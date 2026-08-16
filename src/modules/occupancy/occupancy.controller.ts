import { Body, Controller, ForbiddenException, Get, Headers, Post} from '@nestjs/common';

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
    @Headers('user-role') role: string,
  ) {
    if (role !== 'admin') {
      throw new ForbiddenException(
        'Only admins can check in customers',
      );
    }

    return this.occupancyService.checkIn(dto.customerId);
  }

  @Post('checkout')
  checkOut(
    @Body() dto: CheckOutDto,
    @Headers('user-role') role: string,
  ) {
    if (role !== 'admin') {
      throw new ForbiddenException(
        'Only admins can check out customers',
      );
    }

    return this.occupancyService.checkOut(dto.customerId);
  }

  @Get('current')
  getCurrentOccupancy() {
    return this.occupancyService.getCurrentOccupancy();
  }
}