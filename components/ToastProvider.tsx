"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colorMap: Record<ToastType, { bg: string; border: string; text: string }> = {
    success: { bg: "var(--color-green-dim)",  border: "rgba(111,190,142,0.25)", text: "var(--color-green)" },
    error:   { bg: "var(--color-red-dim)",    border: "rgba(224,112,112,0.25)", text: "var(--color-red)" },
    info:    { bg: "var(--color-brand-dim)",  border: "var(--color-brand-muted)", text: "var(--color-brand-hover)" },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-end",
        }}
      >
        {toasts.map((toast) => {
          const c = colorMap[toast.type];
          return (
            <div
              key={toast.id}
              className="animate-fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: c.bg,
                border: `1px solid ${c.border}`,
                maxWidth: "340px",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ color: c.text, fontSize: "13px", flex: 1 }}>
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: c.text,
                  opacity: 0.7,
                  padding: "2px",
                  display: "flex",
                }}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
