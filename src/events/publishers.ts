import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { kafkaProducer } from './kafka';

@Injectable()
export class EventPublisher implements OnModuleInit, OnModuleDestroy {

  async onModuleInit() {
    await kafkaProducer.connect();
    console.log('Gym Operations Kafka Producer connected');
  }

  async publish(
    eventName: string,
    payload: Record<string, unknown>,
  ) {
    await kafkaProducer.send({
      topic: eventName,
      messages: [
        {
          key: String(payload.bookingId ?? ''),
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(`[Kafka] Published ${eventName}`, payload);
  }

  async onModuleDestroy() {
    await kafkaProducer.disconnect();
  }
}