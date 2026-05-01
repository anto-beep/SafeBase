/**
 * Public SWMS sign page — no auth required.
 * URL: /swms/sign/:token
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Warning, Hand } from "@phosphor-icons/react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ORDER = ["eliminate", "substitute", "isolate", "engineer", "admin", "ppe"];
const LVL_COLOUR = {
  eliminate: "bg-emerald-800", substitute: "bg-teal-600",
  isolate: "bg-blue-700", engineer: "bg-blue-900",
  admin: "bg-amber-600", ppe: "bg-red-700",
};

export default function SwmsSignPublic() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  const [sig, setSig] = useState("");
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/swms/sign/${token}`)
      .then((r) => setDoc(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || "Link invalid"));
  }, [token]);

  const submit = async () => {
    if (!sig) { toast.error("Please type your signature"); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/public/swms/sign/${token}`, { signature_data: sig });
      setSigned(true);
      toast.success("Thanks — your SWMS sign-off is recorded");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Sign failed");
    }
    setBusy(false);
  };

  if (err) return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-red-50 border-2 border-red-700 p-6 max-w-md text-center">
        <Warning weight="fill" size={36} className="text-red-700 mx-auto mb-3" />
        <div className="font-display font-black text-xl">Link unavailable</div>
        <div className="text-sm text-muted-foreground mt-2">{err}</div>
        <div className="text-xs text-muted-foreground mt-4">Contact your supervisor for a fresh link.</div>
      </div>
    </div>
  );

  if (!doc) return <div className="p-10 text-center text-sm text-muted-foreground">Loading SWMS…</div>;

  if (signed) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-emerald-50">
      <div className="bg-background border-2 border-emerald-600 p-8 max-w-md text-center">
        <CheckCircle weight="fill" size={48} className="text-emerald-700 mx-auto mb-3" />
        <div className="font-display font-black text-2xl">Signed</div>
        <div className="text-sm text-muted-foreground mt-2">
          Thanks {doc.worker_name}. Your acknowledgement is recorded against <strong>{doc.reference}</strong>.
          You can close this window.
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="swms-public-sign">
      <div className="border-b-2 border-ink pb-3">
        <div className="label-eyebrow">SafeBase · SWMS Sign-off</div>
        <div className="font-display text-2xl md:text-3xl font-black tracking-tighter mt-1">{doc.reference}</div>
        <div className="text-sm">{doc.company_name} · {doc.work_activity}</div>
        <div className="text-xs text-muted-foreground">{doc.site_location}</div>
      </div>

      <div className="bg-warning/20 border-2 border-ink p-3 text-sm">
        <strong className="block label-eyebrow mb-1">Read before signing</strong>
        By signing below, you confirm you've read and understood this SWMS. You understand the
        hazards identified and the controls in place. <strong>Work must stop if this SWMS is not being followed.</strong>
      </div>

      <div className="border border-border">
        <div className="bg-ink text-warning p-2 font-display font-black">Tasks, hazards and controls</div>
        <div className="divide-y divide-border">
          {(doc.rows || []).map((r, i) => (
            <div key={i} className="p-3 text-sm">
              <div className="font-bold">{i + 1}. {r.task}</div>
              {r.hazards?.length > 0 && (
                <div className="mt-1">
                  <span className="label-eyebrow">Hazards</span>
                  <ul className="list-disc pl-5 text-xs">{r.hazards.map((h, j) => <li key={j}>{h}</li>)}</ul>
                </div>
              )}
              {r.controls?.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {[...r.controls].sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level)).map((c, j) => (
                    <div key={j} className="text-xs">
                      <span className={`${LVL_COLOUR[c.level] || "bg-muted"} text-white px-1.5 py-[1px] text-[9px] font-bold tracking-widest mr-1`}>
                        {c.level?.toUpperCase()}
                      </span>{c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {doc.ppe?.length > 0 && (
        <div className="border border-border p-3 text-xs">
          <div className="label-eyebrow mb-1">PPE Required</div>
          <ul className="list-disc pl-5">{doc.ppe.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="bg-ink text-white border-2 border-ink p-4">
        <div className="label-eyebrow text-warning">Signing as</div>
        <div className="font-display text-xl font-black">{doc.worker_name}</div>
        <Label className="label-eyebrow text-warning mt-3 block">Type your full name or initials</Label>
        <Input
          value={sig} onChange={(e) => setSig(e.target.value)}
          className="h-12 rounded-none border-warning bg-white text-ink text-lg mt-1"
          placeholder="e.g. Jane Smith"
          data-testid="public-sig-input"
        />
        <Button
          onClick={submit} disabled={busy || !sig}
          className="btn-sharp bg-warning text-ink hover:bg-yellow-400 h-12 w-full mt-3 text-base"
          data-testid="public-sig-submit"
        >
          <Hand className="mr-2" weight="fill" />{busy ? "Signing…" : "Sign SWMS"}
        </Button>
      </div>

      <div className="text-[10px] text-muted-foreground text-center py-4">
        Powered by SafeBase · Secure link · Expires {(doc.expires_at || "").slice(0, 10)}
      </div>
    </div>
  );
}
