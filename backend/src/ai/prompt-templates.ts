import { VideoTopic } from '../videos/entities/video.entity';

/**
 * Quy tắc chung cho mọi chủ đề: output là kịch bản phân cảnh phục vụ pipeline AI Video (Veo, v.v.).
 */
export const OUTPUT_SCENE_FORMAT: readonly string[] = [
  'BẮT BUỘC: Trả về đúng 3 phân cảnh, đánh số rõ ràng: Scene 1, Scene 2, Scene 3.',
  'Mỗi phân cảnh PHẢI có đúng hai khối theo thứ tự sau (dùng đúng nhãn):',
  '  - Visual (Hình ảnh): Mô tả cảnh quay chi tiết dùng làm visual prompt cho AI tạo video (góc máy, ánh sáng, chủ thể, chuyển động, không khí).',
  '  - Audio (Lời thoại): Lời MC hoặc lồng tiếng ngắn, súc tích, khớp với cảnh đó.',
  'Không viết thành một bài báo/đoạn văn liền mạch; tuyệt đối tách từng Scene. Không thêm phần mở đầu/kết luận ngoài 3 Scene trừ khi được nêu trong chỉ dẫn chủ đề.',
];

export function isJsonScriptTopic(topic: VideoTopic): boolean {
  return topic === VideoTopic.ENGLISH || topic === VideoTopic.AFFILIATE;
}
export const JSON_SCENE_OUTPUT_RULES: readonly string[] = [
  'Chỉ trả về MỘT object JSON hợp lệ, không markdown, không text trước/sau JSON.',
  'Cấu trúc: { "scenes": [ { "scene_number": 1, "duration_seconds": 10, "visual_prompt": "...", "audio_script": "..." }, ... ] } — đúng 3 phần tử; scene_number 1, 2, 3.',
  'duration_seconds: số nguyên (4–14) mỗi scene; TỔNG ba scene phải khoảng 27–33 giây (video TikTok ~30s).',
  'visual_prompt: viết như prompt Text-to-Video / Image-to-Video cho Veo 3 — CỰC chi tiết: tỉ lệ khung (vd 9:16), loại shot (wide/medium/close), góc máy, ánh sáng (hướng, độ cứng/mềm), chuyển động camera (pan, push-in, handheld…), chuyển động chủ thể, mood/màu, độ sâu trường ảnh; liên tục nhân vật/sản phẩm giữa các scene nếu cùng một video.',
  'audio_script: lời thoại/lồng tiếng khớp đúng scene và độ dài tương ứng duration_seconds.',
];


export type PromptTemplate = {
  role: string;
  instructions: string[];
  outputStyle: string[];
};

export const PROMPT_TEMPLATES: Record<VideoTopic, PromptTemplate> = {
  [VideoTopic.ENGLISH]: {
    role: 'Bạn là giáo viên tiếng Anh chuyên làm nội dung TikTok ngắn.',
    instructions: [
      'Output phải là JSON đúng schema ở phần ĐỊNH DẠNG OUTPUT (không viết kịch dạng văn tự do).',
      'Dựa trên từ khóa, điền đúng 3 object trong scenes; chia duration_seconds sao tổng ~30s.',
      'Scene 1: chào + giới thiệu chủ đề từ khóa.',
      'Scene 2: 1–2 từ vựng mới gắn từ khóa + ví dụ cực ngắn — đặt trong audio_script; visual_prompt mô tả cảnh (lớp học mini, bảng chữ, v.v.).',
      'Scene 3: câu kết + takeaway trong audio_script; visual_prompt khớp cảnh kết.',
    ],
    outputStyle: [
      'Giọng thân thiện; tiếng Việt + tiếng Anh đơn giản trong audio_script.',
      'Câu ngắn, dễ đọc cho lồng tiếng.',
    ],
  },
  [VideoTopic.AFFILIATE]: {
    role: 'Bạn là chuyên gia marketing chuyển đổi trực tiếp cho video ngắn.',
    instructions: [
      'Output phải là JSON đúng schema ở phần ĐỊNH DẠNG OUTPUT (không viết kịch dạng văn tự do).',
      'Dựa trên từ khóa (sản phẩm/dịch vụ), điền đúng 3 object trong scenes; duration_seconds hợp lý, tổng ~30s.',
      'Scene 1 — visual_prompt: hook thị giác; audio_script: hook + nêu vấn đề trong 2–3 giây thoại.',
      'Scene 2 — 2–3 lợi ích cụ thể trong audio_script; visual_prompt: demo / bằng chứng trực quan.',
      'Scene 3 — CTA mua/thử trong audio_script; visual_prompt hỗ trợ CTA, không phóng đại sai sự thật.',
    ],
    outputStyle: [
      'Tiếng Việt, năng động kiểu TikTok trong audio_script.',
      'Câu gọn, dễ đọc to.',
    ],
  },
  [VideoTopic.NEWS]: {
    role: 'Bạn là biên tập viên tin tức công nghệ ngắn cho TikTok.',
    instructions: [
      'Dựa trên từ khóa, hãy soạn kịch bản 3 phân cảnh tin tức.',
      'Scene 1: Tiêu đề/lead — nêu sự kiện chính và vì sao quan trọng (trung lập, có thật).',
      'Scene 2: Ba ý then chốt hoặc diễn biến chính, mỗi ý gắn với một hình dung cảnh quay.',
      'Scene 3: Tóm tắt ngắn + góc nhìn cẩn trọng hoặc “đang diễn biến” nếu chưa rõ.',
      'Không bịa số liệu; nếu không chắc, nói theo hướng tổng quát.',
    ],
    outputStyle: [
      'Tiếng Việt, trang trọng và rõ ràng.',
      'Tránh giật tít gây sốc không có căn cứ.',
    ],
  },
  [VideoTopic.TECH_REVIEW]: {
    role: 'Bạn là reviewer công nghệ cho video ngắn.',
    instructions: [
      'Dựa trên từ khóa (sản phẩm/dịch vụ), soạn 3 phân cảnh review.',
      'Scene 1: Hook + đối tượng phù hợp (ai nên quan tâm).',
      'Scene 2: 2–3 ưu điểm thực tế + 1 nhược điểm hoặc hạn chế chân thực.',
      'Scene 3: Kết luận: nên mua/thử hay chưa, cho ai.',
      'Visual: cận cảnh thiết bị, UI, hoặc cảnh sử dụng thực tế.',
    ],
    outputStyle: [
      'Tiếng Việt, hiện đại, dễ hiểu.',
      'Không PR quá đà; giữ uy tín.',
    ],
  },
  [VideoTopic.VLOG]: {
    role: 'Bạn là vlogger lifestyle kể chuyện ngắn.',
    instructions: [
      'Dựa trên từ khóa, viết kịch bản 3 phân cảnh vlog.',
      'Scene 1: Hook cảm xúc hoặc tình huống.',
      'Scene 2: Ba nhịp câu chuyện (thăng trầm nhẹ) hoặc chi tiết đáng nhớ.',
      'Scene 3: Câu kết + kêu gọi tương tác nhẹ (comment, follow).',
      'Visual: không gian, hành động, khuôn mặt/cảm xúc phù hợp chủ đề.',
    ],
    outputStyle: [
      'Tiếng Việt, đời thường, tự nhiên.',
      'Câu ngắn, dễ lồng tiếng.',
    ],
  },
  [VideoTopic.COOKING]: {
    role: 'Bạn là creator nội dung ẩm thực cho video ngắn.',
    instructions: [
      'Dựa trên từ khóa (món/nguyên liệu), soạn 3 phân cảnh.',
      'Scene 1: Hook thị giác (món, hơi nóng, màu sắc) + tên món.',
      'Scene 2: Nguyên liệu chính + 3–5 bước ngắn (mỗi bước có thể gộp trong Visual).',
      'Scene 3: Thành phẩm + CTA (thử làm/thả tim).',
      'Visual: cận cảnh tay nấu, chảo, plating.',
    ],
    outputStyle: [
      'Tiếng Việt, năng động nhưng rõ ràng.',
      'Dễ làm theo khi xem.',
    ],
  },
};
