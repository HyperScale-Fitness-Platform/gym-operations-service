import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Occupancy } from './entities/occupancy.entity';

import { MembershipService } from '../membership/membership.service';
import { CheckInDto } from './dto/checkin.dto';
import { CheckOutDto } from './dto/checkout.dto';

@Injectable()
export class OccupancyService {
  constructor(
    @InjectRepository(Occupancy)
    private readonly occupancyRepository: Repository<Occupancy>,

    private readonly membershipService: MembershipService,
  ) { }

  async checkIn(dto: CheckInDto) {
    const membership =
      await this.membershipService.getCustomerMembership(
        dto.customerId,
      );

    if (!membership || membership.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Customer does not have an active membership',
      );
    }

    const existing =
      await this.occupancyRepository.findOne({
        where: {
          customerId: dto.customerId,
          checkOut: IsNull(),
        },
      });

    if (existing) {
      throw new ConflictException(
        'Customer is already checked in',
      );
    }

    const occupancy =
      this.occupancyRepository.create({
        customerId: dto.customerId,
        checkIn: new Date(),
      });

    return this.occupancyRepository.save(occupancy);
  }

  async checkOut(dto: CheckOutDto) {
    const occupancy =
      await this.occupancyRepository.findOne({
        where: {
          customerId: dto.customerId,
          checkOut: IsNull(),
        },
      });

    if (!occupancy) {
      throw new BadRequestException(
        'Customer is not currently checked in',
      );
    }

    occupancy.checkOut = new Date();

    return this.occupancyRepository.save(occupancy);
  }

  async getCurrentOccupancy() {
    const currentOccupancy = await this.occupancyRepository.count({
      where: {
        checkOut: IsNull(),
      },
    });

    return {
      currentOccupancy,
    };
  }
}