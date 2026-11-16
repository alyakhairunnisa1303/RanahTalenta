import type { Metadata } from "next";
<<<<<<< HEAD
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "./globals.css";
=======
import "../src/app/globals.css";
>>>>>>> origin/main
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
