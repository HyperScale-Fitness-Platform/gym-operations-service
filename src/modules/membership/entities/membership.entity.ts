import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { MembershipPlan } from './membership-plan.entity';
import { MembershipStatus } from '../enum/membership-status.enum';


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
}