import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, CheckCircle, Lightning, Certificate, X } from "@phosphor-icons/react";

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
  const [quiz, setQuiz] = useState(null);  // {module_slug, title, questions, answers, result}

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

  const markComplete = async (slug) => {
    setBusy(slug);
    try {
      await api.post(`/academy/${slug}/complete`, { score: 100 });
      await load();
    } catch (e) { /* */ }
    finally { setBusy(null); }
  };

  const completedCount = Object.keys(completed).length;

  const downloadCert = (cert_id) => {
    // Open in new tab. Cert PDF endpoint requires bearer auth — pass via query param.
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

  return (
    <div className="space-y-8" data-testid="academy-page">
      {quiz && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" data-testid="academy-quiz-modal">
          <div className="bg-background border border-ink max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="label-eyebrow">Quiz · {quiz.module_slug}</div>
                <h2 className="font-display text-2xl font-black tracking-tight mt-1">{quiz.title}</h2>
              </div>
              <button onClick={() => setQuiz(null)} className="text-muted-foreground hover:text-ink" data-testid="quiz-close-btn"><X size={20} /></button>
            </div>
            {!quiz.result ? (
              <>
                <p className="text-sm text-muted-foreground mt-4">Answer all questions. 80% required to pass and earn certificate.</p>
                <div className="space-y-5 mt-5">
                  {quiz.questions.map((q, qi) => (
                    <div key={qi} data-testid={`quiz-q-${qi}`}>
                      <div className="font-bold text-sm">{qi + 1}. {q.q}</div>
                      <div className="space-y-1.5 mt-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center gap-2 p-2 border cursor-pointer ${quiz.answers[qi] === oi ? "border-ink bg-warning/10" : "border-border hover:bg-muted"}`} data-testid={`quiz-opt-${qi}-${oi}`}>
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
                  <Button variant="outline" className="btn-sharp border-ink" onClick={() => setQuiz(null)}>Cancel</Button>
                  <Button onClick={submitQuiz} disabled={busy === quiz.module_slug || quiz.answers.includes(null)} className="btn-sharp bg-ink text-white" data-testid="quiz-submit-btn">
                    {busy === quiz.module_slug ? "Scoring…" : "Submit"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8" data-testid="quiz-result">
                <div className={`font-display text-6xl font-black ${quiz.result.passed ? "text-emerald-600" : "text-red-600"}`}>{quiz.result.score}%</div>
                <div className={`label-eyebrow mt-3 ${quiz.result.passed ? "text-emerald-700" : "text-red-700"}`}>{quiz.result.passed ? "Passed · certificate earned" : "Not passed · 80% required"}</div>
                <div className="text-sm text-muted-foreground mt-2">{quiz.result.correct} of {quiz.result.total} correct</div>
                {quiz.result.passed && quiz.result.cert_id && (
                  <Button onClick={() => downloadCert(quiz.result.cert_id)} className="btn-sharp bg-warning text-ink hover:bg-warning/90 mt-6 uppercase tracking-widest" data-testid="quiz-download-cert">
                    <Certificate weight="bold" className="mr-2" /> Download certificate (PDF)
                  </Button>
                )}
                <div className="mt-6">
                  <Button variant="outline" className="btn-sharp border-ink" onClick={() => setQuiz(null)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  onClick={() => done ? null : startQuiz(c.slug)}
                  disabled={busy === c.slug || done}
                  className={`btn-sharp h-10 mt-auto uppercase tracking-widest text-xs ${done ? "bg-emerald-50 text-emerald-700" : "bg-ink text-white hover:bg-authority"}`}
                  data-testid={`academy-complete-${c.slug}`}
                >
                  {done ? "Completed" : busy === c.slug ? "…" : "Take quiz to complete"}
                </Button>
                {done && completed[c.slug]?.completion_id && (
                  <button
                    type="button"
                    onClick={() => downloadCert(completed[c.slug].completion_id)}
                    className="text-xs text-emerald-700 underline mt-2"
                    data-testid={`academy-cert-${c.slug}`}
                  >
                    Download certificate (PDF)
                  </button>
                )}
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
