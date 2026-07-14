import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MembershipService } from '../membership.service';

@Injectable()
export class MembershipExpirationJob {

  private readonly logger = new Logger(
    MembershipExpirationJob.name,
  );


  constructor(
    private readonly membershipService: MembershipService,
  ) {}


  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleMembershipExpiration() {

    this.logger.log(
      'Checking expired memberships...',
    );


    const updatedCount =
      await this.membershipService.expireMemberships();


    this.logger.log(
      `${updatedCount} memberships expired`,
    );
  }
}