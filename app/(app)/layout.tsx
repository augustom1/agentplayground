import { Sidebar } from "@/components/Sidebar";

// All authenticated app pages share this layout (sidebar + main content area)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      {/* Main scroll container — children are responsible for their own max-width + centering */}
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
