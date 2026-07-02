# Email Templates

> **Note (2026-07-02):** Pricing and business-model details in this file are historical. The current model (open source core; custom playgrounds $350-500; full installations $1,000-1,500; managed hosting ~$100 / ~$180-200 / ~$250-300 per month; Playground Library) lives in `00-overview.md` and `03-services-pricing.md` - use those numbers. The AR site is now a lead-gen page: no listed prices, no MercadoPago checkout.

All templates are in Spanish. Send from hello@agentplayground.net.

---

## 1. Payment Received — Confirmation

**Subject:** ✅ Recibimos tu pago — AgentPlayground [Plan]

```
Hola [Nombre],

¡Tu pago fue acreditado! Estamos muy contentos de que hayas elegido AgentPlayground.

Pedido: [Ref]
Plan: [Básico / Stack Completo / Premium]
Monto: [USD XX]

Para comenzar con la instalación necesitamos:
1. Acceso SSH a tu VPS (IP + usuario + contraseña/clave)
2. El dominio que querés usar (ej: miempresa.com)
3. Confirmación de que el DNS ya apunta al VPS (registros A: @ y * → IP)

¿No tenés VPS todavía? Te recomendamos Hetzner (desde ~€6/mes):
https://www.hetzner.com/cloud — es el que usamos nosotros y el más confiable.

Respondé este email con los datos y empezamos en las próximas 24hs.

Saludos,
Augusto
AgentPlayground AR
hello@agentplayground.net
```

---

## 2. Setup Started

**Subject:** 🚀 Empezamos la instalación — AgentPlayground

```
Hola [Nombre],

¡Perfecto! Ya tenemos todo lo necesario y empezamos con tu instalación ahora.

Dominio: [dominio]
VPS: [IP]
Plan: [Plan]

Te vamos a avisar cuando esté listo. El tiempo estimado es:
- Básico: ~2 horas
- Stack Completo: ~4 horas
- Premium: ~4 horas (soporte comienza después de la entrega)

Te contactamos cuando todo esté funcionando.

Saludos,
Augusto
```

---

## 3. Delivery — Credentials (Básico)

**Subject:** 🎉 Tu stack está listo — Credenciales y accesos

```
Hola [Nombre],

¡Listo! Tu stack está funcionando. Encontrás todo en los siguientes links:

[copiar bloque de credenciales de checklist.md]

IMPORTANTE: Por seguridad, te recomendamos:
1. Guardar estas credenciales en un gestor de contraseñas (Bitwarden es gratis)
2. Cambiar las contraseñas después del primer login
3. Revocar el acceso SSH que nos compartiste

¿Qué tenés instalado?
- https://[dominio] → Tu sitio web (podés subir archivos por FileBrowser)
- https://n8n.[dominio] → n8n automatización (400+ conectores)
- https://files.[dominio] → Gestión de archivos
- https://manage.[dominio] → Panel de administración Docker

Si tenés alguna duda, escribinos a hello@agentplayground.net.

Saludos,
Augusto
AgentPlayground AR
```

---

## 4. Delivery — Credentials (Stack Completo)

**Subject:** 🎉 Tu plataforma de IA está lista — AgentPlayground

```
Hola [Nombre],

¡Todo listo! Tu plataforma de agentes de IA está corriendo en tu servidor.

[copiar bloque de credenciales]

¿Qué podés hacer ahora?

1. CHAT CON TUS AGENTES
   Andá a https://app.[dominio] → Chat
   Seleccioná el modelo "qwen2.5:7b" (local, gratis) o agregá tu API key de Anthropic en Settings para usar Claude.

2. TUS 5 EQUIPOS DE AGENTES están en "Agent Lab":
   - Dev Core: código, debugging, pull requests
   - DevOps: infraestructura, Docker, deploys
   - Product & Design: UX, copy, research
   - Business & Growth: marketing, análisis, estrategia
   - Command Center: coordinador que delega a todos los demás

3. AUTOMATIZACIÓN con n8n:
   https://n8n.[dominio] — conectá 400+ servicios sin código

4. GESTIÓN DE ARCHIVOS:
   https://files.[dominio] — subí archivos que tus agentes pueden leer

¿Tenés API key de Anthropic? Agregala en Settings → API Keys para desbloquear Claude claude-sonnet-4-6.
Podés obtener una en https://console.anthropic.com

Cualquier duda, respondé este email.

Saludos,
Augusto
AgentPlayground AR
```

---

## 5. Premium — Day 1 Check-in

**Subject:** Día 1 — ¿Cómo está yendo todo?

```
Hola [Nombre],

Pasó un día desde que entregamos tu plataforma. ¿Cómo está yendo todo?

¿Pudiste:
- Iniciar sesión sin problemas?
- Charlar con algún agente?
- Explorar n8n?

Si hay algo que no funciona o que no quedó claro, escribime y lo resolvemos hoy.

Recordá que tenés soporte hasta el [fecha fin soporte].

Saludos,
Augusto
```

---

## 6. Premium — Day 30 End of Support + Upsell

**Subject:** Fin del soporte — Opciones para seguir

```
Hola [Nombre],

Hoy termina el período de soporte incluido en tu plan Premium.

Esperamos que la plataforma te haya sido útil este mes.

Si querés continuar con soporte y mantenimiento, tenemos un plan mensual:

PLAN MANTENIMIENTO MENSUAL — $29 USD/mes
✓ Updates del stack aplicados mensualmente
✓ 1 ticket de soporte técnico por mes
✓ Monitoreo de salud del servidor
✓ Renovación automática de certificados SSL verificada

¿Te interesa? Respondé este email y coordinamos.

Si preferís manejarlo vos solo, también está perfecto — el stack es tuyo y está documentado.

Gracias por confiar en nosotros.

Saludos,
Augusto
AgentPlayground AR
```
