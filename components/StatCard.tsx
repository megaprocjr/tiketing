import type { LucideIcon } from "lucide-react";

const accents = {
  blue: { line: "from-blue-600 to-sky-500", icon: "bg-blue-50 text-blue-700" },
  emerald: { line: "from-emerald-600 to-teal-500", icon: "bg-emerald-50 text-emerald-700" },
  violet: { line: "from-violet-600 to-indigo-500", icon: "bg-violet-50 text-violet-700" },
  amber: { line: "from-amber-500 to-orange-500", icon: "bg-amber-50 text-amber-700" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: keyof typeof accents;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/80 bg-white/85 p-4 shadow-lg shadow-slate-200/70 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200 md:p-5">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accents[accent].line}`} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 md:text-sm">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{value}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl md:h-12 md:w-12 ${accents[accent].icon} transition group-hover:scale-105`}>
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}
