import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeAdmin",
  description: "A personal command center for bills, renewals, documents, and deadlines."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
