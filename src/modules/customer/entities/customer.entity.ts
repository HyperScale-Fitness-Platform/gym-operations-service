import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'full_name' })
  fullName: string;
}