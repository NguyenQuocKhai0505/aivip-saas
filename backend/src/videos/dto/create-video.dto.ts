import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { VideoTopic } from '../entities/video.entity';

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsEnum(VideoTopic)
  topic!: VideoTopic;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  keyword!: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  productUrl?: string;
}
