import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { MembershipPlan } from './membership-plan.entity';
import { MembershipStatus } from '../enum/membership-status.enum';
import { CustomerBenefit } from './customer-benefit.entity';
import { MembershipFreeze } from './membership-freeze.entity';


@Entity('memberships')
export class Membership {

    @PrimaryGeneratedColumn()
    id: number;


    @Column()
    customerId: string;


    @ManyToOne(() => MembershipPlan)
    @JoinColumn({ name: 'plan_id' })
    plan: MembershipPlan;


    @Column()
    startDate: Date;


    @Column()
    endDate: Date;


    @Column({
        type: 'enum',
        enum: MembershipStatus,
        default: MembershipStatus.ACTIVE,
    })
    status: MembershipStatus;


    @Column({
        default: 0,
    })
    freezesUsed: number;


    @CreateDateColumn()
    createdAt: Date;


    @UpdateDateColumn()
    updatedAt: Date;
    @OneToMany(
        () => CustomerBenefit,
        benefit => benefit.membership
    )
    benefits: CustomerBenefit[];


    @OneToMany(
        () => MembershipFreeze,
        freeze => freeze.membership
    )
    freezes: MembershipFreeze[];
}