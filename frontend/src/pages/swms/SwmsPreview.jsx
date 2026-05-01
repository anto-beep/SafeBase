/**
 * SwmsPreview — read-only compact preview that mirrors the PDF layout.
 * Used on the right side of the SWMS generator wizard.
 */

const HIERARCHY_COLOURS = {
  eliminate: "bg-emerald-800", substitute: "bg-teal-600",
  isolate: "bg-blue-700", engineer: "bg-blue-900",
  admin: "bg-amber-600", ppe: "bg-red-700",
};

const ORDER = ["eliminate", "substitute", "isolate", "engineer", "admin", "ppe"];

function sortControls(controls) {
  return [...(controls || [])].sort(
    (a, b) => (ORDER.indexOf(a.level) ?? 99) - (ORDER.indexOf(b.level) ?? 99)
  );
}

export default function SwmsPreview({ doc, hrcwCatalog = [] }) {
  const hrcwMap = Object.fromEntries(hrcwCatalog.map((c) => [c.code, c.label]));
  const ticked = new Set(doc.hrcw_codes || []);
  const rows = doc.rows || [];

  return (
    <div className="border-2 border-ink bg-white p-4 text-xs max-h-[85vh] overflow-y-auto" data-testid="swms-preview">
      <div className="text-center border-b-2 border-ink pb-2 mb-3">
        <div className="font-display text-lg font-black tracking-tighter">SAFE WORK METHOD STATEMENT</div>
        <div className="text-[10px] text-muted-foreground">For High Risk Construction Work</div>
        <div className="label-eyebrow mt-1">{doc.reference || "— Not saved yet —"}</div>
      </div>

      <div className="bg-warning/30 border border-ink p-2 text-[10px] leading-relaxed mb-3">
        <strong className="label-eyebrow block mb-0.5">LEGAL NOTICE</strong>
        Work must be performed in accordance with this SWMS. Keep accessible for every worker
        until HRCW complete. If a notifiable incident occurs, retain for at least 2 years from
        incident date.
      </div>

      <Section title="Business and job details">
        <Kv k="Company" v={doc.company_name} />
        <Kv k="Work activity" v={doc.work_activity} />
        <Kv k="Site" v={doc.site_location} />
        <Kv k="State" v={doc.site_state} />
        <Kv k="Start" v={doc.start_date} />
        <Kv k="Works manager" v={doc.works_manager_name} />
        {doc.has_principal_contractor && <Kv k="Principal contractor" v={doc.pc_business} />}
      </Section>

      <Section title="HRCW categories covered">
        {hrcwCatalog.length === 0 && <div className="text-muted-foreground">—</div>}
        <div className="grid grid-cols-1 gap-0.5">
          {hrcwCatalog.map((c) => (
            <div key={c.code} className={`${ticked.has(c.code) ? "font-bold" : "text-muted-foreground"} text-[10px]`}>
              <span className="font-mono">{ticked.has(c.code) ? "☒" : "☐"}</span> {c.label}
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Tasks, hazards and controls (${rows.length})`}>
        {rows.length === 0 && <div className="text-muted-foreground">No rows yet.</div>}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.row_id || i} className="border border-border p-2">
              <div className="font-bold">{i + 1}. {r.task || <em className="text-muted-foreground">Untitled task</em>}</div>
              {r.hrcw_code && (
                <span className="inline-block bg-amber-100 border border-amber-600 text-amber-900 px-1.5 py-0.5 text-[9px] font-bold tracking-widest mt-1">
                  {hrcwMap[r.hrcw_code]?.slice(0, 50)}
                </span>
              )}
              {r.hazards?.length > 0 && (
                <div className="mt-1">
                  <div className="label-eyebrow text-[9px]">Hazards</div>
                  <ul className="list-disc pl-4 text-[10px]">
                    {r.hazards.filter(Boolean).map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                </div>
              )}
              {r.controls?.length > 0 && (
                <div className="mt-1">
                  <div className="label-eyebrow text-[9px]">Controls</div>
                  <div className="space-y-0.5">
                    {sortControls(r.controls).map((c, j) => (
                      <div key={j} className="text-[10px] leading-tight">
                        <span className={`${HIERARCHY_COLOURS[c.level] || "bg-muted"} text-white px-1.5 py-[1px] text-[8px] font-bold tracking-widest mr-1`}>
                          {c.level?.toUpperCase()}
                        </span>
                        {c.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="PPE required">
        {doc.ppe?.length ? (
          <ul className="text-[10px] list-disc pl-4">
            {doc.ppe.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : <div className="text-muted-foreground">None selected.</div>}
      </Section>

      <Section title="Training / Licences required">
        {doc.training?.length ? (
          <ul className="text-[10px] list-disc pl-4">
            {doc.training.map((p) => <li key={p}>{p}</li>)}
          </ul>
        ) : <div className="text-muted-foreground">None selected.</div>}
      </Section>

      <Section title="Emergency procedures">
        <Kv k="Emergency contact" v={doc.emergency_contact} />
        <Kv k="Nearest hospital" v={doc.nearest_hospital} />
        <Kv k="Assembly point" v={doc.assembly_point} />
        <Kv k="First aider" v={doc.first_aider} />
      </Section>

      <Section title="Workers">
        {doc.workers?.length ? (
          <ul className="text-[10px]">
            {doc.workers.map((w) => (
              <li key={w.name} className="flex justify-between py-0.5 border-b border-border last:border-0">
                <span>{w.name}</span>
                <span className={w.signed ? "text-emerald-700 font-bold" : "text-muted-foreground"}>
                  {w.signed ? `✓ ${w.signed_at?.slice(0, 10)}` : "Unsigned"}
                </span>
              </li>
            ))}
          </ul>
        ) : <div className="text-muted-foreground">No workers selected.</div>}
      </Section>

      <div className="text-[9px] text-muted-foreground italic border-t border-border pt-2 mt-3">
        This SWMS was generated using SafeTradie. It must be reviewed and tailored on site before HRCW commences.
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-3">
      <div className="label-eyebrow border-b border-ink pb-1 mb-1">{title}</div>
      {children}
    </div>
  );
}

function Kv({ k, v }) {
  return (
    <div className="flex gap-2 py-0.5 text-[10px]">
      <span className="font-bold min-w-[100px]">{k}</span>
      <span className="text-muted-foreground">{v || "—"}</span>
    </div>
  );
}
