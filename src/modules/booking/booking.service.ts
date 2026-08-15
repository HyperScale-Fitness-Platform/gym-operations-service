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
import { UpdateClassDto } from './dto/update-class.dto';
import { TrainerProfile } from './entities/trainer-profile.entity';
import { PtPackageStatus } from '../membership/enum/pt-package-status.enum';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Class) private classRepo: Repository<Class>,
    @InjectRepository(ClassSession) private sessionRepo: Repository<ClassSession>,
    @InjectRepository(TrainerSlot) private slotRepo: Repository<TrainerSlot>,
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(TrainerProfile) private trainerProfileRepo: Repository<TrainerProfile>,
    private dataSource: DataSource,
    private membershipService: MembershipService,
    private events: EventPublisher,
  ) { }

  async getClasses() {
    return this.classRepo.find();
  }

  async getClassSessions(classId: string) {
    const sessions = await this.sessionRepo.find({
      where: { classId },
      relations: ['class', 'bookings'],
    });

    return sessions.map((session) => {
      const confirmedCount = session.bookings.filter((b) => b.status === 'confirmed').length;
      return {
        id: session.id,
        classId: session.classId,
        trainerId: session.trainerId,
        startTime: session.startTime,
        endTime: session.endTime,
        capacity: session.class.capacity,
        spotsRemaining: session.class.capacity - confirmedCount,
      };
    });
  }

  async getTrainerSlots(trainerId: string) {
    return this.slotRepo.find({ where: { trainerId, status: 'open' } });
  }

  // for customers using a paid PT package, slots are restricted to
  // only the trainer that package is locked to
  async getSlotsForPackage(
    customerId: string,
    packageId: string,
    date?: string,
  ) {
    const ptPackage =
      await this.membershipService.getCustomerPackageForBooking(
        customerId,
        packageId,
      );

    const trainerId = ptPackage.trainerId;

    const query =
      this.slotRepo
        .createQueryBuilder('slot')
        .where('slot.trainer_id = :trainerId', {
          trainerId,
        })
        .andWhere('slot.status = :status', {
          status: 'open',
        })
        .andWhere('slot.start_time > NOW()');

    if (date) {
      query.andWhere(
        'DATE(slot.start_time) = :date',
        { date },
      );
    }

    return query
      .orderBy('slot.start_time', 'ASC')
      .getMany();
  }

  // async getCustomerBookings(customerId: string) {
  //   return this.bookingRepo.find({
  //     where: { customerId },
  //     relations: ['classSession', 'classSession.class', 'trainerSlot'],
  //     order: { createdAt: 'DESC' },
  //   });
  // }

  async getCustomerBookings(
    customerId: string,
  ) {

    const bookings =
      await this.bookingRepo.find({
        where: {
          customerId,
        },

        relations: [
          'classSession',
          'classSession.class',
          'trainerSlot',
        ],

        order: {
          createdAt: 'DESC',
        },
      });

    const trainerIds = [
      ...new Set(
        bookings
          .map(
            (booking) =>
              booking.trainerId,
          )
          .filter(Boolean),
      ),
    ];

    const trainers =
      trainerIds.length > 0
        ? await this.trainerProfileRepo
          .createQueryBuilder('trainer')
          .where(
            'trainer.id IN (:...trainerIds)',
            {
              trainerIds,
            },
          )
          .getMany()
        : [];

    const trainerMap =
      new Map(
        trainers.map(
          (trainer) => [
            trainer.id,
            trainer,
          ],
        ),
      );

    return bookings.map(
      (booking) => {

        const trainer =
          booking.trainerId
            ? trainerMap.get(
              booking.trainerId,
            )
            : null;

        return {
          ...booking,

          trainer: trainer
            ? {
              id: trainer.id,
              fullName:
                trainer.fullName,
              bio:
                trainer.bio,
              gender:
                trainer.gender,
              photoUrl:
                trainer.photoUrl,
            }
            : null,
        };
      },
    );
  }

  async createBooking(customerId: string, dto: CreateBookingDto) {
    if (dto.type === 'class') return this.createClassBooking(customerId, dto);
    return this.createPtSessionBooking(customerId, dto);
  }

  private async createClassBooking(customerId: string, dto: CreateBookingDto) {
    await this.membershipService.checkActiveMembership(customerId);

    const session = await this.sessionRepo.findOne({
      where: { id: dto.classSessionId },
      relations: ['class', 'bookings'],
    });
    if (!session) throw new BadRequestException('Class session not found');

    const alreadyBooked = session.bookings.find(
      (booking) =>
        booking.customerId === customerId &&
        booking.status === 'confirmed',
    );
    if (alreadyBooked) {
      throw new ConflictException(
        'You have already booked this class session',
      );
    }


    const confirmedCount = session.bookings.filter((b) => b.status === 'confirmed').length;
    if (confirmedCount >= session.class.capacity) {
      throw new ConflictException('This class session is full');
    }

    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId,
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

  async getAvailableTrainers() {
    return this.trainerProfileRepo
      .createQueryBuilder('trainer')
      .innerJoin(
        TrainerSlot,
        'slot',
        `
        slot.trainer_id = trainer.id
        AND slot.status = :status
        AND slot.start_time > NOW()
      `,
        { status: 'open' },
      )
      .select([
        'trainer.id',
        'trainer.fullName',
        'trainer.bio',
        'trainer.gender',
        'trainer.photoUrl',
      ])
      .distinct(true)
      .orderBy('trainer.fullName', 'ASC')
      .getMany();
  }


  private async createPtSessionBooking(
    customerId: string,
    dto: CreateBookingDto,
  ) {
    if (!dto.sourceType) {
      throw new BadRequestException(
        'PT session source is required',
      );
    }

    if (!dto.slotStart) {
      throw new BadRequestException(
        'PT session time is required',
      );
    }

    // ==========================================
    // PACKAGE
    // ==========================================

    if (dto.sourceType === 'package') {
      if (!dto.sourceId) {
        throw new BadRequestException(
          'Package ID is required',
        );
      }

      const ptPackage =
        await this.membershipService.getCustomerPackageForBooking(
          customerId,
          dto.sourceId,
        );

      const booking =
        await this.dataSource.transaction(
          async (manager) => {

            const slot =
              await manager
                .createQueryBuilder(
                  TrainerSlot,
                  'slot',
                )
                .setLock('pessimistic_write')
                .where(
                  'slot.trainer_id = :trainerId',
                  {
                    trainerId:
                      ptPackage.trainerId,
                  },
                )
                .andWhere(
                  'slot.start_time = :startTime',
                  {
                    startTime:
                      new Date(dto.slotStart!),
                  },
                )
                .andWhere(
                  'slot.status = :status',
                  {
                    status: 'open',
                  },
                )
                .getOne();

            if (!slot) {
              throw new ConflictException(
                'This trainer slot is no longer available',
              );
            }

            slot.status = 'booked';

            await manager.save(
              TrainerSlot,
              slot,
            );

            const booking =
              manager.create(Booking, {
                customerId,

                trainerId:
                  ptPackage.trainerId,

                trainerSlotId:
                  slot.id,

                type: 'pt_session',

                status: 'confirmed',

                sourceType: 'package',

                sourceId: ptPackage.id,
              });

            return manager.save(
              Booking,
              booking,
            );
          },
        );

      await this.membershipService
        .deductPackageSession(
          ptPackage.id,
        );

      await this.events.publish(
        'PT_SESSION_BOOKED',
        {
          bookingId: booking.id,
          customerId,
          trainerId: ptPackage.trainerId,
          trainerSlotId: booking.trainerSlotId,
        },
      );

      return booking;
    }

    // ==========================================
    // FREE / MEMBERSHIP CREDIT
    // ==========================================

    if (dto.sourceType === 'free') {

      const hasCredit =
        await this.membershipService
          .checkPtSessionsAvailable(
            customerId,
          );

      if (!hasCredit) {
        throw new BadRequestException(
          'No free PT sessions remaining',
        );
      }

      const booking =
        await this.dataSource.transaction(
          async (manager) => {

            const slot =
              await this.assignTrainerForFreeSlot(
                manager,
                new Date(dto.slotStart!),
                new Date(
                  new Date(dto.slotStart!).getTime()
                  +
                  60 * 60 * 1000
                ),
              );

            slot.status = 'booked';

            await manager.save(
              TrainerSlot,
              slot,
            );

            const booking =
              manager.create(Booking, {
                customerId,

                trainerId:
                  slot.trainerId,

                trainerSlotId:
                  slot.id,

                type: 'pt_session',

                status: 'confirmed',

                sourceType: 'free',

                sourceId: null,
              });

            return manager.save(
              Booking,
              booking,
            );
          },
        );

      await this.membershipService
        .deductPtSession(customerId);

      await this.events.publish(
        'PT_SESSION_BOOKED',
        {
          bookingId: booking.id,
          customerId,
          trainerId: booking.trainerId,
          trainerSlotId: booking.trainerSlotId,
        },
      );

      return booking;
    }

    throw new BadRequestException(
      'Invalid PT session source',
    );
  }

  async getBookableSources(customerId: string) {

    let freeCredit = {
      available: false,
      remaining: 0,
    };

    try {
      freeCredit =
        await this.membershipService
          .getPtBookingCredits(customerId);
    } catch {
      // Customer has no active membership/PT benefit.
    }

    const packages =
      await this.membershipService
        .getCustomerPackages(customerId);

    const activePackages =
      packages.filter(
        (pkg) =>
          pkg.status === PtPackageStatus.ACTIVE &&
          pkg.sessionsUsed < pkg.sessionsTotal,
      );

    /*
     * Get trainer profiles for all package trainers.
     */
    const trainerIds = [
      ...new Set(
        activePackages.map(
          (pkg) => pkg.trainerId,
        ),
      ),
    ];

    const trainers =
      trainerIds.length > 0
        ? await this.trainerProfileRepo
          .createQueryBuilder('trainer')
          .where('trainer.id IN (:...trainerIds)', {
            trainerIds,
          })
          .getMany()
        : [];

    const trainerMap =
      new Map(
        trainers.map(
          (trainer) => [
            trainer.id,
            trainer,
          ],
        ),
      );

    return {
      freeCredit,

      packages: activePackages.map(
        (pkg) => {

          const trainer =
            trainerMap.get(
              pkg.trainerId,
            );

          return {
            id: pkg.id,

            packageType:
              pkg.packageType,

            trainerId:
              pkg.trainerId,

            trainer: trainer
              ? {
                id: trainer.id,
                fullName:
                  trainer.fullName,
                bio:
                  trainer.bio,
                gender:
                  trainer.gender,
                photoUrl:
                  trainer.photoUrl,
              }
              : null,

            sessionsTotal:
              pkg.sessionsTotal,

            sessionsUsed:
              pkg.sessionsUsed,

            remainingSessions:
              pkg.sessionsTotal -
              pkg.sessionsUsed,

            status:
              pkg.status,
          };
        },
      ),
    };
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

      if (
        booking.sourceType === 'package' &&
        booking.sourceId
      ) {
        await this.membershipService
          .refundPackageSession(
            booking.sourceId,
          );
      }

      else if (
        booking.sourceType === 'free'
      ) {
        await this.membershipService
          .refundPtSession(
            booking.customerId,
          );
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

    const booking =
      await this.bookingRepo.findOne({
        where: {
          id: bookingId,
        },
      });

    if (!booking) {
      throw new BadRequestException(
        'Booking not found',
      );
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        'Only confirmed bookings can be rescheduled',
      );
    }

    const newBooking =
      await this.dataSource.transaction(
        async (manager) => {

          let newTrainerId =
            booking.trainerId;

          /*
           * Release the old resource.
           */
          await manager.update(
            Booking,
            bookingId,
            {
              status: 'rescheduled',
            },
          );

          if (booking.trainerSlotId) {

            await manager.update(
              TrainerSlot,
              booking.trainerSlotId,
              {
                status: 'open',
              },
            );
          }

          /*
           * PT SESSION
           */
          if (newTrainerSlotId) {

            if (booking.type !== 'pt_session') {
              throw new BadRequestException(
                'Trainer slots can only be used for PT sessions',
              );
            }

            const newSlot =
              await manager
                .createQueryBuilder(
                  TrainerSlot,
                  'slot',
                )
                .setLock(
                  'pessimistic_write',
                )
                .where(
                  'slot.id = :slotId',
                  {
                    slotId:
                      newTrainerSlotId,
                  },
                )
                .andWhere(
                  'slot.status = :status',
                  {
                    status: 'open',
                  },
                )
                .getOne();

            if (!newSlot) {
              throw new ConflictException(
                'The new trainer slot is not available',
              );
            }

            /*
             * Package bookings are locked to
             * their original trainer.
             */
            if (
              booking.sourceType === 'package'
              &&
              newSlot.trainerId !==
              booking.trainerId
            ) {

              throw new ConflictException(
                'A PT package booking must remain with its assigned trainer',
              );
            }

            newTrainerId =
              newSlot.trainerId;

            newSlot.status =
              'booked';

            await manager.save(
              TrainerSlot,
              newSlot,
            );
          }

          /*
           * CLASS SESSION
           */
          if (newClassSessionId) {

            if (booking.type !== 'class') {
              throw new BadRequestException(
                'Class sessions can only be used for class bookings',
              );
            }

            const newSession =
              await manager.findOne(
                ClassSession,
                {
                  where: {
                    id:
                      newClassSessionId,
                  },
                  relations: [
                    'class',
                    'bookings',
                  ],
                },
              );

            if (!newSession) {
              throw new BadRequestException(
                'New class session not found',
              );
            }

            const confirmedCount =
              newSession.bookings.filter(
                (b) =>
                  b.status ===
                  'confirmed',
              ).length;

            if (
              confirmedCount >=
              newSession.class.capacity
            ) {
              throw new ConflictException(
                'The new class session is full',
              );
            }

            newTrainerId =
              newSession.trainerId;
          }

          /*
           * Create the new booking.
           */
          return manager.save(
            manager.create(
              Booking,
              {
                customerId:
                  booking.customerId,

                type:
                  booking.type,

                classSessionId:
                  newClassSessionId ??
                  null,

                trainerSlotId:
                  newTrainerSlotId ??
                  null,

                status:
                  'confirmed',

                trainerId:
                  newTrainerId,

                sourceType:
                  booking.sourceType,

                sourceId:
                  booking.sourceId,
              },
            ),
          );
        },
      );

    await this.events.publish(
      'SessionRescheduled',
      {
        oldBookingId:
          bookingId,

        newBookingId:
          newBooking.id,
      },
    );

    return newBooking;
  }


  async updateClass(classId: string, dto: UpdateClassDto) {
    const existing = await this.classRepo.findOne({ where: { id: classId } });
    if (!existing) throw new BadRequestException('Class not found');

    await this.classRepo.update(classId, dto);
    return this.classRepo.findOne({ where: { id: classId } });
  }

  async getFreePtAvailability(date?: string) {
    const query =
      this.slotRepo
        .createQueryBuilder('slot')
        .where('slot.status = :status', {
          status: 'open',
        })
        .andWhere('slot.start_time > NOW()');

    if (date) {
      query.andWhere(
        'DATE(slot.start_time) = :date',
        { date },
      );
    }

    const slots = await query
      .orderBy('slot.start_time', 'ASC')
      .getMany();

    // Group slots by time.
    // We don't expose trainers to the customer.
    const grouped = new Map<
      string,
      {
        startTime: Date;
        endTime: Date;
      }
    >();

    for (const slot of slots) {
      const key =
        `${slot.startTime.toISOString()}_${slot.endTime.toISOString()}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    return Array.from(grouped.values());
  }

  private async assignTrainerForFreeSlot(
    manager: any,
    startTime: Date,
    endTime: Date,
  ): Promise<TrainerSlot> {

    const slot = await manager
      .createQueryBuilder(TrainerSlot, 'slot')
      .setLock('pessimistic_write')
      .where('slot.status = :status', {
        status: 'open',
      })
      .andWhere(
        'slot.start_time = :startTime',
        { startTime },
      )
      .andWhere(
        'slot.end_time = :endTime',
        { endTime },
      )
      .orderBy('slot.start_time', 'ASC')
      .getOne();

    if (!slot) {
      throw new ConflictException(
        'No trainer is available at this time',
      );
    }

    return slot;
  }


}