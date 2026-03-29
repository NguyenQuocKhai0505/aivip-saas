import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export enum VideoTopic {
  ENGLISH = 'ENGLISH',
  AFFILIATE = 'AFFILIATE',

  NEWS = 'NEWS',
  TECH_REVIEW = 'TECH_REVIEW',
  VLOG = 'VLOG',
  COOKING = 'COOKING',
}

export enum VideoStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
}

@Entity('videos')
export class VideoEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'enum', enum: VideoTopic })
  topic!: VideoTopic;

  @Column({ type: 'text' })
  rawInput!: string;

  @Column({ type: 'text' })
  aiScript!: string;

  @Column({ type: 'enum', enum: VideoStatus, default: VideoStatus.PENDING })
  status!: VideoStatus;

  @ManyToOne(() => UserEntity, (user) => user.videos, { onDelete: 'CASCADE' })
  user!: UserEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
