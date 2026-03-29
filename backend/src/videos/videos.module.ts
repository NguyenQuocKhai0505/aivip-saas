import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoEntity } from './entities/video.entity';
import { UserEntity } from '../users/entities/user.entity';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { VideoQueueModule } from '../queue/video.queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([VideoEntity, UserEntity]), VideoQueueModule],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
