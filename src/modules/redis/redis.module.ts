import { Module } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports:[
    RedisModule.forRoot({
      type:'single',
      url: process.env.REDIS_URL
    })
  ],
  exports:[RedisModule]
})
export class RedisConfigModule {}