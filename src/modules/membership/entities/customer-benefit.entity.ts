import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';

import { Membership } from './membership.entity';
import { MembershipBenefitType } from '../enum/membership-benefit-type.enum';

@Entity('customer_benefits')
export class CustomerBenefit {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Membership, {
    onDelete: 'CASCADE',
  })
  membership: Membership;

  @Column({
    type: 'enum',
    enum: MembershipBenefitType,
  })
  benefitName: MembershipBenefitType;

  @Column()
  totalValue: number;

  @Column()
  remainingValue: number;
}