import type { Metadata } from "next";
import "../src/app/globals.css";
import SiteChrome from "../src/components/SiteChrome";

export const metadata: Metadata = {
  title: "RanahTalenta — Portal Karir Cerdas",
  description:
    "Platform rekrutmen berbasis AI: pencocokan CV otomatis, blind screening, dan analisis kandidat yang transparan.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
