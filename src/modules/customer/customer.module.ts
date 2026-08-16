import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer } from './entities/customer.entity';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerConsumerService } from '../../events/customer-consumer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
  ],
  controllers: [
    CustomerController,
  ],
  providers: [
    CustomerService,
    CustomerConsumerService,
  ],
  exports: [
    CustomerService,
  ],
})
export class CustomerModule {}