import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';


@Entity('occupancies')
export class Occupancy {


  @PrimaryGeneratedColumn()
  id:number;


  @Column({
    name:'customer_id'
  })
  customerId:string;


  @Column({
    name:'check_in',
    type:'timestamp'
  })
  checkIn:Date;


  @Column({
    name:'check_out',
    type:'timestamp',
    nullable:true,
  })
  checkOut:Date | null;


  @CreateDateColumn({
    name:'created_at'
  })
  createdAt:Date;

}