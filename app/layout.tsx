import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/app/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "LifeAdmin",
  title: "LifeAdmin",
  description: "A personal command center for bills, renewals, documents, and deadlines.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeAdmin"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1d1a"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
