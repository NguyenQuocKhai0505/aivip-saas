import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoTopic } from '../videos/entities/video.entity';
import { OUTPUT_SCENE_FORMAT, PROMPT_TEMPLATES } from './prompt-templates';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('GEMINI_API_KEY');
    const apiKey = typeof raw === 'string' ? raw.trim() : '';
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is missing or empty in .env. Add your key and restart the server.',
      );
    }
    this.modelName = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private buildPrompt(topic: VideoTopic, keyword: string): string {
    const template = PROMPT_TEMPLATES[topic];
    if (!template) {
      throw new InternalServerErrorException(
        `No prompt template registered for topic: ${topic}`,
      );
    }

    const cleanKeyword = keyword.trim();

    return [
      `ROLE: ${template.role}`,
      '',
      `TASK: Soạn kịch bản video ngắn (định dạng phân cảnh) cho từ khóa: "${cleanKeyword}"`,
      '',
      'INSTRUCTIONS (theo chủ đề):',
      ...template.instructions.map((item) => `- ${item}`),
      '',
      'OUTPUT STYLE:',
      ...template.outputStyle.map((item) => `- ${item}`),
      '',
      'ĐỊNH DẠNG OUTPUT (bắt buộc — dùng làm input cho AI tạo video sau này):',
      ...OUTPUT_SCENE_FORMAT.map((item) => `- ${item}`),
      '',
      'Tuân thủ ĐÚNG nhãn "Scene N", "Visual (Hình ảnh)", "Audio (Lời thoại)" trong câu trả lời. Chỉ trả về nội dung kịch bản theo định dạng trên, không giải thích thêm.',
    ].join('\n');
  }

  async generateScript(topic: VideoTopic, keyword: string): Promise<string> {
    const prompt = this.buildPrompt(topic, keyword);        

    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}
