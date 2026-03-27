import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existed = await this.userRepository.findOne({
      where: { email },
    });

    if (existed) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      email,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      passwordHash,
    });

    const saved = await this.userRepository.save(user);

    return {
      id: saved.id,
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
    };
  }
}
