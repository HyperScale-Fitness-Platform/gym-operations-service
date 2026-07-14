import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Class } from './modules/booking/entities/class.entity';
import { ClassSession } from './modules/booking/entities/class-session.entity';
import { TrainerSlot } from './modules/booking/entities/trainer-slot.entity';
import { Booking } from './modules/booking/entities/booking.entity';


import { MembershipPlan } from './modules/membership/entities/membership-plan.entity';
import { Membership } from './modules/membership/entities/membership.entity';
import { MembershipBenefit } from './modules/membership/entities/membership-benefit.entity';
import { CustomerBenefit } from './modules/membership/entities/customer-benefit.entity';
import { MembershipFreeze } from './modules/membership/entities/membership-freeze.entity';
import { PtPackage } from './modules/membership/entities/pt-package.entity';


import { Occupancy } from './modules/occupancy/entities/occupancy.entity';


console.log('DATA SOURCE LOADED');
export default new DataSource({

  type:'postgres',

  host:process.env.DB_HOST,


  port:parseInt(process.env.DB_PORT ?? '5432',10),

  username:process.env.DB_USER,

  password:process.env.DB_PASSWORD,

  database:process.env.DB_NAME,


  entities:[
    Class,
    ClassSession,
    TrainerSlot,
    Booking,

    MembershipPlan,
    Membership,
    MembershipBenefit,
    CustomerBenefit,
    MembershipFreeze,
    PtPackage,

    Occupancy,
  ],


  migrations:[
    'src/migrations/*.ts',
  ],

  synchronize:false,

});