import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('occupancy')
export class Occupancy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customerId: string;

  @Column()
  checkIn: Date;

  @Column({
    nullable: true,
  })
  checkOut: Date;

  @CreateDateColumn()
  createdAt: Date;
}