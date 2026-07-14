import {
  IsEnum,
  IsNumber,
  IsPositive,
} from 'class-validator';

import { MembershipBenefitType } from '../enum/membership-benefit-type.enum';


export class CreateBenefitDto {


  @IsEnum(MembershipBenefitType)
  benefitName: MembershipBenefitType;


  @IsNumber()
  @IsPositive()
  benefitValue: number;

}