# Diseño Web — GuardTech Solutions (empresa creadora de SensorGuard)

**Objetivo:** Sitio institucional/comercial de la empresa que desarrolla y vende SensorGuard.
Promociona la app, captura leads (pedir demo/piloto) e incluye un chatbot de consultas con Ollama.

**Destino:** subdominio de `agentplayground.net` (sugerido: `guardtech.agentplayground.net`).
La demo de la app ya vive en `sensorguard.agentplayground.net` — el sitio linkea a ella.

> El nombre "GuardTech Solutions" es una propuesta. Si el equipo elige otro, buscar y
> reemplazar `GuardTech` en `index.html` (está centralizado en variables y texto).

---

## 1. Identidad visual

Coherente con la paleta del pitch de Canva (`Entregas PPI/guion_pitch_canva.md`) para que
presentación, demo y web se vean como un mismo producto.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0D1117` | Fondo principal (negro industrial) |
| `--bg-alt` | `#161B22` | Secciones alternas / tarjetas |
| `--border` | `#21262D` | Bordes sutiles |
| `--accent` | `#00E083` | Verde IoT — CTAs, estados OK (ajustado de #00FF88 por contraste AA sobre oscuro y legibilidad de texto oscuro encima) |
| `--accent-2` | `#00B4D8` | Cyan — links, detalles secundarios |
| `--danger` | `#FF4444` | Estados de alerta (solo ilustrativo en mockups) |
| `--warn` | `#F0B429` | Estado advertencia |
| `--text` | `#F0F6FC` | Texto principal (contraste >12:1 sobre `--bg`) |
| `--text-dim` | `#9BA7B4` | Texto secundario (≥4.5:1 sobre `--bg`) |

**Tipografía:** `Inter` (Google Fonts, `font-display: swap`). Títulos 700/800, cuerpo 400, labels 500.
Escala: 13 / 15 / 16 / 18 / 22 / 32 / 44-56 (hero con `clamp()`). Cuerpo base 16px, line-height 1.6.

**Estilo:** dark industrial + acentos neón sutiles. Tarjetas planas con borde 1px, radio 12px,
sin glassmorphism pesado. Íconos SVG inline (estilo Lucide, stroke 2px) — **nunca emojis como íconos**.
Animaciones solo `transform/opacity`, 150–300ms, con `prefers-reduced-motion` respetado.

## 2. Estructura de la página (single page)

1. **Navbar fija** — logo GuardTech, links ancla (Producto, Cómo funciona, Resultados, Empresa, Contacto), CTA "Ver demo en vivo" → sensorguard.agentplayground.net.
2. **Hero** — titular de venta ("Sus máquinas avisan antes de fallar"), subtítulo con propuesta de valor, 2 CTAs (primario: Ver demo / secundario: Hablar con nosotros), mockup del dashboard hecho en CSS (tarjetas de máquinas con estados verde/amarillo/rojo animados).
3. **Barra de métricas** — 15% tiempo perdido, $2.8M pérdidas/año, ≤30s alerta, 99.5% uptime.
4. **El problema** — 3 tarjetas (sin visibilidad, averías sin causa raíz, alertas que llegan tarde). Basado en el relevamiento real al cliente (Cuestionario).
5. **Producto SensorGuard** — grid de 6 features (dashboard 10s, alertas email ≤30s, órdenes de mantenimiento, historial, roles, umbrales por máquina + reportes PDF).
6. **Cómo funciona** — flujo 4 pasos: Sensor IoT → API REST → Detección → Alerta + OT.
7. **Resultados / ROI** — comparativa antes/después, cita de cliente (MetalTech, caso simulado).
8. **Empresa / equipo** — quiénes somos (los 4 integrantes con roles), misión.
9. **CTA final + contacto** — formulario simple (nombre, email, empresa, mensaje) `mailto:` o endpoint a definir; oferta de piloto 30 días.
10. **Footer** — links, contacto, "SensorGuard es un producto de GuardTech Solutions".
11. **Chatbot flotante** (ver §3).

Responsive mobile-first: breakpoints 768 / 1024. Container `max-width: 1120px`.

## 3. Chatbot (Ollama)

Widget flotante abajo a la derecha (botón circular ≥48px → panel de chat).

**Arquitectura:**
```
Navegador ──POST /api/chat──▶ Reverse proxy (nginx/caddy en el servidor)
                                   └──▶ Ollama local: http://127.0.0.1:11434/api/chat
```
- El frontend **nunca** llama a `:11434` directo (CORS + no exponer Ollama a internet).
- El proxy solo expone `POST /api/chat` y debería limitar tamaño/rate.
- Config en `index.html`: objeto `CHATBOT_CONFIG` (endpoint, modelo, system prompt).
- Modelo sugerido: `llama3.2:3b` o `qwen2.5:3b` (rápidos en CPU). `stream: false` para simplicidad.
- **System prompt** ya redactado en el código: asistente comercial de GuardTech, responde en
  español sobre SensorGuard (features, precios → "agendar reunión", piloto, requisitos técnicos).
- **Fallback sin conexión:** si el fetch falla, responde con respuestas predefinidas por
  palabras clave (precio / demo / sensores / contacto) y ofrece el email. El sitio nunca muestra un chat roto.
- Accesibilidad: `aria-live="polite"` en mensajes, foco al abrir, cierre con Escape.

## 4. Notas para el deploy (sesión aparte)

Ver `INSTRUCCIONES_DEPLOY.md` — incluye el prompt sugerido para la otra sesión de Claude Code,
la config de nginx para el subdominio y el proxy de Ollama.
