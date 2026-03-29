
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VideoEntity } from '../../videos/entities/video.entity';

@Entity("users")
export class UserEntity{

    @PrimaryGeneratedColumn("uuid")
    id!:string

    @Index({unique:true})
    @Column({type:"varchar",length:320})
    email!:string 

    @Column({type:"varchar",length:100})
    firstName!:string

    @Column({type:"varchar",length:100})
    lastName!:string 

    @Column({ type: 'varchar', length: 255, select: false })
    passwordHash!: string

    @Column({ type: 'boolean', default: true })
    isActive!: boolean

    @CreateDateColumn({type:"timestamp"})
    createdAt!:Date

    @UpdateDateColumn({type:"timestamp"})
    updatedAt!:Date

    @OneToMany(() => VideoEntity, (video) => video.user)
    videos!: VideoEntity[];
}