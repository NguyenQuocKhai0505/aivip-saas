import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoupangApiService } from './coupang-api.service';
import { ScraperService } from './scraper.service';

@Module({
  imports: [ConfigModule],
  providers: [ScraperService, CoupangApiService],
  exports: [ScraperService, CoupangApiService],
})
export class ScraperModule {}