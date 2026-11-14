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
    <div className="grid min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)] lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:grid-rows-[minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-start gap-5 overflow-hidden border-r-2 border-ink-900 bg-brand-600 p-8 text-white xl:gap-10 xl:p-12 lg:sticky lg:top-20 lg:flex lg:h-[calc(100vh-5rem)] lg:min-h-0 lg:self-start">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_30%_0%,rgba(250,204,21,0.22),transparent)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.8)_0.75px,transparent_0.75px)] [background-size:18px_18px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-accent-400/15 blur-3xl" />
        <div className="relative z-10">
          <Logo light />
          <h2 className="mt-10 max-w-lg text-4xl font-extrabold leading-[1.08] tracking-tight xl:mt-12 xl:text-5xl">
            Seleksi yang adil, keputusan yang lebih cepat.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 xl:text-base">
            Temukan peluang kerja yang relevan dan bantu proses rekrutmen berjalan lebih terarah dengan teknologi AI.
          </p>
        </div>
        <ul className="relative z-10 grid max-w-xl gap-3">
          {points.map((p) => (
            <li key={p.title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm xl:p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-400 text-ink-950">
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

      <div className="relative isolate flex min-h-0 flex-col overflow-y-auto bg-slate-50/70 px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-8">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(31,79,224,0.10)_0.75px,transparent_0.75px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(31,79,224,0.08),transparent)]" />
        <div className="relative z-10 my-auto flex w-full justify-center">
          <div className="w-full">{children}</div>
        </div>
      </div>
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
