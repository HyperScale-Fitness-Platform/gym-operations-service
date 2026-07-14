import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateTrainerSlotDto } from './dto/create-trainer-slot.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';

@Controller()
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get('classes')
  getClasses() {
    return this.bookingService.getClasses();
  }

  @Get('classes/:id/sessions')
  getClassSessions(@Param('id') classId: string) {
    return this.bookingService.getClassSessions(classId);
  }

  @Get('trainers/:id/slots')
  getTrainerSlots(@Param('id') trainerId: string) {
    return this.bookingService.getTrainerSlots(trainerId);
  }

  // NEW — slots filtered to the trainer this PT package is locked to
  @Get('pt-packages/:packageId/available-slots')
  getSlotsForPackage(@Param('packageId') packageId: string) {
    return this.bookingService.getSlotsForPackage(packageId);
  }

  @Get('customers/:id/bookings')
  getCustomerBookings(@Param('id') customerId: string) {
    return this.bookingService.getCustomerBookings(customerId);
  }

  @Post('bookings')
  createBooking(@Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(dto);
  }

  @Delete('bookings/:id')
  cancelBooking(@Param('id') id: string) {
    return this.bookingService.cancelBooking(id);
  }

  // --- Admin/Trainer endpoints ---

  @Post('classes')
  createClass(@Body() dto: CreateClassDto) {
    return this.bookingService.createClass(dto);
  }

  @Post('classes/:id/sessions')
  createClassSession(@Param('id') classId: string, @Body() dto: CreateClassSessionDto) {
    return this.bookingService.createClassSession(classId, dto);
  }

  @Post('trainers/:id/slots')
  createTrainerSlot(@Param('id') trainerId: string, @Body() dto: CreateTrainerSlotDto) {
    return this.bookingService.createTrainerSlot(trainerId, dto);
  }

  @Get('trainers/:id/schedule')
  getTrainerSchedule(@Param('id') trainerId: string) {
    return this.bookingService.getTrainerSchedule(trainerId);
  }

  @Patch('bookings/:id/reschedule')
  rescheduleBooking(@Param('id') id: string, @Body() dto: RescheduleBookingDto) {
    return this.bookingService.rescheduleBooking(
      id,
      dto.newClassSessionId,
      dto.newTrainerSlotId,
    );
  }
}