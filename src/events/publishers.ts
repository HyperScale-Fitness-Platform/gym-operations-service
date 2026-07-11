import { Injectable } from '@nestjs/common';

@Injectable()
export class EventPublisher {
  async publish(eventName: string, payload: Record<string, unknown>) {
    console.log(`[event] ${eventName}`, payload);
  }
}