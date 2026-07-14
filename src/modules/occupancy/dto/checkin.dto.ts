import { IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  customerId: string;
}