import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Class } from './modules/booking/entities/class.entity';
import { ClassSession } from './modules/booking/entities/class-session.entity';
import { TrainerSlot } from './modules/booking/entities/trainer-slot.entity';
import { Booking } from './modules/booking/entities/booking.entity';
// import Membership entities here too once Person 2 adds them

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Class, ClassSession, TrainerSlot, Booking],
  migrations: ['src/migrations/*.ts'],
});