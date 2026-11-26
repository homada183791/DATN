import { Injectable, Logger } from '@nestjs/common';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  maxTokens: number;
  temperature?: number;
  /** Ghi đè AI_TIMEOUT_MS cho lượt gọi dài (vd. viết chương trình sinh test). */
  timeoutMs?: number;
}

export interface AiCompletionResult {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

/**
 * Gọi một API tương thích chuẩn OpenAI (/chat/completions), ví dụ APIZ.
 * Cấu hình qua biến môi trường:
 *   AI_BASE_URL        vd. https://api.apiz.vn/v1
 *   AI_API_KEY         sk-...
 *   AI_MODEL_TUTOR     model chính (mặc định glm-5.3-flash)
 *   AI_MODEL_FALLBACK  model dự phòng khi model chính lỗi hoặc trả rỗng
 *   AI_TIMEOUT_MS      mặc định 30000
 * Thiếu AI_BASE_URL hoặc AI_API_KEY thì isConfigured() = false và AiService
 * dùng câu trả lời soạn sẵn (chế độ offline), app vẫn chạy bình thường.
 */
@Injectable()
export class AiProvider {
  private readonly logger = new Logger(AiProvider.name);

  /** Test có thể gán lại để giả lập API. */
  fetchImpl: typeof fetch = (input, init) => globalThis.fetch(input, init);

  isConfigured(): boolean {
    return Boolean(
      process.env.AI_BASE_URL?.trim() && process.env.AI_API_KEY?.trim(),
    );
  }

  models(): string[] {
    const primary = process.env.AI_MODEL_TUTOR?.trim() || 'glm-5.3-flash';
    const fallback = process.env.AI_MODEL_FALLBACK?.trim();
    return fallback && fallback !== primary ? [primary, fallback] : [primary];
  }

  /** Thử lần lượt model chính rồi model dự phòng. Ném lỗi nếu tất cả đều thất bại. */
  async complete(req: AiCompletionRequest): Promise<AiCompletionResult> {
    if (!this.isConfigured()) throw new Error('AI provider is not configured');
    let lastError: unknown;
    for (const model of this.models()) {
      try {
        const result = await this.callModel(model, req);
        if (result.text.trim()) return result;
        lastError = new Error(`empty response from ${model}`);
      } catch (err) {
        lastError = err;
        this.logger.warn(
          `[AI] ${model} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('AI request failed');
  }

  private async callModel(
    model: string,
    req: AiCompletionRequest,
  ): Promise<AiCompletionResult> {
    const base = process.env.AI_BASE_URL!.trim().replace(/\/+$/, '');
    const timeoutMs = req.timeoutMs ?? (Number(process.env.AI_TIMEOUT_MS) || 30_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();

    const body: Record<string, unknown> = {
      model,
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature ?? 0.3,
    };
    // Dòng GLM mặc định "suy nghĩ" trước khi trả lời, tốn token và dễ bị cắt cụt
    // câu trả lời. Đã đo: tắt đi nhanh hơn ~2,5 lần mà chất lượng giải thích lỗi vẫn tốt.
    if (model.startsWith('glm')) body.thinking = { type: 'disabled' };

    try {
      const res = await this.fetchImpl(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY!.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const json = (await res.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };
      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}: ${json.error?.message ?? 'request failed'}`,
        );
      }
      return {
        text: json.choices?.[0]?.message?.content ?? '',
        model,
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
