import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
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

  async login(dto:LoginDto){
    const email = dto.email.trim().toLowerCase();

    const user = await this.userRepository
        .createQueryBuilder("u")
        .addSelect("u.passwordHash")
        .where("u.email = :email",{email})
        .getOne()
        
        if(!user){
          throw new UnauthorizedException("Invalid credentials");
        }

        const ok = await bcrypt.compare(dto.password, user.passwordHash);

        if(!ok){
          throw new UnauthorizedException("Invalid credentials");
        }
        
        if(!user.isActive){
          throw new UnauthorizedException("Account is not active");
        }

        const payload = {sub:user.id,email:user.email};

        const accessToken = await this.jwtService.signAsync(payload);
        return{
          accessToken,
          user:{
            id:user.id,
            email:user.email,
            firstName:user.firstName,
            lastName:user.lastName,
          }
        }
  }

}
