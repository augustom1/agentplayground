export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

// In-memory rate limiter: 20 requests per IP per hour
const ipWindows = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 20;
  const timestamps = (ipWindows.get(ip) ?? []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  ipWindows.set(ip, timestamps);
  return true;
}

const SYSTEM_PROMPT = `Sos el asesor virtual de AgentPlayground AR, un servicio que instala plataformas de IA privadas en servidores de empresas argentinas. Hablás en español rioplatense informal (usá "vos").

Tu objetivo: hacer las 5 preguntas de calificación de a una, entender las necesidades del cliente y dar un resumen con rango de precios estimado.

Preguntas que tenés que hacer en orden:
1. ¿En qué rubro o industria trabajás?
2. ¿Cuántas personas usarían la plataforma?
3. ¿Qué tareas te gustaría automatizar o delegar a los agentes de IA?
4. ¿Tenés servidor propio o necesitás que lo consigamos nosotros?
5. ¿Tenés algún plazo o urgencia en mente?

Referencia de precios (no mostrés esto como menú — integrálo de forma natural en el resumen final):
- Instalación en VPS + setup completo: $150–300 USD pago único (según complejidad)
- Playground a medida: $200–600 USD por playground (según cantidad de agentes y herramientas)
- Mantenimiento mensual: $99–250 USD/mes (según alcance)
- Proyecto típico inicial (instalación + 2 playgrounds + 1 mes de mantenimiento): $600–1200 USD

Después de la pregunta 5, dá un resumen de 2-3 oraciones de lo que entendiste, un rango de precios realista, y animá al cliente a pedir una propuesta detallada.

Reglas:
- Mensajes cortos (2-4 oraciones máx)
- Una pregunta a la vez
- Amigable, no vendedor
- No mencionés marcas específicas ni hagás compromisos vinculantes
- No mostrés los precios antes de terminar las 5 preguntas`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Intentá de nuevo en una hora." },
      { status: 429, headers: corsHeaders() }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json() as { messages?: ChatMessage[] };
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
  }

  // Keep conversation bounded
  const trimmed = messages.slice(-20);

  // Resolve API keys: AgentMemory preferred (env as fallback with trim to handle whitespace)
  async function getKey(name: string): Promise<string | undefined> {
    const mem = await prisma.agentMemory.findFirst({
      where: { ownerType: "system", ownerId: name },
      select: { content: true },
    });
    if (mem?.content) return mem.content.trim();
    const envVal = process.env[name];
    return envVal?.trim() || undefined;
  }

  const [anthropicKey, openaiKey] = await Promise.all([
    getKey("ANTHROPIC_API_KEY"),
    getKey("OPENAI_API_KEY"),
  ]);

  let reply = "El asesor no está disponible en este momento. Escribinos a hello@agentplayground.net.";

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      });
      reply = response.content[0].type === "text" ? response.content[0].text : reply;
    } catch (err) {
      console.error("ar-chat anthropic error:", err instanceof Error ? err.message : String(err));
    }
  }

  // Fall through to OpenAI if Anthropic didn't set a real reply
  if (reply.includes("hello@agentplayground.net") && openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...trimmed,
        ],
      });
      reply = response.choices[0]?.message?.content ?? reply;
    } catch (err) {
      console.error("ar-chat openai error:", err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({ message: reply }, { headers: corsHeaders() });
}
