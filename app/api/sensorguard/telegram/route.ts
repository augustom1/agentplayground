// Telegram webhook for @sensorguard_analista_bot
// Token env: TELEGRAM_SENSORGUARD_BOT_TOKEN
// Webhook URL: https://app.agentplayground.net/api/sensorguard/telegram
// CLEANUP: delete after 2026-06-19 (along with /api/sensorguard/chat and webroot/sensorguard/)

export const dynamic = "force-dynamic";

import http from "http";
import https from "https";
import { URL } from "url";

const SYSTEM_PROMPT = `Sos el Analista Virtual de SensorGuard, el sistema de gestión de mantenimiento predictivo desarrollado para MetalTech Argentina S.A.

Contexto del proyecto:
- Cliente: MetalTech Argentina S.A., empresa metalúrgica mediana del Gran Buenos Aires, 50 empleados, 3 líneas de producción, 18 máquinas con sensores IoT de temperatura y vibración.
- Problema: 34 fallas imprevistas en 2025, $2.800.000 en pérdidas. Sin sistema centralizado, solo planillas Excel.
- Solución: SensorGuard, aplicación web que integra sensores vía API REST, dashboard en tiempo real, alertas automáticas, gestión de órdenes de mantenimiento.
- Metodología: Scrum con sprints de 2 semanas. Herramientas: Trello, Figma, Draw.io.
- Equipo: Y. Marcano (Product Owner), A. Meyer (Scrum Master), M. Tolaba y S. De Vicenzo (Dev/Tester).

Requerimientos funcionales:
- RF01: Dashboard en tiempo real, actualización cada 10 segundos
- RF02: Alertas automáticas por email en menos de 30 segundos al superar umbral
- RF03: Gestión de órdenes de mantenimiento
- RF04: Historial de lecturas y fallas
- RF05: Tres perfiles de usuario (Operario, Supervisor, Gerente)
- RF06: Configuración de umbrales por máquina
- RF07: Exportación de reportes PDF

Requerimientos no funcionales:
- RNF01: Respuesta del dashboard < 2 segundos
- RNF02: Disponibilidad 99.5% (24/7)
- RNF03: Interfaz responsive (tablet + desktop)
- RNF04: HTTPS + AES-256 en reposo
- RNF05: Escala hasta 100 sensores sin rediseño
- RNF06: 60% cobertura de tests unitarios

FODA del proyecto:
- Fortalezas: dominio de Scrum/Kanban, conocimiento de IoT/Industria 4.0, rol Analista/Tester integrado desde el inicio
- Oportunidades: adopción del IIoT en manufactura, sensores accesibles, cliente ya tiene sensores instalados
- Debilidades: MVP acotado, sin experiencia en sistemas industriales, dependencia de infraestructura del cliente
- Amenazas: SAP PM e IBM Maximo en el mercado, resistencia al cambio, ciberseguridad IoT, variaciones presupuestarias

Alcance del MVP:
- Incluye: dashboard, alertas email, órdenes de mantenimiento, historial, usuarios, configuración de umbrales, exportación PDF, API REST para sensores
- Excluye: integración ERP, IA/ML predictivo, app móvil nativa, MQTT, control remoto de máquinas

Respondé siempre en español, de forma clara y concisa. Usá formato de texto plano, sin markdown con asteriscos — Telegram ya muestra el texto bien.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

// Per-chat conversation history (resets on redeploy — fine for demo)
const history = new Map<number, ChatMessage[]>();
const MAX_HISTORY = 10;

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

    req.setTimeout(90000, () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function callOllama(messages: ChatMessage[]): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const payload = JSON.stringify({
    model: "qwen2.5:3b",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    stream: false,
    options: { temperature: 0.7, num_predict: 512 },
  });

  const raw = await httpPost(`${ollamaUrl}/api/chat`, payload);
  const data = JSON.parse(raw) as { message?: { content: string }; error?: string };
  if (data.error) throw new Error(data.error);
  return data.message?.content || "No pude generar una respuesta. Intentá de nuevo.";
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await httpPost(url, JSON.stringify({ chat_id: chatId, text }));
}

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { first_name?: string };
  };
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_SENSORGUARD_BOT_TOKEN;
  if (!token) {
    console.error("[sensorguard/telegram] TELEGRAM_SENSORGUARD_BOT_TOKEN not set");
    return Response.json({ ok: false }, { status: 500 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const message = update?.message;
  if (!message?.text || !message?.chat?.id) return Response.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    await sendMessage(
      token,
      chatId,
      "Hola! Soy el Analista Virtual de SensorGuard.\n\nPuedo responder preguntas sobre el proyecto MetalTech Argentina: requerimientos, FODA, metodología, alcance y más.\n\n¿En qué puedo ayudarte?"
    );
    return Response.json({ ok: true });
  }

  if (text.startsWith("/reset")) {
    history.delete(chatId);
    await sendMessage(token, chatId, "Historial borrado. Empezamos de nuevo.");
    return Response.json({ ok: true });
  }

  // Typing indicator
  try {
    await httpPost(
      `https://api.telegram.org/bot${token}/sendChatAction`,
      JSON.stringify({ chat_id: chatId, action: "typing" })
    );
  } catch { /* non-critical */ }

  const msgs = history.get(chatId) || [];
  msgs.push({ role: "user", content: text });
  if (msgs.length > MAX_HISTORY) msgs.splice(0, msgs.length - MAX_HISTORY);
  history.set(chatId, msgs);

  let reply: string;
  try {
    reply = await callOllama(msgs);
  } catch (err) {
    console.error("[sensorguard/telegram] Ollama error:", err);
    reply = "Hubo un error al procesar tu consulta. Intentá de nuevo en unos segundos.";
  }

  msgs.push({ role: "assistant", content: reply });
  history.set(chatId, msgs);

  await sendMessage(token, chatId, reply);
  return Response.json({ ok: true });
}
