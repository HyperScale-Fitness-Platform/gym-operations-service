import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Occupancy } from './entities/occupancy.entity';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';

import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Occupancy]),
    MembershipModule,
  ],
  controllers: [OccupancyController],
  providers: [OccupancyService],
})
export class OccupancyModule {}