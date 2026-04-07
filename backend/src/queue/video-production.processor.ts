import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoEntity, VideoStatus } from '../videos/entities/video.entity';
import { AiService } from '../ai/ai.service';
import { ScraperService } from '../scraper/scraper.service';
import type { ScrapedProduct } from '../scraper/scraped-product.type';
import type { VideoProductionJobData } from './video-production.types';
import { mockProductData } from '../videos/videos.service';
import { AudioService } from '../audio/audio.service';

@Injectable()
@Processor('video-production')
export class VideoProductionProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProductionProcessor.name);

  constructor(
    @InjectRepository(VideoEntity)
    private readonly videoRepository: Repository<VideoEntity>,
    private readonly aiService: AiService,
    private readonly scraperService: ScraperService,
    private readonly audioService: AudioService,
  ) {
    super();
  }

  async process(job: Job<VideoProductionJobData>): Promise<void> {
    const { videoId, keyword, topic, productUrl } = job.data;

    try {
      await job.updateProgress(10);

      // Bước 1 (MOCK): dùng dữ liệu giả lập thay vì Scraper để làm tiếp pipeline
      const scraped: ScrapedProduct = {
        platform: 'coupang',
        sourceUrl: productUrl ?? mockProductData.sourceUrl,
        title: mockProductData.title,
        price: mockProductData.price,
        description: mockProductData.description,
        discountRate: mockProductData.discountRate,
        images: [...mockProductData.images],
        raw: { source: 'mock_product_data' },
      };
      await this.videoRepository.update(videoId, {
        metadata: {
          scrape: scraped,
          scrapedAt: new Date().toISOString(),
        },
      });
      await job.updateProgress(35);

      // Bước 2: Kịch bản (Gemini)
      const enrichedKeyword =
        `${keyword}\n\nPRODUCT_DATA:\n${JSON.stringify(scraped)}`;
      const aiScript = await this.aiService.generateScript(topic, enrichedKeyword);
      await job.updateProgress(70);

      // Bước 3 (MOCK TTS): tạo audio giả lập để UI/flow chạy xuyên suốt
      const audio = await this.audioService.generateFromScript({ videoId, aiScript });
      await this.videoRepository.update(videoId, {
        metadata: {
          scrape: scraped,
          scrapedAt: new Date().toISOString(),
          audio,
        },
      });
      this.logger.log(`[Audio] generated (mock) for ${videoId}`);

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
