import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { Membership } from './entities/membership.entity';
import { MembershipFreeze } from './entities/membership-freeze.entity';
import { SubscribeMembershipDto } from './dto/subscribe-membership.dto';
import { MembershipStatus } from './enum/membership-status.enum';
import { CustomerBenefit } from './entities/customer-benefit.entity';
import { MembershipBenefitType } from './enum/membership-benefit-type.enum';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { MembershipBenefit } from './entities/membership-benefit.entity';
import { PtPackage } from './entities/pt-package.entity';
import { PtSession } from './entities/pt-session.entity';
import { PtPackageStatus } from './enum/pt-package-status.enum';
import { CreatePtPackageDto } from './dto/create-pt-package.dto';
import { CreatePtSessionDto } from './dto/create-pt-session.dto';
import { EventPublisher } from 'src/events/publishers';

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(MembershipPlan)
    private readonly membershipPlanRepository: Repository<MembershipPlan>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipFreeze)
    private readonly membershipFreezeRepository: Repository<MembershipFreeze>,
    @InjectRepository(CustomerBenefit)
    private readonly customerBenefitRepository: Repository<CustomerBenefit>,
    @InjectRepository(MembershipBenefit)
    private readonly membershipBenefitRepository: Repository<MembershipBenefit>,
    @InjectRepository(PtPackage)
    private readonly ptPackageRepository:
      Repository<PtPackage>,
    @InjectRepository(PtSession)
    private readonly ptSessionRepository:
      Repository<PtSession>,
    private events: EventPublisher
  ) { }

  private normalizeDate(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);

    return result;
  }

  private calculateFreezeDays(
    startDate: Date,
    endDate: Date,
  ): number {

    return (
      Math.ceil(
        (
          this.normalizeDate(endDate).getTime() -
          this.normalizeDate(startDate).getTime()
        ) /
        (1000 * 60 * 60 * 24)
      ) + 1
    );

  }

  private restoreFreezeDays(
    membership: Membership,
    days: number,
  ): void {

    membership.freezeDaysUsed -= days;

    if (membership.freezeDaysUsed < 0) {
      membership.freezeDaysUsed = 0;
    }

  }

  private updateMembershipStatus(
    membership: Membership,
  ): void {

    const today =
      this.normalizeDate(new Date());

    const endDate =
      this.normalizeDate(
        membership.endDate
      );

    membership.status =
      endDate < today
        ? MembershipStatus.EXPIRED
        : MembershipStatus.ACTIVE;

  }

  async createPlan(
    dto: CreatePlanDto,
  ) {

    const existingPlan =
      await this.membershipPlanRepository.findOne({
        where: {
          name: dto.name,
        },
      });

    if (existingPlan) {
      throw new ConflictException(
        'Plan already exists',
      );
    }

    const plan =
      this.membershipPlanRepository.create({

        name: dto.name,

        price: dto.price,

        durationInDays: dto.durationInDays,

        freezeDays: dto.freezeDays,

        isActive: true,

      });

    return this.membershipPlanRepository.save(plan);
  }

  async getPlanById(
    id: number,
  ) {
    const plan =
      await this.membershipPlanRepository.findOne({

        where: {
          id,
        },

        relations: {
          benefits: true,
        },

      });

    if (!plan) {
      throw new NotFoundException(
        'Plan not found',
      );
    }

    return plan;

  }

  async addBenefit(
    planId: number,
    dto: CreateBenefitDto,
  ) {
    const plan =
      await this.membershipPlanRepository.findOne({

        where: {
          id: planId,
        },

      });

    if (!plan) {
      throw new NotFoundException(
        'Plan not found',
      );
    }

    const benefit =
      this.membershipBenefitRepository.create({

        plan,

        benefitName:
          dto.benefitName,

        benefitValue:
          dto.benefitValue,

      });

    return this.membershipBenefitRepository.save(
      benefit,
    );

  }

  async deletePlan(planId: number) {

    const plan =
      await this.membershipPlanRepository.findOne({
        where: {
          id: planId,
        },
      });

    if (!plan) {
      throw new NotFoundException(
        'Plan not found',
      );
    }

    // Cancel every membership subscribed to this plan. This cascades
    // to the customers' benefits (PT credits) and freezes via FK, so the
    // customers are left with no plan -- exactly what the admin expects.
    const memberships =
      await this.membershipRepository.find({
        where: {
          plan: {
            id: planId,
          },
        },
      });

    for (const membership of memberships) {
      await this.membershipRepository.remove(
        membership,
      );
    }

    // Soft-delete the plan so it disappears from admin + customer lists
    // and can no longer be subscribed to.
    plan.isActive = false;

    await this.membershipPlanRepository.save(
      plan,
    );

    return {
      message: 'Plan deleted',
      removedMemberships:
        memberships.length,
    };

  }

  async findAllPlans() {
    return this.membershipPlanRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        benefits: true,
      },
      order: {
        price: 'ASC',
      },
    });
  }

  async findAllPlansAdmin() {

    return this.membershipPlanRepository.find({
      where: {
        isActive: true,
      },
      relations: {
        benefits: true,
      },
      order: {
        price: 'ASC',
      },
    });

  }

  async subscribe(
    customerId: string,
    planId: number
  ) {

    const plan =
      await this.membershipPlanRepository.findOne({
        where: {
          id: planId,
          isActive: true,
        },
        relations: {
          benefits: true,
        },
      });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const existingMembership =
      await this.membershipRepository.findOne({
        where: {
          customerId,
        },
        order: {
          createdAt: 'DESC',
        },
      });

    if (
      existingMembership &&
      (
        existingMembership.status === MembershipStatus.ACTIVE ||
        existingMembership.status === MembershipStatus.FROZEN
      )
    ) {
      throw new ConflictException(
        'Customer already has an active membership',
      );
    }

    // A previous subscription was abandoned before payment was
    // completed — drop it and start fresh so the payment reference
    // stays unique for the new membership row.
    if (
      existingMembership &&
      existingMembership.status === MembershipStatus.PENDING_PAYMENT
    ) {
      await this.membershipRepository.remove(existingMembership);
    }

    const startDate = new Date();

    const endDate = new Date();
    endDate.setDate(
      startDate.getDate() + plan.durationInDays,
    );

    const membership =
      this.membershipRepository.create({
        customerId,
        plan,
        startDate,
        endDate,
        status: MembershipStatus.PENDING_PAYMENT,
        freezeDaysUsed: 0,
      });

    const savedMembership =
      await this.membershipRepository.save(membership);

    // Initiate the Stripe PaymentIntent via the payment service.
    // The membership is only activated once the payment service
    // confirms the charge through the PAYMENT_STATUS Kafka event.
    const paymentServiceUrl =
      process.env.PAYMENT_SERVICE_URL || 'http://localhost:4004';

    const paymentResponse = await fetch(
      `${paymentServiceUrl}/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': customerId,
        },
        body: JSON.stringify({
          referenceType: 'membership',
          referenceId: String(savedMembership.id),
          amountCents: Math.round(plan.price * 100),
          currency: 'egp',
        }),
      },
    );

    if (!paymentResponse.ok) {
      await this.membershipRepository.remove(savedMembership);
      throw new BadRequestException(
        'Failed to initiate payment',
      );
    }

    const paymentData = await paymentResponse.json();

    return {
      membershipId: savedMembership.id,
      clientSecret: paymentData.clientSecret,
    };
  }

  async activateMembership(
    membershipId: number,
  ): Promise<void> {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          id: membershipId,
        },
        relations: {
          plan: {
            benefits: true,
          },
        },
      });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.status === MembershipStatus.ACTIVE) {
      return; // already activated
    }

    membership.status = MembershipStatus.ACTIVE;

    const savedMembership =
      await this.membershipRepository.save(membership);

    for (const benefit of membership.plan.benefits) {

      const customerBenefit =
        this.customerBenefitRepository.create({

          membership: savedMembership,

          benefitName: benefit.benefitName,

          totalValue: benefit.benefitValue,

          remainingValue: benefit.benefitValue,

        });

      await this.customerBenefitRepository.save(
        customerBenefit,
      );
    }

  }

  async handleMembershipPaymentStatus(
    referenceId: string,
    status: string,
  ): Promise<void> {

    const membershipId = Number(referenceId);

    if (status === 'succeeded') {
      await this.activateMembership(membershipId);
    }

    if (status === 'failed') {
      // Same reasoning as handlePaymentStatus: a payment_intent.payment_failed
      // event usually precedes the customer retrying and succeeding. Do not
      // delete the pending membership — keep it so the later 'succeeded' event
      // activates it, or the customer can resume/delete it from the UI.
      console.warn(
        `[handleMembershipPaymentStatus] Payment failed for membership ${membershipId} — keeping it pending so a retry can succeed`,
      );
    }

  }

  async getCustomerMembership(customerId: string) {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          customerId,
        },
        relations: {
          plan: {
            benefits: true,
          },
          freezes: true,
        },
      });
    if (!membership) {
      return null;
    }
    return {
      ...membership,

      freezeDaysAllowed:
        membership.plan.freezeDays,

      freezeDaysUsed:
        membership.freezeDaysUsed,

      freezeDaysRemaining:
        membership.plan.freezeDays -
        membership.freezeDaysUsed,
    };
  }

  async freezeMembership(
    membershipId: number, startDate: string, endDate: string,
  ) {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          id: membershipId,
        },
        relations: {
          plan: true,
        },
      });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Membership is not active');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlappingFreeze =
      await this.membershipFreezeRepository.findOne({
        where: {
          membership: {
            id: membershipId,
          },
          startDate: LessThanOrEqual(end),
          endDate: MoreThanOrEqual(start),
        },
      });

    if (overlappingFreeze) {
      throw new BadRequestException(
        'This freeze overlaps an existing freeze period',
      );
    }

    if (end < start) {
      throw new BadRequestException(
        'End date must be after start date',
      );
    }

    const daysRequested =
      this.calculateFreezeDays(
        start,
        end
      );

    const remainingDays =
      membership.plan.freezeDays -
      membership.freezeDaysUsed;

    if (daysRequested > remainingDays) {
      throw new BadRequestException('Not enough freeze days remaining');
    }

    const oldEndDate =
      new Date(membership.endDate);

    // extend membership expiration once
    membership.endDate.setDate(
      membership.endDate.getDate() + daysRequested,
    );

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);

    if (start.getTime() === today.getTime()) {

      membership.status =
        MembershipStatus.FROZEN;

    }

    membership.freezeDaysUsed += daysRequested;

    await this.membershipRepository.save(
      membership
    );

    const freeze =
      this.membershipFreezeRepository.create({

        membership,

        startDate: start,

        endDate: end,

        daysUsed: daysRequested,

        previousEndDate: oldEndDate

      });

    return this.membershipFreezeRepository.save(
      freeze,
    );
  }

  async updateMembershipFreezeStatuses() {

    const freezes =
      await this.membershipFreezeRepository.find({
        relations: {
          membership: true,
        },
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const freeze of freezes) {

      const startDate = new Date(freeze.startDate);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(freeze.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Membership should become frozen today
      if (
        startDate.getTime() === today.getTime() &&
        freeze.membership.status === MembershipStatus.ACTIVE
      ) {

        freeze.membership.status = MembershipStatus.FROZEN;

        await this.membershipRepository.save(
          freeze.membership,
        );

        continue;
      }

      // Freeze period finished
      if (
        endDate < today &&
        freeze.membership.status === MembershipStatus.FROZEN
      ) {

        // Don't reactivate expired memberships
        if (freeze.membership.endDate < today) {
          freeze.membership.status = MembershipStatus.EXPIRED;
        } else {
          freeze.membership.status = MembershipStatus.ACTIVE;
        }

        await this.membershipRepository.save(
          freeze.membership,
        );
      }
    }
  }

  async unfreezeMembership(
    membershipId: number,
  ) {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          id: membershipId,
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Membership not found'
      );
    }

    const freeze =
      await this.membershipFreezeRepository.findOne({
        where: {
          membership: {
            id: membershipId,
          },
        },
        order: {
          createdAt: 'DESC',
        },
      });

    if (!freeze) {
      throw new NotFoundException(
        'Freeze record not found'
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate =
      new Date(freeze.startDate);

    startDate.setHours(0, 0, 0, 0);

    /*
      CASE 1:
      Freeze was scheduled but didn't start yet
  
      Example:
      freeze:
      30/07 -> 05/08
  
      today:
      26/07
  
      Remove everything
    */

    if (today < startDate) {

      membership.endDate =
        freeze.previousEndDate;

      this.restoreFreezeDays(
        membership,
        freeze.daysUsed
      );

      membership.status =
        MembershipStatus.ACTIVE;

      await this.membershipRepository.save(
        membership
      );

      await this.membershipFreezeRepository.remove(
        freeze
      );

      return {
        message:
          "Scheduled freeze cancelled successfully"
      };
    }
    /*
      CASE 2:
      Freeze started today and customer cancels today
  
      Example:
  
      Freeze:
      26/07 -> 30/07
  
      Today:
      26/07
  
      Consumed:
      0 days
  
      Return everything
    */
    if (today.getTime() === startDate.getTime()) {

      membership.endDate =
        freeze.previousEndDate;

      this.restoreFreezeDays(
        membership,
        freeze.daysUsed
      );

      membership.status =
        MembershipStatus.ACTIVE;

      await this.membershipRepository.save(
        membership
      );

      await this.membershipFreezeRepository.remove(
        freeze
      );

      return {
        message:
          "Membership unfrozen successfully"
      };

    }
    /*
      CASE 3:
      Freeze already consumed some days
  
      Example:
  
      Freeze:
      26/07 -> 30/07
  
      Today:
      28/07
  
      Used:
      3 days
    */

    const consumedDays =
      this.calculateFreezeDays(
        startDate,
        today
      );

    const unusedDays =
      freeze.daysUsed - consumedDays;

    /*
      Remove only unused extension
    */

    if (unusedDays > 0) {

      membership.endDate.setDate(
        membership.endDate.getDate()
        -
        unusedDays
      );

      membership.freezeDaysUsed -=
        unusedDays;

      if (membership.freezeDaysUsed < 0)
        membership.freezeDaysUsed = 0;

    }

    membership.status =
      MembershipStatus.ACTIVE;

    freeze.endDate =
      today;

    freeze.daysUsed =
      consumedDays;

    await this.membershipRepository.save(
      membership
    );

    await this.membershipFreezeRepository.save(
      freeze
    );

    return {
      message:
        "Membership unfrozen successfully",
      membership
    };

  }

  async cancelFreeze(
    membershipId: number,
    freezeId: number,
  ) {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          id: membershipId,
        },
      });


    if (!membership) {
      throw new NotFoundException(
        'Membership not found'
      );
    }

    const freeze =
      await this.membershipFreezeRepository.findOne({
        where: {
          id: freezeId,
          membership: {
            id: membershipId,
          },
        },
      });

    if (!freeze) {
      throw new NotFoundException(
        'Freeze record not found'
      );
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const startDate =
      new Date(freeze.startDate);

    startDate.setHours(0, 0, 0, 0);

    // only future freeze can be cancelled
    if (startDate <= today) {

      throw new BadRequestException(
        'Cannot cancel active freeze'
      );

    }

    // return membership to original expiration date

    membership.endDate =
      freeze.previousEndDate;

    this.restoreFreezeDays(
      membership,
      freeze.daysUsed
    );

    await this.membershipRepository.save(
      membership
    );

    await this.membershipFreezeRepository.remove(
      freeze
    );

    return {
      message:
        'Freeze cancelled successfully',
    };

  }

  async expireMemberships() {

    const result =
      await this.membershipRepository
        .createQueryBuilder()
        .update()
        .set({
          status: MembershipStatus.EXPIRED,
        })
        .where(
          'endDate < :now',
          {
            now: new Date(),
          },
        )
        .andWhere(
          'status = :status',
          {
            status: MembershipStatus.ACTIVE,
          },
        )
        .execute();

    return result.affected ?? 0;
  }

  private async getActiveMembership(customerId: string): Promise<Membership> {
    const membership =
      await this.membershipRepository.findOne({

        where: {
          customerId,
          status: MembershipStatus.ACTIVE,
        },

        relations: {
          plan: true,
        },

      });

    if (!membership) {
      throw new NotFoundException('No active membership found');
    }

    if (membership.endDate < new Date()) {
      throw new BadRequestException('Membership has expired');
    }

    return membership;
  }

  private async getPtBenefit(
    membershipId: number,
  ): Promise<CustomerBenefit> {

    const benefit =
      await this.customerBenefitRepository.findOne({

        where: {
          membership: {
            id: membershipId,
          },
          benefitName: MembershipBenefitType.PT_SESSIONS,
        },

        relations: {
          membership: true,
        },

      });

    if (!benefit) {
      throw new NotFoundException(
        'PT session benefit not found',
      );
    }

    return benefit;
  }

  async checkPtSessionsAvailable(
    customerId: string,
  ): Promise<boolean> {

    const membership =
      await this.getActiveMembership(customerId);

    const benefit =
      await this.getPtBenefit(membership.id);

    return benefit.remainingValue > 0;
  }

  async deductPtSession(
    customerId: string,
  ): Promise<void> {

    const membership =
      await this.getActiveMembership(customerId);

    const benefit =
      await this.getPtBenefit(membership.id);

    if (benefit.remainingValue <= 0) {
      throw new BadRequestException(
        'No PT sessions remaining',
      );
    }

    benefit.remainingValue--;

    await this.customerBenefitRepository.save(
      benefit,
    );
  }

  async refundPtSession(
    customerId: string,
  ): Promise<void> {

    const membership =
      await this.getActiveMembership(customerId);

    const benefit =
      await this.getPtBenefit(membership.id);

    if (
      benefit.remainingValue <
      benefit.totalValue
    ) {
      benefit.remainingValue++;
    }

    await this.customerBenefitRepository.save(
      benefit,
    );
  }

  async purchasePackage(
    dto: CreatePtPackageDto & { customerId: string }
  ) {

    // Look up the PT session offering from the catalog
    const session =
      await this.ptSessionRepository.findOne({
        where: { id: dto.sessionId },
      });

    if (!session) {
      throw new NotFoundException(
        'PT session offering not found',
      );
    }

    // Create package as PENDING_PAYMENT — it will only become ACTIVE
    // once the payment service confirms the charge via Kafka.
    const packageEntity =
      this.ptPackageRepository.create({

        customerId: dto.customerId,

        trainerId: dto.trainerId,

        packageType: String(session.sessions),

        sessionsTotal: session.sessions,

        sessionsUsed: 0,

        status: PtPackageStatus.PENDING_PAYMENT,

      });

    const savedPackage =
      await this.ptPackageRepository.save(packageEntity);

    // Call the payment service to create a Stripe PaymentIntent
    const paymentServiceUrl =
      process.env.PAYMENT_SERVICE_URL || 'http://localhost:4004';

    const paymentResponse = await fetch(
      `${paymentServiceUrl}/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': dto.customerId,
        },
        body: JSON.stringify({
          referenceType: 'pt_package',
          referenceId: savedPackage.id,
          amountCents: session.priceCents,
          currency: session.currency || 'egp',
        }),
      },
    );

    if (!paymentResponse.ok) {
      // Payment initiation failed — remove the pending package
      await this.ptPackageRepository.remove(savedPackage);
      throw new BadRequestException(
        'Failed to initiate payment',
      );
    }

    const paymentData = await paymentResponse.json();

    return {
      packageId: savedPackage.id,
      clientSecret: paymentData.clientSecret,
    };
  }

  async getPackageTypes() {

    return this.ptSessionRepository.find({
      order: {
        sessions: 'ASC',
      },
    });

  }

  async createPtSession(
    dto: CreatePtSessionDto,
  ) {

    const session = this.ptSessionRepository.create({
      name: dto.name,
      sessions: dto.sessions,
      priceCents: Math.round(
        dto.price * 100
      ),
      currency: 'egp',
    });

    return this.ptSessionRepository.save(session);

  }
  async getCustomerPackages(
    customerId: string,
  ) {

    return this.ptPackageRepository.find({

      where: {
        customerId,
      },

      order: {
        purchasedAt: 'DESC',
      },

    });

  }

  private async getActivePackage(
    packageId: string,
  ): Promise<PtPackage> {

    const ptPackage =
      await this.ptPackageRepository.findOne({

        where: {
          id: packageId,
          status: PtPackageStatus.ACTIVE,
        },

      });

    if (!ptPackage) {

      throw new NotFoundException(
        'Active package not found',
      );

    }

    return ptPackage;

  }

  async checkPackageSessionsAvailable(
    packageId: string,
  ): Promise<boolean> {

    const ptPackage =
      await this.getActivePackage(packageId);

    return (
      ptPackage.sessionsUsed <
      ptPackage.sessionsTotal
    );

  }
  async deductPackageSession(
    packageId: string,
  ): Promise<void> {

    const ptPackage =
      await this.getActivePackage(packageId);

    if (
      ptPackage.sessionsUsed >=
      ptPackage.sessionsTotal
    ) {

      throw new BadRequestException(
        'No package sessions remaining',
      );

    }

    ptPackage.sessionsUsed++;

    if (
      ptPackage.sessionsUsed ===
      ptPackage.sessionsTotal
    ) {

      ptPackage.status =
        PtPackageStatus.EXHAUSTED;

    }

    await this.ptPackageRepository.save(
      ptPackage,
    );

  }
  async refundPackageSession(
    packageId: string,
  ): Promise<void> {

    const ptPackage =
      await this.ptPackageRepository.findOne({

        where: {
          id: packageId,
        },

      });

    if (!ptPackage) {

      throw new NotFoundException(
        'Package not found',
      );

    }

    if (
      ptPackage.sessionsUsed > 0
    ) {

      ptPackage.sessionsUsed--;

    }

    if (
      ptPackage.status ===
      PtPackageStatus.EXHAUSTED
    ) {

      ptPackage.status =
        PtPackageStatus.ACTIVE;

    }

    await this.ptPackageRepository.save(
      ptPackage,
    );

  }
  async getPackageTrainerId(
    packageId: string,
  ): Promise<string> {


    const ptPackage =
      await this.ptPackageRepository.findOne({

        where: {
          id: packageId,
        },

      });


    if (!ptPackage) {

      throw new NotFoundException(
        'Package not found',
      );

    }

    return ptPackage.trainerId;

  }
  async checkActiveMembership(
    customerId: string,
  ): Promise<void> {
    await this.getActiveMembership(customerId);
  }

  async getBookableSources(customerId: string) {
  const packages = await this.ptPackageRepository.find({
    where: {
      customerId,
      status: PtPackageStatus.ACTIVE,
    },
    order: {
      purchasedAt: 'DESC',
    },
  });

  let freeSessions = 0;

  try {
    const membership =
      await this.getActiveMembership(customerId);

    const benefit =
      await this.getPtBenefit(membership.id);

    freeSessions = benefit.remainingValue;
  } catch {
    freeSessions = 0;
  }

  return {
    packages: packages
      .filter(
        (pkg) =>
          pkg.sessionsUsed < pkg.sessionsTotal,
      )
      .map((pkg) => ({
        id: pkg.id,
        packageType: pkg.packageType,
        trainerId: pkg.trainerId,
        sessionsTotal: pkg.sessionsTotal,
        sessionsUsed: pkg.sessionsUsed,
        remainingSessions:
          pkg.sessionsTotal -
          pkg.sessionsUsed,
        status: pkg.status,
      })),

    freeSessions,
  };
}

async getCustomerPackageForBooking(
  customerId: string,
  packageId: string,
): Promise<PtPackage> {
  const ptPackage =
    await this.ptPackageRepository.findOne({
      where: {
        id: packageId,
        customerId,
        status: PtPackageStatus.ACTIVE,
      },
    });

  if (!ptPackage) {
    throw new NotFoundException(
      'Active package not found',
    );
  }

  if (
    ptPackage.sessionsUsed >=
    ptPackage.sessionsTotal
  ) {
    throw new BadRequestException(
      'No sessions remaining in this package',
    );
  }

  return ptPackage;
}

async getPtBookingCredits(customerId: string) {

  try {

    const membership =
      await this.getActiveMembership(customerId);

    const benefit =
      await this.getPtBenefit(membership.id);

    return {
      available: benefit.remainingValue > 0,
      remaining: benefit.remainingValue,
    };

  }
  catch {

    // No active membership (e.g. plan was deleted or membership
    // expired) -- the customer simply has no free PT credits left.
    return {
      available: false,
      remaining: 0,
    };

  }
}

async activatePackage(
  packageId: string,
): Promise<void> {

  const ptPackage =
    await this.ptPackageRepository.findOne({
      where: { id: packageId },
    });

  if (!ptPackage) {
    console.warn(
      `[activatePackage] Package ${packageId} not found`,
    );
    return;
  }

  if (ptPackage.status === PtPackageStatus.ACTIVE) {
    return; // already activated
  }

  ptPackage.status = PtPackageStatus.ACTIVE;

  await this.ptPackageRepository.save(ptPackage);

  // Notify other services that the package is now active
  await this.events.publish(
    'PT_PACKAGE_PURCHASED',
    {
      ptPackageId: ptPackage.id,
      customerId: ptPackage.customerId,
      trainerId: ptPackage.trainerId,
      packageType: ptPackage.packageType,
      sessionsTotal: ptPackage.sessionsTotal,
    },
  );

  console.log(
    `[activatePackage] Package ${packageId} activated`,
  );
}

async deletePendingPackage(
  packageId: string,
): Promise<void> {

  const ptPackage =
    await this.ptPackageRepository.findOne({
      where: {
        id: packageId,
        status: PtPackageStatus.PENDING_PAYMENT,
      },
    });

  if (!ptPackage) {
    throw new NotFoundException(
      'Pending package not found',
    );
  }

  await this.ptPackageRepository.remove(ptPackage);
}

async handlePaymentStatus(
  referenceId: string,
  status: string,
): Promise<void> {

  if (status === 'succeeded') {
    await this.activatePackage(referenceId);
  }

  if (status === 'failed') {
    // Do NOT delete the package on a failed event. Stripe emits
    // payment_intent.payment_failed for a declined/aborted attempt and then a
    // separate payment_intent.succeeded once the customer retries and pays.
    // Deleting here would wipe a package the customer actually ends up paying
    // for (the later 'succeeded' event would find nothing to activate). Keep
    // the package PENDING_PAYMENT so a subsequent 'succeeded' can activate it,
    // or the customer can resume/delete it from the UI.
    console.warn(
      `[handlePaymentStatus] Payment failed for package ${referenceId} — keeping it pending so a retry can succeed`,
    );
  }
}

}