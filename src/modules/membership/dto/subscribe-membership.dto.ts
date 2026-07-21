import { IsInt } from "class-validator";

export class SubscribeMembershipDto {

  @IsInt()
  planId: number;

}