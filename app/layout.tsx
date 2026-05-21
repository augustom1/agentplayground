import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";

const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "AgentPlayground",
  description: "Your personal AI operations platform — build agent teams, automate workflows, run local LLMs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AgentPlayground",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
};

// Inline script: apply saved theme before first paint to avoid flash
const themeScript = `
(function(){
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
})();
`;

// Analytics beacon — fires pageview + duration events
const analyticsScript = `
(function(){
  var sid = sessionStorage.getItem('_ap_sid');
  if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem('_ap_sid', sid); }
  var start = Date.now();
  function beacon(data) {
    navigator.sendBeacon('/api/admin/analytics/event', JSON.stringify(data));
  }
  beacon({ type: 'pageview', path: location.pathname, referrer: document.referrer || null, sessionId: sid });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      beacon({ type: 'duration', path: location.pathname, sessionId: sid, durationMs: Date.now() - start });
    }
  });
})();
`;

// Root layout — no sidebar here (app pages add it via their own layout)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: analyticsScript }} />
      </head>
      <body className="h-full antialiased" style={{ background: "var(--color-background)" }}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
