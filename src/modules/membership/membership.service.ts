import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipService {
  async checkPtSessionsAvailable(customerId: string): Promise<boolean> {
    return true; // TODO: real check against memberships table
  }

  async deductPtSession(customerId: string): Promise<void> {
    return; // TODO: decrement pt_sessions_left
  }

  async refundPtSession(customerId: string): Promise<void> {
    return; // TODO: increment pt_sessions_left back
  }
}