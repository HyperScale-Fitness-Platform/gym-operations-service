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

  // soft reference -> profile-service, no real FK, plain column only
  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'class_session_id', type: 'uuid', nullable: true })
  classSessionId: string | null;

  @Column({ name: 'trainer_slot_id', type: 'uuid', nullable: true })
  trainerSlotId: string | null;

  @Column() // "class" | "pt_session"
  type: string;

  @Column({ default: 'confirmed' }) // "pending_payment" | "confirmed" | "cancelled" | "rescheduled"
  status: string;

  // only meaningful when type = 'pt_session'
  @Column({ default: 'membership' }) // "membership" | "package"
  sessionSource: string;

  // soft reference -> membership-service's pt_packages table, no real FK
  @Column({ name: 'pt_package_id', type: 'uuid', nullable: true })
  ptPackageId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ClassSession, (session) => session.bookings, { nullable: true })
  @JoinColumn({ name: 'class_session_id' })
  classSession: ClassSession | null;

  @ManyToOne(() => TrainerSlot, (slot) => slot.bookings, { nullable: true })
  @JoinColumn({ name: 'trainer_slot_id' })
  trainerSlot: TrainerSlot | null;
}

// Note: the partial unique index enforcing "only one active booking per
// trainer slot" (WHERE status = 'confirmed') isn't expressible via TypeORM
// decorators directly — add it as a raw migration once you run
// `typeorm migration:generate`, right after the initial table creation:
//
// CREATE UNIQUE INDEX unique_active_trainer_slot_booking
// ON bookings (trainer_slot_id)
// WHERE status = 'confirmed' AND trainer_slot_id IS NOT NULL;