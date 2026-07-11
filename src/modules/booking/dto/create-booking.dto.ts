import { IsUUID, IsIn, ValidateIf } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  customerId: string;

  @IsIn(['class', 'pt_session'])
  type: 'class' | 'pt_session';

  @ValidateIf((dto) => dto.type === 'class')
  @IsUUID()
  classSessionId?: string;

  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsUUID()
  trainerSlotId?: string;
}