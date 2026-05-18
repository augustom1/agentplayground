import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

// All authenticated app pages share this layout (sidebar + main content area)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Content column: main area + mobile bottom nav stacked */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
        {/* MobileNav is in-flow so it never overlaps content */}
        <MobileNav />
      </div>
    </div>
  );
}
