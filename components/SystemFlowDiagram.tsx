"use client";

import React from "react";

const RUST = "#38BDF8"; // brand blue-cyan — hex needed for alpha-suffix styles below
const BLUE = "#5B8DEF";
const PURPLE = "#9B72DB";
const AMBER = "#E0A030";
const GREEN = "#4CAF50";

function Arrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
      <svg width="12" height="28" viewBox="0 0 12 28" fill="none">
        <line x1="6" y1="0" x2="6" y2="20" stroke="var(--color-border)" strokeWidth="1.5" />
        <path d="M2 18L6 26L10 18" stroke="var(--color-border)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: `1px solid ${accent}30`,
      borderRadius: 10,
      overflow: "hidden",
      background: "var(--color-surface-2)",
    }}>
      <div style={{
        padding: "7px 14px",
        background: `${accent}10`,
        borderBottom: `1px solid ${accent}20`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase" as const,
        color: accent,
      }}>
        {title}
      </div>
      <div style={{ padding: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, sub, color }: { label: string; sub?: string; color?: string }) {
  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column" as const,
      padding: "6px 10px",
      borderRadius: 6,
      border: `1px solid ${color || "var(--color-border)"}35`,
      background: "var(--color-surface-3)",
      fontSize: 12,
    }}>
      <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{label}</span>
      {sub && <span style={{ color: "var(--color-muted)", fontSize: 10, marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

function PresetCard({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div style={{
      padding: "8px 12px",
      borderRadius: 7,
      border: `1px solid ${color}35`,
      background: `${color}08`,
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{ color, fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{label}</div>
      <div style={{ color: "var(--color-muted)", fontSize: 10, lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

export function SystemFlowDiagram() {
  return (
    <div style={{ maxWidth: 660, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0 }}>

      {/* 1. Input */}
      <Section title="Entrada de información" accent={BLUE}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Chip label="App Chat" sub="Directo en el navegador" color={BLUE} />
          <Chip label="Telegram" sub="Móvil · bidireccional" color={BLUE} />
          <Chip label="MCP" sub="Claude Desktop · ChatGPT" color={BLUE} />
        </div>
      </Section>

      <Arrow />

      {/* 2. Brain */}
      <Section title="Cerebro / RAG" accent={PURPLE}>
        <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
          Ingestar → Generar embeddings → pgvector → Clasificar por tipo
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["Ideas / Notas", "Facturas / Datos", "Planes", "Investigación", "Resultados de tareas", "Reportes de sesión"].map(l => (
            <Chip key={l} label={l} color={PURPLE} />
          ))}
        </div>
      </Section>

      <Arrow />

      {/* 3. Coordinator */}
      <Section title="Coordinador" accent={RUST}>
        <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 10 }}>
          Lee contexto del Brain → Detecta pendientes → Formula plan → Pregunta al usuario
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip label="Responde en App" sub="Chat en tiempo real" color={RUST} />
          <Chip label="Responde en Telegram" sub="Modo móvil · asíncrono" color={RUST} />
        </div>
        <div style={{ fontSize: 10, color: "var(--color-muted)", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
          El canal depende del modo configurado en Integrations → Telegram
        </div>
      </Section>

      <Arrow />

      {/* 4. Council */}
      <Section title="Council — Multi-LLM Debate" accent={AMBER}>
        <div style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 12 }}>
          Cada equipo revisa el plan desde su dominio → Consenso + Risk flags + Clasificación de tareas por complejidad
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <PresetCard label="Fast" sub={"1 ronda · Ollama local · $0"} color={GREEN} />
          <PresetCard label="Balanced" sub={"2 rondas · Claude API · Default"} color={AMBER} />
          <PresetCard label="Deep" sub={"3 rondas · Extended thinking"} color="#EF5350" />
        </div>
        <div style={{ fontSize: 10, color: "var(--color-muted)", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
          El Council clasifica cada tarea: ¿requiere API? ¿puede hacerlo Ollama? → Routing automático
        </div>
      </Section>

      <Arrow />

      {/* 5. Execution — split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{
          padding: 14, borderRadius: 10,
          border: `1px solid ${GREEN}30`,
          background: `${GREEN}06`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: GREEN, marginBottom: 8 }}>
            Local — Ollama
          </div>
          <ul style={{ fontSize: 11, color: "var(--color-muted)", margin: 0, paddingLeft: 14, lineHeight: 1.9 }}>
            <li>Resúmenes y clasificación</li>
            <li>Formateo de datos</li>
            <li>Borradores simples</li>
            <li>Council en modo Fast</li>
          </ul>
          <div style={{ marginTop: 10, fontSize: 11, color: GREEN, fontWeight: 500 }}>Costo: $0</div>
        </div>
        <div style={{
          padding: 14, borderRadius: 10,
          border: `1px solid ${AMBER}30`,
          background: `${AMBER}06`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: AMBER, marginBottom: 8 }}>
            API — Claude
          </div>
          <ul style={{ fontSize: 11, color: "var(--color-muted)", margin: 0, paddingLeft: 14, lineHeight: 1.9 }}>
            <li>Razonamiento complejo</li>
            <li>Código y arquitectura</li>
            <li>Decisiones estratégicas</li>
            <li>Council Balanced / Deep</li>
          </ul>
          <div style={{ marginTop: 10, fontSize: 11, color: AMBER, fontWeight: 500 }}>Créditos del plan</div>
        </div>
      </div>

      <Arrow />

      {/* 6. Results loop */}
      <Section title="Resultados → Brain → Próxima sesión" accent={BLUE}>
        <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.7 }}>
          Todo resultado de tarea vuelve al Brain indexado como contexto. Con cada sesión el sistema
          acumula investigaciones, planes ejecutados, código generado y documentación.
          Los agentes locales se vuelven más capaces sin costo adicional.
        </div>
      </Section>
    </div>
  );
}
