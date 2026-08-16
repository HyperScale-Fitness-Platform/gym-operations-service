import {
  Controller,
  Get,
} from '@nestjs/common';

import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
  ) {}

  @Get()
  getAllCustomers() {
    return this.customerService.getAllCustomers();
  }
}