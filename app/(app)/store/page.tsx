"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Check, ArrowRight, Download, Wrench, X } from "lucide-react";
import { STORE_APPS, STORE_CONTACT, type StoreApp } from "@/lib/store-catalog";

function priceLabel(price: StoreApp["price"]): string {
  if (price === "free") return "Free";
  if (price === "included") return "Free on subscription";
  return `$${price}`;
}

export default function StorePage() {
  const [buying, setBuying] = useState<StoreApp | null>(null);

  const apps = STORE_APPS.filter(a => a.category === "app");
  const playgrounds = STORE_APPS.filter(a => a.category === "playground");

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 900, padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Store size={20} style={{ color: "var(--color-brand)" }} />
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>Store</h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 28px", lineHeight: 1.6, maxWidth: 640 }}>
        Apps and ready-made playgrounds you can add to your platform. Free apps are yours to use.
        A subscription unlocks the &quot;included&quot; playgrounds; other packs can be bought one-off.
        You can also build your own and drop it in.
      </p>

      <Section title="Apps">
        {apps.map(a => <AppCard key={a.id} app={a} onBuy={setBuying} />)}
      </Section>

      <Section title="Playground Library">
        {playgrounds.map(a => <AppCard key={a.id} app={a} onBuy={setBuying} />)}
      </Section>

      {/* Build your own */}
      <div style={{
        marginTop: 28, background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <Wrench size={22} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>Build your own app</div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "3px 0 0", lineHeight: 1.55 }}>
            Grab the free template folder and a short guide, build with Claude Code, and it drops straight
            into the platform. See <code style={{ color: "var(--color-text)" }}>downloads/playground-app-template/README.md</code>.
          </p>
        </div>
      </div>

      {/* Crypto purchase panel */}
      {buying && <BuyPanel app={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--color-muted)", margin: "20px 0 10px",
      }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function AppCard({ app, onBuy }: { app: StoreApp; onBuy: (a: StoreApp) => void }) {
  const paid = typeof app.price === "number" || app.price === "included";
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>{app.name}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: paid ? "var(--color-brand)" : "var(--color-muted)",
            flexShrink: 0,
          }}>{priceLabel(app.price)}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>{app.summary}</p>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 4 }}>
        {app.status === "available" && app.href ? (
          <Link href={app.href} style={cardBtn(true)}>
            {app.actionLabel} <ArrowRight size={13} />
          </Link>
        ) : app.status === "download" ? (
          <button onClick={() => onBuy(app)} style={cardBtn(false)}>
            <Download size={13} /> {app.actionLabel}
          </button>
        ) : (
          <button onClick={() => onBuy(app)} style={cardBtn(false)}>
            {app.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function BuyPanel({ app, onClose }: { app: StoreApp; onClose: () => void }) {
  const isDownload = app.status === "download";
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 301,
        width: "min(440px, calc(100vw - 32px))", background: "var(--color-surface)",
        border: "1px solid var(--color-border)", borderRadius: 14, boxShadow: "var(--shadow-md)",
        padding: "20px 22px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>{app.name}</h2>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-muted)", display: "flex" }}><X size={16} /></button>
        </div>

        {isDownload ? (
          <p style={{ fontSize: 13.5, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            This is a free playground pack. Download the template folder from
            {" "}<code style={{ color: "var(--color-text)" }}>downloads/playground-app-template/</code>, follow the README,
            and import it from a playground&apos;s Settings → Import. Full library installs are coming to the Import flow.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13.5, color: "var(--color-text-secondary)", lineHeight: 1.6, marginTop: 0 }}>
              {app.price === "included"
                ? "This playground is free with an active subscription. Without one, you can buy it once with crypto:"
                : `Buy this once for $${app.price} with crypto:`}
            </p>
            <ol style={{ fontSize: 13.5, color: "var(--color-text-secondary)", lineHeight: 1.7, paddingLeft: 18, margin: "8px 0" }}>
              <li>Send the amount in USDT/USDC to your deposit wallet (see Billing → Add credits for addresses).</li>
              <li>Email the transaction receipt and the app name to
                {" "}<a href={`mailto:${STORE_CONTACT.email}?subject=${encodeURIComponent("App purchase: " + app.name)}`} style={{ color: "var(--color-brand)" }}>{STORE_CONTACT.email}</a>.</li>
              <li>We enable the playground on your account and reply to confirm.</li>
            </ol>
            <Link href="/billing" style={{ ...cardBtn(true), marginTop: 6, width: "fit-content" }}>
              Go to Billing <ArrowRight size={13} />
            </Link>
          </>
        )}

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
          <Check size={12} /> No card required — crypto deposit + emailed receipt.
        </div>
      </div>
    </>
  );
}

function cardBtn(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
    padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: primary ? "none" : "1px solid var(--color-border)",
    background: primary ? "var(--color-brand)" : "transparent",
    color: primary ? "#0a1628" : "var(--color-text-secondary)",
  };
}
