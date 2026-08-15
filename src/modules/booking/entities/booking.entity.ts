import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { ClassSession } from './class-session.entity';
import { TrainerSlot } from './trainer-slot.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({
    name: 'class_session_id',
    type: 'uuid',
    nullable: true,
  })
  classSessionId: string | null;

  @Column({
    name: 'trainer_slot_id',
    type: 'uuid',
    nullable: true,
  })
  trainerSlotId: string | null;

  // Trainer assigned to the booking.
  // For package: known from package.
  // For free/membership: assigned by backend.
  @Column({
    name: 'trainer_id',
    type: 'uuid',
    nullable: true,
  })
  trainerId: string | null;

  @Column()
  type: string;

  @Column({ default: 'confirmed' })
  status: string;

  // package | free
  @Column({
    name: 'source_type',
    nullable: true,
    type: 'varchar',
  })
  sourceType: string | null;

  // package ID for package bookings.
  // null for membership/free-credit bookings.
  @Column({
    name: 'source_id',
    type: 'uuid',
    nullable: true,
  })
  sourceId: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @ManyToOne(
    () => ClassSession,
    (session) => session.bookings,
    { nullable: true },
  )
  @JoinColumn({
    name: 'class_session_id',
  })
  classSession: ClassSession | null;

  @ManyToOne(
    () => TrainerSlot,
    (slot) => slot.bookings,
    { nullable: true },
  )
  @JoinColumn({
    name: 'trainer_slot_id',
  })
  trainerSlot: TrainerSlot | null;
}