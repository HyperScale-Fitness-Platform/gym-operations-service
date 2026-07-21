import { Body, Controller, Get, Post, Headers } from '@nestjs/common';

import { OccupancyService } from './occupancy.service';
import { CheckInDto } from './dto/checkin.dto';
import { CheckOutDto } from './dto/checkout.dto';

@Controller('operations')
export class OccupancyController {
  constructor(
    private readonly occupancyService: OccupancyService,
  ) { }

  @Post('checkin')
  checkIn(
    @Headers('user-id') customerId: string,
  ) {
    return this.occupancyService.checkIn(customerId);
  }

  @Post('checkout')
  checkOut(
    @Headers('user-id') customerId: string,
  ) {
    return this.occupancyService.checkOut(customerId);
  }

  @Get('current')
  getCurrentOccupancy() {
    return this.occupancyService.getCurrentOccupancy();
  }
}