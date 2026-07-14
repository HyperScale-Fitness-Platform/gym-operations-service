import { IsInt, IsString } from 'class-validator';

export class SubscribeMembershipDto {
  @IsString()
  customerId: string;

  @IsInt()
  planId: number;
}