import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Membership } from './membership.entity';


@Entity('membership_freezes')
export class MembershipFreeze {

  @PrimaryGeneratedColumn()
  id: number;


  @ManyToOne(
    () => Membership,
    {
      onDelete: 'CASCADE'
    }
  )
  @JoinColumn({ name: 'membership_id' })
  membership: Membership;


  @Column()
  startDate: Date;


  @Column()
  endDate: Date;


  @CreateDateColumn()
  createdAt: Date;

}