import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

interface GetNotificationsOptions {
  status?: string;
  type?: string;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: string, options: GetNotificationsOptions) {
    const { status, type, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (status) {
      where.status = status as NotificationStatus;
    }
    if (type) {
      where.type = type as NotificationType;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
      },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return updated;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.SENT] },
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { deleted: true };
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: (data as any) ?? undefined,
        status: NotificationStatus.PENDING,
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledNotifications() {
    this.logger.log('Running scheduled notification checks...');

    try {
      await this.checkExpiringGroceries();
      await this.checkTomorrowMeals();
    } catch (error) {
      this.logger.error('Error in scheduled notifications', error);
    }
  }

  private async checkExpiringGroceries() {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Items expiring within 3 days
    const expiringItems = await this.prisma.groceryItem.findMany({
      where: {
        isActive: true,
        expiryDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
      include: {
        family: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    for (const item of expiringItems) {
      const daysUntilExpiry = Math.ceil(
        (item.expiryDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const type =
        daysUntilExpiry <= 1 ? NotificationType.EXPIRED : NotificationType.EXPIRING_SOON;

      const title =
        daysUntilExpiry <= 1
          ? `${item.name} expires today or tomorrow!`
          : `${item.name} expiring in ${daysUntilExpiry} days`;

      const message =
        daysUntilExpiry <= 1
          ? `Use ${item.name} immediately to avoid waste.`
          : `${item.name} (${item.quantity} ${item.unit}) will expire in ${daysUntilExpiry} days. Plan to use it soon.`;

      // Notify all family members
      for (const member of item.family.members) {
        // Check if a similar notification was already sent recently (last 24h)
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            data: { path: ['groceryItemId'], equals: item.id },
          },
        });

        if (!existingNotification) {
          await this.createNotification(member.userId, type, title, message, {
            groceryItemId: item.id,
            itemName: item.name,
            expiryDate: item.expiryDate,
            daysUntilExpiry,
            familyId: item.familyId,
          });
        }
      }
    }

    // Check for low stock (quantity <= 10% of typical amount — simple threshold: quantity < 1)
    const lowStockItems = await this.prisma.groceryItem.findMany({
      where: {
        isActive: true,
        quantity: { lte: 0.5 },
        expiryDate: null,
      },
      include: {
        family: {
          include: {
            members: true,
          },
        },
      },
    });

    for (const item of lowStockItems) {
      const title = `Low stock: ${item.name}`;
      const message = `${item.name} is running low (${item.quantity} ${item.unit} remaining). Consider restocking.`;

      for (const member of item.family.members) {
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type: NotificationType.LOW_STOCK,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            data: { path: ['groceryItemId'], equals: item.id },
          },
        });

        if (!existingNotification) {
          await this.createNotification(
            member.userId,
            NotificationType.LOW_STOCK,
            title,
            message,
            {
              groceryItemId: item.id,
              itemName: item.name,
              quantity: item.quantity,
              unit: item.unit,
              familyId: item.familyId,
            },
          );
        }
      }
    }

    this.logger.log(
      `Expiring grocery check complete. Processed ${expiringItems.length} expiring items, ${lowStockItems.length} low stock items.`,
    );
  }

  private async checkTomorrowMeals() {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowMeals = await this.prisma.mealSchedule.findMany({
      where: {
        scheduledAt: { gte: tomorrowStart, lte: tomorrowEnd },
        status: 'PLANNED',
      },
      include: {
        recipe: true,
        family: {
          include: {
            members: true,
          },
        },
      },
    });

    for (const meal of tomorrowMeals) {
      const mealName = meal.recipe?.name ?? meal.customMealName ?? 'a meal';
      const title = `Meal reminder: ${mealName}`;
      const message = `You have ${mealName} planned for ${meal.mealType.toLowerCase()} tomorrow. Make sure you have all ingredients ready.`;

      for (const member of meal.family.members) {
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: member.userId,
            type: NotificationType.MEAL_REMINDER,
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            data: { path: ['mealScheduleId'], equals: meal.id },
          },
        });

        if (!existingNotification) {
          await this.createNotification(
            member.userId,
            NotificationType.MEAL_REMINDER,
            title,
            message,
            {
              mealScheduleId: meal.id,
              mealName,
              mealType: meal.mealType,
              scheduledAt: meal.scheduledAt,
              familyId: meal.familyId,
            },
          );
        }
      }
    }

    this.logger.log(
      `Tomorrow meal check complete. Processed ${tomorrowMeals.length} meals.`,
    );
  }
}
