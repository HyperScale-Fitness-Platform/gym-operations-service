import { IsDateString } from 'class-validator';

export class CreateTrainerSlotDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}