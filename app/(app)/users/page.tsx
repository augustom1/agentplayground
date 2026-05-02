"use client";

import { useState, useEffect } from "react";
import {
  Users, Plus, X, Pencil, Check, Loader2,
  ShieldCheck, User as UserIcon, Eye,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useLanguage } from "@/components/LanguageProvider";

type AppUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  planExpiresAt: string | null;
  active: boolean;
  createdAt: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string; icon: React.ComponentType<{ size?: number }> }> = {
  admin:  { bg: "rgba(255,255,255,0.08)",  text: "var(--color-text)", icon: ShieldCheck },
  user:   { bg: "var(--color-green-dim)", text: "var(--color-green)", icon: UserIcon },
  viewer: { bg: "rgba(100,116,139,0.1)", text: "var(--color-muted)", icon: Eye },
};

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  enterprise: { bg: "rgba(251,191,36,0.1)", text: "var(--color-yellow)" },
  pro:        { bg: "rgba(255,255,255,0.08)", text: "var(--color-text)" },
  free:       { bg: "rgba(100,116,139,0.1)", text: "var(--color-muted)" },
};

export default function UsersPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [users, setUsers]         = useState<AppUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "user", plan: "free", active: true,
  });

  const [editForm, setEditForm] = useState<Partial<AppUser & { password: string }>>({});

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => [data, ...prev]);
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "user", plan: "free", active: true });
      addToast(`User ${data.email} created`, "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to create user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(id: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
      setEditId(null);
      addToast("User updated", "success");
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Failed to update user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      addToast("User deleted", "info");
    } catch {
      addToast("Failed to delete user", "error");
    }
  }

  return (
    <>
    <div className="flex flex-col gap-5 p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {t("users")}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
            {t("manageAccess")}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5">
          <Plus size={15} />
          {t("inviteUser")}
        </button>
      </div>

      {/* User table */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div
          className="grid text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{
            color: "var(--color-muted)",
            borderBottom: "1px solid var(--color-border)",
            gridTemplateColumns: "1fr 100px 100px 80px 100px",
          }}
        >
          <span>User</span>
          <span>Role</span>
          <span>Plan</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-text-secondary)" }} />
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-2">
            <Users size={24} style={{ color: "var(--color-muted)", opacity: 0.4 }} />
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>{t("noUsersYet")}</p>
          </div>
        )}

        {users.map((user, i) => {
          const isEditing = editId === user.id;
          const roleCfg = ROLE_COLORS[user.role] ?? ROLE_COLORS.user;
          const planCfg = PLAN_COLORS[user.plan] ?? PLAN_COLORS.free;
          const RoleIcon = roleCfg.icon;

          return (
            <div
              key={user.id}
              className="grid items-center px-4 py-3"
              style={{
                gridTemplateColumns: "1fr 100px 100px 80px 100px",
                borderBottom: i < users.length - 1 ? "1px solid var(--color-border)" : undefined,
                background: isEditing ? "rgba(255,255,255,0.08)" : "transparent",
              }}
            >
              {/* Identity */}
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    className="glass-input px-2 py-1 text-sm w-full"
                    style={{ color: "var(--color-text)", maxWidth: "220px" }}
                  />
                ) : (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                      {user.name ?? "—"}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>{user.email}</p>
                  </div>
                )}
              </div>

              {/* Role */}
              <div>
                {isEditing ? (
                  <select
                    value={editForm.role ?? user.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="glass-input px-2 py-1 text-xs w-full"
                    style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                  >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: roleCfg.bg, color: roleCfg.text }}
                  >
                    <RoleIcon size={10} />
                    {user.role}
                  </span>
                )}
              </div>

              {/* Plan */}
              <div>
                {isEditing ? (
                  <select
                    value={editForm.plan ?? user.plan}
                    onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                    className="glass-input px-2 py-1 text-xs w-full"
                    style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                ) : (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: planCfg.bg, color: planCfg.text }}
                  >
                    {user.plan}
                  </span>
                )}
              </div>

              {/* Active toggle */}
              <div>
                {isEditing ? (
                  <button
                    onClick={() => setEditForm((f) => ({ ...f, active: !(f.active ?? user.active) }))}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      background: (editForm.active ?? user.active) ? "var(--color-green-dim)" : "var(--color-red-dim)",
                      color: (editForm.active ?? user.active) ? "var(--color-green)" : "var(--color-red)",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    {(editForm.active ?? user.active) ? "Active" : "Disabled"}
                  </button>
                ) : (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: user.active ? "var(--color-green-dim)" : "var(--color-red-dim)",
                      color: user.active ? "var(--color-green)" : "var(--color-red)",
                    }}
                  >
                    {user.active ? "Active" : "Disabled"}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => saveEdit(user.id)}
                      disabled={submitting}
                      style={{
                        background: "var(--color-green-dim)", color: "var(--color-green)",
                        border: "none", cursor: "pointer", borderRadius: "6px", padding: "5px",
                      }}
                      title="Save"
                    >
                      {submitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      style={{
                        background: "transparent", color: "var(--color-muted)",
                        border: "none", cursor: "pointer", borderRadius: "6px", padding: "5px",
                      }}
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditId(user.id); setEditForm({ name: user.name ?? "", role: user.role, plan: user.plan, active: user.active }); }}
                      style={{
                        background: "transparent", color: "var(--color-muted)",
                        border: "none", cursor: "pointer", borderRadius: "6px", padding: "5px",
                      }}
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.email)}
                      style={{
                        background: "transparent", color: "var(--color-muted)",
                        border: "none", cursor: "pointer", borderRadius: "6px", padding: "5px",
                      }}
                      title="Delete"
                    >
                      <X size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>

      {/* Add User Modal — outside animated wrapper so fixed positioning uses viewport */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowAdd(false)}
        >
          <form
            onSubmit={createUser}
            className="glass-card p-6 animate-fade-in"
            style={{ width: "min(420px, calc(100vw - 2rem))", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-base" style={{ color: "var(--color-text)" }}>{t("inviteUser")}</h2>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: t("nameOptional"), key: "name", type: "text", placeholder: t("clientName") },
                { label: t("emailAddress"), key: "email", type: "email", placeholder: "client@company.com", required: true },
                { label: t("password"), key: "password", type: "password", placeholder: t("minChars"), required: true },
              ].map(({ label, key, type, placeholder, required }) => (
                <div key={key}>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, unknown>)[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    required={required}
                    className="glass-input w-full px-3 py-2 text-sm"
                    style={{ color: "var(--color-text)" }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>{t("role")}</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className="glass-input w-full px-3 py-2 text-sm"
                    style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--color-muted)" }}>{t("plan")}</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                    className="glass-input w-full px-3 py-2 text-sm"
                    style={{ color: "var(--color-text)", colorScheme: "dark", background: "var(--color-surface-2)" }}
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.email || !form.password}
                className="btn-primary flex items-center justify-center gap-2 py-2.5 mt-1"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {submitting ? t("creatingUser") : t("createUser")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
