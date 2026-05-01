import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkle, Robot, FileText } from "@phosphor-icons/react";

/**
 * AI document generator UI (Part 2). Lists the available doc types for the
 * user's industry, lets them fill in inputs, hits POST /api/ai-docs/{ind}/{type}/generate,
 * and renders the Markdown result inline. Generated docs are saved to the
 * Document Library with a reference number (e.g. HACCP-2026-0001).
 */
export default function AIDocsPage() {
  const [types, setTypes] = useState([]);
  const [industry, setIndustry] = useState("trades");
  const [selected, setSelected] = useState(null);
  const [inputs, setInputs] = useState({});
  const [output, setOutput] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/ai-docs/types").then((r) => {
      setTypes(r.data.types);
      setIndustry(r.data.industry);
    }).catch(() => {});
  }, []);

  const reset = () => { setSelected(null); setInputs({}); setOutput(null); };
  const select = (t) => { setSelected(t); setInputs({}); setOutput(null); };

  const generate = async () => {
    if (!selected) return;
    setBusy(true);
    setOutput(null);
    try {
      const r = await api.post(`/ai-docs/${industry}/${selected.doc_type}/generate`, { inputs });
      setOutput(r.data);
    } catch (e) {
      setOutput({ content: `**Error**: ${e?.response?.data?.detail || e.message}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-docs-page">
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow flex items-center gap-2">
          <Robot size={14} className="text-warning" />
          <span>AI Documents · {industry}</span>
        </div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Generate compliance documents.</h1>
        <p className="text-muted-foreground mt-2">Industry-specific AI document generation powered by Claude Sonnet 4.5. Each generated doc is saved to your Document Library with a unique reference.</p>
      </div>

      {types.length === 0 && (
        <div className="border border-border bg-muted p-6 text-sm">
          No AI doc types available for your industry yet. Coming soon.
        </div>
      )}

      {!selected && types.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="ai-docs-types-grid">
          {types.map((t) => (
            <button
              key={t.doc_type}
              type="button"
              onClick={() => select(t)}
              className="text-left border border-border bg-background p-5 hover:border-ink transition-colors flex flex-col gap-3"
              data-testid={`ai-doc-card-${t.doc_type}`}
            >
              <div className="flex items-start justify-between">
                <FileText weight="bold" className="text-warning" size={20} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.ref_prefix}-XXX</span>
              </div>
              <div>
                <h3 className="font-display text-xl font-black tracking-tight">{t.label}</h3>
                <div className="text-xs text-muted-foreground mt-1">{t.inputs.length} inputs · {t.category}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-auto">Click to generate →</div>
            </button>
          ))}
        </div>
      )}

      {selected && !output && (
        <div className="border border-border bg-background p-6" data-testid="ai-docs-form">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <div className="label-eyebrow">{industry} · {selected.ref_prefix}</div>
              <h2 className="font-display text-3xl font-black tracking-tight mt-1">{selected.label}</h2>
            </div>
            <Button variant="outline" className="btn-sharp border-ink" onClick={reset} data-testid="ai-docs-back">← Back</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selected.inputs.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <Label className="label-eyebrow">{f.label}{f.required && <span className="text-red-600 ml-1">*</span>}</Label>
                {f.type === "select" ? (
                  <select
                    value={inputs[f.key] || ""}
                    onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })}
                    className="mt-2 w-full h-11 rounded-none border border-ink bg-background px-3 text-sm"
                    data-testid={`ai-doc-input-${f.key}`}
                  >
                    <option value="">Select…</option>
                    {(f.options || []).map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <Textarea
                    value={inputs[f.key] || ""}
                    onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="mt-2 rounded-none border-ink min-h-24"
                    data-testid={`ai-doc-input-${f.key}`}
                  />
                ) : (
                  <Input
                    value={inputs[f.key] || ""}
                    onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="mt-2 h-11 rounded-none border-ink"
                    data-testid={`ai-doc-input-${f.key}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6 border-t border-border pt-4">
            <Button onClick={generate} disabled={busy} className="btn-sharp h-12 bg-ink text-white hover:bg-authority uppercase tracking-widest" data-testid="ai-docs-generate-btn">
              {busy ? "Generating…" : <>Generate with AI <Sparkle weight="fill" className="ml-2" /></>}
            </Button>
          </div>
        </div>
      )}

      {output && (
        <div className="border border-border bg-background p-6" data-testid="ai-docs-output">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <div className="label-eyebrow text-emerald-700">Generated · {output.reference || "DRAFT"}</div>
              <h2 className="font-display text-2xl font-black tracking-tight mt-1">{output.label || selected?.label}</h2>
            </div>
            <Button variant="outline" className="btn-sharp border-ink" onClick={reset} data-testid="ai-docs-new">New document</Button>
          </div>
          {output.disclaimer && <div className="text-[10px] text-amber-700 italic mb-3">{output.disclaimer}</div>}
          <pre className="whitespace-pre-wrap text-sm font-sans bg-muted p-4 border border-border max-h-[600px] overflow-y-auto" data-testid="ai-docs-content">{output.content}</pre>
        </div>
      )}
    </div>
  );
}
