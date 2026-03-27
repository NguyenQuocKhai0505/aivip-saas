import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(UserEntity) private readonly userRepository:Repository<UserEntity>){}

    //CREATE USER
    async createUser(createUserDto:CreateUserDto):Promise<UserEntity>{
        const user = this.userRepository.create({
            email: createUserDto.email,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
        });

        return this.userRepository.save(user);
    }
}
