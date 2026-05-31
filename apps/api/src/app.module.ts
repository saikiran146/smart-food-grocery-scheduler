import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FamiliesModule } from './families/families.module';
import { RecipesModule } from './recipes/recipes.module';
import { MealsModule } from './meals/meals.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShoppingModule } from './shopping/shopping.module';
import { WasteModule } from './waste/waste.module';
import { FruitsModule } from './fruits/fruits.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { appConfig, databaseConfig, authConfig, aiConfig } from './common/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, aiConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    RecipesModule,
    MealsModule,
    InventoryModule,
    ShoppingModule,
    WasteModule,
    FruitsModule,
    NotificationsModule,
    AnalyticsModule,
    AiModule,
  ],
})
export class AppModule {}
