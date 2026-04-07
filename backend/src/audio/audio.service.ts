import { Injectable } from '@nestjs/common';

@Injectable()
export class AudioService {
  /**
   * Mock TTS step: returns placeholder “audio artifact”.
   * Later you can replace with Google Cloud Text-to-Speech implementation.
   */
  async generateFromScript(args: { videoId: string; aiScript: string }) {
    return {
      provider: 'google-tts',
      status: 'MOCK',
      mimeType: 'audio/mpeg',
      url: `mock://tts/${args.videoId}.mp3`,
      createdAt: new Date().toISOString(),
    };
  }
}

