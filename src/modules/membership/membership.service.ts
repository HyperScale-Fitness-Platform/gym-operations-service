import { Injectable } from '@nestjs/common';

// STUB — your friend (Person 2) replaces the bodies of these functions
// with real Prisma/TypeORM queries against the memberships and pt_packages
// tables. Booking module calls these and only these — keep this the shared
// contract, don't let Booking reach into Membership's other internals.
//
// Agreed signatures (do not change without telling Person 1 / Booking owner):
//
// -- Free membership-included PT sessions (any trainer) --
//   checkPtSessionsAvailable(customerId: string): Promise<boolean>
//   deductPtSession(customerId: string): Promise<void>
//   refundPtSession(customerId: string): Promise<void>
//
// -- Paid PT packages (locked to one specific trainer) --
//   checkPackageSessionsAvailable(packageId: string): Promise<boolean>
//   deductPackageSession(packageId: string): Promise<void>
//   refundPackageSession(packageId: string): Promise<void>
//   getPackageTrainerId(packageId: string): Promise<string>

@Injectable()
export class MembershipService {
  // --- Free membership-included sessions ---

  async checkPtSessionsAvailable(customerId: string): Promise<boolean> {
    // TODO(Person 2): query memberships table, return true if pt_sessions_left > 0
    return true; // stubbed to always allow, so Booking isn't blocked during dev
  }

  async deductPtSession(customerId: string): Promise<void> {
    // TODO(Person 2): decrement pt_sessions_left, insert a benefit_usage row
    return;
  }

  async refundPtSession(customerId: string): Promise<void> {
    // TODO(Person 2): increment pt_sessions_left back on cancellation
    return;
  }

  // --- Paid PT packages (20/40/60), locked to one trainer ---

  async checkPackageSessionsAvailable(packageId: string): Promise<boolean> {
    // TODO(Person 2): query pt_packages table, return true if
    // status = 'active' AND sessions_used < sessions_total
    return true; // stubbed to always allow, so Booking isn't blocked during dev
  }

  async deductPackageSession(packageId: string): Promise<void> {
    // TODO(Person 2): increment sessions_used; flip status to 'exhausted'
    // if sessions_used reaches sessions_total
    return;
  }

  async refundPackageSession(packageId: string): Promise<void> {
    // TODO(Person 2): decrement sessions_used on cancellation, flip
    // status back to 'active' if it was 'exhausted'
    return;
  }

  async getPackageTrainerId(packageId: string): Promise<string> {
    // TODO(Person 2): query pt_packages table, return its trainer_id.
    // Booking uses this to enforce "package can only book its own trainer's slots".
    return '33333333-3333-4333-a333-333333333333'; // stubbed placeholder trainer id
  }
}