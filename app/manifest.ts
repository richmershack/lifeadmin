import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeAdmin",
    short_name: "LifeAdmin",
    description: "Daily admin, handled.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f4",
    theme_color: "#0f1d1a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ],
    shortcuts: [
      {
        name: "Capture item",
        short_name: "Capture",
        description: "Add a new bill, renewal, document, or notice.",
        url: "/dashboard#capture",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
      },
      {
        name: "Reminders",
        short_name: "Reminders",
        description: "Review items that need attention.",
        url: "/dashboard#reminders",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }]
      }
    ]
  };
}
