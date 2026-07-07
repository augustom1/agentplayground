// Store catalog — the Playground Store / Library.
// Apps and playground packs users can open, download, or buy. This is a static
// catalog for now; installs of downloadable packs land through the SDK folder
// (see /downloads/playground-app-template) and, later, POST /api/library/install.

export type StoreApp = {
  id: string;
  name: string;
  summary: string;
  category: "app" | "playground";
  price: "free" | "included" | number; // "included" = free with a subscription; number = USD one-time
  status: "available" | "download" | "soon";
  href?: string;        // for available apps, the route to open
  actionLabel: string;
};

export const STORE_APPS: StoreApp[] = [
  {
    id: "redirect",
    name: "Redirect",
    summary: "Short codes that jump to a Meet, call, video, or any page. A one-tap launcher for showing off a playground.",
    category: "app",
    price: "free",
    status: "available",
    href: "/apps/redirect",
    actionLabel: "Open",
  },
  {
    id: "meetings",
    name: "Meetings",
    summary: "Schedule meetings with people and agent teams; reminders show up in chat. Built into the platform.",
    category: "app",
    price: "free",
    status: "available",
    href: "/schedule",
    actionLabel: "Open",
  },
  {
    id: "link-hub",
    name: "Link Hub Playground",
    summary: "A ready-made playground that turns a set of redirect links into a shareable showcase page for your apps.",
    category: "playground",
    price: "free",
    status: "download",
    actionLabel: "Download",
  },
  {
    id: "personal-trainer",
    name: "Personal Trainer Playground",
    summary: "Fitness coaching team — training plans, nutrition, progress tracking, and check-in reminders.",
    category: "playground",
    price: "included",
    status: "soon",
    actionLabel: "Get",
  },
  {
    id: "ceo-advisory",
    name: "CEO Advisory Playground",
    summary: "An executive team (strategy, finance, ops) you can consult and delegate to for running a company.",
    category: "playground",
    price: 19,
    status: "soon",
    actionLabel: "Buy",
  },
];

// Where crypto buyers send proof of payment.
export const STORE_CONTACT = {
  email: "store@agentplayground.net",
};
