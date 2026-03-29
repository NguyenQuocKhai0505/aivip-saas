import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoTopic } from '../videos/entities/video.entity';
import {
  isJsonScriptTopic,
  JSON_SCENE_OUTPUT_RULES,
  OUTPUT_SCENE_FORMAT,
  PROMPT_TEMPLATES,
} from './prompt-templates';
import { parseAndValidateVeoScript } from './veo-script.types';

const JSON_SYSTEM_INSTRUCTION =
  'Bạn chỉ trả lời bằng MỘT object JSON hợp lệ theo đúng cấu trúc trong user message. Không markdown, không ```, không lời dẫn hay giải thích ngoài JSON.';

function stripPossibleMarkdownFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/im.exec(t);
  return m ? m[1].trim() : t;
}

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
    const useJson = isJsonScriptTopic(topic);

    const formatLines = useJson
      ? [
          'ĐỊNH DẠNG OUTPUT (JSON — bắt buộc):',
          ...JSON_SCENE_OUTPUT_RULES.map((item) => `- ${item}`),
        ]
      : [
          'ĐỊNH DẠNG OUTPUT (bắt buộc — dùng làm input cho AI tạo video sau này):',
          ...OUTPUT_SCENE_FORMAT.map((item) => `- ${item}`),
          '',
          'Tuân thủ ĐÚNG nhãn "Scene N", "Visual (Hình ảnh)", "Audio (Lời thoại)" trong câu trả lời. Chỉ trả về nội dung kịch bản theo định dạng trên, không giải thích thêm.',
        ];

    return [
      `ROLE: ${template.role}`,
      '',
      `TASK: Soạn kịch bản video ngắn cho từ khóa: "${cleanKeyword}"`,
      '',
      'INSTRUCTIONS (theo chủ đề):',
      ...template.instructions.map((item) => `- ${item}`),
      '',
      'OUTPUT STYLE:',
      ...template.outputStyle.map((item) => `- ${item}`),
      '',
      ...formatLines,
    ].join('\n');
  }

  async generateScript(topic: VideoTopic, keyword: string): Promise<string> {
    const prompt = this.buildPrompt(topic, keyword);
    const useJson = isJsonScriptTopic(topic);

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      ...(useJson ? { systemInstruction: JSON_SYSTEM_INSTRUCTION } : {}),
    });

    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();

      if (!useJson) {
        return raw;
      }

      const jsonStr = stripPossibleMarkdownFence(raw);
      const parsed: unknown = JSON.parse(jsonStr);
      const valid = parseAndValidateVeoScript(parsed);
      return JSON.stringify(valid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `AI script failed${useJson ? ' (invalid or non-JSON output)' : ''}: ${msg}`,
      );
    }
  }
}
