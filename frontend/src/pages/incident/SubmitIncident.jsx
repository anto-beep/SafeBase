import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkle, ArrowRight, ArrowLeft, CheckCircle, User, UsersThree, Buildings, Warning, MapPin, House } from "@phosphor-icons/react";
import { toast } from "sonner";
import BodyMap from "./BodyMap";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { INCIDENT_CATEGORIES, INJURY_NATURES, TREATMENT_OPTIONS } from "./constants";

const INVOLVED = [
  { key: "me", label: "ME", desc: "I was involved in this incident", icon: User },
  { key: "other", label: "SOMEONE ELSE", desc: "This happened to another person", icon: UsersThree },
  { key: "property", label: "PROPERTY ONLY", desc: "No person was injured", icon: Buildings },
  { key: "near_miss", label: "NEAR MISS", desc: "Nothing was damaged but something nearly happened", icon: Warning },
];

export default function SubmitIncident() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [aiBusy, setAiBusy] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [sub, setSub] = useState({
    involved_type: "", // me / other / property / near_miss
    involved_people: [],
    description: "",
    category: "",
    was_hurt: "",
    body_parts: [],
    injury_natures: [],
    treatment_given: "",
    treatments: [],
    ambulance: "",
    hospital: "",
    hospital_name: "",
    work_stopped: "",
    first_aider: "",
    treatment_notes: "",
    site: "",
    site_id: "",
    site_location: "",
    location_type: "site", // site / map / wfh
    map_address: "",
    map_lat: null,
    map_lng: null,
    state: "NSW",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    commuting: "no",
    shift_duration: "",
    witnessed: "",
    witnesses: [],
    other_info: "",
  });

  useEffect(() => {
    api.get("/workers").then((r) => setWorkers(r.data || []));
    api.get("/sites").then((r) => setSites(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    // Auto-fill submitter as the involved person when "ME" selected
    if (sub.involved_type === "me" && sub.involved_people.length === 0 && user) {
      setSub((s) => ({ ...s, involved_people: [{ name: user.name, role: user.role || "", source: "self" }] }));
    }
  }, [sub.involved_type, user]);

  const patch = (k, v) => setSub((s) => ({ ...s, [k]: v }));

  const aiCategorise = async () => {
    if (!sub.description.trim()) return toast.error("Describe what happened first");
    setAiBusy(true);
    try {
      const r = await api.post("/incident-workflow/ai/categorise", { description: sub.description });
      patch("category", r.data.category || "");
      if (r.data.fallback) toast.info("AI unavailable — showing standard suggestion");
      else toast.success(`AI suggests: ${r.data.category}`);
    } catch { toast.error("AI failed"); }
    setAiBusy(false);
  };

  const next = () => setStep((s) => Math.min(6, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const submit = async () => {
    try {
      const payload = {
        title: sub.description.slice(0, 80) || "Incident",
        incident_type: sub.category || null,
        submission: sub,
      };
      const r = await api.post("/incident-workflow", payload);
      toast.success(`Lodged. Reference: ${r.data.reference}`);

      // AUTO-TRIAGE: run the incident against SIRS / NDIS / NHVR matrices.
      // If any pipeline fires, create a draft regulator case so the 24h clock starts
      // automatically — no owner needs to remember to run triage manually.
      try {
        const industry = user?.industry || "trades";
        const triageBody = {
          industry,
          incident_type: sub.category || "",
          description: sub.description || "",
        };
        const tr = await api.post("/regulator-pipeline/triage", triageBody);
        if (tr?.data?.match_count > 0) {
          await api.post("/regulator-pipeline/draft", {
            ...triageBody,
            incident_id: r.data.incident_id,
          });
          const names = tr.data.matches.map((m) => `${m.pipeline} (${m.priority})`).join(" · ");
          toast.warning(`Regulator notification required: ${names}. Draft case started — review in Regulator Cases.`, { duration: 8000 });
        }
      } catch (e) { /* non-blocking */ }

      nav(`/dashboard/incidents/${r.data.incident_id}`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Submission failed"); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="incident-submit">
      <div className="border-b-2 border-ink pb-4">
        <div className="label-eyebrow">/ Incidents</div>
        <h1 className="font-display text-3xl font-black tracking-tighter mt-1">Report an incident</h1>
        <p className="text-muted-foreground mt-1 text-sm">Step {step} of 6 · takes about 3 minutes · plain language, no jargon.</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div key={s} className={`flex-1 h-1.5 ${s <= step ? "bg-ink" : "bg-muted"}`} data-testid={`progress-${s}`} />
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Who was involved?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INVOLVED.map((o) => (
              <button
                type="button"
                key={o.key}
                onClick={() => patch("involved_type", o.key)}
                className={`border-2 p-5 text-left transition ${sub.involved_type === o.key ? "border-ink bg-ink text-white" : "border-border hover:border-ink"}`}
                data-testid={`involved-${o.key}`}
              >
                <o.icon size={28} weight="bold" />
                <div className="font-display font-black text-xl mt-2">{o.label}</div>
                <div className="text-xs mt-1 opacity-80">{o.desc}</div>
              </button>
            ))}
          </div>
          {sub.involved_type === "other" && (
            <div className="border border-border p-4 space-y-2">
              <Label className="label-eyebrow">Who was involved?</Label>
              <Select value={sub.involved_people[0]?.worker_id || "__manual__"}
                onValueChange={(v) => {
                  if (v === "__manual__") patch("involved_people", [{ name: "", role: "", source: "manual" }]);
                  else { const w = workers.find((x) => x.worker_id === v); patch("involved_people", [{ name: w?.name, role: w?.role, worker_id: v, source: "roster" }]); }
                }}>
                <SelectTrigger className="h-11 rounded-none border-ink" data-testid="involved-select"><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Add person manually…</SelectItem>
                  {workers.map((w) => <SelectItem key={w.worker_id} value={w.worker_id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {sub.involved_people[0]?.source === "manual" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input placeholder="First & last name" value={sub.involved_people[0].name || ""} onChange={(e) => patch("involved_people", [{ ...sub.involved_people[0], name: e.target.value }])} className="h-11 rounded-none border-ink" />
                  <Input placeholder="Role" value={sub.involved_people[0].role || ""} onChange={(e) => patch("involved_people", [{ ...sub.involved_people[0], role: e.target.value }])} className="h-11 rounded-none border-ink" />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Tell us what happened</h2>
          <p className="text-sm text-muted-foreground">Describe it in your own words. Don't worry about being technical.</p>
          <Textarea rows={8} value={sub.description} onChange={(e) => patch("description", e.target.value)}
            placeholder="What were you doing, what went wrong, what did you see or experience?"
            className="rounded-none border-ink" data-testid="f-description" />
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <Button onClick={aiCategorise} disabled={aiBusy || !sub.description.trim()} variant="outline"
              className="btn-sharp border-ink" data-testid="ai-categorise-btn">
              <Sparkle className="mr-2" weight="fill" />{aiBusy ? "Thinking…" : "AI suggest category"}
            </Button>
            <div className="flex-1 min-w-[220px]">
              <Label className="label-eyebrow">Category</Label>
              <Select value={sub.category || "__none__"} onValueChange={(v) => patch("category", v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">—</SelectItem>{INCIDENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Were any body parts injured?</h2>
          {sub.involved_type === "property" && <div className="text-sm text-muted-foreground">Skipping — property-only incident.</div>}
          {sub.involved_type !== "property" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {["yes", "no", "unsure"].map((v) => (
                  <button type="button" key={v} onClick={() => patch("was_hurt", v)}
                    className={`border-2 p-4 text-sm font-bold tracking-widest ${sub.was_hurt === v ? "border-ink bg-ink text-white" : "border-border"}`}
                    data-testid={`hurt-${v}`}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
              {sub.was_hurt === "yes" && (
                <>
                  <BodyMap value={sub.body_parts} onChange={(v) => patch("body_parts", v)} />
                  <div>
                    <Label className="label-eyebrow">Nature of injury</Label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {INJURY_NATURES.map((n) => (
                        <button type="button" key={n}
                          onClick={() => patch("injury_natures", sub.injury_natures.includes(n) ? sub.injury_natures.filter((x) => x !== n) : [...sub.injury_natures, n])}
                          className={`px-3 py-1 text-xs font-bold tracking-widest border-2 ${sub.injury_natures.includes(n) ? "bg-ink text-warning border-ink" : "bg-background border-border hover:border-ink"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Immediate treatment</h2>
          <div className="grid grid-cols-3 gap-2">
            {["yes", "no", "unsure"].map((v) => (
              <button type="button" key={v} onClick={() => patch("treatment_given", v)}
                className={`border-2 p-3 text-sm font-bold tracking-widest ${sub.treatment_given === v ? "border-ink bg-ink text-white" : "border-border"}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          {sub.treatment_given === "yes" && (
            <>
              <div>
                <Label className="label-eyebrow">Treatments provided</Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {TREATMENT_OPTIONS.map((t) => (
                    <button type="button" key={t}
                      onClick={() => patch("treatments", sub.treatments.includes(t) ? sub.treatments.filter((x) => x !== t) : [...sub.treatments, t])}
                      className={`px-3 py-1 text-xs font-bold tracking-widest border-2 ${sub.treatments.includes(t) ? "bg-ink text-warning border-ink" : "bg-background border-border hover:border-ink"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="label-eyebrow">Ambulance called?</Label>
                  <Select value={sub.ambulance || "__none__"} onValueChange={(v) => patch("ambulance", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="label-eyebrow">Taken to hospital?</Label>
                  <Select value={sub.hospital || "__none__"} onValueChange={(v) => patch("hospital", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
                  </Select>
                </div>
                {sub.hospital === "yes" && (
                  <Input placeholder="Which hospital / medical facility?" value={sub.hospital_name} onChange={(e) => patch("hospital_name", e.target.value)} className="md:col-span-2 h-11 rounded-none border-ink" />
                )}
                <div className="md:col-span-2">
                  <Label className="label-eyebrow">Work stopped?</Label>
                  <Select value={sub.work_stopped || "__none__"} onValueChange={(v) => patch("work_stopped", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="stopped">Yes — fully stopped</SelectItem>
                      <SelectItem value="area">Yes — area cordoned</SelectItem>
                      <SelectItem value="continued">No — continued</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="label-eyebrow">First aider (optional)</Label>
                  <Input value={sub.first_aider} onChange={(e) => patch("first_aider", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
                </div>
                <Textarea rows={3} placeholder="Additional treatment notes" value={sub.treatment_notes} onChange={(e) => patch("treatment_notes", e.target.value)} className="md:col-span-2 rounded-none border-ink" />
              </div>
            </>
          )}
        </section>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Where and when</h2>

          {/* Location type — 3 large tiles: Site / Map / Work from home */}
          <div>
            <Label className="label-eyebrow">Where did it happen?</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              {[
                { v: "site", label: "Site", desc: "A registered site / location from your Site Register.", icon: Buildings },
                { v: "map",  label: "Map",  desc: "Anywhere else — pick an address (Google Places).", icon: MapPin },
                { v: "wfh",  label: "Work from home", desc: "The worker's home workplace.", icon: House },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = sub.location_type === opt.v;
                return (
                  <button
                    type="button"
                    key={opt.v}
                    onClick={() => patch("location_type", opt.v)}
                    className={`text-left border-2 p-3 flex gap-3 items-start ${active ? "border-ink bg-ink text-white" : "border-border hover:border-ink"}`}
                    data-testid={`f-location-type-${opt.v}`}
                  >
                    <Icon size={22} weight="bold" />
                    <div>
                      <div className="font-bold tracking-widest text-sm">{opt.label.toUpperCase()}</div>
                      <div className="text-xs opacity-80 mt-1">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional fields based on location_type */}
          {sub.location_type === "site" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="label-eyebrow">Site</Label>
                <Select
                  value={sub.site_id || "__none__"}
                  onValueChange={(v) => {
                    if (v === "__none__") { patch("site_id", ""); patch("site", ""); return; }
                    const s = sites.find((x) => x.site_id === v);
                    patch("site_id", v); patch("site", s?.name || "");
                  }}
                >
                  <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-site-id"><SelectValue placeholder="Pick a site from your register" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None / not in register —</SelectItem>
                    {sites.map((s) => <SelectItem key={s.site_id} value={s.site_id}>{s.name}{s.address ? ` · ${s.address.slice(0, 40)}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <a href="/dashboard/sites" target="_blank" rel="noreferrer" className="text-[11px] underline text-muted-foreground mt-1 inline-block">Manage sites →</a>
              </div>
              <div>
                <Label className="label-eyebrow">Site free-text (if not in register)</Label>
                <Input
                  value={sub.site}
                  onChange={(e) => patch("site", e.target.value)}
                  placeholder="Site name or description"
                  className="mt-1 h-11 rounded-none border-ink"
                  data-testid="f-site"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Specific location on site</Label>
                <Input value={sub.site_location} onChange={(e) => patch("site_location", e.target.value)} placeholder="e.g. Ground floor bathroom" className="mt-1 h-11 rounded-none border-ink" />
              </div>
            </div>
          )}

          {sub.location_type === "map" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Address (Google search)</Label>
                <AddressAutocomplete
                  value={sub.map_address}
                  onChange={(v) => patch("map_address", v)}
                  onSelect={(place) => {
                    patch("map_address", place.formatted_address || place.name || "");
                    const loc = place.geometry?.location;
                    patch("map_lat", loc?.lat ? loc.lat() : null);
                    patch("map_lng", loc?.lng ? loc.lng() : null);
                  }}
                  placeholder="Start typing an address…"
                  data-testid="f-map-address"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="label-eyebrow">Specific location detail (optional)</Label>
                <Input value={sub.site_location} onChange={(e) => patch("site_location", e.target.value)} placeholder="e.g. Footpath outside main entrance" className="mt-1 h-11 rounded-none border-ink" />
              </div>
            </div>
          )}

          {sub.location_type === "wfh" && (
            <div className="bg-muted border border-border p-4 text-sm space-y-2">
              <div className="font-bold">Work from home</div>
              <p className="text-muted-foreground">The incident occurred at the worker's home workplace. The worker's address on file will be used as the location reference.</p>
              <div>
                <Label className="label-eyebrow">Specific location (e.g. home office, garage)</Label>
                <Input value={sub.site_location} onChange={(e) => patch("site_location", e.target.value)} placeholder="e.g. Home office desk" className="mt-1 h-11 rounded-none border-ink" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">State / Territory</Label>
              <Select value={sub.state} onValueChange={(v) => patch("state", v)}>
                <SelectTrigger className="mt-1 h-11 rounded-none border-ink" data-testid="f-state"><SelectValue /></SelectTrigger>
                <SelectContent>{["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-eyebrow">Date</Label>
              <Input type="date" max={new Date().toISOString().slice(0, 10)} value={sub.date} onChange={(e) => patch("date", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Time</Label>
              <Input type="time" value={sub.time} onChange={(e) => patch("time", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Commuting?</Label>
              <Select value={sub.commuting} onValueChange={(v) => patch("commuting", v)}>
                <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No — at work</SelectItem>
                  <SelectItem value="to_work">Yes — to work</SelectItem>
                  <SelectItem value="from_work">Yes — from work</SelectItem>
                  <SelectItem value="between">Yes — between locations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Shift duration when it happened</Label>
              <Select value={sub.shift_duration || "__none__"} onValueChange={(v) => patch("shift_duration", v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1 h-11 rounded-none border-ink"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="<1">Less than 1 hour</SelectItem>
                  <SelectItem value="1-2">1–2 hours</SelectItem>
                  <SelectItem value="2-4">2–4 hours</SelectItem>
                  <SelectItem value="4-6">4–6 hours</SelectItem>
                  <SelectItem value="6-8">6–8 hours</SelectItem>
                  <SelectItem value=">8">More than 8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      )}

      {/* STEP 6 */}
      {step === 6 && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-black">Did anyone see what happened?</h2>
          <div className="grid grid-cols-3 gap-2">
            {["yes", "no", "unsure"].map((v) => (
              <button type="button" key={v} onClick={() => patch("witnessed", v)}
                className={`border-2 p-3 text-sm font-bold tracking-widest ${sub.witnessed === v ? "border-ink bg-ink text-white" : "border-border"}`}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          {sub.witnessed === "yes" && (
            <div className="space-y-2">
              {sub.witnesses.map((w, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border border-border p-2">
                  <Input placeholder="Name" value={w.name} onChange={(e) => { const n = [...sub.witnesses]; n[i] = { ...n[i], name: e.target.value }; patch("witnesses", n); }} className="h-9 rounded-none border-ink" />
                  <Input placeholder="Role" value={w.role || ""} onChange={(e) => { const n = [...sub.witnesses]; n[i] = { ...n[i], role: e.target.value }; patch("witnesses", n); }} className="h-9 rounded-none border-ink" />
                  <Input placeholder="Contact" value={w.contact || ""} onChange={(e) => { const n = [...sub.witnesses]; n[i] = { ...n[i], contact: e.target.value }; patch("witnesses", n); }} className="h-9 rounded-none border-ink" />
                  <Input placeholder="Brief account" value={w.account || ""} onChange={(e) => { const n = [...sub.witnesses]; n[i] = { ...n[i], account: e.target.value }; patch("witnesses", n); }} className="h-9 rounded-none border-ink" />
                </div>
              ))}
              <Button type="button" variant="outline" className="btn-sharp border-ink" onClick={() => patch("witnesses", [...sub.witnesses, { name: "" }])} data-testid="add-witness">+ Add witness</Button>
            </div>
          )}
          <div>
            <Label className="label-eyebrow">Anything else?</Label>
            <Textarea rows={3} value={sub.other_info} onChange={(e) => patch("other_info", e.target.value)} placeholder="Any other info you want to add…" className="mt-1 rounded-none border-ink" />
          </div>
          <div className="border-2 border-ink bg-muted p-4 text-sm space-y-1" data-testid="review-summary">
            <div className="label-eyebrow">Review</div>
            <div><strong>Who:</strong> {sub.involved_type || "—"}{sub.involved_people[0]?.name ? ` · ${sub.involved_people[0].name}` : ""}</div>
            <div><strong>Category:</strong> {sub.category || "—"}</div>
            <div><strong>Description:</strong> {(sub.description || "").slice(0, 120)}{sub.description.length > 120 ? "…" : ""}</div>
            <div><strong>When:</strong> {sub.date} {sub.time}</div>
            <div><strong>Where:</strong> {sub.location_type === "map" ? (sub.map_address || "Map location") : sub.location_type === "wfh" ? "Work from home" : (sub.site || "—")} ({sub.state})</div>
          </div>
        </section>
      )}

      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="outline" className="btn-sharp border-ink h-12" onClick={back} disabled={step === 1} data-testid="step-back"><ArrowLeft className="mr-2" />Back</Button>
        {step < 6 ? (
          <Button className="btn-sharp bg-ink text-white hover:bg-authority h-12" onClick={next} disabled={step === 1 && !sub.involved_type} data-testid="step-next">Next <ArrowRight className="ml-2" /></Button>
        ) : (
          <Button className="btn-sharp bg-red-700 text-white hover:bg-red-800 h-12" onClick={submit} data-testid="confirm-submit-btn"><CheckCircle className="mr-2" weight="fill" />Confirm & Submit</Button>
        )}
      </div>
    </div>
  );
}
