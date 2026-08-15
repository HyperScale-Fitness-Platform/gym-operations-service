import {
  IsUUID,
  IsIn,
  ValidateIf,
  IsDateString,
} from 'class-validator';

export class CreateBookingDto {
  @IsIn(['class', 'pt_session'])
  type: 'class' | 'pt_session';

  // =========================
  // CLASS BOOKING
  // =========================

  @ValidateIf((dto) => dto.type === 'class')
  @IsUUID()
  classSessionId?: string;

  // =========================
  // PT BOOKING
  // =========================

  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsIn(['package', 'free'])
  sourceType?: 'package' | 'free';

  // Required only for package bookings
  @ValidateIf(
    (dto) =>
      dto.type === 'pt_session' &&
      dto.sourceType === 'package',
  )
  @IsUUID()
  sourceId?: string;

  // The customer chooses a time.
  // The backend chooses the trainer.
  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsDateString()
  slotStart?: string;
}