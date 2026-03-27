import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),

        // Entities/Migrations: bạn sẽ chỉnh theo cấu trúc project
        autoLoadEntities: true,

        // Dev safety
        synchronize: config.get<string>('TYPEORM_SYNCHRONIZE') === 'true',
        logging: config.get<string>('TYPEORM_LOGGING') === 'true',

        // SSL (prod hay cần)
        ssl: config.get<string>('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
      }),
    }),

    UsersModule,
    AuthModule,
    VideosModule,
  ],
})
export class AppModule {}