import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Receipt, CreditCard } from "@phosphor-icons/react";

const TIER_LABEL = {
  sole_trader: "Sole Trader",
  small_business: "Small Business",
  growing_business: "Growing Business",
  enterprise: "Enterprise",
};

const STATUS_CLS = {
  active: "bg-emerald-600 text-white",
  trial: "bg-warning text-ink",
  cancelled: "bg-muted text-muted-foreground",
  past_due: "bg-red-600 text-white",
};

export default function BillingPanel() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get("/billing/my-subscription");
      setSub(r.data);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="bg-background border border-border p-6 text-sm text-muted-foreground">Loading subscription…</div>;

  const hasSub = !!sub?.tier;
  const tierLabel = TIER_LABEL[sub?.tier] || "Free trial";
  const status = sub?.status || "trial";
  const cycle = sub?.cycle;
  const priceMap = { sole_trader: cycle === "annual" ? "A$2,490/yr + GST" : "A$249/mo + GST",
                     small_business: cycle === "annual" ? "A$4,990/yr + GST" : "A$499/mo + GST",
                     growing_business: cycle === "annual" ? "A$7,990/yr + GST" : "A$799/mo + GST",
                     enterprise: cycle === "annual" ? "A$12,990/yr + GST" : "A$1,299/mo + GST" };
  const price = hasSub ? priceMap[sub.tier] : "A$0";

  return (
    <div className="space-y-4" data-testid="billing-panel">
      <div className="bg-background border border-border p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="label-eyebrow">/ Current plan</div>
            <div className="font-display font-black text-3xl mt-2" data-testid="billing-tier-name">{tierLabel}</div>
            <div className="text-muted-foreground mt-1">{price} {hasSub ? "· renews automatically" : "· 14-day trial active"}</div>
          </div>
          <span className={`${STATUS_CLS[status] || "bg-muted"} px-3 py-1 label-eyebrow`} data-testid="billing-status">{status.toUpperCase()}</span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link to="/pricing" className="block">
            <Button className="w-full btn-sharp bg-ink text-white hover:bg-authority h-12" data-testid="billing-change-plan">
              <CreditCard className="mr-2" />{hasSub ? "Change plan" : "View plans"}
            </Button>
          </Link>
          <Link to="/compare" className="block">
            <Button variant="outline" className="w-full btn-sharp border-ink h-12">Compare to competitors</Button>
          </Link>
        </div>

        {sub?.started_at && (
          <div className="mt-6 text-sm text-muted-foreground">
            Active since {new Date(sub.started_at).toLocaleDateString("en-AU")} · Renews in {sub.renews || "—"}
          </div>
        )}
      </div>

      {sub?.recent_transactions?.length > 0 && (
        <div className="bg-background border border-border p-6">
          <div className="flex items-center gap-2 label-eyebrow"><Receipt />Recent transactions</div>
          <table className="w-full text-sm mt-4">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Date</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Tier</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Amount</th>
                <th className="text-left py-2 label-eyebrow text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {sub.recent_transactions.map((t) => (
                <tr key={t.session_id} className="border-b border-border" data-testid={`billing-txn-${t.session_id}`}>
                  <td className="py-2">{new Date(t.created_at).toLocaleDateString("en-AU")}</td>
                  <td className="py-2">{TIER_LABEL[t.tier] || t.tier} · {t.cycle}</td>
                  <td className="py-2 font-bold">A${Number(t.amount).toLocaleString("en-AU")}</td>
                  <td className="py-2">
                    {t.payment_status === "paid" ? (
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle weight="fill" size={14} />Paid</span>
                    ) : <span className="text-muted-foreground">{t.payment_status}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
