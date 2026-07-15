import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
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
import { PtPackageStatus } from './enum/pt-package-status.enum';
import { CreatePtPackageDto } from './dto/create-pt-package.dto';


// STUB — your friend (Person 2) replaces the bodies of these functions
// with real Prisma/TypeORM queries against the memberships and pt_packages
// tables. Booking module calls these and only these — keep this the shared
// contract, don't let Booking reach into Membership's other internals.
//
// Agreed signatures (do not change without telling Person 1 / Booking owner):
//
// -- Free membership-included PT sessions (any trainer) --
//   checkPtSessionsAvailable(customerId: string): Promise<boolean>
//   deductPtSession(customerId: string): Promise<void>
//   refundPtSession(customerId: string): Promise<void>
//
// -- Paid PT packages (locked to one specific trainer) --
//   checkPackageSessionsAvailable(packageId: string): Promise<boolean>
//   deductPackageSession(packageId: string): Promise<void>
//   refundPackageSession(packageId: string): Promise<void>
//   getPackageTrainerId(packageId: string): Promise<string>

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
  ) { }


  async createPlan(
  dto: CreatePlanDto,
) {

  const existingPlan =
    await this.membershipPlanRepository.findOne({
      where:{
        name:dto.name,
      },
    });


  if(existingPlan){
    throw new ConflictException(
      'Plan already exists',
    );
  }


  const plan =
    this.membershipPlanRepository.create({

      name:dto.name,

      price:dto.price,

      durationInDays:dto.durationInDays,

      maxFreezes:dto.maxFreezes,

      isActive:true,

    });


  return this.membershipPlanRepository.save(plan);

}

async getPlanById(
  id:number,
){

  const plan =
    await this.membershipPlanRepository.findOne({

      where:{
        id,
      },

      relations:{
        benefits:true,
      },

    });


  if(!plan){
    throw new NotFoundException(
      'Plan not found',
    );
  }


  return plan;

}
async addBenefit(
  planId:number,
  dto:CreateBenefitDto,
){

  const plan =
    await this.membershipPlanRepository.findOne({

      where:{
        id:planId,
      },

    });


  if(!plan){
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

  async findAllPlans() {
    return this.membershipPlanRepository.find({
      where: {
        isActive: true,
      },
      order: {
        price: 'ASC',
      },
    });
  }
  async subscribe(dto: SubscribeMembershipDto) {
    const {
      customerId,
      planId,
    } = dto;

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
        status: MembershipStatus.ACTIVE,
        freezesUsed: 0,
      });

    const savedMembership =
      await this.membershipRepository.save(membership);

    for (const benefit of plan.benefits) {

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

    return savedMembership;
  }

  async getCustomerMembership(customerId: string) {

    const membership =
      await this.membershipRepository.findOne({
        where: {
          customerId,
        },
        relations: {
          plan: true,
        },
      });


    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async freezeMembership(
    membershipId: number,
    days: number,
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


    if (
      membership.freezesUsed >= membership.plan.maxFreezes
    ) {
      throw new BadRequestException('Freeze limit reached');
    }


    const startDate = new Date();


    const endDate = new Date();

    endDate.setDate(
      startDate.getDate() + days,
    );


    // extend membership expiration
    membership.endDate.setDate(
      membership.endDate.getDate() + days,
    );


    membership.status = MembershipStatus.FROZEN;

    membership.freezesUsed++;


    await this.membershipRepository.save(
      membership,
    );


    const freeze =
      this.membershipFreezeRepository.create({

        membership,

        startDate,

        endDate,

      });


    return this.membershipFreezeRepository.save(
      freeze,
    );
  }

  async activateExpiredMemberships() {

    const freezes =
      await this.membershipFreezeRepository.find({
        relations: {
          membership: true,
        },
      });


    const now = new Date();


    for (const freeze of freezes) {


      if (
        freeze.endDate <= now &&
        freeze.membership.status === MembershipStatus.FROZEN
      ) {

        freeze.membership.status = MembershipStatus.ACTIVE;


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
      throw new NotFoundException('Membership not found');
    }


    if (membership.status !== MembershipStatus.FROZEN) {
      throw new BadRequestException('Membership is not frozen');
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
      throw new NotFoundException('Freeze record not found');
    }



    const today = new Date();


    const remainingDays =
      Math.ceil(
        (
          freeze.endDate.getTime()
          -
          today.getTime()
        )
        /
        (1000 * 60 * 60 * 24)
      );



    if (remainingDays > 0) {

      membership.endDate.setDate(
        membership.endDate.getDate()
        -
        remainingDays
      );

    }



    membership.status = MembershipStatus.ACTIVE;



    freeze.endDate = today;



    await this.membershipRepository.save(
      membership
    );


    await this.membershipFreezeRepository.save(
      freeze
    );


    return membership;

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
 dto:CreatePtPackageDto
){

 let sessionsTotal:number;


 switch(dto.packageType){

  case '20':
    sessionsTotal=20;
    break;


  case '40':
    sessionsTotal=40;
    break;


  case '60':
    sessionsTotal=60;
    break;


  default:
    throw new BadRequestException(
      'Invalid package type'
    );

 }


 const packageEntity =
 this.ptPackageRepository.create({

   customerId:dto.customerId,

   trainerId:dto.trainerId,

   packageType:dto.packageType,

   sessionsTotal,

   sessionsUsed:0,

   status:
   PtPackageStatus.PENDING_PAYMENT,

 });


 return this.ptPackageRepository.save(
   packageEntity
 );

}


async getPackageTypes() {

  return [
    {
      type: '20',
      sessions: 20,
    },
    {
      type: '40',
      sessions: 40,
    },
    {
      type: '60',
      sessions: 60,
    },
  ];

}
async getCustomerPackages(
  customerId:string,
){

  return this.ptPackageRepository.find({

    where:{
      customerId,
    },

    order:{
      purchasedAt:'DESC',
    },

  });

}

private async getActivePackage(
  packageId:string,
):Promise<PtPackage>{


 const ptPackage =
 await this.ptPackageRepository.findOne({

   where:{
     id:packageId,
     status:PtPackageStatus.ACTIVE,
   },

 });


 if(!ptPackage){

   throw new NotFoundException(
     'Active package not found',
   );

 }


 return ptPackage;

}

async checkPackageSessionsAvailable(
 packageId:string,
):Promise<boolean>{


 const ptPackage =
 await this.getActivePackage(packageId);


 return (
   ptPackage.sessionsUsed <
   ptPackage.sessionsTotal
 );

}
async deductPackageSession(
 packageId:string,
):Promise<void>{


 const ptPackage =
 await this.getActivePackage(packageId);


 if(
   ptPackage.sessionsUsed >=
   ptPackage.sessionsTotal
 ){

   throw new BadRequestException(
    'No package sessions remaining',
   );

 }


 ptPackage.sessionsUsed++;


 if(
   ptPackage.sessionsUsed ===
   ptPackage.sessionsTotal
 ){

   ptPackage.status =
    PtPackageStatus.EXHAUSTED;

 }


 await this.ptPackageRepository.save(
   ptPackage,
 );

}
async refundPackageSession(
 packageId:string,
):Promise<void>{


 const ptPackage =
 await this.ptPackageRepository.findOne({

   where:{
     id:packageId,
   },

 });


 if(!ptPackage){

   throw new NotFoundException(
     'Package not found',
   );

 }


 if(
   ptPackage.sessionsUsed > 0
 ){

   ptPackage.sessionsUsed--;

 }


 if(
   ptPackage.status ===
   PtPackageStatus.EXHAUSTED
 ){

   ptPackage.status =
    PtPackageStatus.ACTIVE;

 }


 await this.ptPackageRepository.save(
   ptPackage,
 );

}
async getPackageTrainerId(
 packageId:string,
):Promise<string>{


 const ptPackage =
 await this.ptPackageRepository.findOne({

   where:{
     id:packageId,
   },

 });


 if(!ptPackage){

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
}
