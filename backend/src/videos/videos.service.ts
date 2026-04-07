import { Injectable } from '@nestjs/common';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoEntity, VideoStatus } from './entities/video.entity';
import { UserEntity } from '../users/entities/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { VideoProductionJobData } from '../queue/video-production.types';
import { Queue } from 'bullmq';

export const mockProductData = {
  platform: 'coupang',
  sourceUrl:
    'https://www.coupang.com/vp/products/6577822503?itemId=14790109733&vendorItemId=90822605251',
  title: 'Coupang Mock: Wireless Earbuds (Example)',
  price: '20640',
  description: 'Mock product data for pipeline testing (title/price/images).',
  discountRate: '15%',
  images: [
    'https://static.coupangcdn.com/image/product/image/vendoritem/2023/01/01/mock-1.jpg',
    'https://static.coupangcdn.com/image/product/image/vendoritem/2023/01/01/mock-2.jpg',
    'https://static.coupangcdn.com/image/product/image/vendoritem/2023/01/01/mock-3.jpg',
  ],
} as const;

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly videoRepository: Repository<VideoEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectQueue('video-production')
    private readonly videoProductionQueue: Queue<VideoProductionJobData>,
  ) {}

  async create(userId: string, dto: CreateVideoDto) {
    const user = await this.userRepository.findOneByOrFail({ id: userId });

    const video = this.videoRepository.create({
      title: dto.title,
      topic: dto.topic,
      rawInput: dto.keyword,
      status: VideoStatus.PENDING,
      user,
      aiScript: '',
    });
    const saved = await this.videoRepository.save(video);

    const job = await this.videoProductionQueue.add(
      'video-production',
      {
        videoId: saved.id,
        userId,
        title: dto.title,
        topic: dto.topic,
        keyword: dto.keyword,
        productUrl: dto.productUrl,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    return {
      ...saved,
      jobId: job.id,
    };
  }

  findAll() {
    return `This action returns all videos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} video`;
  }

  update(id: number, updateVideoDto: UpdateVideoDto) {
    return `This action updates a #${id} video`;
  }

  remove(id: number) {
    return `This action removes a #${id} video`;
  }
}
