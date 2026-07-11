import { IsUUID, IsDateString } from 'class-validator';

export class CreateClassSessionDto {
  @IsUUID()
  trainerId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}