// Public chatbot API for sensorguard.agentplayground.net
// No auth required — uses local Ollama LLM.
// CLEANUP: delete this file after 2026-06-19.

export const dynamic = "force-dynamic";

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

Podés responder preguntas sobre:
- Decisiones técnicas del proyecto
- Qué hace cada requerimiento y por qué tiene esa prioridad
- Diferencia entre requerimientos funcionales y no funcionales
- Qué es el FODA y por qué se hizo así
- Cómo se desarrolla con Scrum
- Cualquier aspecto del análisis de sistemas aplicado a este proyecto

Respondé siempre en español, de forma clara y concisa. Si te preguntan algo fuera del scope del proyecto, podés responder brevemente pero redirigí al tema del sistema.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

export async function POST(req: Request) {
  // CORS — allow the sensorguard subdomain
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://sensorguard.agentplayground.net",
    "http://localhost:3000",
    "http://localhost",
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array required" }, { status: 400, headers: corsHeaders });
  }

  // Keep last 10 messages to avoid context overflow
  const recentMessages = messages.slice(-10);

  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const model = "qwen2.5:7b";

  try {
    const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...recentMessages,
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1024,
        },
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      console.error("[sensorguard/chat] Ollama error:", ollamaRes.status, errText);
      return Response.json(
        { error: "LLM unavailable", detail: ollamaRes.status },
        { status: 503, headers: corsHeaders }
      );
    }

    const data = (await ollamaRes.json()) as {
      message?: { content: string };
    };

    const response = data.message?.content || "No pude generar una respuesta. Intentá de nuevo.";
    return Response.json({ response }, { headers: corsHeaders });
  } catch (err) {
    console.error("[sensorguard/chat] fetch error:", err);
    return Response.json(
      { error: "Connection failed" },
      { status: 503, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://sensorguard.agentplayground.net",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
