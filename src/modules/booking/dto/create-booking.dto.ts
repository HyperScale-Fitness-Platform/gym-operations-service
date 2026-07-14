import { IsUUID, IsIn, ValidateIf } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  customerId: string;

  @IsIn(['class', 'pt_session'])
  type: 'class' | 'pt_session';

  // required only when type = 'class'
  @ValidateIf((dto) => dto.type === 'class')
  @IsUUID()
  classSessionId?: string;

  // required only when type = 'pt_session'
  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsUUID()
  trainerSlotId?: string;

  // required only when type = 'pt_session'
  @ValidateIf((dto) => dto.type === 'pt_session')
  @IsIn(['membership', 'package'])
  sessionSource?: 'membership' | 'package';

  // required only when sessionSource = 'package'
  @ValidateIf((dto) => dto.sessionSource === 'package')
  @IsUUID()
  ptPackageId?: string;
}