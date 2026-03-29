import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoEntity, VideoStatus } from '../videos/entities/video.entity';
import { AiService } from '../ai/ai.service';
import type { VideoProductionJobData } from './video-production.types';

@Injectable()
@Processor('video-production')
export class VideoProductionProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProductionProcessor.name);

  constructor(
    @InjectRepository(VideoEntity)
    private readonly videoRepository: Repository<VideoEntity>,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<VideoProductionJobData>): Promise<void> {
    const { videoId, keyword, topic, productUrl } = job.data;

    try {
      await job.updateProgress(10);

      // Bước 1: Crawl (skeleton — truyền productUrl từ job khi DTO/API có field)
      if (productUrl) {
        // const crawled = await this.scraperService.fetchProduct(productUrl);
        this.logger.log(`[Crawl] placeholder for ${productUrl}`);
      }
      await job.updateProgress(35);

      // Bước 2: Kịch bản (Gemini)
      const aiScript = await this.aiService.generateScript(topic, keyword);
      await job.updateProgress(70);

      // Bước 3: Media (Veo / ffmpeg — sau này)
      this.logger.log(`[Media] placeholder for ${videoId}`);

      await this.videoRepository.update(videoId, {
        aiScript,
        status: VideoStatus.SCRIPT_COMPLETED,
      });
      await job.updateProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id} video ${videoId}: ${message}`);

      await this.videoRepository.update(videoId, {
        status: VideoStatus.FAILED,
      });

      throw err;
    }
  }
}
