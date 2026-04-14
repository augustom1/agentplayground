import { NextRequest, NextResponse } from "next/server";

// CORS: ar.agentplayground.net is a static nginx site that calls this endpoint
// cross-origin. Only that origin (and the prod app itself) is allowed.
const ALLOWED_ORIGINS = [
  "https://ar.agentplayground.net",
  "https://app.agentplayground.net",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Handle preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ---------------------------------------------------------------------------
// Products catalogue — edit prices/descriptions here
// Prices are in USD. MercadoPago handles conversion for local markets.
// ---------------------------------------------------------------------------
const PRODUCTS: Record<string, { title: string; description: string; unit_price: number }> = {
  basico: {
    title: "AgentPlayground — Instalación Básica VPS",
    description: "Instalación del stack completo en tu VPS: Docker, PostgreSQL, Redis, Nginx + Traefik con HTTPS automático.",
    unit_price: 49,
  },
  completo: {
    title: "AgentPlayground — Stack Completo",
    description: "Instalación completa + configuración de AgentPlayground como cerebro de tu plataforma de IA: Ollama, n8n, equipos de agentes y dashboard.",
    unit_price: 149,
  },
  premium: {
    title: "AgentPlayground — Stack Completo + Soporte",
    description: "Todo lo del plan Completo + 30 días de soporte técnico, actualizaciones y backup configurado.",
    unit_price: 299,
  },
};

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "Procesador de pagos no configurado aún. Contactá a hello@agentplayground.net" },
      { status: 503, headers: cors }
    );
  }

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request inválido" }, { status: 400, headers: cors });
  }

  const product = PRODUCTS[body.productId ?? ""];
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 400, headers: cors });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://app.agentplayground.net";
  const arUrl = `https://ar.${process.env.DOMAIN ?? "agentplayground.net"}`;

  const preference = {
    items: [
      {
        title: product.title,
        description: product.description,
        quantity: 1,
        unit_price: product.unit_price,
        currency_id: "USD",
      },
    ],
    back_urls: {
      success: `${arUrl}?status=aprobado`,
      failure: `${arUrl}?status=rechazado`,
      pending: `${arUrl}?status=pendiente`,
    },
    auto_return: "approved",
    statement_descriptor: "AgentPlayground",
    external_reference: `${body.productId}-${Date.now()}`,
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
  };

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preference),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    console.error("[MercadoPago] Error al crear preferencia:", err);
    return NextResponse.json(
      { error: "Error al iniciar el pago. Intentá de nuevo." },
      { status: 500, headers: cors }
    );
  }

  const data = await mpRes.json() as { init_point: string; sandbox_init_point: string };
  return NextResponse.json(
    { init_point: data.init_point, sandbox_init_point: data.sandbox_init_point },
    { headers: cors }
  );
}
