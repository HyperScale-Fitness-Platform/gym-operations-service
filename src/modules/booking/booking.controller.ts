import {Controller,Get,Post,Patch,Delete,Body,Param,Headers,Query} from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateClassSessionDto } from './dto/create-class-session.dto';
import { CreateTrainerSlotDto } from './dto/create-trainer-slot.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller()
export class BookingController {

  constructor(
    private bookingService: BookingService,
  ) {}

  // ==========================================
  // CLASSES
  // ==========================================

  @Get('classes')
  getClasses() {
    return this.bookingService.getClasses();
  }

  @Get('classes/:id/sessions')
  getClassSessions(
    @Param('id') classId: string,
  ) {
    return this.bookingService.getClassSessions(
      classId,
    );
  }

  // ==========================================
  // PT BOOKING SOURCES
  // ==========================================

  @Get('bookable-sources')
  getBookableSources(
    @Headers('user-id') customerId: string,
  ) {
    return this.bookingService.getBookableSources(
      customerId,
    );
  }

  // ==========================================
  // FREE CREDIT AVAILABILITY
  // ==========================================

  @Get('pt/free-availability')
  getFreePtAvailability(
    @Query('date') date?: string,
  ) {
    return this.bookingService.getFreePtAvailability(
      date,
    );
  }

  // ==========================================
  // TRAINERS
  // ==========================================

  @Get('trainers/available')
  getAvailableTrainers() {
    return this.bookingService.getAvailableTrainers();
  }

  @Get('trainers/:id/slots')
  getTrainerSlots(
    @Param('id') trainerId: string,
  ) {
    return this.bookingService.getTrainerSlots(
      trainerId,
    );
  }

  // ==========================================
  // PACKAGE AVAILABILITY
  // ==========================================

  @Get('pt-packages/:packageId/available-slots')
  getSlotsForPackage(
    @Param('packageId') packageId: string,
    @Headers('user-id') customerId: string,
  ) {
    return this.bookingService.getSlotsForPackage(
      customerId,
      packageId,
    );
  }

  // ==========================================
  // CUSTOMER BOOKINGS
  // ==========================================

  @Get('customers/:id/bookings')
  getCustomerBookings(
    @Param('id') customerId: string,
  ) {
    return this.bookingService.getCustomerBookings(
      customerId,
    );
  }

  // ==========================================
  // CREATE BOOKING
  // ==========================================

  @Post('bookings')
  createBooking(
    @Body() dto: CreateBookingDto,
    @Headers('user-id') customerId: string,
  ) {
    return this.bookingService.createBooking(
      customerId,
      dto,
    );
  }

  // ==========================================
  // CANCEL
  // ==========================================

  @Delete('bookings/:id')
  cancelBooking(
    @Param('id') id: string,
  ) {
    return this.bookingService.cancelBooking(
      id,
    );
  }

  // ==========================================
  // ADMIN / TRAINER
  // ==========================================

  @Post('classes')
  createClass(
    @Body() dto: CreateClassDto,
  ) {
    return this.bookingService.createClass(dto);
  }

  @Post('classes/:id/sessions')
  createClassSession(
    @Param('id') classId: string,
    @Body() dto: CreateClassSessionDto,
  ) {
    return this.bookingService.createClassSession(
      classId,
      dto,
    );
  }

  @Post('trainers/:id/slots')
  createTrainerSlot(
    @Param('id') trainerId: string,
    @Body() dto: CreateTrainerSlotDto,
  ) {
    return this.bookingService.createTrainerSlot(
      trainerId,
      dto,
    );
  }

  @Get('trainers/:id/schedule')
  getTrainerSchedule(
    @Param('id') trainerId: string,
  ) {
    return this.bookingService.getTrainerSchedule(
      trainerId,
    );
  }

  // ==========================================
  // RESCHEDULE
  // ==========================================

  @Patch('bookings/:id/reschedule')
  rescheduleBooking(
    @Param('id') id: string,
    @Body() dto: RescheduleBookingDto,
  ) {
    return this.bookingService.rescheduleBooking(
      id,
      dto.newClassSessionId,
      dto.newTrainerSlotId,
    );
  }

  // ==========================================
  // UPDATE CLASS
  // ==========================================

  @Patch('classes/:id')
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.bookingService.updateClass(
      id,
      dto,
    );
  }
}