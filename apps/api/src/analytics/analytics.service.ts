import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------

  async getDashboard(familyId: string, month: number, year: number) {
    const [inventory, consumption, waste, budget] = await Promise.all([
      this.getInventoryMetrics(familyId),
      this.getConsumptionMetrics(familyId, month, year),
      this.getWasteMetrics(familyId, month, year),
      this.getBudgetMetrics(familyId, month, year),
    ]);

    return { inventory, consumption, waste, budget };
  }

  // ---------------------------------------------------------------
  // INVENTORY METRICS
  // ---------------------------------------------------------------

  async getInventoryMetrics(familyId: string) {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const items = await this.prisma.groceryItem.findMany({
      where: { familyId, isActive: true },
    });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.totalCost, 0);

    // Breakdown by category
    const categoryMap: Record<string, { count: number; value: number }> = {};
    for (const item of items) {
      if (!categoryMap[item.category]) {
        categoryMap[item.category] = { count: 0, value: 0 };
      }
      categoryMap[item.category].count += 1;
      categoryMap[item.category].value += item.totalCost;
    }

    const byCategory = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      count: data.count,
      value: parseFloat(data.value.toFixed(2)),
    }));

    // Expiry counts
    const expiredCount = items.filter(
      (i) => i.expiryDate && i.expiryDate < now,
    ).length;

    const expiringSoonCount = items.filter(
      (i) =>
        i.expiryDate &&
        i.expiryDate >= now &&
        i.expiryDate <= threeDaysFromNow,
    ).length;

    const expiringThisWeekCount = items.filter(
      (i) =>
        i.expiryDate &&
        i.expiryDate >= now &&
        i.expiryDate <= sevenDaysFromNow,
    ).length;

    return {
      totalItems,
      totalValue: parseFloat(totalValue.toFixed(2)),
      byCategory,
      expiredCount,
      expiringSoonCount,
      expiringThisWeekCount,
    };
  }

  // ---------------------------------------------------------------
  // CONSUMPTION METRICS
  // ---------------------------------------------------------------

  async getConsumptionMetrics(familyId: string, month: number, year: number) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Last 7 days for weekly chart
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all consumption transactions for the family this month
    const monthlyTransactions = await this.prisma.groceryTransaction.findMany({
      where: {
        type: TransactionType.CONSUMPTION,
        performedAt: { gte: monthStart, lte: monthEnd },
        groceryItem: { familyId },
      },
      include: { groceryItem: true },
    });

    // Weekly chart: last 7 days
    const weeklyTransactions = await this.prisma.groceryTransaction.findMany({
      where: {
        type: TransactionType.CONSUMPTION,
        performedAt: { gte: sevenDaysAgo },
        groceryItem: { familyId },
      },
      include: { groceryItem: true },
    });

    // Build daily chart data for last 7 days
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }

    for (const tx of weeklyTransactions) {
      const key = tx.performedAt.toISOString().split('T')[0];
      if (dailyMap[key] !== undefined) {
        dailyMap[key] += tx.quantity;
      }
    }

    const weeklyUsageChart = Object.entries(dailyMap).map(([date, quantity]) => ({
      date,
      quantity: parseFloat(quantity.toFixed(2)),
    }));

    // Monthly total consumption
    const monthlyTotal = monthlyTransactions.reduce((sum, tx) => sum + tx.quantity, 0);

    // Top consumed items
    const itemConsumption: Record<string, { name: string; quantity: number; category: string }> = {};
    for (const tx of monthlyTransactions) {
      const key = tx.groceryItem.id;
      if (!itemConsumption[key]) {
        itemConsumption[key] = {
          name: tx.groceryItem.name,
          quantity: 0,
          category: tx.groceryItem.category,
        };
      }
      itemConsumption[key].quantity += tx.quantity;
    }

    const topConsumedItems = Object.values(itemConsumption)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map((item) => ({ ...item, quantity: parseFloat(item.quantity.toFixed(2)) }));

    return {
      weeklyUsageChart,
      monthlyTotalQuantity: parseFloat(monthlyTotal.toFixed(2)),
      topConsumedItems,
      month,
      year,
    };
  }

  // ---------------------------------------------------------------
  // WASTE METRICS
  // ---------------------------------------------------------------

  async getWasteMetrics(familyId: string, month: number, year: number) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Current month waste logs
    const wasteLogsThisMonth = await this.prisma.wasteLog.findMany({
      where: {
        familyId,
        wastedAt: { gte: monthStart, lte: monthEnd },
      },
    });

    // Purchase transactions this month to calculate waste %
    const purchaseTransactions = await this.prisma.groceryTransaction.findMany({
      where: {
        type: TransactionType.PURCHASE,
        performedAt: { gte: monthStart, lte: monthEnd },
        groceryItem: { familyId },
      },
    });

    const purchasedQty = purchaseTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
    const wastedQty = wasteLogsThisMonth.reduce((sum, log) => sum + log.quantity, 0);
    const wasteCost = wasteLogsThisMonth.reduce((sum, log) => sum + log.costWasted, 0);
    const wastePercentage =
      purchasedQty > 0 ? parseFloat(((wastedQty / purchasedQty) * 100).toFixed(2)) : 0;

    // Most wasted items (top 5)
    const itemWasteMap: Record<string, { name: string; quantity: number; cost: number; category: string }> = {};
    for (const log of wasteLogsThisMonth) {
      const key = log.itemName;
      if (!itemWasteMap[key]) {
        itemWasteMap[key] = { name: log.itemName, quantity: 0, cost: 0, category: log.category };
      }
      itemWasteMap[key].quantity += log.quantity;
      itemWasteMap[key].cost += log.costWasted;
    }

    const mostWastedItems = Object.values(itemWasteMap)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity.toFixed(2)),
        cost: parseFloat(item.cost.toFixed(2)),
      }));

    // Waste by category
    const categoryWasteMap: Record<string, { quantity: number; cost: number }> = {};
    for (const log of wasteLogsThisMonth) {
      if (!categoryWasteMap[log.category]) {
        categoryWasteMap[log.category] = { quantity: 0, cost: 0 };
      }
      categoryWasteMap[log.category].quantity += log.quantity;
      categoryWasteMap[log.category].cost += log.costWasted;
    }

    const wasteByCategory = Object.entries(categoryWasteMap).map(([category, data]) => ({
      category,
      quantity: parseFloat(data.quantity.toFixed(2)),
      cost: parseFloat(data.cost.toFixed(2)),
    }));

    // Waste by reason (wasteCategory)
    const reasonWasteMap: Record<string, { quantity: number; cost: number }> = {};
    for (const log of wasteLogsThisMonth) {
      if (!reasonWasteMap[log.wasteCategory]) {
        reasonWasteMap[log.wasteCategory] = { quantity: 0, cost: 0 };
      }
      reasonWasteMap[log.wasteCategory].quantity += log.quantity;
      reasonWasteMap[log.wasteCategory].cost += log.costWasted;
    }

    const wasteByReason = Object.entries(reasonWasteMap).map(([reason, data]) => ({
      reason,
      quantity: parseFloat(data.quantity.toFixed(2)),
      cost: parseFloat(data.cost.toFixed(2)),
    }));

    // Trend data: last 6 months
    const trendData = await this.buildWasteTrend(familyId, month, year);

    return {
      wastePercentage,
      wasteCostThisMonth: parseFloat(wasteCost.toFixed(2)),
      wastedQuantity: parseFloat(wastedQty.toFixed(2)),
      purchasedQuantity: parseFloat(purchasedQty.toFixed(2)),
      mostWastedItems,
      wasteByCategory,
      wasteByReason,
      trendData,
      month,
      year,
    };
  }

  private async buildWasteTrend(
    familyId: string,
    currentMonth: number,
    currentYear: number,
  ) {
    const results: Array<{
      month: number;
      year: number;
      label: string;
      wasteCost: number;
      wastePercentage: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

      const [wasteLogs, purchaseTxs] = await Promise.all([
        this.prisma.wasteLog.findMany({
          where: { familyId, wastedAt: { gte: monthStart, lte: monthEnd } },
          select: { quantity: true, costWasted: true },
        }),
        this.prisma.groceryTransaction.findMany({
          where: {
            type: TransactionType.PURCHASE,
            performedAt: { gte: monthStart, lte: monthEnd },
            groceryItem: { familyId },
          },
          select: { quantity: true },
        }),
      ]);

      const wastedQty = wasteLogs.reduce((sum, l) => sum + l.quantity, 0);
      const purchasedQty = purchaseTxs.reduce((sum, tx) => sum + tx.quantity, 0);
      const wasteCost = wasteLogs.reduce((sum, l) => sum + l.costWasted, 0);
      const wastePercentage =
        purchasedQty > 0 ? parseFloat(((wastedQty / purchasedQty) * 100).toFixed(2)) : 0;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      results.push({
        month: m,
        year: y,
        label: `${monthNames[m - 1]} ${y}`,
        wasteCost: parseFloat(wasteCost.toFixed(2)),
        wastePercentage,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------
  // BUDGET METRICS
  // ---------------------------------------------------------------

  async getBudgetMetrics(familyId: string, month: number, year: number) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    const now = new Date();

    // Total grocery spend this month (sum of GroceryItem costs purchased this month)
    const purchasedItems = await this.prisma.groceryItem.findMany({
      where: {
        familyId,
        purchaseDate: { gte: monthStart, lte: monthEnd },
      },
      select: { totalCost: true, category: true, purchaseDate: true },
    });

    const monthlySpend = purchasedItems.reduce((sum, item) => sum + item.totalCost, 0);

    // Budget record for this month
    const budgetRecord = await this.prisma.budget.findUnique({
      where: { familyId_month_year: { familyId, month, year } },
    });

    // Predicted spend: extrapolate based on daily average
    const daysElapsed =
      now >= monthEnd
        ? monthEnd.getDate()
        : now.getDate();
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const dailyAverage = daysElapsed > 0 ? monthlySpend / daysElapsed : 0;
    const predictedSpend = parseFloat((dailyAverage * totalDaysInMonth).toFixed(2));

    // Spend by category
    const categorySpendMap: Record<string, number> = {};
    for (const item of purchasedItems) {
      if (!categorySpendMap[item.category]) {
        categorySpendMap[item.category] = 0;
      }
      categorySpendMap[item.category] += item.totalCost;
    }

    const spendByCategory = Object.entries(categorySpendMap).map(([category, amount]) => ({
      category,
      amount: parseFloat(amount.toFixed(2)),
    }));

    // Savings estimate: last month's waste cost (if we had reduced waste)
    const lastMonthStart = new Date(year, month - 2, 1);
    const lastMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const lastMonthWaste = await this.prisma.wasteLog.aggregate({
      where: {
        familyId,
        wastedAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { costWasted: true },
    });

    const savingsEstimate = parseFloat(
      ((lastMonthWaste._sum.costWasted ?? 0) * 0.5).toFixed(2),
    );

    return {
      monthlySpend: parseFloat(monthlySpend.toFixed(2)),
      budgetAmount: budgetRecord?.totalBudget ?? null,
      budgetRemaining: budgetRecord
        ? parseFloat((budgetRecord.totalBudget - monthlySpend).toFixed(2))
        : null,
      predictedSpend,
      savingsEstimate,
      spendByCategory,
      daysElapsed,
      totalDaysInMonth,
      dailyAverage: parseFloat(dailyAverage.toFixed(2)),
      month,
      year,
    };
  }
}
