import { Body, Controller, Get, Post } from '@nestjs/common';

import { OccupancyService } from './occupancy.service';
import { CheckInDto } from './dto/checkin.dto';
import { CheckOutDto } from './dto/checkout.dto';

@Controller()
export class OccupancyController {
  constructor(
    private readonly occupancyService: OccupancyService,
  ) {}

  @Post('checkin')
  checkIn(
    @Body() dto: CheckInDto,
  ) {
    return this.occupancyService.checkIn(dto);
  }

  @Post('checkout')
  checkOut(
    @Body() dto: CheckOutDto,
  ) {
    return this.occupancyService.checkOut(dto);
  }

  @Get('current')
  getCurrentOccupancy() {
    return this.occupancyService.getCurrentOccupancy();
  }
}