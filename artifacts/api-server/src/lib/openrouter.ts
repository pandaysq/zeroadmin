import { logger } from "./logger";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3-8b-instruct:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `Ты — опытный Linux сисадмин. Кратко, в 2-3 предложениях, объясни администратору причину сбоя на основе предоставленных данных и логов, и дай конкретную SSH-команду для решения проблемы. Говори простым человеческим языком. Команду оформляй в отдельную строку, начиная с символа $. Не используй markdown-разметку кроме символа $ перед командой.`;

export interface AnalysisInput {
  alertType: string;
  message: string;
  serverName: string;
  cpuPercent?: number;
  memoryPercent?: number;
  topProcess?: string;
  lastLogs?: string;
}

export async function analyzeIncident(input: AnalysisInput): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return "AI-анализ недоступен: OPENROUTER_API_KEY не настроен. Добавьте ключ в переменные окружения.";
  }

  const userMessage = `
Инцидент на сервере: ${input.serverName}
Тип алерта: ${input.alertType}
Сообщение: ${input.message}
${input.cpuPercent != null ? `CPU: ${input.cpuPercent.toFixed(1)}%` : ""}
${input.memoryPercent != null ? `RAM: ${input.memoryPercent.toFixed(1)}%` : ""}
${input.topProcess ? `Топ процесс: ${input.topProcess}` : ""}
${input.lastLogs ? `\nПоследние системные логи:\n${input.lastLogs}` : ""}
`.trim();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://zeroadmin.app",
        "X-Title": "ZeroAdmin",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.warn({ status: response.status, err }, "OpenRouter API error");
      return `Ошибка AI-анализа: ${response.status} — ${response.statusText}`;
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || "AI не вернул ответ.";
  } catch (err) {
    logger.error({ err }, "OpenRouter fetch failed");
    return "Ошибка подключения к AI-сервису.";
  }
}
