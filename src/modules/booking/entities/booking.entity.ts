import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { ClassSession } from './class-session.entity';
import { TrainerSlot } from './trainer-slot.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'class_session_id', nullable: true })
  classSessionId: string | null;

  @Column({ name: 'trainer_slot_id', nullable: true })
  trainerSlotId: string | null;

  @Column()
  type: string;

  @Column({ default: 'confirmed' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => ClassSession, (session) => session.bookings, { nullable: true })
  @JoinColumn({ name: 'class_session_id' })
  classSession: ClassSession | null;

  @ManyToOne(() => TrainerSlot, (slot) => slot.bookings, { nullable: true })
  @JoinColumn({ name: 'trainer_slot_id' })
  trainerSlot: TrainerSlot | null;
}