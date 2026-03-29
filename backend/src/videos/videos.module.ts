import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from './entities/video.entity';
import { UserEntity } from '../users/entities/user.entity';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoEntity, UserEntity]), AiModule],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
