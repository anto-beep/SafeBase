import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HardHat, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function InductionPublic() {
  const { code } = useParams();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ worker_name: "", worker_email: "", worker_phone: "" });
  const [answers, setAnswers] = useState({});
  const [signature, setSignature] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/tradeinduct/public/${code}`)
      .then((r) => setProgram(r.data))
      .catch(() => setProgram(null))
      .finally(() => setLoading(false));
  }, [code]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.worker_name.trim()) { toast.error("Name is required"); return; }
    if (!signature.trim()) { toast.error("Signature is required"); return; }
    // require all required questions answered
    for (const [i, q] of (program.questions || []).entries()) {
      if (q.required && !answers[i]) { toast.error(`Q${i + 1} is required`); return; }
    }
    const body = {
      ...form,
      signature,
      answers: (program.questions || []).map((q, i) => ({ q: q.q, a: answers[i] || "" })),
    };
    try {
      const r = await axios.post(`${API_URL}/api/tradeinduct/public/${code}/submit`, body);
      setDone(r.data);
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || "Submission failed");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span>Loading…</span></div>;
  if (!program) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="font-display text-4xl font-black">Invalid code</div>
        <p className="text-muted-foreground mt-2">The induction code <code className="font-mono">{code}</code> isn't recognised. Check with the site supervisor.</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-warning text-ink flex items-center justify-center mx-auto"><CheckCircle size={48} weight="fill" /></div>
        <div className="label-eyebrow text-warning mt-6">/ INDUCTION COMPLETE</div>
        <div className="font-display text-4xl font-black mt-2">{program.title}</div>
        <p className="mt-4">{done.worker_name}, your induction is on file.</p>
        <div className="border-2 border-warning p-4 mt-6">
          <div className="label-eyebrow text-warning">Certificate ID</div>
          <div className="font-display text-2xl font-black tracking-wider">{done.certificate_id}</div>
        </div>
        <p className="text-sm text-white/60 mt-6">Show this to your site supervisor if asked. A copy has been sent to the business.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted py-10 px-4">
      <div className="max-w-xl mx-auto bg-background border border-border p-8">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="w-10 h-10 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" /></div>
          <div>
            <div className="label-eyebrow">/ Site induction</div>
            <div className="font-display text-2xl font-black tracking-tight">{program.title}</div>
            <div className="text-xs text-muted-foreground">{program.site || "Any site"} · {program.trade || "all trades"}</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 mt-6" data-testid="induction-public-form">
          <div><Label className="label-eyebrow">Your name *</Label><Input value={form.worker_name} onChange={(e) => setForm({ ...form, worker_name: e.target.value })} className="mt-2 h-11 rounded-none border-ink" required data-testid="induction-public-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="label-eyebrow">Email</Label><Input type="email" value={form.worker_email} onChange={(e) => setForm({ ...form, worker_email: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
            <div><Label className="label-eyebrow">Mobile</Label><Input value={form.worker_phone} onChange={(e) => setForm({ ...form, worker_phone: e.target.value })} className="mt-2 h-11 rounded-none border-ink" /></div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <div className="label-eyebrow mb-3">Induction questions</div>
            {(program.questions || []).map((q, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Checkbox
                  checked={!!answers[i]}
                  onCheckedChange={(v) => setAnswers({ ...answers, [i]: !!v })}
                  id={`q-${i}`}
                  className="mt-1"
                  data-testid={`induction-q-${i}`}
                />
                <label htmlFor={`q-${i}`} className="text-sm flex-1 cursor-pointer">
                  {q.q} {q.required && <span className="text-red-600">*</span>}
                </label>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
            <Label className="label-eyebrow">Type your full name to sign *</Label>
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} className="mt-2 h-11 rounded-none border-ink font-display italic" required data-testid="induction-public-signature" placeholder="Signature" />
          </div>

          <Button type="submit" className="btn-sharp h-12 w-full bg-ink text-white hover:bg-authority" data-testid="induction-public-submit">Complete induction</Button>
        </form>
      </div>
    </div>
  );
}
