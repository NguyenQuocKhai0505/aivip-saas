import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from '../videos/entities/video.entity';
import { VideoProductionProcessor } from "./video-production.processor";
import { AiModule } from '../ai/ai.module';
import { ScraperModule } from '../scraper/scraper.module';
import { AudioModule } from '../audio/audio.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<number>('REDIS_PORT', 16379)),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'video-production',
    }),
    TypeOrmModule.forFeature([VideoEntity]),
    AiModule,
    ScraperModule,
    AudioModule,
  ],
  providers: [VideoProductionProcessor],
  exports: [BullModule], // để module khác dùng InjectQueue
})
export class VideoQueueModule {}