import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipService } from './membership.service';
import { MembershipPlan } from './entities/membership-plan.entity';
import { MembershipController } from './membership.controller';
import { Membership } from './entities/membership.entity';
import { MembershipFreeze } from './entities/membership-freeze.entity';
import { MembershipFreezeJob } from './jobs/membership-freeze.job';
import {MembershipExpirationJob} from './jobs/membership-expiration.job';
import { MembershipBenefit } from './entities/membership-benefit.entity';
import { CustomerBenefit } from './entities/customer-benefit.entity';
import { PtPackage } from './entities/pt-package.entity';
import { EventPublisher } from 'src/events/publishers';

@Module({
  imports:[TypeOrmModule.forFeature([MembershipPlan,Membership,MembershipFreeze,MembershipBenefit,CustomerBenefit, PtPackage])],
  controllers:[MembershipController],
  providers: [MembershipService,MembershipFreezeJob,MembershipExpirationJob,EventPublisher],
  exports: [MembershipService,EventPublisher],
})
export class MembershipModule {}