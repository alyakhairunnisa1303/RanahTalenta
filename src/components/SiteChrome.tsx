"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Navbar dan Footer publik disembunyikan di area dashboard (punya sidebar sendiri)
function SiteChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard =
    pathname.startsWith("/candidate") || pathname.startsWith("/hrd");

  if (isDashboard) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen flex-col">{children}</div>}>
      <SiteChromeInner>{children}</SiteChromeInner>
    </Suspense>
  );
}