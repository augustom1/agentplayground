import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { RegisterForm } from "./RegisterForm";

// Read REGISTRATION_OPEN at request time, not build time — the switch must work
// by editing .env.local + restart, without a rebuild
export const dynamic = "force-dynamic";

// Self-registration is closed by default (REGISTRATION_OPEN=true reopens it
// when there is a product to sell). The API route enforces the same switch.
export default function RegisterPage() {
  const registrationOpen = process.env.REGISTRATION_OPEN === "true";

  if (registrationOpen) return <RegisterForm />;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-background)" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <LogoMark size={44} />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>Registration closed</h1>
        </div>
        <div className="glass-card p-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
            Agent Playground is not accepting new accounts right now.
            If you were given access, ask the owner to create an account for you.
          </p>
          <Link
            href="/login"
            className="btn-primary py-2 px-5 mt-1"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
