import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HardHat, IdentificationBadge, ChatCircleText, FileText, MapPin, SignOut, GraduationCap, Check } from "@phosphor-icons/react";
import { toast } from "sonner";

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <div className="label-eyebrow text-warning">/ {title}</div>
      {children}
    </section>
  );
}

export default function MobileWorker() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [site, setSite] = useState("");
  const [history, setHistory] = useState([]);

  const load = async () => {
    const [s, h] = await Promise.all([api.get("/worker/my-summary"), api.get("/worker/checkins")]);
    setData(s.data);
    setHistory(h.data);
  };

  useEffect(() => { load(); }, []);

  const doCheckin = async () => {
    if (!site.trim()) { toast.error("Site is required"); return; }
    await api.post("/worker/checkin", { site });
    toast.success(`Checked in at ${site}`);
    setCheckinOpen(false);
    setSite("");
    load();
  };

  const handleLogout = async () => { await logout(); navigate("/"); };

  if (!data) return <div className="min-h-screen bg-ink text-white flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-ink text-white" data-testid="mobile-worker-page">
      <header className="sticky top-0 z-30 bg-ink border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={18} /></div>
            <div>
              <div className="label-eyebrow text-warning">/ My SafeTradie</div>
              <div className="font-display font-black text-sm">{data.name}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white" data-testid="mobile-worker-logout"><SignOut /></Button>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8 pb-32 max-w-md mx-auto">
        <button onClick={() => setCheckinOpen(true)} data-testid="mobile-checkin-btn" className="w-full bg-warning text-ink py-5 text-center border-4 border-warning hover:bg-warning/90">
          <MapPin size={28} weight="fill" className="mx-auto" />
          <div className="font-display text-xl font-black mt-1">CHECK IN</div>
          <div className="text-xs">Tap to log arrival on site</div>
        </button>

        <Section title="My licences">
          {data.licences_total === 0 ? (
            <div className="text-sm text-white/60 border border-white/10 p-3">No licences on file. Ask your supervisor to add them.</div>
          ) : data.licences_expiring_soon.length === 0 ? (
            <div className="text-sm text-emerald-400 border border-emerald-500/30 p-3 flex items-center gap-2"><Check weight="bold" />All {data.licences_total} licences valid.</div>
          ) : (
            <div className="space-y-2">
              {data.licences_expiring_soon.map((lic, i) => (
                <div key={i} className={`border p-3 ${lic.days_to_expiry < 0 ? "border-red-500 bg-red-900/30" : "border-warning/50 bg-warning/10"}`}>
                  <div className="flex items-center gap-2"><IdentificationBadge weight="duotone" size={16} /><span className="font-bold text-sm">{lic.licence_type || "Licence"}</span></div>
                  <div className="text-xs text-white/70 mt-1">{lic.days_to_expiry < 0 ? `Expired ${Math.abs(lic.days_to_expiry)}d ago` : `Expires in ${lic.days_to_expiry}d`} · {lic.expiry_date}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Upcoming toolbox talks">
          {data.upcoming_toolbox.length === 0 ? (
            <div className="text-sm text-white/60 border border-white/10 p-3">Nothing scheduled.</div>
          ) : (
            <div className="space-y-2">
              {data.upcoming_toolbox.map((t, i) => (
                <div key={i} className="border border-white/10 p-3">
                  <div className="flex items-center gap-2"><ChatCircleText weight="duotone" size={16} /><span className="font-bold text-sm">{t.topic || t.title || "Talk"}</span></div>
                  <div className="text-xs text-white/70 mt-1">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString("en-AU") : "TBC"} · {t.site || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recent SWMS">
          {data.recent_swms.length === 0 ? (
            <div className="text-sm text-white/60 border border-white/10 p-3">No SWMS issued yet.</div>
          ) : (
            <div className="space-y-2">
              {data.recent_swms.slice(0, 3).map((d) => (
                <div key={d.document_id} className="border border-white/10 p-3">
                  <div className="flex items-center gap-2"><FileText weight="duotone" size={16} /><span className="font-bold text-sm line-clamp-1">{d.title}</span></div>
                  <div className="text-xs text-white/70 mt-1">{d.trade} · {d.created_at ? new Date(d.created_at).toLocaleDateString("en-AU") : "—"}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="My training">
          {data.my_courses.length === 0 ? (
            <Link to="/dashboard/academy" className="block text-sm text-warning border border-warning/50 p-3 text-center">Browse Academy →</Link>
          ) : (
            <div className="space-y-2">
              {data.my_courses.map((c) => (
                <div key={c.enrolment_id} className="border border-white/10 p-3">
                  <div className="flex items-center gap-2"><GraduationCap weight="duotone" size={16} /><span className="font-bold text-sm">{c.course_title}</span></div>
                  <div className="text-xs text-white/70 mt-1">{c.progress_pct}% · {c.status}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {history.length > 0 && (
          <Section title="Recent check-ins">
            <div className="space-y-2">
              {history.slice(0, 5).map((h) => (
                <div key={h.checkin_id} className="border border-white/10 p-3 text-xs text-white/70">
                  <strong className="text-white">{h.site}</strong> — {new Date(h.timestamp).toLocaleString("en-AU")}
                </div>
              ))}
            </div>
          </Section>
        )}
      </main>

      <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
        <DialogContent className="rounded-none border-ink max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-tight">Site check-in</DialogTitle>
            <DialogDescription>Where are you working today?</DialogDescription>
          </DialogHeader>
          <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. 42 King St Sydney" className="h-12 rounded-none border-ink" data-testid="mobile-checkin-site" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => setCheckinOpen(false)}>Cancel</Button>
            <Button type="button" onClick={doCheckin} className="btn-sharp bg-ink text-white" data-testid="mobile-checkin-submit">Check in</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
