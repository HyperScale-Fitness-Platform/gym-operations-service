import { IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  customerId: string;
}