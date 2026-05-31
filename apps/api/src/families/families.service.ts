import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFamilyDto) {
    const family = await this.prisma.family.create({
      data: {
        name: dto.name,
        description: dto.description,
        timezone: dto.timezone ?? 'Asia/Kolkata',
        currency: dto.currency ?? 'INR',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
      },
    });

    return family;
  }

  async findAllForUser(userId: string) {
    return this.prisma.family.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, dietaryPreference: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!family) {
      throw new NotFoundException(`Family with id ${id} not found`);
    }

    await this.assertMember(id, userId);

    return family;
  }

  async update(id: string, userId: string, dto: UpdateFamilyDto) {
    await this.assertOwnerOrAdmin(id, userId);

    return this.prisma.family.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId);

    await this.prisma.family.delete({ where: { id } });

    return { message: 'Family deleted successfully' };
  }

  async join(userId: string, inviteCode: string) {
    const family = await this.prisma.family.findUnique({ where: { inviteCode } });

    if (!family) {
      throw new NotFoundException('Invalid invite code');
    }

    const existing = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId } },
    });

    if (existing) {
      throw new ConflictException('You are already a member of this family');
    }

    await this.prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role: 'MEMBER',
      },
    });

    return this.prisma.family.findUnique({
      where: { id: family.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async regenerateInviteCode(id: string, userId: string) {
    await this.assertOwnerOrAdmin(id, userId);

    const { randomUUID } = await import('crypto');
    const newInviteCode = randomUUID();

    return this.prisma.family.update({
      where: { id },
      data: { inviteCode: newInviteCode },
      select: { id: true, inviteCode: true },
    });
  }

  async listMembers(id: string, userId: string) {
    await this.assertMember(id, userId);

    return this.prisma.familyMember.findMany({
      where: { familyId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            dietaryPreference: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeMember(familyId: string, requesterId: string, memberId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    const requesterMembership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: requesterId } },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    const isOwner = requesterMembership.role === 'OWNER';
    const isAdmin = requesterMembership.role === 'ADMIN';
    const isSelf = requesterId === memberId;

    if (!isOwner && !isAdmin && !isSelf) {
      throw new ForbiddenException('You do not have permission to remove this member');
    }

    if (memberId === family.ownerId) {
      throw new ForbiddenException('Cannot remove the family owner');
    }

    const targetMembership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: memberId } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this family');
    }

    await this.prisma.familyMember.delete({
      where: { familyId_userId: { familyId, userId: memberId } },
    });

    return { message: 'Member removed successfully' };
  }

  private async assertMember(familyId: string, userId: string) {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this family');
    }

    return membership;
  }

  private async assertOwnerOrAdmin(familyId: string, userId: string) {
    const membership = await this.assertMember(familyId, userId);

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only owners or admins can perform this action');
    }

    return membership;
  }

  private async assertOwner(familyId: string, userId: string) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (family.ownerId !== userId) {
      throw new ForbiddenException('Only the family owner can perform this action');
    }

    return family;
  }
}
