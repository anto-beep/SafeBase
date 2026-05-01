/**
 * SWMS Library — register of all SWMS documents with status, filters, actions.
 * Replaces the old Documents page for SWMS — old /api/documents is preserved.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, FilePdf, Copy, PaperPlaneTilt, ArrowRight, Warning, CheckCircle,
  Eye, MagnifyingGlass, Archive as ArchiveIcon, Lock,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUS_COLOURS = {
  draft: "bg-muted text-ink",
  awaiting_signatures: "bg-amber-500 text-ink",
  signed: "bg-blue-700 text-white",
  in_use: "bg-emerald-600 text-white",
  reviewed: "bg-teal-600 text-white",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_LABEL = {
  draft: "Draft",
  awaiting_signatures: "Awaiting signatures",
  signed: "Signed",
  in_use: "In use",
  reviewed: "Reviewed",
  archived: "Archived",
};

export default function SwmsLibraryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/swms");
      setRows(r.data || []);
    } catch { toast.error("Failed to load SWMS"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q) {
        const qq = q.toLowerCase();
        if (!(r.reference || "").toLowerCase().includes(qq) &&
            !(r.work_activity || "").toLowerCase().includes(qq) &&
            !(r.site_location || "").toLowerCase().includes(qq)) return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      if (tradeFilter && r.trade !== tradeFilter) return false;
      return true;
    });
  }, [rows, q, statusFilter, tradeFilter]);

  const trades = useMemo(() => Array.from(new Set(rows.map((r) => r.trade).filter(Boolean))), [rows]);

  const needsReview = rows.filter((r) => r.requires_review || (r.review_date && new Date(r.review_date) < new Date()));
  const linkedToIncident = rows.filter((r) => r.linked_incident_id);

  const duplicate = async (id) => {
    try {
      const r = await api.post(`/swms/${id}/duplicate`);
      toast.success(`Duplicated — ${r.data.reference}`);
      load();
    } catch { toast.error("Duplicate failed"); }
  };

  const archive = async (id) => {
    if (!window.confirm("Archive this SWMS? It will be retained for the legal retention period.")) return;
    try {
      await api.delete(`/swms/${id}`);
      toast.success("Archived");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Archive failed");
    }
  };

  const downloadPdf = (r) => {
    const token = localStorage.getItem("st_token");
    const backend = process.env.REACT_APP_BACKEND_URL;
    fetch(`${backend}/api/swms/${r.swms_id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => x.blob()).then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url; a.download = `${r.reference}.pdf`; a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded");
      }).catch(() => toast.error("PDF failed"));
  };

  const sendSms = async (id) => {
    try {
      const r = await api.post(`/swms/${id}/send-sign-links`);
      toast.success(`${r.data.sent} sign link(s) generated (SMS MOCKED)`);
      load();
    } catch { toast.error("Send failed"); }
  };

  return (
    <div className="space-y-5" data-testid="swms-library-page">
      <div className="border-b-2 border-ink pb-4 flex items-end justify-between flex-wrap gap-2">
        <div>
          <div className="label-eyebrow">/ Documents · SWMS Library</div>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tighter mt-1">Safe Work Method Statements</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            All SWMS you've generated. Legal retention is enforced — notifiable-incident-linked
            SWMS cannot be deleted for 2 years from incident date.
          </p>
        </div>
        <Link to="/dashboard/swms/new">
          <Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="new-swms-btn">
            <Plus className="mr-2" weight="bold" />New SWMS
          </Button>
        </Link>
      </div>

      {(needsReview.length > 0 || linkedToIncident.length > 0) && (
        <div className="bg-red-700 text-white border-2 border-red-700 p-4 flex items-start gap-3" data-testid="review-banner">
          <Warning weight="fill" size={24} className="shrink-0 mt-0.5 text-warning" />
          <div className="flex-1">
            <div className="font-display font-black text-lg">
              {needsReview.length + linkedToIncident.length} SWMS require review
            </div>
            <div className="text-xs text-white/80 mt-1">
              {linkedToIncident.length > 0 && `${linkedToIncident.length} linked to a notifiable incident · `}
              {needsReview.length > 0 && `${needsReview.length} past review date`}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={rows.length} testid="stat-total" />
        <Stat label="Drafts" value={rows.filter((r) => r.status === "draft").length} testid="stat-draft" />
        <Stat label="Awaiting signatures" value={rows.filter((r) => r.status === "awaiting_signatures").length} accent="text-amber-600" testid="stat-awaiting" />
        <Stat label="In use" value={rows.filter((r) => r.status === "in_use").length} accent="text-emerald-700" testid="stat-in-use" />
      </div>

      <div className="bg-background border border-border p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search reference, activity, site…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 pl-10 rounded-none border-ink" data-testid="swms-search" />
        </div>
        <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-10 w-44 rounded-none border-ink" data-testid="swms-filter-status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tradeFilter || "__all__"} onValueChange={(v) => setTradeFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="h-10 w-40 rounded-none border-ink"><SelectValue placeholder="All trades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All trades</SelectItem>
            {trades.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-3 py-2 label-eyebrow">Reference</th>
              <th className="text-left px-3 py-2 label-eyebrow">Activity</th>
              <th className="text-left px-3 py-2 label-eyebrow">Site</th>
              <th className="text-left px-3 py-2 label-eyebrow">HRCW</th>
              <th className="text-left px-3 py-2 label-eyebrow">Status</th>
              <th className="text-left px-3 py-2 label-eyebrow">Signed</th>
              <th className="text-left px-3 py-2 label-eyebrow">Review</th>
              <th className="text-left px-3 py-2 label-eyebrow">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (<tr><td colSpan={8} className="p-4 text-muted-foreground text-xs">Loading…</td></tr>)}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center">
                <div className="font-display font-black text-lg">No SWMS yet</div>
                <div className="text-xs text-muted-foreground mt-1">Click "New SWMS" to generate your first legally compliant SWMS.</div>
              </td></tr>
            )}
            {filtered.map((r) => {
              const signed = (r.workers || []).filter((w) => w.signed).length;
              const total = (r.workers || []).length;
              const reviewDue = r.review_date && new Date(r.review_date) < new Date();
              return (
                <tr key={r.swms_id} className="border-t border-border hover:bg-muted/30" data-testid={`swms-row-${r.swms_id}`}>
                  <td className="px-3 py-2">
                    <div className="font-bold">{r.reference}</div>
                    <div className="text-[10px] text-muted-foreground">{(r.trade || "").replace("_", " ")} · v{r.version || 1}</div>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="text-xs">{r.work_activity}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.site_location}<div className="text-muted-foreground">{r.site_state}</div></td>
                  <td className="px-3 py-2">
                    <span className="bg-amber-100 border border-amber-600 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">{(r.hrcw_codes || []).length}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${STATUS_COLOURS[r.status] || "bg-muted"} px-2 py-0.5 text-[10px] font-bold tracking-widest`}>
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    {r.locked_by_incident && (
                      <div className="text-[10px] mt-1 text-red-700 flex items-center gap-1">
                        <Lock weight="fill" size={10} /> Incident-locked
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {total === 0 ? "—" : (
                      <span className={signed === total ? "text-emerald-700 font-bold" : "text-amber-600"}>
                        {signed}/{total}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {reviewDue ? (
                      <span className="text-red-700 font-bold">Overdue</span>
                    ) : (
                      <span className="text-muted-foreground">{r.review_date || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link to={`/dashboard/swms/${r.swms_id}`} className="text-xs underline mr-2" data-testid={`view-${r.swms_id}`}>
                      <Eye className="inline mr-0.5" size={12} />View
                    </Link>
                    <button onClick={() => downloadPdf(r)} className="text-xs text-muted-foreground hover:text-ink px-1" title="Download PDF" data-testid={`pdf-${r.swms_id}`}><FilePdf size={14} /></button>
                    <button onClick={() => duplicate(r.swms_id)} className="text-xs text-muted-foreground hover:text-ink px-1" title="Duplicate" data-testid={`dup-${r.swms_id}`}><Copy size={14} /></button>
                    <button onClick={() => sendSms(r.swms_id)} className="text-xs text-muted-foreground hover:text-ink px-1" title="Send sign links" data-testid={`sms-${r.swms_id}`}><PaperPlaneTilt size={14} /></button>
                    {!r.locked_by_incident && r.status !== "archived" && (
                      <button onClick={() => archive(r.swms_id)} className="text-xs text-muted-foreground hover:text-destructive px-1" title="Archive" data-testid={`arc-${r.swms_id}`}><ArchiveIcon size={14} /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "", testid }) {
  return (
    <div className="bg-background border border-border p-3" data-testid={testid}>
      <div className="label-eyebrow">{label}</div>
      <div className={`font-display text-2xl font-black mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
