import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, CheckCircle, Lightning, Certificate } from "@phosphor-icons/react";

/**
 * SafeBase Academy — industry-tagged module catalogue.
 *
 * Users only see modules relevant to their active industry. Microlearning
 * modules are 5-15 min, full courses are 45-90 min with a final certificate.
 * Completion is logged via /api/academy/{slug}/complete and feeds into the
 * compliance score + audit pack automatically.
 */
export default function Academy() {
  const [data, setData] = useState({ industry: "trades", microlearning: [], full_courses: [], total_modules: 0 });
  const [completed, setCompleted] = useState({});
  const [busy, setBusy] = useState(null);

  const load = async () => {
    try {
      const [c, comp] = await Promise.all([
        api.get("/academy/catalogue"),
        api.get("/academy/completions"),
      ]);
      setData(c.data);
      const map = {};
      (comp.data || []).forEach((r) => { map[r.module_slug] = r; });
      setCompleted(map);
    } catch (e) { /* */ }
  };
  useEffect(() => { load(); }, []);

  const markComplete = async (slug) => {
    setBusy(slug);
    try {
      await api.post(`/academy/${slug}/complete`, { score: 100 });
      await load();
    } catch (e) { /* */ }
    finally { setBusy(null); }
  };

  const completedCount = Object.keys(completed).length;

  return (
    <div className="space-y-8" data-testid="academy-page">
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow flex items-center gap-2">
          <GraduationCap size={14} className="text-warning" />
          <span>SafeBase Academy · {data.industry}</span>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Industry-specific WHS training.</h1>
        <p className="text-muted-foreground mt-2">{data.total_modules} modules built for {data.industry}. {completedCount} completed across your team.</p>
      </div>

      <section data-testid="academy-courses">
        <div className="flex items-center gap-2 mb-4">
          <Certificate weight="bold" className="text-warning" size={20} />
          <h2 className="font-display text-2xl font-black tracking-tight">Full courses</h2>
          <span className="text-xs text-muted-foreground">— assessment + certificate</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.full_courses.map((c) => {
            const done = !!completed[c.slug];
            return (
              <div key={c.slug} className={`border bg-background p-5 flex flex-col gap-3 ${done ? "border-emerald-600" : "border-border"}`} data-testid={`academy-course-${c.slug}`}>
                <div className="flex items-start justify-between">
                  <BookOpen weight="bold" className="text-ink" size={20} />
                  {done && <CheckCircle weight="fill" className="text-emerald-600" size={20} />}
                </div>
                <div>
                  <h3 className="font-display text-lg font-black tracking-tight">{c.title}</h3>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{c.duration_minutes} min · {c.modules.length} modules</div>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                  {c.modules.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
                {c.note && <div className="text-[10px] text-amber-700 italic border-t border-border pt-2">{c.note}</div>}
                <Button
                  type="button"
                  onClick={() => markComplete(c.slug)}
                  disabled={busy === c.slug || done}
                  className={`btn-sharp h-10 mt-auto uppercase tracking-widest text-xs ${done ? "bg-emerald-50 text-emerald-700" : "bg-ink text-white hover:bg-authority"}`}
                  data-testid={`academy-complete-${c.slug}`}
                >
                  {done ? "Completed" : busy === c.slug ? "…" : "Mark complete"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section data-testid="academy-microlearning">
        <div className="flex items-center gap-2 mb-4">
          <Lightning weight="bold" className="text-warning" size={20} />
          <h2 className="font-display text-2xl font-black tracking-tight">Microlearning</h2>
          <span className="text-xs text-muted-foreground">— 5-15 min refreshers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.microlearning.map((m) => {
            const done = !!completed[m.slug];
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => !done && markComplete(m.slug)}
                disabled={busy === m.slug || done}
                className={`text-left border p-4 cursor-pointer transition-colors ${done ? "border-emerald-600 bg-emerald-50/50" : "border-border bg-background hover:border-ink"}`}
                data-testid={`academy-micro-${m.slug}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Lightning size={14} className="text-warning" />
                  {done && <CheckCircle weight="fill" className="text-emerald-600" size={14} />}
                </div>
                <div className="text-sm font-bold">{m.title}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{m.duration_minutes} min</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
