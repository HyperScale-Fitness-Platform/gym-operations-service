import { IsString, IsInt, IsNumber, Min } from 'class-validator';

export class CreatePtSessionDto {

    @IsString()
    name: string;

    @IsInt()
    @Min(1)
    sessions: number;

    @IsNumber()
    @Min(0.01)
    price: number;

}