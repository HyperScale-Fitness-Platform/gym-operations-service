import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PtPackageStatus } from '../enum/pt-package-status.enum';


@Entity('pt_packages')
export class PtPackage {


  @PrimaryGeneratedColumn('uuid')
  id:string;


  @Column()
  customerId:string;


  @Column()
  trainerId:string;


  @Column()
  packageType:string;


  @Column()
  sessionsTotal:number;


  @Column()
  sessionsUsed:number;


  @Column({
    type:'enum',
    enum:PtPackageStatus,
  })
  status:PtPackageStatus;


  @CreateDateColumn()
  purchasedAt:Date;


  @UpdateDateColumn()
  updatedAt:Date;

}