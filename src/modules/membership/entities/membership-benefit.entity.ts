import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';

import { MembershipPlan } from './membership-plan.entity';
import { MembershipBenefitType } from '../enum/membership-benefit-type.enum';


@Entity('membership_benefits')
export class MembershipBenefit {

  @PrimaryGeneratedColumn()
  id: number;


  @ManyToOne(
    () => MembershipPlan,
    (plan) => plan.benefits,
    {
      onDelete: 'CASCADE',
    },
  )
  plan: MembershipPlan;


  @Column({
    type: 'enum',
    enum: MembershipBenefitType,
  })
  benefitName: MembershipBenefitType;


  @Column()
  benefitValue: number;
}
