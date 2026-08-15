import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'gym-operations-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const kafkaProducer = kafka.producer();

export const kafkaConsumer = kafka.consumer({
  groupId: 'gym-operations-service-group',
});