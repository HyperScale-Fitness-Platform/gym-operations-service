import { Entity,PrimaryGeneratedColumn,Column,CreateDateColumn,UpdateDateColumn,OneToMany} from 'typeorm';
import { MembershipBenefit } from './membership-benefit.entity';

@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  name: string;

  @Column('decimal')
  price: number;

  @Column()
  durationInDays: number;

  @Column()
  maxFreezes: number;

  @Column({
    default: true,
  })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => MembershipBenefit,
    (benefit) => benefit.plan,
    )
    benefits: MembershipBenefit[];
}