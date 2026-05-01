/**
 * Resources hub — public landing /resources with 5 industry sub-sections,
 * "Ask SafeBase" AI compliance assistant prominent in the centre, and
 * recent articles per industry.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { MarketingNav, MarketingFooter } from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HardHat, ChefHat, Truck, HeartStraight, ShoppingBag,
  Sparkle, ArrowRight,
} from "@phosphor-icons/react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const INDUSTRIES = [
  { slug: "trades",      label: "Trades & Construction",  icon: HardHat,        bg: "bg-[#0A1F44]",   accent: "#FFCC00" },
  { slug: "hospitality", label: "Hospitality",            icon: ChefHat,        bg: "bg-[#5B2A0A]",   accent: "#0F4C5C" },
  { slug: "transport",   label: "Transport & Logistics",  icon: Truck,          bg: "bg-[#0E3B3B]",   accent: "#0DC4B5" },
  { slug: "healthcare",  label: "Healthcare & Aged Care", icon: HeartStraight,  bg: "bg-[#1E3A8A]",   accent: "#60A5FA" },
  { slug: "retail",      label: "Retail",                 icon: ShoppingBag,    bg: "bg-[#4C1D95]",   accent: "#A855F7" },
];

const SAMPLE_QUESTIONS = {
  trades: [
    "Do I need a SWMS for hot water installation in QLD?",
    "How long must I keep a SWMS after a notifiable incident?",
    "What happens during a WorkSafe inspection?",
  ],
  hospitality: [
    "Do I need a Food Safety Supervisor in NSW?",
    "What temperature should a walk-in fridge be set to?",
    "What are my obligations if a customer reports a foodborne illness?",
  ],
  transport: [
    "What are standard fatigue hours for a HC licence driver under HVNL?",
    "As a scheduler, what are my CoR obligations if a driver tells me they're tired?",
    "What records must I keep for load restraint?",
  ],
  healthcare: [
    "When does an NDIS Worker Screening Check expire?",
    "What changed under the Aged Care Act 2024?",
    "What are my obligations if a clinician practises with a lapsed AHPRA?",
  ],
  retail: [
    "What is the legal requirement for checking on lone workers in retail?",
    "Do I need a first aider on every shift?",
    "What are my WHS obligations when a customer is injured in my store?",
  ],
};

export default function Resources() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState("trades");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [articles, setArticles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [regulators, setRegulators] = useState([]);

  // Refetch when industry changes
  useEffect(() => {
    axios.get(`${API_URL}/api/resources/articles?industry=${industry}`).then((r) => setArticles(r.data || [])).catch(() => {});
    axios.get(`${API_URL}/api/resources/templates?industry=${industry}`).then((r) => setTemplates((r.data || {}).templates || [])).catch(() => {});
    axios.get(`${API_URL}/api/resources/regulators/${industry}`).then((r) => setRegulators(r.data || [])).catch(() => {});
  }, [industry]);

  const ask = async (q) => {
    const queryText = (q ?? question).trim();
    if (queryText.length < 5) return;
    setAsking(true);
    setAnswer("");
    try {
      const r = await axios.post(`${API_URL}/api/resources/ai/ask`, {
        question: queryText, industry, session_id: sessionId,
      });
      setAnswer(r.data.answer);
      setSessionId(r.data.session_id);
    } catch (e) {
      setAnswer("Sorry — the AI assistant is temporarily unavailable. Please try again in a moment.");
    } finally {
      setAsking(false);
    }
  };

  const ind = INDUSTRIES.find((i) => i.slug === industry);

  return (
    <div className="bg-background text-ink" data-testid="resources-hub">
      <MarketingNav />

      <section className="border-b border-border py-12 lg:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="label-eyebrow">/ Resources hub</div>
          <h1 className="font-display text-5xl lg:text-7xl font-black tracking-tighter mt-3 max-w-4xl" data-testid="resources-headline">
            Compliance resources for every<br />Australian industry.
          </h1>
          <p className="text-lg text-muted-foreground mt-5 max-w-2xl">
            Ask SafeBase a question, browse industry-specific articles, or download free templates and checklists.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-muted">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap gap-1">
            {INDUSTRIES.map((i) => {
              const active = industry === i.slug;
              return (
                <button
                  key={i.slug}
                  onClick={() => { setIndustry(i.slug); setAnswer(""); setQuestion(""); }}
                  data-testid={`resources-tab-${i.slug}`}
                  className={`px-5 py-3 text-sm font-display font-black tracking-tight uppercase border-b-4 transition-all ${active ? "text-ink bg-background" : "text-muted-foreground hover:text-ink border-transparent"}`}
                  style={active ? { borderColor: i.accent } : { borderColor: "transparent" }}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16" data-testid="resources-ai-section">
        <div className="max-w-4xl mx-auto px-6">
          <div className={`${ind.bg} text-white p-8 lg:p-10 border-l-8`} style={{ borderColor: ind.accent }}>
            <div className="flex items-center gap-2">
              <Sparkle weight="fill" style={{ color: ind.accent }} />
              <span className="label-eyebrow" style={{ color: ind.accent }}>/ Ask SafeBase · AI compliance assistant</span>
            </div>
            <h2 className="font-display text-3xl lg:text-5xl font-black tracking-tighter mt-3">
              Get instant answers — {ind.label.toLowerCase()}.
            </h2>
            <p className="text-white/70 mt-3">
              Powered by Claude. Trained on Australian {ind.label.toLowerCase()} compliance obligations, regulators, and legislation.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); ask(); }} className="mt-6 flex flex-col sm:flex-row gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a compliance question…"
                className="h-14 rounded-none border-2 bg-white text-ink text-base"
                data-testid="resources-ai-input"
                disabled={asking}
              />
              <Button
                type="submit"
                disabled={asking || question.trim().length < 5}
                className="btn-sharp h-14 px-7 hover:opacity-90 text-ink"
                style={{ background: ind.accent }}
                data-testid="resources-ai-submit"
              >
                {asking ? "Thinking…" : <><Sparkle className="mr-2" weight="fill" /> Ask</>}
              </Button>
            </form>

            {!answer && !asking && (
              <div className="mt-5">
                <div className="label-eyebrow text-white/50 mb-2">Try one of these:</div>
                <div className="flex flex-wrap gap-2">
                  {(SAMPLE_QUESTIONS[industry] || []).map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuestion(q); ask(q); }}
                      className="text-left text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 transition-colors"
                      data-testid="resources-ai-sample"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {asking && (
              <div className="mt-5 text-white/60 text-sm flex items-center gap-2" data-testid="resources-ai-loading">
                <Sparkle className="animate-pulse" weight="fill" /> Asking Claude · should be a few seconds…
              </div>
            )}

            {answer && (
              <div className="mt-6 bg-white text-ink p-6" data-testid="resources-ai-answer">
                <div className="label-eyebrow mb-2" style={{ color: ind.accent }}>/ Answer</div>
                <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">{answer}</pre>
                <div className="mt-5 flex justify-between items-center flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">For specific advice on high-risk decisions, consult a WHS professional.</span>
                  <button onClick={() => { setAnswer(""); setQuestion(""); }} className="text-xs font-bold underline" data-testid="resources-ai-reset">Ask another →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-muted py-12 lg:py-20" data-testid="resources-content">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-background border border-border p-6">
            <div className="label-eyebrow" style={{ color: ind.accent }}>/ Latest articles</div>
            <div className="font-display font-black text-3xl tracking-tighter mt-1">Compliance reading</div>
            <ul className="mt-5 divide-y divide-border" data-testid="resources-articles-list">
              {articles.map((a) => (
                <li key={a.slug} className="py-4">
                  <Link
                    to={`/resources/${industry}/${a.slug}`}
                    className="group block"
                    data-testid={`resources-article-${a.slug}`}
                  >
                    <div className="font-display font-black text-lg group-hover:underline">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.tags}</div>
                  </Link>
                </li>
              ))}
              {articles.length === 0 && <li className="py-6 text-sm text-muted-foreground">Loading articles…</li>}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="bg-background border border-border p-6" data-testid="resources-templates">
              <div className="label-eyebrow" style={{ color: ind.accent }}>/ Free templates</div>
              <div className="font-display font-black text-xl mt-1">Download (lead capture)</div>
              <ul className="mt-3 space-y-2 text-sm">
                {templates.map((t) => (
                  <li key={t} className="flex items-center justify-between">
                    <span>{t}</span>
                    <button className="text-xs font-bold underline" data-testid={`resources-tpl-${t.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}>Get →</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background border border-border p-6" data-testid="resources-regulators">
              <div className="label-eyebrow" style={{ color: ind.accent }}>/ Regulators · {ind.label}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {regulators.map((r) => (
                  <li key={r.name} className="flex items-center justify-between">
                    <span className="font-bold">{r.name}</span>
                    <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="font-mono text-xs underline">{r.phone}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
