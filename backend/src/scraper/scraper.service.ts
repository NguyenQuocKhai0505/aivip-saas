import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadScrapeError } from './error';
import { ScrapedProduct } from './scraped-product.type';
import { CoupangApiService } from './coupang-api.service';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly coupangApi: CoupangApiService,
  ) {}

  async scrape(url: string): Promise<ScrapedProduct> {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      throw new BadScrapeError(`Invalid URL: ${url}`);
    }

    const host = parsed.hostname.toLowerCase();

    try {
      if (host.includes('coupang.com')) {
        return await this.scrapeCoupang(parsed.toString());
      }
      if (host.includes('shopee.vn') || host.includes('shopee.')) {
        return await this.scrapeShopee(parsed.toString());
      }
      if (host.includes('tiktok.com')) {
        return await this.scrapeTikTok(parsed.toString());
      }

      throw new BadScrapeError(`Chưa hỗ trợ domain: ${host}`);
    } catch (err) {
      this.logger.warn(`scrape failed: ${url} — ${String(err)}`);
      throw err;
    }
  }

  /**
   * Lưu ý: Coupang thường có WAF/anti-bot và có thể trả "Access Denied".
   * Hàm này KHÔNG cố né/bypass; nếu bị chặn sẽ throw để BullMQ retry / hoặc bạn đổi sang nguồn chính thống.
   */
  async scrapeCoupang(url: string, keywordHint?: string): Promise<ScrapedProduct> {
    // 1) Partners API: tạo affiliate link từ URL (để kiếm hoa hồng)
    // NOTE: Docs phổ biến không có endpoint detail /products/{productId} để lấy title/price trực tiếp.
    // Vì vậy mình luôn cố tạo deeplink trước (nếu có key), rồi vẫn cần lấy title/price/images (Playwright fallback).
    let deeplink: { shortenUrl?: string; landingUrl?: string } | null = null;
    try {
      if (this.coupangApi.getKeysOrNull()) {
        deeplink = await this.coupangApi.createDeeplink(url);
      }
    } catch (e) {
      // Deeplink fail không nhất thiết block toàn bộ scrape, nhưng mình vẫn lưu dấu vết để debug.
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[CoupangAPI] deeplink failed: ${msg}`);
    }

    const { chromium } = await import('playwright-extra');

    const USER_AGENT =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const SELECTORS = {
      title: 'h1.prod-buy-header__title',
      price: 'span.total-price > strong',
      images: 'img.prod-image__detail',
    };

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    try {
      const page = await browser.newPage({
        userAgent: USER_AGENT,
        locale: 'ko-KR',
      });
      await page.setExtraHTTPHeaders({
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
      });

      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // Trang sản phẩm có thể render JS; đợi network idle một nhịp để giá/ảnh hiện ổn hơn.
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => null);
      await page.waitForTimeout(1500);

      // Detect WAF/blocked page early.
      const htmlSnippet = (await page.content().catch(() => '')).slice(0, 400);
      if (/Access Denied/i.test(htmlSnippet)) {
        throw new BadScrapeError(
          `Coupang trả về Access Denied (bị chặn). httpStatus=${resp?.status() ?? 'unknown'} finalUrl=${page.url()}`,
        );
      }

      await page.waitForSelector(SELECTORS.title, { timeout: 30_000 });
      await page.waitForSelector(SELECTORS.price, { timeout: 30_000 });

      const title = ((await page.locator(SELECTORS.title).first().textContent()) ?? '').trim();
      const price = ((await page.locator(SELECTORS.price).first().textContent()) ?? '').trim();

      const imageUrls =
        (await page
          .locator(SELECTORS.images)
          .evaluateAll((nodes) =>
            nodes
              .map((n) => (n as HTMLImageElement).src)
              .filter((src) => typeof src === 'string' && src.startsWith('http')),
          )
          .catch(() => [] as string[])) ?? [];
      const uniqueImages = Array.from(new Set(imageUrls)).slice(0, 10);

      if (!title) throw new BadScrapeError('Không đọc được title (bị chặn hoặc selector sai)');
      if (!price) throw new BadScrapeError('Không đọc được price (bị chặn hoặc selector sai)');

      return {
        platform: 'coupang',
        sourceUrl: url,
        title,
        price,
        discountRate: '',
        description: '',
        images: uniqueImages,
        raw: {
          httpStatus: resp?.status() ?? null,
          finalUrl: page.url(),
          affiliate: deeplink ?? undefined,
          productId: (() => {
            try {
              return this.coupangApi.extractProductIdFromUrl(url);
            } catch {
              return undefined;
            }
          })(),
          keywordHint: keywordHint ?? undefined,
        },
      };
    } catch (err) {
      this.logger.warn(`scrape failed: ${url} — ${String(err)}`);
      throw err;
    } finally {
      await browser.close();
    }
  }

  private async scrapeShopee(url: string): Promise<ScrapedProduct> {
    throw new BadScrapeError('Shopee: triển khai sau');
  }

  private async scrapeTikTok(url: string): Promise<ScrapedProduct> {
    throw new BadScrapeError('TikTok: triển khai sau');
  }
}