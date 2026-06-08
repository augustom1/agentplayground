// SensorGuard playground chat — supports Ollama (local) or Anthropic (API).
// POST /api/sensorguard/playground-chat
// Body: { messages, provider: "ollama"|"anthropic", model, fileContext? }
export const dynamic = "force-dynamic";

import http from "http";
import https from "https";
import { URL } from "url";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Sos el Analista Virtual de SensorGuard, el sistema de gestión de mantenimiento predictivo desarrollado para MetalTech Argentina S.A.

Contexto del proyecto:
- Cliente: MetalTech Argentina S.A., empresa metalúrgica mediana del Gran Buenos Aires, 50 empleados, 3 líneas de producción, 18 máquinas con sensores IoT de temperatura y vibración.
- Problema: 34 fallas imprevistas en 2025, $2.800.000 en pérdidas. Sin sistema centralizado, solo planillas Excel.
- Solución: SensorGuard — dashboard en tiempo real, alertas automáticas por email en <30s, gestión de órdenes de mantenimiento, API REST para sensores.
- Metodología: Scrum con sprints de 2 semanas. Herramientas: Trello, Figma, Draw.io.
- Equipo: Y. Marcano (Product Owner), A. Meyer (Scrum Master), M. Tolaba y S. De Vicenzo (Dev/Tester).

Requerimientos funcionales:
RF01: Dashboard en tiempo real (actualización cada 10s) | RF02: Alertas email <30s | RF03: Órdenes de mantenimiento | RF04: Historial de lecturas y fallas | RF05: Tres perfiles (Operario, Supervisor, Gerente) | RF06: Umbrales por máquina | RF07: Exportación PDF

Requerimientos no funcionales:
RNF01: Respuesta <2s | RNF02: Uptime 99.5% 24/7 | RNF03: Responsive (tablet+desktop) | RNF04: HTTPS+AES-256 | RNF05: Escala a 100 sensores | RNF06: 60% cobertura tests

FODA — Fortalezas: Scrum/IoT/Industria4.0. Oportunidades: adopción IIoT en manufactura. Debilidades: MVP acotado, sin exp industrial. Amenazas: SAP PM, IBM Maximo, ciberseguridad IoT.

Alcance MVP — Incluye: dashboard, alertas, órdenes, historial, usuarios, umbrales, exportación PDF, API REST. Excluye: ERP, IA/ML predictivo, app móvil, MQTT, control remoto.

Respondé siempre en español, de forma clara y concisa.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

interface RequestBody {
  messages: ChatMessage[];
  provider: "ollama" | "anthropic";
  model: string;
  fileContext?: string;
}

function httpPost(urlStr: string, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port || (isHttps ? "443" : "80")),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Connection: "close",
      },
    };
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve(data));
    });
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function callOllama(model: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const payload = JSON.stringify({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: false,
    options: { temperature: 0.7, num_predict: 1024 },
  });
  const raw = await httpPost(`${ollamaUrl}/api/chat`, payload);
  const data = JSON.parse(raw) as { message?: { content: string }; error?: string };
  if (data.error) throw new Error(data.error);
  return data.message?.content ?? "No pude generar una respuesta.";
}

async function callAnthropic(model: string, messages: ChatMessage[], systemPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, provider, model, fileContext } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array required" }, { status: 400 });
  }

  const systemPrompt = fileContext
    ? `${SYSTEM_PROMPT}\n\n---\nDocumento compartido por el usuario:\n${fileContext}`
    : SYSTEM_PROMPT;

  const recent = messages.slice(-12);

  try {
    let response: string;
    if (provider === "anthropic") {
      response = await callAnthropic(model || "claude-haiku-4-5-20251001", recent, systemPrompt);
    } else {
      response = await callOllama(model || "qwen2.5:3b", recent, systemPrompt);
    }
    return Response.json({ response });
  } catch (err) {
    console.error("[sensorguard/playground-chat] error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 503 });
  }
}
