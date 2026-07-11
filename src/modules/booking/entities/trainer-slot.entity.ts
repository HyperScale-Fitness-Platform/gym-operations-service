import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { Booking } from './booking.entity';

@Entity('trainer_slots')
export class TrainerSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'trainer_id' })
  trainerId: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Index()
  @Column({ default: 'open' })
  status: string;

  @OneToMany(() => Booking, (booking) => booking.trainerSlot)
  bookings: Booking[];
}