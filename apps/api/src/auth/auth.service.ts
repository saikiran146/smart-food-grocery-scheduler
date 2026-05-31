import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        dietaryPreference: dto.dietaryPreference,
        lastLoginAt: new Date(),
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  async login(userId: string, email: string): Promise<AuthTokens> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(userId, email);
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash || !user.isActive) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  async findOrCreateGoogleUser(payload: GoogleUserPayload) {
    const existingByGoogle = await this.prisma.user.findUnique({
      where: { googleId: payload.googleId },
    });

    if (existingByGoogle) {
      await this.prisma.user.update({
        where: { id: existingByGoogle.id },
        data: { lastLoginAt: new Date() },
      });
      return existingByGoogle;
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingByEmail) {
      const updated = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: payload.googleId,
          avatar: existingByEmail.avatar ?? payload.avatar,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
      });
      return updated;
    }

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        googleId: payload.googleId,
        avatar: payload.avatar,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    return user;
  }

  async refreshTokens(token: string): Promise<AuthTokens> {
    const refreshSecret = this.configService.get<string>('auth.refreshSecret');

    let payload: { sub: string; email: string };
    try {
      payload = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token not found or expired');
    }

    // Rotate token: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { token } });

    return this.generateTokens(payload.sub, payload.email);
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token },
    });
  }

  async handleGoogleCallback(user: any): Promise<AuthTokens> {
    return this.generateTokens(user.id, user.email);
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const jwtSecret = this.configService.get<string>('auth.jwtSecret');
    const jwtExpiresIn = this.configService.get<string>('auth.jwtExpiresIn') || '15m';
    const refreshSecret = this.configService.get<string>('auth.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('auth.refreshExpiresIn') || '7d';

    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: jwtExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    // expiresIn in seconds — parse jwtExpiresIn string
    const expiresInSeconds = this.parseExpiresIn(jwtExpiresIn);

    return { accessToken, refreshToken, expiresIn: expiresInSeconds };
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return num * (multipliers[unit] ?? 1);
  }
}
