/**
 * DocumentListPage — all documents of a single type (e.g. all JSAs).
 * URL: /dashboard/document-library/:doc_type
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, FilePdf, Archive as ArchiveIcon, MagnifyingGlass, ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function DocumentListPage() {
  const { doc_type } = useParams();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [spec, setSpec] = useState(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/docs?doc_type=${doc_type}`),
      api.get("/docs/types"),
    ]).then(([r, t]) => {
      setRows(r.data || []);
      setSpec((t.data.types || []).find((x) => x.id === doc_type));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [doc_type]);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return rows.filter((r) => !qq || JSON.stringify(r).toLowerCase().includes(qq));
  }, [rows, q]);

  const archive = async (id) => {
    if (!window.confirm("Archive this document?")) return;
    try { await api.delete(`/docs/${id}`); load(); toast.success("Archived"); }
    catch { toast.error("Archive failed"); }
  };

  const pdf = (id, ref) => {
    const token = localStorage.getItem("st_token");
    const backend = process.env.REACT_APP_BACKEND_URL;
    fetch(`${backend}/api/docs/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob()).then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url; a.download = `${ref}.pdf`; a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF downloaded");
      }).catch(() => toast.error("PDF failed"));
  };

  return (
    <div className="space-y-5" data-testid="doc-list-page">
      <div className="border-b-2 border-ink pb-4 flex items-end justify-between flex-wrap gap-2">
        <div>
          <div className="label-eyebrow flex items-center gap-2">
            <Link to="/dashboard/document-library" className="text-xs underline"><ArrowLeft className="inline" size={10} /> Document Library</Link>
            <span>·</span><span>{spec?.label || doc_type}</span>
          </div>
          <h1 className="font-display text-3xl font-black tracking-tighter mt-1">{spec?.label || doc_type}</h1>
          <p className="text-xs text-muted-foreground mt-1">{spec?.blurb}</p>
        </div>
        <Link to={`/dashboard/document-library/${doc_type}/new`}>
          <Button className="btn-sharp bg-ink text-white hover:bg-authority" data-testid="doc-list-new">
            <Plus className="mr-2" />Generate new
          </Button>
        </Link>
      </div>

      <div className="bg-background border border-border p-3">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reference, title, site…" className="h-10 pl-10 rounded-none border-ink" data-testid="doc-list-search" />
        </div>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning">
            <tr>
              <th className="text-left px-3 py-2 label-eyebrow">Reference</th>
              <th className="text-left px-3 py-2 label-eyebrow">Title / Key field</th>
              <th className="text-left px-3 py-2 label-eyebrow">Created</th>
              <th className="text-left px-3 py-2 label-eyebrow">Status</th>
              <th className="text-left px-3 py-2 label-eyebrow">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-4 text-xs text-muted-foreground">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center">
                <div className="font-display font-black text-lg">No {spec?.label || "documents"} yet</div>
                <div className="text-xs text-muted-foreground mt-1">Click "Generate new" to create your first.</div>
              </td></tr>
            )}
            {filtered.map((r) => {
              const title = r.task || r.activity || r.site_name || r.worker_name || r.topic || r.company_name || r.space_id || "—";
              return (
                <tr key={r.doc_id} className="border-t border-border hover:bg-muted/30" data-testid={`doc-row-${r.doc_id}`}>
                  <td className="px-3 py-2 font-bold">{r.reference}</td>
                  <td className="px-3 py-2 text-xs max-w-lg truncate">{title}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{(r.created_at || "").slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <span className={`${r.status === "archived" ? "bg-muted" : "bg-warning"} text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest`}>
                      {(r.status || "draft").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link to={`/dashboard/document-library/doc/${r.doc_id}`} className="text-xs underline mr-2" data-testid={`view-${r.doc_id}`}>
                      <Eye className="inline mr-0.5" size={12} />View
                    </Link>
                    <button onClick={() => pdf(r.doc_id, r.reference)} className="text-muted-foreground hover:text-ink px-1" title="PDF" data-testid={`pdf-${r.doc_id}`}><FilePdf size={14} /></button>
                    {r.status !== "archived" && (
                      <button onClick={() => archive(r.doc_id)} className="text-muted-foreground hover:text-destructive px-1" title="Archive" data-testid={`arc-${r.doc_id}`}><ArchiveIcon size={14} /></button>
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
