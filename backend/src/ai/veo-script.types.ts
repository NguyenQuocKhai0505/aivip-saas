/**
 * Schema JSON tối ưu cho pipeline: Gemini → Veo 3 (Text-to-Video / Image-to-Video) → ghép clip.
 * Mỗi scene = một lần gọi render; duration_seconds điều phối timeline và quota.
 */
export const VEO_SCENE_COUNT = 3;

/** Giới hạn mỗi clip (có thể chỉnh theo quota Veo thực tế). */
export const VEO_DURATION_PER_SCENE_MIN = 4;
export const VEO_DURATION_PER_SCENE_MAX = 14;

/** TikTok ~30s: tổng duration các scene nên nằm trong khoảng này (giây). */
export const VEO_TOTAL_DURATION_MIN = 27;
export const VEO_TOTAL_DURATION_MAX = 33;

export type VeoSceneJson = {
  scene_number: number;
  /** Thời lượng clip dự kiến cho scene này (giây, số nguyên). */
  duration_seconds: number;
  /**
   * Prompt Text-to-Video / Image-to-Veo: shot, góc máy, ánh sáng, chuyển động, mood.
   * Không chỉ mô tả chữ — phải đủ chi tiết kỹ thuật để model video hiểu.
   */
  visual_prompt: string;
  /** Lời thoại / lồng tiếng khớp scene (TTS hoặc host). */
  audio_script: string;
};

export type VeoScriptPayload = {
  scenes: VeoSceneJson[];
};

/**
 * Ví dụ JSON mẫu (dùng test UI, mock API, hoặc so sánh output Gemini).
 * Lưu ý: visual_prompt nên luôn chi tiết kiểu dưới đây khi gửi Veo 3.
 */
export const VEO_SCRIPT_EXAMPLE: VeoScriptPayload = {
  scenes: [
    {
      scene_number: 1,
      duration_seconds: 10,
      visual_prompt:
        'Text-to-Video, cinematic UGC TikTok style, 9:16 vertical. Medium shot at eye level, soft key light from camera-left, subtle rim light; shallow depth of field. Slow handheld micro-movement toward subject. Young presenter in casual outfit, friendly smile, gestures toward lower-third space. Warm neutral color grade, clean modern indoor background slightly blurred. 24mm lens feel, 4K crisp, no text overlay.',
      audio_script:
        'Bạn có biết ba từ này ở sân bay? Cùng mình học trong mười giây nhé.',
    },
    {
      scene_number: 2,
      duration_seconds: 10,
      visual_prompt:
        'Close-up insert shot, top-down on desk with passport and boarding pass props; smooth slow pan right. Cool daylight-balanced light, high clarity macro detail. Motion: fingers point at printed words on card mockup. Consistent color palette with scene 1. No readable copyrighted logos.',
      audio_script:
        'Check-in — làm thủ tục. Gate — cửa lên máy bay. Boarding — lên tàu bay.',
    },
    {
      scene_number: 3,
      duration_seconds: 10,
      visual_prompt:
        'Wide-to-medium pull-back on same host, golden hour rim, optimistic mood. Static tripod then gentle push-in. Subject gives thumbs-up; optional subtle confetti or bokeh in background (tasteful). End frame holds 1 second feel for outro. Same wardrobe continuity as scene 1.',
      audio_script:
        'Lưu lại video để ôn nha — hẹn bạn ở bài sau.',
    },
  ],
};

export function parseAndValidateVeoScript(data: unknown): VeoScriptPayload {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Root must be a JSON object');
  }
  const scenes = (data as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes) || scenes.length !== VEO_SCENE_COUNT) {
    throw new Error(`scenes must be an array of length ${VEO_SCENE_COUNT}`);
  }

  let totalSec = 0;
  const normalized: VeoSceneJson[] = [];

  scenes.forEach((scene, i) => {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`Scene ${i} invalid`);
    }
    const s = scene as Record<string, unknown>;
    if (typeof s.scene_number !== 'number' || !Number.isInteger(s.scene_number)) {
      throw new Error(`Scene ${i} scene_number must be integer`);
    }
    if (typeof s.duration_seconds !== 'number' || !Number.isInteger(s.duration_seconds)) {
      throw new Error(`Scene ${i} duration_seconds must be integer`);
    }
    if (
      s.duration_seconds < VEO_DURATION_PER_SCENE_MIN ||
      s.duration_seconds > VEO_DURATION_PER_SCENE_MAX
    ) {
      throw new Error(
        `Scene ${i} duration_seconds must be between ${VEO_DURATION_PER_SCENE_MIN} and ${VEO_DURATION_PER_SCENE_MAX}`,
      );
    }
    if (typeof s.visual_prompt !== 'string' || !s.visual_prompt.trim()) {
      throw new Error(`Scene ${i} visual_prompt required`);
    }
    if (typeof s.audio_script !== 'string' || !s.audio_script.trim()) {
      throw new Error(`Scene ${i} audio_script required`);
    }
    totalSec += s.duration_seconds;
    normalized.push({
      scene_number: s.scene_number,
      duration_seconds: s.duration_seconds,
      visual_prompt: String(s.visual_prompt).trim(),
      audio_script: String(s.audio_script).trim(),
    });
  });

  if (totalSec < VEO_TOTAL_DURATION_MIN || totalSec > VEO_TOTAL_DURATION_MAX) {
    throw new Error(
      `Sum of duration_seconds must be between ${VEO_TOTAL_DURATION_MIN} and ${VEO_TOTAL_DURATION_MAX} (got ${totalSec})`,
    );
  }

  const nums = new Set(normalized.map((x) => x.scene_number));
  if (nums.size !== VEO_SCENE_COUNT || ![1, 2, 3].every((n) => nums.has(n))) {
    throw new Error('scene_number must be exactly 1, 2, and 3');
  }

  normalized.sort((a, b) => a.scene_number - b.scene_number);
  return { scenes: normalized };
}
