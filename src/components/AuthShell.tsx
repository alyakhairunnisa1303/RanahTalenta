import Icon, { type IconName } from "./Icons";
import { Logo } from "./Navbar";

const points: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "target",
    title: "Kecocokan CV berbasis AI",
    text: "Lihat skor kecocokan Anda untuk setiap lowongan.",
  },
  {
    icon: "eyeOff",
    title: "Seleksi tanpa bias",
    text: "Identitas baru terbuka setelah Anda di-shortlist.",
  },
  {
    icon: "shield",
    title: "Lowongan terverifikasi",
    text: "Perusahaan diverifikasi dan lowongan dipindai anti-penipuan.",
  },
];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r-2 border-ink-900 bg-brand-600 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_30%_0%,rgba(250,204,21,0.22),transparent)]" />
        <div className="relative">
          <Logo light />
          <h2 className="mt-14 max-w-sm text-3xl font-extrabold leading-tight tracking-tight">
            Seleksi yang adil, keputusan yang lebih cepat.
          </h2>
        </div>
        <ul className="relative mt-10 space-y-6">
          {points.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-400 text-ink-950">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-0.5 text-sm text-brand-100">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex items-center justify-center px-4 py-12">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md py-2 transition ${
            value === v
              ? "bg-accent-400 text-ink-950 shadow-sm"
              : "text-slate-500 hover:text-ink-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}