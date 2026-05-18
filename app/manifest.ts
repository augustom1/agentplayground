import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AgentPlayground",
    short_name: "AgentPG",
    description: "Your personal AI operations platform — build agent teams, automate workflows.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06060e",
    theme_color: "#06060e",
    categories: ["productivity", "business", "utilities"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
