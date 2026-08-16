import {
 IsUUID,
} from 'class-validator';


export class CreatePtPackageDto {


 @IsUUID()
 trainerId:string;


 @IsUUID()
 sessionId:string;

}