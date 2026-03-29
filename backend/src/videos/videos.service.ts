import { Injectable } from '@nestjs/common';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoEntity, VideoStatus } from './entities/video.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(VideoEntity)
    private readonly videoRepository: Repository<VideoEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, dto: CreateVideoDto) {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const aiScript = await this.aiService.generateScript(dto.topic, dto.keyword);

    const video = this.videoRepository.create({
      title: dto.title,
      topic: dto.topic,
      rawInput: dto.keyword,
      aiScript,
      status: VideoStatus.DONE,
      user,
    });

    return this.videoRepository.save(video);
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
