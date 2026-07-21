import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
  Logger
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Occupancy } from './entities/occupancy.entity';

import { MembershipService } from '../membership/membership.service';
import { CheckInDto } from './dto/checkin.dto';
import { CheckOutDto } from './dto/checkout.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class OccupancyService implements OnModuleInit {

  constructor(
    @InjectRepository(Occupancy)
    private readonly occupancyRepository: Repository<Occupancy>,

    private readonly membershipService: MembershipService,

    @InjectRedis()
    private readonly redis: Redis,
  ) { }

  private readonly logger = new Logger(OccupancyService.name);

  private readonly OCCUPANCY_KEY =
    'occupancy:current_members';

  async onModuleInit() {
    await this.rebuildRedis();
  }

  private async rebuildRedis() {

    await this.redis.del(this.OCCUPANCY_KEY);

    const currentMembers =
      await this.occupancyRepository.find({
        where: {
          checkOut: IsNull(),
        },
      });

    if (currentMembers.length === 0) {
      return;
    }

    await this.redis.sadd(
      this.OCCUPANCY_KEY,
      ...currentMembers.map(member => member.customerId),
    );

    this.logger.log(
      `Redis rebuilt with ${currentMembers.length} active members.`,
    );
  }



  async checkIn(customerId:string) {
    const membership =
      await this.membershipService.getCustomerMembership(
        customerId,
      );

    if (!membership || membership.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Customer does not have an active membership',
      );
    }

    const existing =
      await this.occupancyRepository.findOne({
        where: {
          customerId: customerId,
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
        customerId: customerId,
        checkIn: new Date(),
      });

    const savedOccupancy =
      await this.occupancyRepository.save(occupancy);

    try {

      await this.redis.sadd(
        this.OCCUPANCY_KEY,
        customerId,
      );

    } catch (error) {

      this.logger.error(
        'Failed to update Redis after check-in',
        error,
      );

    }

    return savedOccupancy;
  }

  async checkOut(customerId:string) {
    const occupancy =
      await this.occupancyRepository.findOne({
        where: {
          customerId: customerId,
          checkOut: IsNull(),
        },
      });

    if (!occupancy) {
      throw new BadRequestException(
        'Customer is not currently checked in',
      );
    }

    occupancy.checkOut = new Date();

    const updatedOccupancy =
      await this.occupancyRepository.save(occupancy);

    try {

      await this.redis.srem(
        this.OCCUPANCY_KEY,
        customerId,
      );

    } catch (error) {

      this.logger.error(
        'Failed to update Redis after checkout',
        error,
      );

    }

    return updatedOccupancy;
  }

  async getCurrentOccupancy() {
    const currentOccupancy =
      await this.redis.scard(
        this.OCCUPANCY_KEY,
      );

    return {
      currentOccupancy: Number(currentOccupancy),
    };
  }
}