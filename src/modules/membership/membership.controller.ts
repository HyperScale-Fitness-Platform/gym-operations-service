import { Controller, Get, Post, Delete, Body, Param, Headers } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { FreezeMembershipDto } from './dto/freeze-membership.dto';
import { SubscribeMembershipDto } from './dto/subscribe-membership.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { CreatePtPackageDto } from './dto/create-pt-package.dto';
import { CreatePtSessionDto } from './dto/create-pt-session.dto';

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
    @Get('admin/plans')
    findAllPlansAdmin() {

        return this.membershipService.findAllPlansAdmin();

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
    @Delete('plans/:id')
    deletePlan(
        @Param('id') id: number,
    ) {
        return this.membershipService.deletePlan(id);
    }
    @Post('memberships/subscribe')
    subscribe(
        @Body() dto: SubscribeMembershipDto,
        @Headers('user-id') customerId: string,
    ) {

        return this.membershipService.subscribe(
            customerId,
            dto.planId
        );

    }

    @Get('membership/current')
    getCustomerMembership(
        @Headers('user-id') customerId: string
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
            dto.startDate,
            dto.endDate
        );
    }
    @Post('memberships/:id/unfreeze')
    unfreezeMembership(
        @Param('id') membershipId: number,
    ) {
        return this.membershipService.unfreezeMembership(membershipId);
    }

    @Post('memberships/:id/cancel-freeze/:freezeId')
    cancelFreeze(
        @Param('id') membershipId: number,
        @Param('freezeId') freezeId: number
    ) {
        return this.membershipService.cancelFreeze(
            membershipId,
            freezeId
        );
    }

    @Post('pt-packages/purchase')
    purchasePackage(
        @Body() dto: CreatePtPackageDto,
        @Headers('user-id') customerId: string,
    ) {

        return this.membershipService.purchasePackage({ ...dto, customerId });

    }

    @Get('pt-sessions')
    getSessionTypes() {
        return this.membershipService.getPackageTypes();
    }

    @Post('pt-sessions')
    createPtSession(
        @Body() dto: CreatePtSessionDto,
    ) {
        return this.membershipService.createPtSession(dto);
    }

    @Get('pt-packages/types')
    getPackageTypes() {
        return this.membershipService.getPackageTypes();
    }

    @Get('customers/:id/pt-packages')
    getCustomerPackages(
        @Param('id') customerId: string,
    ) {

        return this.membershipService.getCustomerPackages(customerId);

    }

    @Delete('pt-packages/:id')
    deletePendingPackage(
        @Param('id') packageId: string,
    ) {

        return this.membershipService.deletePendingPackage(packageId);

    }
}