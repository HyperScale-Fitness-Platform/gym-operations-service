import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { kafkaConsumer } from './kafka';
import { TrainerProfile } from '../modules/booking/entities/trainer-profile.entity';

interface TrainerCreationPayload {
  id: string;
  full_name: string;
  bio?: string;
  gender?: string;
  photo_url?: string;
}

@Injectable()
export class TrainerConsumerService
  implements OnModuleInit, OnModuleDestroy {

  constructor(
    @InjectRepository(TrainerProfile)
    private trainerProfileRepo: Repository<TrainerProfile>,
  ) {}

  async onModuleInit() {
    await kafkaConsumer.connect();

    await kafkaConsumer.subscribe({
      topic: 'trainer_creation',
      fromBeginning: true,
    });

    await kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        try {
          const payload: TrainerCreationPayload =
            JSON.parse(message.value.toString());

          console.log(
            `[Kafka] Received trainer_creation for ${payload.id}`,
          );

          await this.trainerProfileRepo.upsert(
            {
              id: payload.id,
              fullName: payload.full_name,
              bio: payload.bio ?? null,
              gender: payload.gender ?? null,
              photoUrl: payload.photo_url ?? null,
            },
            ['id'],
          );

          console.log(
            `[Kafka] Trainer ${payload.id} stored/updated`,
          );

        } catch (error) {
          console.error(
            '[Kafka] Failed to process trainer_creation:',
            error,
          );
        }
      },
    });
  }

  async onModuleDestroy() {
    await kafkaConsumer.disconnect();
  }
}