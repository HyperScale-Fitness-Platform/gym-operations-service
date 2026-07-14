import {
 IsUUID,
 IsIn,
} from 'class-validator';


export class CreatePtPackageDto {


 @IsUUID()
 customerId:string;


 @IsUUID()
 trainerId:string;


 @IsIn([
   '20',
   '40',
   '60'
 ])
 packageType:string;

}