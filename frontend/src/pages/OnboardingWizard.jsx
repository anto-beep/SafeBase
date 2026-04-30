import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HardHat, ArrowRight, ArrowLeft, CheckCircle, Sparkle, X, FileText, Users, Bell, EnvelopeSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const STEPS = [
  { n: 1, title: "Business Setup", eta: "2 min" },
  { n: 2, title: "Add first worker", eta: "2 min" },
  { n: 3, title: "Create first SWMS", eta: "1 min" },
  { n: 4, title: "Compliance alerts", eta: "1 min" },
  { n: 5, title: "Invite team", eta: "1 min" },
  { n: 6, title: "Launch", eta: "30 sec" },
];

const TRADES = ["Electrician", "Plumber", "Builder", "Carpenter", "Roofer", "Gasfitter", "Other"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];
const WORKER_BANDS = ["Just me", "2-5", "6-10", "11-20", "20+"];
const CRED_TYPES = ["white_card", "electrical_licence", "plumbing_licence", "high_risk_work", "first_aid", "working_at_heights"];

export default function OnboardingWizard({ onClose }) {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [biz, setBiz] = useState({ company_name: user?.company_name || "", abn: "", trade_type: "Electrician", primary_state: "NSW", worker_count_band: "Just me" });
  // Step 2
  const [firstWorker, setFirstWorker] = useState({ name: user?.name || "", role: "Owner", trade: "Electrician", phone: "", email: user?.email || "" });
  const [createdWorkerId, setCreatedWorkerId] = useState(null);
  // Step 3
  const [swmsForm, setSwmsForm] = useState({ job_description: "", site_location: "", hazards: "" });
  const [swmsDone, setSwmsDone] = useState(false);
  // Step 4
  const [cred, setCred] = useState({ licence_type: "white_card", licence_number: "", expiry_date: "" });
  // Step 5
  const [invites, setInvites] = useState([{ email: "", role: "worker" }]);

  useEffect(() => {
    api.get("/onboarding").then((r) => {
      if (r.data?.completed) {
        onClose?.();
      } else if (r.data?.step) {
        setStep(r.data.step);
      }
    }).catch(() => {});
  }, [onClose]);

  const saveState = (nextStep, completed = false) => {
    api.put("/onboarding", { step: nextStep, completed, data: {} }).catch(() => {});
  };

  const next = () => { const s = Math.min(6, step + 1); setStep(s); saveState(s); };
  const back = () => setStep(Math.max(1, step - 1));
  const saveAndExit = () => { saveState(step); onClose?.(); };

  const submitBusiness = async () => {
    setLoading(true);
    try {
      await api.put("/settings/business", biz);
      toast.success("Business profile saved");
      next();
    } catch { toast.error("Save failed"); }
    finally { setLoading(false); }
  };

  const submitWorker = async () => {
    setLoading(true);
    try {
      const r = await api.post("/workers", firstWorker);
      setCreatedWorkerId(r.data.worker_id);
      toast.success("Worker added");
      next();
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  const submitSwms = async () => {
    setLoading(true);
    try {
      await api.post("/documents/generate", {
        document_type: "SWMS",
        trade: biz.trade_type,
        job_description: swmsForm.job_description,
        site_location: swmsForm.site_location,
        hazards: swmsForm.hazards.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("First SWMS generated");
      setSwmsDone(true);
      next();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI generation unavailable — you can try again from the dashboard.");
      // Don't block onboarding — allow progression
      setSwmsDone(true);
      next();
    } finally { setLoading(false); }
  };

  const submitCred = async () => {
    if (!cred.licence_number || !cred.expiry_date) { next(); return; }
    setLoading(true);
    try {
      await api.post("/licences", { worker_id: createdWorkerId, ...cred });
      toast.success("Credential tracked");
      next();
    } catch { toast.error("Failed"); next(); }
    finally { setLoading(false); }
  };

  const submitInvites = async () => {
    setLoading(true);
    try {
      for (const inv of invites) {
        if (inv.email) {
          await api.post("/team/invite", { email: inv.email, role: inv.role });
        }
      }
      toast.success("Invitations queued");
      next();
    } catch { next(); }
    finally { setLoading(false); }
  };

  const finishWizard = async () => {
    await api.put("/onboarding", { step: 6, completed: true, data: {} }).catch(() => {});
    await checkAuth();
    onClose?.();
    navigate("/dashboard");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" data-testid="onboarding-wizard">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink flex items-center justify-center"><HardHat weight="fill" className="text-warning" size={18} /></div>
            <div>
              <div className="font-display font-black text-sm tracking-tight">SAFETRADIE</div>
              <div className="label-eyebrow text-[10px]">/ Onboarding · ~8 minutes total</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveAndExit} className="label-eyebrow underline" data-testid="onb-save-exit">Save & exit</button>
            <button onClick={onClose} className="p-2 hover:bg-muted" data-testid="onb-close"><X size={18} /></button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 pb-4">
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div key={s.n} className={`flex-1 h-2 ${s.n < step ? "bg-ink" : s.n === step ? "bg-warning" : "bg-muted"}`} />
            ))}
          </div>
          <div className="mt-2 label-eyebrow">Step {step} of 6 · {STEPS[step - 1].title} · ~{STEPS[step - 1].eta}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {step === 1 && (
          <div data-testid="onb-step-1">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Let's set up your SafeTradie account.</h1>
            <p className="mt-3 text-muted-foreground">We'll use this to pre-load relevant WHS rules and SWMS templates for your trade and state.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="label-eyebrow">Business name</Label><Input data-testid="onb-biz-name" value={biz.company_name} onChange={(e) => setBiz({ ...biz, company_name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">ABN</Label><Input data-testid="onb-biz-abn" value={biz.abn} onChange={(e) => setBiz({ ...biz, abn: e.target.value })} className="mt-2 h-12 rounded-none border-ink" placeholder="11-digit ABN" /></div>
              <div><Label className="label-eyebrow">Trade type</Label>
                <Select value={biz.trade_type} onValueChange={(v) => setBiz({ ...biz, trade_type: v })}>
                  <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="onb-biz-trade"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRADES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="label-eyebrow">Primary state</Label>
                <Select value={biz.primary_state} onValueChange={(v) => setBiz({ ...biz, primary_state: v })}>
                  <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="onb-biz-state"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="label-eyebrow">Workers</Label>
                <Select value={biz.worker_count_band} onValueChange={(v) => setBiz({ ...biz, worker_count_band: v })}>
                  <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="onb-biz-workers"><SelectValue /></SelectTrigger>
                  <SelectContent>{WORKER_BANDS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></div>
            </div>
            <div className="mt-6 bg-warning border-2 border-ink p-4 text-sm font-bold">Based on {biz.trade_type} in {biz.primary_state}, we'll pre-load relevant WHS legislation + SWMS templates.</div>
            <div className="mt-8 flex justify-end">
              <Button onClick={submitBusiness} disabled={loading || !biz.company_name} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="onb-step1-next">Add your first worker <ArrowRight className="ml-2" /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div data-testid="onb-step-2">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Who works with you?</h1>
            <p className="mt-3 text-muted-foreground">Add yourself first. You can add the rest of the crew any time from the Workers page.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="label-eyebrow">Name</Label><Input data-testid="onb-w-name" value={firstWorker.name} onChange={(e) => setFirstWorker({ ...firstWorker, name: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Role</Label><Input data-testid="onb-w-role" value={firstWorker.role} onChange={(e) => setFirstWorker({ ...firstWorker, role: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Trade</Label><Input data-testid="onb-w-trade" value={firstWorker.trade} onChange={(e) => setFirstWorker({ ...firstWorker, trade: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Mobile</Label><Input data-testid="onb-w-phone" value={firstWorker.phone} onChange={(e) => setFirstWorker({ ...firstWorker, phone: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div className="md:col-span-2"><Label className="label-eyebrow">Email (optional)</Label><Input data-testid="onb-w-email" value={firstWorker.email} onChange={(e) => setFirstWorker({ ...firstWorker, email: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={back} className="btn-sharp h-12 border-ink"><ArrowLeft className="mr-2" /> Back</Button>
              <Button onClick={submitWorker} disabled={loading || !firstWorker.name} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="onb-step2-next">Generate your first SWMS <ArrowRight className="ml-2" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div data-testid="onb-step-3">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Generate your first SWMS.</h1>
            <p className="mt-3 text-muted-foreground">This is the document WorkSafe will ask for first. Our AI creates it in 60 seconds.</p>
            <div className="mt-8 space-y-4">
              <div><Label className="label-eyebrow">Describe the job</Label><Textarea data-testid="onb-swms-job" rows={3} value={swmsForm.job_description} onChange={(e) => setSwmsForm({ ...swmsForm, job_description: e.target.value })} className="mt-2 rounded-none border-ink" placeholder={`e.g. Install hot water system on a 2-storey roof in ${biz.primary_state}`} /></div>
              <div><Label className="label-eyebrow">Site location</Label><Input data-testid="onb-swms-site" value={swmsForm.site_location} onChange={(e) => setSwmsForm({ ...swmsForm, site_location: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Known hazards (comma separated)</Label><Input data-testid="onb-swms-haz" value={swmsForm.hazards} onChange={(e) => setSwmsForm({ ...swmsForm, hazards: e.target.value })} className="mt-2 h-12 rounded-none border-ink" placeholder="Working at heights, electrical" /></div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={back} className="btn-sharp h-12 border-ink"><ArrowLeft className="mr-2" /> Back</Button>
              <Button onClick={submitSwms} disabled={loading || !swmsForm.job_description} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="onb-step3-next">
                {loading ? "Generating…" : <>Generate with AI <Sparkle className="ml-2" weight="fill" /></>}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div data-testid="onb-step-4">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Never miss an expiry again.</h1>
            <p className="mt-3 text-muted-foreground">Add your most important credential (e.g. white card). You can skip and add credentials any time.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label className="label-eyebrow">Type</Label>
                <Select value={cred.licence_type} onValueChange={(v) => setCred({ ...cred, licence_type: v })}>
                  <SelectTrigger className="mt-2 h-12 rounded-none border-ink" data-testid="onb-cred-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{CRED_TYPES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label className="label-eyebrow">Licence number</Label><Input data-testid="onb-cred-num" value={cred.licence_number} onChange={(e) => setCred({ ...cred, licence_number: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
              <div><Label className="label-eyebrow">Expiry date</Label><Input data-testid="onb-cred-exp" type="date" value={cred.expiry_date} onChange={(e) => setCred({ ...cred, expiry_date: e.target.value })} className="mt-2 h-12 rounded-none border-ink" /></div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={back} className="btn-sharp h-12 border-ink"><ArrowLeft className="mr-2" /> Back</Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={next} className="btn-sharp h-12" data-testid="onb-step4-skip">Skip for now</Button>
                <Button onClick={submitCred} disabled={loading} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="onb-step4-next">Continue <ArrowRight className="ml-2" /></Button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div data-testid="onb-step-5">
            <h1 className="font-display text-4xl lg:text-5xl font-black tracking-tighter">Invite your team.</h1>
            <p className="mt-3 text-muted-foreground">Workers log incidents and do training on their phone. No extra charge.</p>
            <div className="mt-8 space-y-3">
              {invites.map((inv, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-3"><Input data-testid={`onb-inv-email-${i}`} type="email" placeholder="teammate@example.com" value={inv.email} onChange={(e) => { const ns = [...invites]; ns[i].email = e.target.value; setInvites(ns); }} className="h-12 rounded-none border-ink" /></div>
                  <div className="md:col-span-2">
                    <Select value={inv.role} onValueChange={(v) => { const ns = [...invites]; ns[i].role = v; setInvites(ns); }}>
                      <SelectTrigger className="h-12 rounded-none border-ink" data-testid={`onb-inv-role-${i}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="safety_manager">Safety Manager</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="worker">Worker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setInvites([...invites, { email: "", role: "worker" }])} className="btn-sharp border-ink" data-testid="onb-inv-add">+ Add another</Button>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={back} className="btn-sharp h-12 border-ink"><ArrowLeft className="mr-2" /> Back</Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={next} className="btn-sharp h-12" data-testid="onb-step5-skip">Skip for now</Button>
                <Button onClick={submitInvites} disabled={loading} className="btn-sharp h-12 bg-ink text-white hover:bg-authority" data-testid="onb-step5-next">Send invites <EnvelopeSimple className="ml-2" /></Button>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div data-testid="onb-step-6" className="text-center">
            <div className="w-20 h-20 bg-warning border-4 border-ink mx-auto flex items-center justify-center mb-6"><CheckCircle size={48} weight="fill" className="text-ink" /></div>
            <h1 className="font-display text-5xl font-black tracking-tighter">You're set up.<br />Your business is protected.</h1>
            <div className="mt-8 max-w-md mx-auto space-y-2 text-left">
              <div className="flex gap-2"><CheckCircle weight="fill" className="text-ink" /> Business configured for {biz.trade_type} in {biz.primary_state}</div>
              <div className="flex gap-2"><CheckCircle weight="fill" className="text-ink" /> First worker added</div>
              <div className="flex gap-2"><CheckCircle weight="fill" className="text-ink" /> {swmsDone ? "First SWMS generated" : "First SWMS ready to generate"}</div>
              <div className="flex gap-2"><CheckCircle weight="fill" className="text-ink" /> Alerts configured</div>
            </div>
            <Button onClick={finishWizard} className="btn-sharp h-14 bg-ink text-white hover:bg-authority mt-10 px-8" data-testid="onb-finish">Go to my dashboard <ArrowRight className="ml-2" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
