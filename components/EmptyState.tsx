import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/85 p-8 text-center shadow-lg shadow-slate-200/60 backdrop-blur">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
