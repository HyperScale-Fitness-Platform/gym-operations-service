import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';


export class CreatePlanDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsNumber()
  @IsPositive()
  price: number;


  @IsNumber()
  @IsPositive()
  durationInDays: number;


  @IsNumber()
  @IsPositive()
  maxFreezes: number;

}