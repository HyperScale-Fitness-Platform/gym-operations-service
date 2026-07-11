import { IsString, IsInt, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsInt()
  @Min(1)
  capacity: number;
}