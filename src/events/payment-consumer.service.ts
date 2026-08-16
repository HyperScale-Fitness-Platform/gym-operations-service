import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { kafka } from './kafka';
import { MembershipService } from '../modules/membership/membership.service';

const paymentKafkaConsumer = kafka.consumer({
  groupId: 'gym-operations-payment-group',
});

interface PaymentStatusPayload {
  referenceType: string;
  referenceId: string;
  status: string;
}

@Injectable()
export class PaymentConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly membershipService: MembershipService,
  ) {}

  async onModuleInit() {
    await paymentKafkaConsumer.connect();

    await paymentKafkaConsumer.subscribe({
      topic: 'PAYMENT_STATUS',
      fromBeginning: true,
    });

    await paymentKafkaConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        try {
          const payload: PaymentStatusPayload =
            JSON.parse(message.value.toString());

          console.log(
            `[Kafka] Received PAYMENT_STATUS: ${payload.referenceType} ${payload.referenceId} → ${payload.status}`,
          );

          // Only handle pt_package references — other types
          // (e.g. membership) are handled elsewhere.
          if (payload.referenceType !== 'pt_package') {
            return;
          }

          await this.membershipService.handlePaymentStatus(
            payload.referenceId,
            payload.status,
          );

        } catch (error) {
          console.error(
            '[Kafka] Failed to process PAYMENT_STATUS:',
            error,
          );
        }
      },
    });
  }

  async onModuleDestroy() {
    await paymentKafkaConsumer.disconnect();
  }
}
