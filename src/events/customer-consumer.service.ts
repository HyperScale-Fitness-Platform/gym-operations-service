import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { customerKafkaConsumer } from './kafka';
import { CustomerService } from '../modules/customer/customer.service';

interface CustomerCreationPayload {
  id: string;
  full_name: string;
  gender?: string;
  phone?: string;
}

@Injectable()
export class CustomerConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly customerService: CustomerService,
  ) {}

  async onModuleInit() {
    await customerKafkaConsumer.connect();

    await customerKafkaConsumer.subscribe({
      topic: 'customer_creation',
      fromBeginning: true,
    });

    await customerKafkaConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        try {
          const payload: CustomerCreationPayload =
            JSON.parse(message.value.toString());

          console.log(
            `[Kafka] Received customer_creation for ${payload.id}`,
          );

          if (!payload.id || !payload.full_name) {
            throw new Error(
              'Invalid customer_creation payload',
            );
          }

          await this.customerService.upsertCustomer(
            payload.id,
            payload.full_name,
          );

          console.log(
            `[Kafka] Customer ${payload.id} stored/updated`,
          );
        } catch (error) {
          console.error(
            '[Kafka] Failed to process customer_creation:',
            error,
          );
        }
      },
    });
  }

  async onModuleDestroy() {
    await customerKafkaConsumer.disconnect();
  }
}