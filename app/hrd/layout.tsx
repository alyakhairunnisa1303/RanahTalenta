import DashboardShell from "../../src/components/DashboardShell";

export default function HrdLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="hrd">{children}</DashboardShell>;
}