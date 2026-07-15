import { IsInt, Min } from 'class-validator';

export class FreezeMembershipDto {
  @IsInt()
  @Min(1)
  days: number;
}