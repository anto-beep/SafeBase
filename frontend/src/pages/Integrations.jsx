import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/Layout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plug, Code, Webhooks, Key, ShieldCheck, Plugs } from "@phosphor-icons/react";

const ENDPOINT_GROUPS = [
  { title: "Authentication", anchor: "auth", endpoints: [
    { m: "POST", p: "/api/auth/register",         desc: "Create a new tenant account. Returns JWT." },
    { m: "POST", p: "/api/auth/login",            desc: "Authenticate. Returns JWT (7-day TTL)." },
    { m: "GET",  p: "/api/auth/me",               desc: "Return the authenticated user + industry." },
  ]},
  { title: "Documents", anchor: "documents", endpoints: [
    { m: "GET",  p: "/api/documents",                 desc: "List all generated documents." },
    { m: "POST", p: "/api/documents/generate",        desc: "Generate a SWMS / HACCP plan / CoR plan etc. via Claude." },
    { m: "GET",  p: "/api/documents/{document_id}",   desc: "Fetch a single document." },
  ]},
  { title: "Workers & Credentials", anchor: "workers", endpoints: [
    { m: "GET",  p: "/api/workers",                   desc: "List the worker directory." },
    { m: "POST", p: "/api/workers",                   desc: "Add a worker." },
    { m: "GET",  p: "/api/dashboard/widget/credential-expiry", desc: "Trades: licences expiring in 60 days + already expired." },
    { m: "GET",  p: "/api/healthcare/ahpra-register/expiring", desc: "Healthcare: AHPRA registrations expiring." },
  ]},
  { title: "Incidents", anchor: "incidents", endpoints: [
    { m: "GET",  p: "/api/incidents",                  desc: "List incidents across all industries." },
    { m: "POST", p: "/api/incidents",                  desc: "Create an incident (triggers regulator-pipeline triage)." },
    { m: "PATCH",p: "/api/incidents/{incident_id}",    desc: "Update status / corrective actions." },
  ]},
  { title: "Industry endpoints", anchor: "industry", endpoints: [
    { m: "POST", p: "/api/hospitality/temperature-logs",   desc: "Record a fridge/freezer/hot-hold temperature reading." },
    { m: "POST", p: "/api/transport/pretrip-inspections",  desc: "Submit a heavy-vehicle pre-trip checklist." },
    { m: "POST", p: "/api/transport/fitness-for-duty",     desc: "Driver fitness-for-duty declaration." },
    { m: "POST", p: "/api/retail/lone-worker/checkin",     desc: "Mobile-first lone-worker check-in." },
    { m: "POST", p: "/api/healthcare/sirs-incidents",      desc: "Open an ACQSC SIRS incident." },
  ]},
  { title: "Webhooks", anchor: "webhooks", endpoints: [
    { m: "GET",  p: "/api/webhooks/subscriptions",         desc: "List your webhook subscriptions." },
    { m: "POST", p: "/api/webhooks/subscriptions",         desc: "Subscribe to an event type." },
    { m: "POST", p: "/api/webhooks/test/{sid}",            desc: "Send a test payload to your endpoint." },
    { m: "GET",  p: "/api/webhooks/deliveries",            desc: "Last 100 delivery attempts (audit log)." },
  ]},
];

const WEBHOOK_EVENTS = [
  { key: "incident.created",             desc: "An incident was opened on any module." },
  { key: "incident.escalated",           desc: "Incident reached regulator-notify status." },
  { key: "licence.expiring",             desc: "Worker credential within 60 days of expiry." },
  { key: "ahpra.expiring",               desc: "Clinician AHPRA registration within 60 days." },
  { key: "fatigue.cap_exceeded",         desc: "Driver exceeded Standard/BFM/AFM fatigue cap." },
  { key: "temperature.out_of_range",     desc: "Hospitality temp unit logged out-of-range." },
  { key: "lone_worker.check_in_missed",  desc: "Active lone-worker shift missed its interval + 10m grace." },
  { key: "document.created",             desc: "A SWMS / HACCP / CoR plan was generated." },
  { key: "induction.completed",          desc: "A public induction QR link was submitted." },
];

export default function Integrations() {
  return (
    <MarketingLayout>
      <section className="bg-ink text-white py-20 px-6" data-testid="integrations-hero">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow text-warning">/ Integrations &amp; API</div>
          <h1 className="font-display text-5xl lg:text-6xl font-black tracking-tighter mt-3">Plug SafeBase into<br />the tools you already use.</h1>
          <p className="text-white/70 max-w-2xl mt-4">Native OAuth integrations with Xero, Deputy, Teletrac and Shopify, plus a public REST API and webhooks for anything else.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <a href="#native" className="btn-sharp inline-flex items-center gap-2 bg-warning text-ink hover:bg-warning/90 px-4 py-2 font-bold uppercase tracking-widest text-xs">
              <Plugs weight="duotone" />Native integrations
            </a>
            <a href="#api" className="btn-sharp inline-flex items-center gap-2 bg-white text-ink hover:bg-warning px-4 py-2 font-bold uppercase tracking-widest text-xs">
              <Code weight="duotone" />REST API
            </a>
            <a href="#webhooks" className="btn-sharp inline-flex items-center gap-2 bg-white text-ink hover:bg-warning px-4 py-2 font-bold uppercase tracking-widest text-xs">
              <Webhooks weight="duotone" />Webhooks
            </a>
          </div>
        </div>
      </section>

      {/* Native integrations */}
      <section id="native" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow">/ Native OAuth integrations</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-1">Connect with one click.</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">Five native OAuth flows live in the SafeBase dashboard. Each pulls down structured data continuously — no manual exports.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {NATIVE.map((p) => (
              <div key={p.slug} className="border border-border bg-background p-5" data-testid={`integration-native-${p.slug}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display font-black text-xl tracking-tight">{p.label}</div>
                    <div className="label-eyebrow mt-1" style={{ color: p.accent }}>/ {p.industry}</div>
                  </div>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest">OAUTH</span>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{p.desc}</p>
                <div className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">{p.dataPoints}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REST API */}
      <section id="api" className="py-16 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow">/ Public REST API</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-1">Same endpoints. Your own keys.</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">Every account gets API keys with rotating secrets and granular scopes. Authentication is a standard bearer-token header. All responses are JSON, all timestamps are ISO-8601 UTC.</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
            <Info icon={Key}        title="Bearer tokens" body="Manage your API keys at /dashboard/api-keys. Pass them as Authorization: Bearer <key> on every request." />
            <Info icon={ShieldCheck} title="Per-account isolation" body="Keys are scoped to your tenant — they cannot see other accounts' data, even on shared endpoints." />
            <Info icon={Plug}       title="Sandbox" body="A test tenant ships with a known seed dataset (see SAFEBASE demo accounts) so you can write integration tests against deterministic data." />
          </div>

          <div className="bg-background border-2 border-ink mt-8">
            <div className="bg-ink text-warning px-4 py-2 font-mono text-xs uppercase tracking-widest flex items-center justify-between">
              <span>Quick-start (curl)</span>
              <span className="text-white/60">all responses JSON</span>
            </div>
            <pre className="px-4 py-4 text-xs font-mono leading-relaxed overflow-x-auto" data-testid="integrations-curl-example">{`# 1. Sign in
curl -X POST https://app.safebase.com.au/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"owner@example.com","password":"…"}'
# → { "token": "eyJ...", "user": { ... } }

# 2. Use the token
curl https://app.safebase.com.au/api/dashboard/widget/credential-expiry \\
  -H "Authorization: Bearer <TOKEN>"
# → { "expiring_soon": [...], "expired": [...], "window_days": 60 }

# 3. Open an incident
curl -X POST https://app.safebase.com.au/api/incidents \\
  -H "Authorization: Bearer <TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Customer slip","site_name":"Bondi","severity":"medium"}'`}</pre>
          </div>

          <div className="mt-10 space-y-8">
            {ENDPOINT_GROUPS.map((g) => (
              <div key={g.anchor} id={g.anchor}>
                <div className="font-display font-black text-2xl tracking-tighter">{g.title}</div>
                <div className="mt-3 border border-border bg-background divide-y divide-border">
                  {g.endpoints.map((e) => (
                    <div key={`${e.m}-${e.p}`} className="flex items-start gap-3 px-4 py-3" data-testid={`integration-endpoint-${e.p}`}>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-widest font-mono ${methodCls(e.m)}`}>{e.m}</span>
                      <code className="font-mono text-xs sm:text-sm text-ink/80 break-all">{e.p}</code>
                      <span className="hidden sm:inline text-xs text-muted-foreground ml-auto">{e.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="label-eyebrow">/ Webhooks</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-1">Push, don't poll.</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">Subscribe to event types and SafeBase will POST to your URL with retries (3 attempts, exponential backoff). Every delivery is captured at /dashboard/webhooks for auditing.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
            {WEBHOOK_EVENTS.map((e) => (
              <div key={e.key} className="border border-border bg-background px-4 py-3" data-testid={`integration-event-${e.key}`}>
                <code className="font-mono text-sm font-bold">{e.key}</code>
                <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-background border-2 border-ink mt-8">
            <div className="bg-ink text-warning px-4 py-2 font-mono text-xs uppercase tracking-widest">Sample payload — incident.created</div>
            <pre className="px-4 py-4 text-xs font-mono leading-relaxed overflow-x-auto" data-testid="integrations-webhook-sample">{`{
  "event": "incident.created",
  "delivered_at": "2026-05-24T11:48:42.804802+00:00",
  "tenant_id": "user_abc123…",
  "data": {
    "incident_id": "inc_XYZ",
    "industry": "trades",
    "title": "Customer slip and fall",
    "severity": "medium",
    "regulator_type": "WorkSafe",
    "site_name": "Bondi",
    "opened_at": "2026-05-24T11:48:00+00:00",
    "link": "https://app.safebase.com.au/dashboard/incidents/inc_XYZ"
  }
}`}</pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-ink text-white">
        <div className="max-w-3xl mx-auto text-center">
          <Plug size={36} weight="duotone" className="mx-auto text-warning" />
          <div className="label-eyebrow text-warning mt-3">/ Ready to plug in?</div>
          <h2 className="font-display text-4xl font-black tracking-tighter mt-2">Start a free trial — get an API key in 60 seconds.</h2>
          <p className="text-white/70 mt-4">14-day trial, no credit card. API keys are issued the moment you sign up.</p>
          <Link to="/register"><Button className="btn-sharp mt-6 bg-warning text-ink hover:bg-warning/90" data-testid="integrations-cta">Get API access <ArrowRight className="ml-1" /></Button></Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

const NATIVE = [
  { slug: "xero",     label: "Xero",            accent: "#13B5EA", industry: "All industries",         desc: "Two-way sync of contacts, invoices and timesheets. Your bookkeeper sees compliance costs immediately.", dataPoints: "Contacts · Invoices · Timesheets" },
  { slug: "deputy",   label: "Deputy",          accent: "#FF5E5E", industry: "Hospitality & Retail",   desc: "Roster against credential currency — Deputy shifts auto-block if RSA / Food Safety Supervisor lapses.", dataPoints: "Rosters · Timesheets · Locations" },
  { slug: "teletrac", label: "Teletrac Navman", accent: "#0DC4B5", industry: "Transport",              desc: "Live fleet telematics. Driver hours flow into the SafeBase CoR fatigue tile.", dataPoints: "Vehicles · Driver hours · Routes" },
  { slug: "ahpra",    label: "AHPRA",           accent: "#2196A6", industry: "Healthcare",             desc: "Hourly polling of AHPRA registration status — registration lapses trigger SafeBase notifications.", dataPoints: "Clinician registrations" },
  { slug: "shopify",  label: "Shopify",         accent: "#96BF48", industry: "Retail",                 desc: "Pull store data so SafeBase can surface lone-worker shift coverage against trading hours.", dataPoints: "Stores · Locations · Orders" },
];

function methodCls(m) {
  return {
    GET:    "bg-emerald-100 text-emerald-800",
    POST:   "bg-blue-100 text-blue-800",
    PATCH:  "bg-amber-100 text-amber-800",
    PUT:    "bg-amber-100 text-amber-800",
    DELETE: "bg-red-100 text-red-800",
  }[m] || "bg-slate-100 text-slate-800";
}

function Info({ icon: Icon, title, body }) {
  return (
    <div className="border border-border bg-background p-5">
      <Icon size={28} weight="duotone" className="text-ink" />
      <div className="font-display font-black text-lg tracking-tight mt-3">{title}</div>
      <p className="text-sm text-muted-foreground mt-1.5">{body}</p>
    </div>
  );
}
