import { IsUUID, IsOptional } from 'class-validator';

export class RescheduleBookingDto {
  @IsOptional()
  @IsUUID()
  newClassSessionId?: string;

  @IsOptional()
  @IsUUID()
  newTrainerSlotId?: string;
}