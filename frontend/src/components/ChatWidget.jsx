/**
 * ChatWidget — bottom-right Claude-powered SafeBase concierge.
 * Persists session_id + anon_id in localStorage so the conversation survives reloads.
 *
 * Iter54: When the user's last message looks high-intent (pricing, demo,
 * integration, "talk to a human"…), the backend returns
 * `offer_lead_capture: true`. We then surface an inline lead-capture banner
 * BELOW the assistant reply offering "Have someone follow up?". One-tap → form.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatCircleDots, X, PaperPlaneRight, Cube, UserPlus, CheckCircle } from "@phosphor-icons/react";
import api from "@/lib/api";
import useScrollHide from "@/hooks/useScrollHide";

const SESSION_KEY = "sb_chat_session_v1";
const ANON_KEY = "sb_chat_anon_v1";
const LEAD_KEY = "sb_chat_lead_submitted_v1";

function ensureAnonId() {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = "anon_" + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem(ANON_KEY, id); } catch {}
  }
  return id;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(SESSION_KEY) || "");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [offerLead, setOfferLead] = useState(false);
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(() => !!localStorage.getItem(LEAD_KEY));
  const scrollRef = useRef(null);
  const anonId = useMemo(ensureAnonId, []);
  const scrollHidden = useScrollHide();

  // Load history when opening
  useEffect(() => {
    if (!open || !sessionId || messages.length > 0) return;
    api.get(`/concierge/history?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => setMessages(r.data.messages || []))
      .catch(() => {});
  }, [open, sessionId, messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setText("");
    try {
      const r = await api.post("/concierge/chat", { message: msg, session_id: sessionId || null }, {
        headers: { "X-Anon-Id": anonId },
      });
      if (r.data.session_id && r.data.session_id !== sessionId) {
        setSessionId(r.data.session_id);
        try { localStorage.setItem(SESSION_KEY, r.data.session_id); } catch {}
      }
      setMessages((m) => [...m, { role: "assistant", content: r.data.reply }]);
      // Surface lead-capture if the backend flagged this as high-intent
      // AND the user hasn't already submitted in this browser.
      if (r.data.offer_lead_capture && !leadSubmitted) {
        setOfferLead(true);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I'm offline right now. Please email hello@safebase.com.au and a human will get back to you within one business day." }]);
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionId, anonId, leadSubmitted]);

  const startNew = () => {
    setMessages([]);
    setSessionId("");
    setOfferLead(false);
    setLeadFormOpen(false);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open SafeBase concierge — Talk to me"
        data-testid="chat-toggle"
        className={`fixed bottom-5 right-5 z-[9994] flex items-center gap-2 px-4 py-3 bg-ink text-white border-2 border-ink shadow-2xl hover:bg-authority hover:translate-y-[-2px] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-warning ${open ? "hidden" : ""} ${scrollHidden && !open ? "translate-y-24 opacity-0 pointer-events-none" : ""}`}
      >
        <span className="w-7 h-7 bg-warning flex items-center justify-center shrink-0">
          <Cube weight="fill" size={16} className="text-ink" />
        </span>
        <span className="font-display font-black tracking-tight text-sm uppercase">Talk to me</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="SafeBase concierge"
          data-testid="chat-panel"
          className="fixed bottom-5 right-5 z-[9994] w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-white border-2 border-ink shadow-2xl flex flex-col"
        >
          {/* Header */}
          <header className="bg-ink text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-warning flex items-center justify-center">
              <Cube size={16} weight="fill" className="text-ink" />
            </div>
            <div className="flex-1">
              <div className="font-display font-black tracking-tight text-sm">SafeBase concierge</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">Ask me anything</div>
            </div>
            <button onClick={startNew} title="Start new conversation" aria-label="Start new conversation" data-testid="chat-new" className="text-white/60 hover:text-white text-[10px] font-mono uppercase tracking-widest">New</button>
            <button onClick={() => setOpen(false)} aria-label="Close chat" data-testid="chat-close" className="text-white/60 hover:text-white">
              <X size={18} />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" data-testid="chat-messages">
            {messages.length === 0 && (
              <div className="text-sm text-slate-600 leading-relaxed">
                <div className="font-display font-black tracking-tight text-ink mb-2">Hi 👋 I'm the SafeBase concierge.</div>
                <p>Ask me about pricing, features, industry coverage, integrations, or anything else SafeBase. I'll answer in plain English.</p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => setText(s)} data-testid={`chat-suggest-${s.slice(0, 8).replace(/\s+/g, "-")}`} className="text-left text-xs px-3 py-2 border border-slate-300 hover:bg-white hover:border-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${m.role}-${i}`}>
                <div className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-ink text-white" : "bg-white border border-slate-200 text-slate-900"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start" data-testid="chat-typing">
                <div className="bg-white border border-slate-200 px-3 py-2 text-sm text-slate-500">
                  <span className="inline-block animate-pulse">Thinking…</span>
                </div>
              </div>
            )}

            {/* Iter54 — inline lead-capture handoff */}
            {!sending && offerLead && !leadFormOpen && !leadSubmitted && (
              <LeadCaptureBanner
                onAccept={() => setLeadFormOpen(true)}
                onDismiss={() => setOfferLead(false)}
              />
            )}
            {leadFormOpen && !leadSubmitted && (
              <LeadCaptureForm
                sessionId={sessionId}
                anonId={anonId}
                onSubmitted={() => {
                  setLeadSubmitted(true);
                  setLeadFormOpen(false);
                  setOfferLead(false);
                  try { localStorage.setItem(LEAD_KEY, "1"); } catch {}
                }}
                onCancel={() => setLeadFormOpen(false)}
              />
            )}
            {leadSubmitted && offerLead && (
              <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm flex items-start gap-2" data-testid="chat-lead-thanks">
                <CheckCircle weight="fill" className="text-emerald-600 mt-0.5 shrink-0" size={16} />
                <span>Thanks — someone from the SafeBase team will be in touch within one business day. In the meantime, I'm still here to help.</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="border-t border-slate-200 p-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
            data-testid="chat-form"
          >
            <input
              type="text"
              placeholder="Ask a question…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              data-testid="chat-input"
              className="flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-ink"
              autoFocus
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              data-testid="chat-send"
              aria-label="Send"
              className="px-3 py-2 bg-ink text-warning disabled:opacity-40 hover:bg-authority"
            >
              <PaperPlaneRight size={16} weight="fill" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const SUGGESTIONS = [
  "What's included in the trades plan?",
  "How does SafeBase handle CoR for transport operators?",
  "Can I integrate with Xero?",
];

/* ────────────────── Lead-capture sub-components (Iter54) ────────────────── */
function LeadCaptureBanner({ onAccept, onDismiss }) {
  return (
    <div className="border-2 border-ink bg-warning/30 px-3 py-3" data-testid="chat-lead-banner">
      <div className="flex items-start gap-2">
        <UserPlus weight="duotone" size={18} className="text-ink mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-display font-black text-sm tracking-tight">Want a human to follow up?</div>
          <p className="text-xs text-ink/70 mt-1 leading-relaxed">
            Drop your details and someone from SafeBase will reach out within one business day — no pressure, no spam.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onAccept}
              data-testid="chat-lead-accept"
              className="text-[11px] font-mono uppercase tracking-widest bg-ink text-warning px-3 py-1.5 hover:bg-authority"
            >
              Yes, contact me
            </button>
            <button
              type="button"
              onClick={onDismiss}
              data-testid="chat-lead-dismiss"
              className="text-[11px] font-mono uppercase tracking-widest text-ink/70 px-2 py-1.5 hover:text-ink"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadCaptureForm({ sessionId, anonId, onSubmitted, onCancel }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", industry: "", company: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/concierge/lead",
        { ...form, session_id: sessionId || null },
        { headers: { "X-Anon-Id": anonId } });
      onSubmitted();
    } catch (err) {
      setError(err?.response?.data?.detail || "Couldn't send right now — please email hello@safebase.com.au.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-2 border-ink bg-white p-3 space-y-2" data-testid="chat-lead-form">
      <div className="label-eyebrow text-ink">/ Have a human follow up</div>
      <div className="grid grid-cols-2 gap-2">
        <input value={form.name} onChange={change("name")} placeholder="Your name *" className="border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ink" data-testid="chat-lead-name" required />
        <input value={form.email} onChange={change("email")} type="email" placeholder="Email *" className="border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ink" data-testid="chat-lead-email" required />
        <input value={form.phone} onChange={change("phone")} type="tel" placeholder="Phone (optional)" className="border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-ink" data-testid="chat-lead-phone" />
        <select value={form.industry} onChange={change("industry")} className="border border-slate-300 px-2 py-1.5 text-sm bg-white outline-none focus:border-ink" data-testid="chat-lead-industry">
          <option value="">Industry (optional)</option>
          <option value="trades">Trades</option>
          <option value="hospitality">Hospitality</option>
          <option value="transport">Transport</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail</option>
        </select>
      </div>
      <input value={form.company} onChange={change("company")} placeholder="Company (optional)" className="border border-slate-300 px-2 py-1.5 text-sm w-full outline-none focus:border-ink" data-testid="chat-lead-company" />
      <textarea value={form.note} onChange={change("note")} placeholder="Anything else worth knowing?" rows={2} className="border border-slate-300 px-2 py-1.5 text-sm w-full outline-none focus:border-ink resize-none" data-testid="chat-lead-note" />
      {error && <div className="text-xs text-red-600" data-testid="chat-lead-error">{error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          data-testid="chat-lead-submit"
          className="text-[11px] font-mono uppercase tracking-widest bg-ink text-warning px-3 py-2 hover:bg-authority disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send to SafeBase"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          data-testid="chat-lead-cancel"
          className="text-[11px] font-mono uppercase tracking-widest text-ink/70 px-2 py-2 hover:text-ink"
        >
          Cancel
        </button>
      </div>
      <p className="text-[10px] text-ink/50 leading-snug">By submitting, you agree we may contact you about SafeBase. We don't share your details.</p>
    </form>
  );
}
