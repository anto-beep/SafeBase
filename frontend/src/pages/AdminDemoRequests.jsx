/**
 * AdminDemoRequests — owner-only view of demo_requests captured from
 * /book-demo. List + filter by status + inline status transition.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const STATUS_COLOR = {
  new: "#C7405B",
  contacted: "#E6A70A",
  qualified: "#0F4C5C",
  closed: "#4CAF8F",
};
const STATUSES = ["new", "contacted", "qualified", "closed"];

export default function AdminDemoRequests() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterIndustry !== "all") params.append("industry", filterIndustry);
      const { data } = await api.get(`/demo-requests?${params.toString()}`);
      setRows(data.rows || []);
      setCounts(data.counts || {});
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to load demo requests");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [filterStatus, filterIndustry]);

  const updateStatus = async (request_id, newStatus) => {
    try {
      await api.patch(`/demo-requests/${request_id}`, { status: newStatus });
      toast.success(`Moved to ${newStatus}`);
      load();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const saveNote = async (request_id) => {
    try {
      await api.patch(`/demo-requests/${request_id}`, { note });
      toast.success("Note saved");
      setExpanded(null);
      setNote("");
      load();
    } catch (err) {
      toast.error("Save failed");
    }
  };

  return (
    <div className="p-6" data-testid="admin-demos-page">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-black/50">Owner · Sales</div>
        <h1 className="font-display font-black text-4xl mt-1">Demo Requests</h1>
        <p className="text-sm text-black/60 mt-2">Every demo request submitted via the public Book-a-Demo page. Move leads through the pipeline; notes persist.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATUSES.map(s => (
          <div key={s} className="border-2 border-black/10 bg-white p-4" data-testid={`admin-demos-stat-${s}`}>
            <div className="text-xs uppercase tracking-wider" style={{ color: STATUS_COLOR[s] }}>{s}</div>
            <div className="font-display font-black text-4xl mt-1" style={{ color: STATUS_COLOR[s] }}>{counts[s] || 0}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 items-center mb-4">
        <span className="text-xs uppercase text-black/50">Status</span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]" data-testid="admin-demos-filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs uppercase text-black/50">Industry</span>
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-[180px]" data-testid="admin-demos-filter-industry"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            <SelectItem value="trades">Trades</SelectItem>
            <SelectItem value="hospitality">Hospitality</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="healthcare">Healthcare</SelectItem>
            <SelectItem value="retail">Retail</SelectItem>
            <SelectItem value="multi">Multiple industries</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border-2 border-black/10 bg-white" data-testid="admin-demos-list">
        {loading && <div className="p-8 text-center text-black/40">Loading…</div>}
        {!loading && rows.length === 0 && <div className="p-12 text-center text-black/40" data-testid="admin-demos-empty">No demo requests match this filter yet.</div>}
        {rows.map(r => (
          <div key={r.request_id} className="border-b border-black/5" data-testid={`admin-demos-row-${r.request_id}`}>
            <div className="flex items-start gap-4 p-4">
              <Badge style={{ background: STATUS_COLOR[r.status] || "#111", color: "white" }}>{r.status}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{r.first_name} {r.last_name || ""} <span className="text-xs text-black/40 font-mono ml-2">{r.request_id}</span></div>
                <div className="text-xs text-black/60">{r.business_name} · {r.industry} · {r.role || "—"} · {r.email} · {r.phone || "no phone"}</div>
                <div className="text-xs text-black/40 mt-1">{r.staff_count} staff · {r.locations} locations · submitted {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <Select value={r.status} onValueChange={(v) => updateStatus(r.request_id, v)}>
                <SelectTrigger className="w-[120px]" data-testid={`admin-demos-status-${r.request_id}`}><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => { setExpanded(expanded === r.request_id ? null : r.request_id); setNote(r.note || ""); }} data-testid={`admin-demos-expand-${r.request_id}`}>
                {expanded === r.request_id ? "Collapse" : "Details"}
              </Button>
            </div>
            {expanded === r.request_id && (
              <div className="px-4 pb-4 pt-0 space-y-3 bg-black/[0.02]">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs uppercase text-black/50">Current approach</span><div>{r.current_approach || "—"}</div></div>
                  <div><span className="text-xs uppercase text-black/50">Preferred time</span><div>{r.best_time || "—"}</div></div>
                  <div className="col-span-2"><span className="text-xs uppercase text-black/50">Challenge</span><div className="whitespace-pre-wrap">{r.challenge || "—"}</div></div>
                </div>
                <div>
                  <span className="text-xs uppercase text-black/50">Internal note</span>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid={`admin-demos-note-${r.request_id}`} />
                  <Button size="sm" className="mt-2" onClick={() => saveNote(r.request_id)} data-testid={`admin-demos-save-note-${r.request_id}`}>Save note</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
