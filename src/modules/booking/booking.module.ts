import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Class } from './entities/class.entity';
import { ClassSession } from './entities/class-session.entity';
import { TrainerSlot } from './entities/trainer-slot.entity';
import { Booking } from './entities/booking.entity';
import { MembershipModule } from '../membership/membership.module';
import { EventPublisher } from '../../events/publishers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, ClassSession, TrainerSlot, Booking]),
    MembershipModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, EventPublisher],
})
export class BookingModule {}