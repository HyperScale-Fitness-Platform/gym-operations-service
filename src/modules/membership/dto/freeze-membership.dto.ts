import { IsDateString, IsInt, Min } from 'class-validator';

export class FreezeMembershipDto {
 @IsDateString()
 startDate: string;

 @IsDateString()
 endDate: string;

}