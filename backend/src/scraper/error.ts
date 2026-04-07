// errors.ts
export class BadScrapeError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'BadScrapeError';
    }
  }