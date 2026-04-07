import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BadScrapeError } from './error';

type CoupangPartnersKeys = {
  accessKey: string;
  secretKey: string;
  subId?: string;
};

@Injectable()
export class CoupangApiService {
  constructor(private readonly config: ConfigService) {}

  getKeysOrNull(): CoupangPartnersKeys | null {
    const accessKey = this.config.get<string>('COUPANG_PARTNERS_ACCESS_KEY', '').trim();
    const secretKey = this.config.get<string>('COUPANG_PARTNERS_SECRET_KEY', '').trim();
    const subId = this.config.get<string>('COUPANG_PARTNERS_SUB_ID', '').trim();
    if (!accessKey || !secretKey) return null;
    return { accessKey, secretKey, subId: subId || undefined };
  }

  /** Regex parse `productId` from Coupang PDP URL. */
  extractProductIdFromUrl(url: string): string {
    // Examples:
    // https://www.coupang.com/vp/products/6577822503?itemId=...
    // https://m.coupang.com/vm/products/6577822503?...
    const m = url.match(/\/(?:vp|vm)\/products\/(\d+)/i);
    if (!m?.[1]) {
      throw new BadScrapeError(`Không trích xuất được productId từ URL Coupang: ${url}`);
    }
    return m[1];
  }

  /** Build HMAC Authorization header for Coupang Partners OpenAPI. */
  buildAuthorization(args: {
    method: 'GET' | 'POST';
    pathWithQuery: string; // includes '?', e.g. /.../deeplink
    accessKey: string;
    secretKey: string;
  }): string {
    // YYMMDDTHHMMSSZ in GMT
    const iso = new Date().toISOString(); // 2026-03-31T12:34:56.789Z
    const datetime = iso
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z')
      .slice(2); // YYMMDDTHHMMSSZ

    const [path, query = ''] = args.pathWithQuery.split('?');
    const message = datetime + args.method + path + query; // query without '?'
    const signature = crypto.createHmac('sha256', args.secretKey).update(message).digest('hex');

    return `CEA algorithm=HmacSHA256, access-key=${args.accessKey}, signed-date=${datetime}, signature=${signature}`;
  }

  /**
   * Create affiliate link for a Coupang PDP URL.
   * Uses: POST /v2/providers/affiliate_open_api/apis/openapi/v1/deeplink
   */
  async createDeeplink(originalUrl: string): Promise<{
    originalUrl: string;
    shortenUrl?: string;
    landingUrl?: string;
  }> {
    const keys = this.getKeysOrNull();
    if (!keys) {
      throw new BadScrapeError('Thiếu COUPANG_PARTNERS_ACCESS_KEY/SECRET_KEY trong .env');
    }

    const base = 'https://api-gateway.coupang.com';
    const path = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
    const pathWithQuery = path; // no query

    const authorization = this.buildAuthorization({
      method: 'POST',
      pathWithQuery,
      accessKey: keys.accessKey,
      secretKey: keys.secretKey,
    });

    const body = {
      coupangUrls: [originalUrl],
      ...(keys.subId ? { subId: keys.subId } : {}),
    };

    const resp = await fetch(`${base}${pathWithQuery}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 403) {
      throw new BadScrapeError('Coupang Partners API: 403 Forbidden (check keys/permission)');
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new BadScrapeError(`Coupang Partners API deeplink: HTTP ${resp.status}. body=${text.slice(0, 300)}`);
    }

    const json: any = await resp.json().catch(() => null);
    if (!json || json.rCode !== '0') {
      throw new BadScrapeError(
        `Coupang Partners API deeplink: bad response rCode=${json?.rCode ?? 'unknown'} rMessage=${json?.rMessage ?? ''}`,
      );
    }

    const item = json?.data?.[0];
    return {
      originalUrl,
      shortenUrl: typeof item?.shortenUrl === 'string' ? item.shortenUrl : undefined,
      landingUrl: typeof item?.landingUrl === 'string' ? item.landingUrl : undefined,
    };
  }
}

