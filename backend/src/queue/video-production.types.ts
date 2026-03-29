import { VideoTopic } from '../videos/entities/video.entity';

export type VideoProductionJobData = {
  videoId: string;
  userId: string;
  title: string;
  topic: VideoTopic;
  keyword: string;
  productUrl?: string;
};