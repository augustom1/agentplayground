// Seed the SensorGuard presentation playground team + agents in the DB.
// Idempotent: checks by name before creating.
// POST /api/sensorguard/seed-team
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

const SG_CONTEXT = `
Contexto SensorGuard — MetalTech Argentina S.A.:
- Cliente: empresa metalúrgica mediana del Gran Buenos Aires, 50 empleados, 3 líneas de producción, 18 máquinas con sensores IoT.
- Problema: 34 fallas imprevistas en 2025, $2.800.000 en pérdidas. Solo usaban planillas Excel.
- Solución: SensorGuard — dashboard en tiempo real, alertas automáticas por email, gestión de órdenes de mantenimiento, API REST para sensores.
- Metodología: Scrum, sprints de 2 semanas. Trello, Figma, Draw.io.
- Equipo: Y. Marcano (Product Owner), A. Meyer (Scrum Master), M. Tolaba y S. De Vicenzo (Dev/Tester).
RF: dashboard <10s, alertas <30s, órdenes de mantenimiento, historial, 3 perfiles (Operario/Supervisor/Gerente), umbrales configurables, exportación PDF.
RNF: respuesta <2s, uptime 99.5%, responsive, HTTPS+AES-256, escala a 100 sensores, 60% cobertura tests.
Alcance MVP: dashboard, alertas, órdenes, historial, usuarios, umbrales, PDF. Excluye: ERP, IA/ML predictivo, app móvil, MQTT.
FODA — Fortalezas: Scrum/IoT/Industria4.0. Oportunidades: IIoT en manufactura. Debilidades: MVP acotado, sin exp industrial. Amenazas: SAP PM, IBM Maximo, ciberseguridad IoT.
Respondé siempre en español.`.trim();

const AGENTS = [
  {
    name: "Coordinador SensorGuard",
    description: "Visión completa del proyecto. Primer punto de contacto para cualquier consulta.",
    model: "claude-haiku-4-5-20251001",
    capabilities: ["coordination", "project-overview", "routing"],
    systemPrompt: `Sos el Coordinador del equipo de presentación de SensorGuard. Tenés visión completa del proyecto y respondés consultas generales o las derivás al especialista correcto. Sé conciso y claro.\n\n${SG_CONTEXT}`,
    temperature: 0.7,
    maxTokens: 2048,
  },
  {
    name: "Presentador",
    description: "Experto en flujo y storytelling de la presentación. Script, timing, narrativa.",
    model: "claude-haiku-4-5-20251001",
    capabilities: ["presentation", "storytelling", "communication"],
    systemPrompt: `Sos el experto en presentaciones del equipo SensorGuard. Ayudás con el flujo de slides, el script de cada sección, el timing, cómo abrir y cerrar, y cómo comunicar el problema-solución de forma convincente ante el tribunal.\n\n${SG_CONTEXT}`,
    temperature: 0.8,
    maxTokens: 2048,
  },
  {
    name: "Analista Técnico",
    description: "Profundiza en RF, RNF, arquitectura, stack y decisiones técnicas.",
    model: "claude-haiku-4-5-20251001",
    capabilities: ["technical-analysis", "requirements", "architecture"],
    systemPrompt: `Sos el experto técnico del equipo SensorGuard. Respondés preguntas sobre requerimientos funcionales y no funcionales, arquitectura del sistema, stack tecnológico, seguridad IoT, decisiones de diseño y tradeoffs técnicos.\n\n${SG_CONTEXT}`,
    temperature: 0.5,
    maxTokens: 2048,
  },
  {
    name: "Coach Q&A",
    description: "Anticipa preguntas del tribunal y público. Prepara respuestas concisas.",
    model: "claude-haiku-4-5-20251001",
    capabilities: ["qa-preparation", "coaching", "objection-handling"],
    systemPrompt: `Sos el coach de preguntas y respuestas del equipo SensorGuard. Anticipás preguntas difíciles del tribunal y el público sobre el proyecto, el mercado, la viabilidad técnica y el equipo. Preparás respuestas concisas, honestas y convincentes.\n\n${SG_CONTEXT}`,
    temperature: 0.7,
    maxTokens: 2048,
  },
];

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const userId = session.user.id;

    // Find or create AgentTeam for SensorGuard agents
    let agentTeam = await prisma.agentTeam.findFirst({
      where: { name: "SensorGuard Presentación" },
    });

    if (!agentTeam) {
      agentTeam = await prisma.agentTeam.create({
        data: {
          name: "SensorGuard Presentación",
          description: "Agentes especializados para la presentación de SensorGuard — MetalTech Argentina S.A.",
          port: 0,
          status: "idle",
          permissions: [],
        },
      });
    }

    // Find existing playground team
    const existingPlayground = await prisma.playgroundTeam.findFirst({
      where: { name: "SensorGuard Presentación", userId },
      include: { members: { include: { agent: { select: { id: true, name: true } } } } },
    });

    if (existingPlayground) {
      return NextResponse.json({ teamId: existingPlayground.id, created: false });
    }

    // Create agents
    const createdAgents = await Promise.all(
      AGENTS.map((a) =>
        prisma.agent.create({
          data: { ...a, teamId: agentTeam.id },
          select: { id: true, name: true },
        })
      )
    );

    // Create playground team
    const playground = await prisma.playgroundTeam.create({
      data: {
        name: "SensorGuard Presentación",
        description: "Equipo de agentes especializado en la presentación de SensorGuard para MetalTech Argentina S.A.",
        emoji: "🏭",
        color: "#D4715A",
        userId,
        config: {
          systemPrompt: SG_CONTEXT,
          responseStyle: "individual",
          widgets: [
            { id: "core-agents", type: "agents_count", title: "Agentes", size: "sm", position: 0 },
            { id: "core-groups", type: "groups_count", title: "Grupos", size: "sm", position: 1 },
          ],
        },
        members: {
          create: createdAgents.map((a, i) => ({
            agentId: a.id,
            role: AGENTS[i].capabilities[0],
            group: "Presentación",
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ teamId: playground.id, created: true });
  } catch (err) {
    return apiError(err);
  }
}
