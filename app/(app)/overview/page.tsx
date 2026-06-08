import { SystemFlowDiagram } from "@/components/SystemFlowDiagram";

export const metadata = { title: "How It Works — Agent Playground" };

export default function OverviewPage() {
  return (
    <div style={{ padding: "32px 24px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
          How It Works
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7, maxWidth: 560 }}>
          Agent Playground es un sistema que aprende y crece con vos. La información entra por
          cualquier canal, los agentes la organizan en el Brain, el Coordinador pregunta qué
          necesitás, y el Council divide el trabajo para que los LLMs locales hagan lo que pueden
          sin gastar créditos del API.
        </p>
      </div>

      <SystemFlowDiagram />

      <div style={{ marginTop: 40, padding: "20px 24px", borderRadius: 10, background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted)", marginBottom: 12 }}>
          Principios de diseño
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { label: "Local-first", desc: "Ollama corre en el mismo servidor — sin latencia de red, sin costo." },
            { label: "Brain como memoria", desc: "Cada acción deja un rastro. Los agentes recuerdan lo que hicieron." },
            { label: "Council antes de actuar", desc: "Decisiones importantes pasan por debate multi-perspectiva." },
            { label: "Cualquier canal", desc: "App o Telegram — el Coordinador responde donde estés." },
          ].map(({ label, desc }) => (
            <div key={label}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
