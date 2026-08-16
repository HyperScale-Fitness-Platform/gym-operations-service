import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async getAllCustomers() {
    return this.customerRepository.find({
      order: {
        fullName: 'ASC',
      },
    });
  }

  async upsertCustomer(
    id: string,
    fullName: string,
  ) {
    await this.customerRepository.upsert(
      {
        id,
        fullName,
      },
      ['id'],
    );
  }
}