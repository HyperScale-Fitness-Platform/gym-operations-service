import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { ClassSession } from './entities/class-session.entity';
import { TrainerSlot } from './entities/trainer-slot.entity';
import { Booking } from './entities/booking.entity';
import { MembershipService } from '../membership/membership.service';
import { EventPublisher } from '../../events/publishers';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateTrainerSlotDto } from './dto/create-trainer-slot.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(ClassSession) private sessionRepo: Repository<ClassSession>,
    @InjectRepository(TrainerSlot) private slotRepo: Repository<TrainerSlot>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
    private membershipService: MembershipService,
    private events: EventPublisher,
  ) {}

  async getClasses() {
    return this.classRepo.find();
  }

  async getClassSessions(classId: string) {
    return this.sessionRepo.find({ where: { classId } });
  }

  async getTrainerSlots(trainerId: string) {
    return this.slotRepo.find({ where: { trainerId, status: 'open' } });
  }

  // NEW — for customers using a paid PT package, slots are restricted to
  // only the trainer that package is locked to
  async getSlotsForPackage(packageId: string) {
    const trainerId = await this.membershipService.getPackageTrainerId(packageId);
    return this.slotRepo.find({ where: { trainerId, status: 'open' } });
  }

  async getCustomerBookings(customerId: string) {
    return this.bookingRepo.find({
      where: { customerId },
      relations: ['classSession', 'trainerSlot'],
      order: { createdAt: 'DESC' },
    });
  }

  async createBooking(dto: CreateBookingDto) {
    if (dto.type === 'class') return this.createClassBooking(dto);
    return this.createPtSessionBooking(dto);
  }

  private async createClassBooking(dto: CreateBookingDto) {
    const session = await this.sessionRepo.findOne({
      where: { id: dto.classSessionId },
      relations: ['class', 'bookings'],
    });
    if (!session) throw new BadRequestException('Class session not found');

    const confirmedCount = session.bookings.filter((b) => b.status === 'confirmed').length;
    if (confirmedCount >= session.class.capacity) {
      throw new ConflictException('This class session is full');
    }

    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId: dto.customerId,
        classSessionId: dto.classSessionId,
        type: 'class',
        status: 'confirmed',
      }),
    );

    await this.events.publish('SessionBooked', {
      bookingId: booking.id,
      customerId: booking.customerId,
      type: 'class',
    });

    return booking;
  }

  private async createPtSessionBooking(dto: CreateBookingDto) {
    const slot = await this.slotRepo.findOne({ where: { id: dto.trainerSlotId } });
    if (!slot || slot.status !== 'open') {
      throw new ConflictException('This trainer slot is no longer available');
    }

    // sessionSource is required by the DTO whenever type = 'pt_session',
    // so by this point it's guaranteed to be either 'membership' or 'package'
    if (dto.sessionSource === 'membership') {
      const hasCredit = await this.membershipService.checkPtSessionsAvailable(dto.customerId);
      if (!hasCredit) {
        throw new BadRequestException('No free PT sessions remaining on membership');
      }
      // any trainer allowed — no extra check needed
    } else {
      const hasCredit = await this.membershipService.checkPackageSessionsAvailable(dto.ptPackageId!);
      if (!hasCredit) {
        throw new BadRequestException('No sessions remaining in this package');
      }

      // package is locked to one specific trainer
      const packageTrainerId = await this.membershipService.getPackageTrainerId(dto.ptPackageId!);
      if (slot.trainerId !== packageTrainerId) {
        throw new BadRequestException('This package can only be used with your assigned trainer');
      }
    }

    const booking = await this.dataSource.transaction(async (manager) => {
      await manager.update(TrainerSlot, dto.trainerSlotId, { status: 'booked' });
      return manager.save(
        manager.create(Booking, {
          customerId: dto.customerId,
          trainerSlotId: dto.trainerSlotId,
          type: 'pt_session',
          status: 'confirmed',
          sessionSource: dto.sessionSource,
          ptPackageId: dto.ptPackageId ?? null,
        }),
      );
    });

    if (dto.sessionSource === 'membership') {
      await this.membershipService.deductPtSession(dto.customerId);
    } else {
      await this.membershipService.deductPackageSession(dto.ptPackageId!);
    }

    await this.events.publish('SessionBooked', {
      bookingId: booking.id,
      customerId: booking.customerId,
      type: 'pt_session',
    });

    return booking;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new BadRequestException('Booking not found');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Booking, bookingId, { status: 'cancelled' });
      if (booking.trainerSlotId) {
        await manager.update(TrainerSlot, booking.trainerSlotId, { status: 'open' });
      }
    });

    if (booking.type === 'pt_session') {
      if (booking.sessionSource === 'package' && booking.ptPackageId) {
        await this.membershipService.refundPackageSession(booking.ptPackageId);
      } else {
        await this.membershipService.refundPtSession(booking.customerId);
      }
    }

    await this.events.publish('SessionCancelled', { bookingId });
    return { status: 'cancelled' };
  }

  // --- Admin/Trainer: catalog & availability management ---

  async createClass(dto: CreateClassDto) {
    return this.classRepo.save(this.classRepo.create(dto));
  }

  async createClassSession(classId: string, dto: CreateClassSessionDto) {
    const classExists = await this.classRepo.findOne({ where: { id: classId } });
    if (!classExists) throw new BadRequestException('Class not found');

    return this.sessionRepo.save(
      this.sessionRepo.create({
        classId,
        trainerId: dto.trainerId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      }),
    );
  }

  async createTrainerSlot(trainerId: string, dto: CreateTrainerSlotDto) {
    return this.slotRepo.save(
      this.slotRepo.create({
        trainerId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: 'open',
      }),
    );
  }

  async getTrainerSchedule(trainerId: string) {
    const [sessions, slots] = await Promise.all([
      this.sessionRepo.find({ where: { trainerId }, relations: ['class'] }),
      this.slotRepo.find({ where: { trainerId } }),
    ]);

    return {
      classSessions: sessions,
      trainerSlots: slots,
    };
  }

  // --- Reschedule ---

  async rescheduleBooking(
    bookingId: string,
    newClassSessionId?: string,
    newTrainerSlotId?: string,
  ) {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new BadRequestException('Booking not found');
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can be rescheduled');
    }

    const newBooking = await this.dataSource.transaction(async (manager) => {
      // mark old booking as rescheduled, free up its old resource
      await manager.update(Booking, bookingId, { status: 'rescheduled' });

      if (booking.trainerSlotId) {
        await manager.update(TrainerSlot, booking.trainerSlotId, { status: 'open' });
      }

      // reserve the new resource
      if (newTrainerSlotId) {
        const newSlot = await manager.findOne(TrainerSlot, { where: { id: newTrainerSlotId } });
        if (!newSlot || newSlot.status !== 'open') {
          throw new ConflictException('The new trainer slot is not available');
        }
        await manager.update(TrainerSlot, newTrainerSlotId, { status: 'booked' });
      }

      return manager.save(
        manager.create(Booking, {
          customerId: booking.customerId,
          type: booking.type,
          classSessionId: newClassSessionId ?? null,
          trainerSlotId: newTrainerSlotId ?? null,
          status: 'confirmed',
          sessionSource: booking.sessionSource,
          ptPackageId: booking.ptPackageId,
        }),
      );
    });

    await this.events.publish('SessionRescheduled', {
      oldBookingId: bookingId,
      newBookingId: newBooking.id,
    });

    return newBooking;
  }
}