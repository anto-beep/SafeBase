/**
 * RegulatoryDigestWidget — compact card showing top-3 regulatory changes for
 * the current user's industry. Mounts on Dashboard beneath the Compliance
 * Inbox widget.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SEV = { high: "#C7405B", medium: "#E6A70A" };

export default function RegulatoryDigestWidget() {
  const { user } = useAuth();
  const industry = user?.industry || "trades";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/regulatory-digest?industry=${industry}&limit=3`)
      .then(({ data }) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [industry]);

  return (
    <div className="border-2 border-black/10 bg-white" data-testid="digest-widget">
      <div className="px-4 py-3 border-b-2 border-black/10 flex items-center justify-between" style={{ background: "#111" }}>
        <div className="flex items-center gap-3 text-white">
          <span className="text-xs uppercase tracking-widest opacity-80">Regulatory Digest · {industry}</span>
        </div>
        <Link to="/regulatory-digest" className="text-xs uppercase tracking-widest text-white/80 hover:text-white" data-testid="digest-widget-view-all">View all →</Link>
      </div>
      {loading && <div className="p-6 text-center text-black/40 text-sm">Loading…</div>}
      {!loading && items.length === 0 && <div className="p-6 text-center text-black/40 text-sm" data-testid="digest-widget-empty">Nothing new for {industry} this week.</div>}
      {items.map(i => (
        <Link key={`${i.posted}-${i.title}`} to="/regulatory-digest" className="block px-4 py-3 border-t border-black/5 hover:bg-black/[0.02]" style={{ borderLeft: `4px solid ${SEV[i.severity] || SEV.medium}` }} data-testid={`digest-widget-item-${i.industry}`}>
          <div className="flex items-center gap-2 text-xs text-black/60 mb-1">
            <span className="font-bold uppercase" style={{ color: SEV[i.severity] || SEV.medium }}>{i.severity}</span>
            <span>·</span>
            <span className="font-mono">{i.regulator}</span>
            <span className="ml-auto font-mono">{new Date(i.posted).toLocaleDateString()}</span>
          </div>
          <div className="font-bold text-sm">{i.title}</div>
        </Link>
      ))}
    </div>
  );
}
