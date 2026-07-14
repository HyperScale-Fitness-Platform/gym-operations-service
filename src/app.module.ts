import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingModule } from './modules/booking/booking.module';
import { MembershipModule } from './modules/membership/membership.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OccupancyModule } from './modules/occupancy/occupancy.module';

@Module({
  imports: [
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

      migrations: [
        'src/migrations/*.ts'
      ],

    }),
    BookingModule,
    MembershipModule,
    OccupancyModule,
  ],
})
export class AppModule { }