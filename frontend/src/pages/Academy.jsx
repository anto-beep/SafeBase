import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  GraduationCap, BookOpen, CheckCircle, Lightning, Certificate, X,
  Warning, Star, Scales,
} from "@phosphor-icons/react";

/**
 * SafeBase Academy — Stage 1 MVP catalogue (per Academy Research Report).
 *
 * 88 modules total across 5 industries. Each module carries a regulatory
 * anchor, an RTO boundary disclaimer (where applicable), and a Stage 1 MVP
 * flag for the 17 worked modules shipped with full 5-Q assessments.
 *
 * SafeBase Academy is NOT a Registered Training Organisation. Where a module
 * is RTO-boundary the user is shown an amber notice — formal credentials
 * must be issued by an external RTO.
 */
export default function Academy() {
  const [data, setData] = useState({
    industry: "trades",
    modules: [],
    microlearning: [],
    standard: [],
    full_courses: [],
    stage1_mvp: [],
    total_modules: 0,
    rto_boundary_notice: "",
  });
  const [completed, setCompleted] = useState({});
  const [busy, setBusy] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [filter, setFilter] = useState("all"); // all | microlearning | standard | full_course | mvp

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

  const startQuiz = async (slug) => {
    try {
      const r = await api.get(`/academy/${slug}/quiz`);
      setQuiz({ ...r.data, answers: Array(r.data.questions.length).fill(null), result: null });
    } catch (e) { /* */ }
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    setBusy(quiz.module_slug);
    try {
      const r = await api.post(`/academy/${quiz.module_slug}/submit-quiz`, { answers: quiz.answers });
      setQuiz({ ...quiz, result: r.data });
      if (r.data.passed) await load();
    } catch (e) { /* */ }
    finally { setBusy(null); }
  };

  const completedCount = Object.keys(completed).length;

  const downloadCert = (cert_id) => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/academy/cert/${cert_id}.pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("st_token")}` } })
      .then((r) => r.blob())
      .then((b) => {
        const u = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = u; a.download = `${cert_id}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      });
  };

  const filteredModules = useMemo(() => {
    const list = data.modules || [];
    if (filter === "all") return list;
    if (filter === "mvp") return list.filter((m) => m.mvp_stage1);
    return list.filter((m) => m.type === filter);
  }, [data.modules, filter]);

  const counts = useMemo(() => ({
    all: data.modules?.length || 0,
    mvp: data.stage1_mvp?.length || 0,
    microlearning: data.microlearning?.length || 0,
    standard: data.standard?.length || 0,
    full_course: data.full_courses?.length || 0,
  }), [data]);

  return (
    <div className="space-y-8" data-testid="academy-page">
      {quiz && <QuizModal quiz={quiz} setQuiz={setQuiz} submitQuiz={submitQuiz} busy={busy} downloadCert={downloadCert} />}

      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow flex items-center gap-2">
          <GraduationCap size={14} className="text-warning" />
          <span>SafeBase Academy · {data.industry}</span>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">
          Industry-specific awareness training.
        </h1>
        <p className="text-muted-foreground mt-2">
          {data.total_modules} modules mapped to Australian WHS / industry regulation
          for {data.industry}. {completedCount} completed across your team.
        </p>
      </div>

      {/* Global RTO boundary notice */}
      {data.rto_boundary_notice && (
        <div
          className="border border-amber-400 bg-amber-50 p-4 flex gap-3"
          data-testid="academy-rto-notice"
        >
          <Scales weight="bold" className="text-amber-700 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-900">
            <div className="font-bold mb-1">SafeBase Academy is not a Registered Training Organisation</div>
            <div className="text-xs leading-relaxed">{data.rto_boundary_notice}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3" data-testid="academy-filters">
        {[
          ["all", "All modules", counts.all],
          ["mvp", "Stage 1 MVP", counts.mvp],
          ["microlearning", "Microlearning (<15 min)", counts.microlearning],
          ["standard", "Standard (15-30 min)", counts.standard],
          ["full_course", "Full course (30-60 min)", counts.full_course],
        ].map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 border transition-colors ${
              filter === key
                ? "border-ink bg-ink text-white"
                : "border-border bg-background hover:border-ink"
            }`}
            data-testid={`academy-filter-${key}`}
          >
            {label} <span className="opacity-60 ml-1">({n})</span>
          </button>
        ))}
      </div>

      {/* Modules grid */}
      <section data-testid="academy-modules">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((m) => (
            <ModuleCard
              key={m.slug}
              m={m}
              done={!!completed[m.slug]}
              completion={completed[m.slug]}
              busy={busy === m.slug}
              onStart={() => startQuiz(m.slug)}
              onCert={(cid) => downloadCert(cid)}
            />
          ))}
        </div>
        {filteredModules.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-12 text-center">
            No modules match this filter.
          </div>
        )}
      </section>
    </div>
  );
}


function ModuleCard({ m, done, completion, busy, onStart, onCert }) {
  const typeLabel = {
    microlearning: "Microlearning",
    standard: "Standard",
    full_course: "Full Course",
  }[m.type] || m.type;

  const TypeIcon = m.type === "microlearning" ? Lightning : m.type === "full_course" ? Certificate : BookOpen;

  return (
    <div
      className={`border bg-background p-5 flex flex-col gap-3 ${done ? "border-emerald-600" : "border-border"}`}
      data-testid={`academy-module-${m.slug}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon weight="bold" className="text-ink" size={20} />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {typeLabel} · {m.duration_minutes} min
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {m.mvp_stage1 && (
            <span
              className="text-[9px] uppercase tracking-widest bg-warning text-ink font-bold px-1.5 py-0.5 inline-flex items-center gap-1"
              data-testid={`mvp-badge-${m.slug}`}
              title="Stage 1 MVP — worked module with full 5-Q assessment"
            >
              <Star weight="fill" size={10} /> MVP
            </span>
          )}
          {done && <CheckCircle weight="fill" className="text-emerald-600" size={20} />}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-black tracking-tight leading-tight">{m.title}</h3>
        {m.regulatory_anchor && (
          <div
            className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 border border-border px-2 py-1 inline-block"
            data-testid={`anchor-${m.slug}`}
          >
            {m.regulatory_anchor}
          </div>
        )}
      </div>

      {m.rto_boundary && m.rto_disclaimer && (
        <div
          className="border border-amber-400 bg-amber-50 p-2.5 flex gap-2 text-[11px] leading-snug text-amber-900"
          data-testid={`rto-disclaimer-${m.slug}`}
        >
          <Warning weight="bold" className="text-amber-700 shrink-0 mt-0.5" size={14} />
          <span>{m.rto_disclaimer}</span>
        </div>
      )}

      <Button
        type="button"
        onClick={() => done ? null : onStart()}
        disabled={busy || done}
        className={`btn-sharp h-10 mt-auto uppercase tracking-widest text-xs ${
          done ? "bg-emerald-50 text-emerald-700 hover:opacity-90" : "bg-ink text-white hover:opacity-90"
        }`}
        data-testid={`academy-start-${m.slug}`}
      >
        {done ? "Completed" : busy ? "…" : "Take quiz to complete"}
      </Button>

      {done && completion?.completion_id && (
        <button
          type="button"
          onClick={() => onCert(completion.completion_id)}
          className="text-xs text-emerald-700 underline -mt-1"
          data-testid={`academy-cert-${m.slug}`}
        >
          Download certificate (PDF)
        </button>
      )}
    </div>
  );
}


function QuizModal({ quiz, setQuiz, submitQuiz, busy, downloadCert }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6"
      data-testid="academy-quiz-modal"
    >
      <div className="bg-background border border-ink max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div>
            <div className="label-eyebrow">Quiz · {quiz.module_slug}</div>
            <h2 className="font-display text-2xl font-black tracking-tight mt-1">{quiz.title}</h2>
            {quiz.regulatory_anchor && (
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                {quiz.regulatory_anchor}
              </div>
            )}
          </div>
          <button
            onClick={() => setQuiz(null)}
            className="text-muted-foreground hover:text-ink"
            data-testid="quiz-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {quiz.rto_boundary && quiz.rto_disclaimer && (
          <div className="border border-amber-400 bg-amber-50 p-3 mt-4 flex gap-2 text-xs text-amber-900" data-testid="quiz-rto-disclaimer">
            <Warning weight="bold" className="text-amber-700 shrink-0 mt-0.5" size={16} />
            <span>{quiz.rto_disclaimer}</span>
          </div>
        )}

        {!quiz.result ? (
          <>
            <p className="text-sm text-muted-foreground mt-4">
              Answer all questions. 80% required to pass and earn certificate.
            </p>
            <div className="space-y-5 mt-5">
              {quiz.questions.map((q, qi) => (
                <div key={qi} data-testid={`quiz-q-${qi}`}>
                  <div className="font-bold text-sm">{qi + 1}. {q.q}</div>
                  <div className="space-y-1.5 mt-2">
                    {q.options.map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex items-center gap-2 p-2 border cursor-pointer ${
                          quiz.answers[qi] === oi
                            ? "border-ink bg-warning/10"
                            : "border-border hover:bg-muted"
                        }`}
                        data-testid={`quiz-opt-${qi}-${oi}`}
                      >
                        <input
                          type="radio"
                          name={`q${qi}`}
                          checked={quiz.answers[qi] === oi}
                          onChange={() => {
                            const newAnswers = [...quiz.answers];
                            newAnswers[qi] = oi;
                            setQuiz({ ...quiz, answers: newAnswers });
                          }}
                        />
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4 mt-6">
              <Button
                variant="outline"
                className="btn-sharp border-ink"
                onClick={() => setQuiz(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitQuiz}
                disabled={busy === quiz.module_slug || quiz.answers.includes(null)}
                className="btn-sharp bg-ink text-white hover:opacity-90"
                data-testid="quiz-submit-btn"
              >
                {busy === quiz.module_slug ? "Scoring…" : "Submit"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8" data-testid="quiz-result">
            <div className={`font-display text-6xl font-black ${quiz.result.passed ? "text-emerald-600" : "text-red-600"}`}>
              {quiz.result.score}%
            </div>
            <div className={`label-eyebrow mt-3 ${quiz.result.passed ? "text-emerald-700" : "text-red-700"}`}>
              {quiz.result.passed ? "Passed · certificate earned" : "Not passed · 80% required"}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {quiz.result.correct} of {quiz.result.total} correct
            </div>
            {quiz.result.passed && quiz.result.cert_id && (
              <Button
                onClick={() => downloadCert(quiz.result.cert_id)}
                className="btn-sharp bg-warning text-ink hover:opacity-90 mt-6 uppercase tracking-widest"
                data-testid="quiz-download-cert"
              >
                <Certificate weight="bold" className="mr-2" /> Download certificate (PDF)
              </Button>
            )}
            <div className="mt-6">
              <Button
                variant="outline"
                className="btn-sharp border-ink"
                onClick={() => setQuiz(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
