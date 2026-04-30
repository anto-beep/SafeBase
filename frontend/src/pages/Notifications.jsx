import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Bell, Warning, Clock, Lightbulb, CheckCircle, Info, ArrowRight } from "@phosphor-icons/react";

const TONE = {
  critical: { cls: "border-l-4 border-red-600", icon: Warning, iconCls: "text-red-600" },
  expiry: { cls: "border-l-4 border-warning", icon: Clock, iconCls: "text-ink" },
  insight: { cls: "border-l-4 border-blue-500", icon: Lightbulb, iconCls: "text-blue-500" },
  update: { cls: "border-l-4 border-muted-foreground", icon: Info, iconCls: "text-muted-foreground" },
  task: { cls: "border-l-4 border-emerald-500", icon: CheckCircle, iconCls: "text-emerald-500" },
};

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/notifications").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const markOne = async (id) => {
    if (id?.startsWith("synth_")) return;
    await api.post(`/notifications/${id}/read`); load();
  };

  const filtered = filter === "all" ? items : filter === "unread" ? items.filter((i) => !i.read) : items.filter((i) => i.tone === filter);

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border pb-6">
        <div>
          <div className="label-eyebrow">/ Notifications</div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-1">Notifications</h1>
          <p className="text-muted-foreground mt-2">Critical alerts, expiries, AI insights and updates across your business.</p>
        </div>
        <Button onClick={markAll} variant="outline" className="btn-sharp border-ink h-11" data-testid="notif-mark-all">Mark all as read</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { v: "all", l: "All" },
          { v: "unread", l: "Unread" },
          { v: "critical", l: "Critical" },
          { v: "expiry", l: "Expiries" },
          { v: "insight", l: "AI Insights" },
          { v: "update", l: "Updates" },
        ].map((t) => (
          <button key={t.v} onClick={() => setFilter(t.v)} className={`btn-sharp px-4 py-2 label-eyebrow ${filter === t.v ? "bg-ink text-white" : "bg-background border border-border"}`} data-testid={`notif-filter-${t.v}`}>
            {t.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-border p-16 text-center">
          <Bell size={48} weight="duotone" className="mx-auto opacity-40" />
          <div className="font-display text-xl font-bold mt-4">You're all caught up</div>
          <div className="text-sm text-muted-foreground mt-1">No new notifications.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const tone = TONE[n.tone] || TONE.update;
            const Icon = tone.icon;
            return (
              <div key={n.notification_id} onClick={() => markOne(n.notification_id)} className={`bg-background border border-border ${tone.cls} p-5 flex gap-4 ${n.read ? "opacity-60" : ""} cursor-pointer hover:bg-muted`} data-testid={`notif-item-${n.notification_id}`}>
                <Icon weight="duotone" className={`shrink-0 ${tone.iconCls}`} size={28} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="label-eyebrow">{n.tag}</span>
                    {!n.read && <span className="bg-warning text-ink text-[9px] font-bold px-1.5 py-0.5">NEW</span>}
                  </div>
                  <div className="font-display font-bold mt-1">{n.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{n.body}</div>
                  <div className="text-xs text-muted-foreground mt-2">{n.created_at ? new Date(n.created_at).toLocaleString("en-AU") : ""}</div>
                </div>
                {n.link && <Link to={n.link} className="shrink-0 self-center"><Button variant="outline" size="sm" className="btn-sharp border-ink">View <ArrowRight className="ml-1" size={12} /></Button></Link>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
