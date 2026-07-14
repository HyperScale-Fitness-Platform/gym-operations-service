import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { FreezeMembershipDto } from './dto/freeze-membership.dto';
import { SubscribeMembershipDto } from './dto/subscribe-membership.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { CreatePtPackageDto } from './dto/create-pt-package.dto';

@Controller()
export class MembershipController {
    constructor(
        private readonly membershipService: MembershipService,
    ) { }


    @Post('plans')
    createPlan(
        @Body() dto: CreatePlanDto,
    ) {
        return this.membershipService.createPlan(dto);
    }
    @Get('membership/plans')
    findAllPlans() {
        return this.membershipService.findAllPlans();
    }
    @Get('plans/:id')
    getPlanById(
        @Param('id') id: number,
    ) {
        return this.membershipService.getPlanById(id);
    }
    @Post('plans/:id/benefits')
    addBenefit(
        @Param('id') planId: number,
        @Body() dto: CreateBenefitDto,
    ) {
        return this.membershipService.addBenefit(
            planId,
            dto,
        );
    }
    @Post('memberships/subscribe')
    subscribe(
        @Body() dto: SubscribeMembershipDto,
    ) {
        return this.membershipService.subscribe(dto);
    }

    @Get('customers/:id/membership')
    getCustomerMembership(
        @Param('id') customerId: string,
    ) {
        return this.membershipService.getCustomerMembership(customerId);
    }

    @Post('memberships/:id/freeze')
    freezeMembership(
        @Param('id') membershipId: number,
        @Body() dto: FreezeMembershipDto,
    ) {
        return this.membershipService.freezeMembership(
            membershipId,
            dto.days,
        );
    }
    @Post('memberships/:id/unfreeze')
    unfreezeMembership(
        @Param('id') membershipId: number,
    ) {
        return this.membershipService.unfreezeMembership(membershipId);
    }



@Get('customers/:id/pt-sessions/check')
checkPtSessions(
  @Param('id') customerId: string,
) {
  return this.membershipService.checkPtSessionsAvailable(
    customerId,
  );
}



@Post('customers/:id/pt-sessions/deduct')
deductPtSession(
  @Param('id') customerId: string,
) {
  return this.membershipService.deductPtSession(
    customerId,
  );
}


@Post('customers/:id/pt-sessions/refund')
refundPtSession(
  @Param('id') customerId: string,
) {
  return this.membershipService.refundPtSession(
    customerId,
  );
}

@Post('pt-packages/purchase')
purchasePackage(
 @Body() dto:CreatePtPackageDto
){

 return this.membershipService.purchasePackage(dto);

}

@Get('pt-packages/types')
getPackageTypes() {
  return this.membershipService.getPackageTypes();
}

@Get('customers/:id/pt-packages')
getCustomerPackages(
  @Param('id') customerId:string,
){

  return this.membershipService.getCustomerPackages(customerId);

}

@Get('pt-packages/:id/sessions/check')
checkPackageSessions(
  @Param('id') packageId: string,
) {
  return this.membershipService.checkPackageSessionsAvailable(
    packageId,
  );
}

@Post('pt-packages/:id/sessions/deduct')
deductPackageSession(
  @Param('id') packageId: string,
) {
  return this.membershipService.deductPackageSession(
    packageId,
  );
}

@Post('pt-packages/:id/sessions/refund')
refundPackageSession(
  @Param('id') packageId: string,
) {
  return this.membershipService.refundPackageSession(
    packageId,
  );
}

@Get('pt-packages/:id/trainer')
getPackageTrainer(
  @Param('id') packageId: string,
) {
  return this.membershipService.getPackageTrainerId(
    packageId,
  );
}

}