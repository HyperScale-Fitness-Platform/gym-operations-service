import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MembershipService } from '../membership.service';


@Injectable()
export class MembershipFreezeJob {


constructor(
 private readonly membershipService:MembershipService
){}



@Cron('0 0 * * *')
async handleExpiredFreezes(){

 await this.membershipService.activateExpiredMemberships();

}
}