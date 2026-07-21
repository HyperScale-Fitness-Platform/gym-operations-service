import { IsUUID, IsIn, ValidateIf } from 'class-validator';

export class CreateBookingDto {
  @IsIn(['class', 'pt_session'])
  type: 'class' | 'pt_session';

  @ValidateIf((dto) => dto.type === 'class')
  @IsUUID()
  classSessionId?: string;

  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsUUID()
  trainerSlotId?: string;

  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsIn(['membership', 'package'])
  sessionSource?: 'membership' | 'package';

  @ValidateIf((dto) => dto.sessionSource === 'package')
  @IsUUID()
  ptPackageId?: string;
}