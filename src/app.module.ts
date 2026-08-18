import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from './modules/booking/booking.module';
import { MembershipModule } from './modules/membership/membership.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OccupancyModule } from './modules/occupancy/occupancy.module';
import { RedisConfigModule } from './modules/redis/redis.module';
import { CustomerModule } from './modules/customer/customer.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    RedisConfigModule,
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({

      type: 'postgres',

      host: process.env.DB_HOST,

      port: parseInt(
        process.env.DB_PORT ?? '5432',
        10
      ),

      username: process.env.DB_USER,

      password: process.env.DB_PASSWORD,

      database: process.env.DB_NAME,


      autoLoadEntities: true,

      synchronize: false,
    }),
    BookingModule,
    MembershipModule,
    OccupancyModule,
    CustomerModule,
    HealthModule,
  ],
})
export class AppModule { }