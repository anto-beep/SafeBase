import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Receipt, CreditCard } from "@phosphor-icons/react";

const TIER_LABEL = {
  sole_trader: "Solo Tradie",
  small_business: "Small Team",
  growing_business: "Growing Business",
  enterprise: "Enterprise",
  retail_single: "Single Store",
  retail_small: "Small Chain",
  retail_multi: "Multi-Store",
  retail_enterprise: "Retail Enterprise",
  hosp_single: "Single Venue",
  hosp_small: "Small Group",
  hosp_multi: "Multi-Venue",
  hosp_enterprise: "Hospitality Enterprise",
  trans_owner: "Owner-Operator",
  trans_small: "Small Fleet",
  trans_growing: "Growing Fleet",
  trans_enterprise: "Transport Enterprise",
  health_solo: "Solo Practice",
  health_small: "Small Practice",
  health_multi: "Multi-Site",
  health_enterprise: "Healthcare Enterprise",
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
  const priceMap = {
    sole_trader: cycle === "annual" ? "A$5,990/yr + GST" : "A$599/mo + GST",
    small_business: cycle === "annual" ? "A$11,990/yr + GST" : "A$1,199/mo + GST",
    growing_business: cycle === "annual" ? "A$18,990/yr + GST" : "A$1,899/mo + GST",
    enterprise: cycle === "annual" ? "A$29,990/yr + GST" : "A$2,999/mo + GST",
    retail_single: cycle === "annual" ? "A$7,990/yr + GST" : "A$799/mo + GST",
    retail_small: cycle === "annual" ? "A$15,990/yr + GST" : "A$1,599/mo + GST",
    retail_multi: cycle === "annual" ? "A$24,990/yr + GST" : "A$2,499/mo + GST",
    retail_enterprise: cycle === "annual" ? "A$39,990/yr + GST" : "A$3,999/mo + GST",
    hosp_single: cycle === "annual" ? "A$11,990/yr + GST" : "A$1,199/mo + GST",
    hosp_small: cycle === "annual" ? "A$22,990/yr + GST" : "A$2,299/mo + GST",
    hosp_multi: cycle === "annual" ? "A$34,990/yr + GST" : "A$3,499/mo + GST",
    hosp_enterprise: cycle === "annual" ? "A$54,990/yr + GST" : "A$5,499/mo + GST",
    trans_owner: cycle === "annual" ? "A$14,990/yr + GST" : "A$1,499/mo + GST",
    trans_small: cycle === "annual" ? "A$27,990/yr + GST" : "A$2,799/mo + GST",
    trans_growing: cycle === "annual" ? "A$42,990/yr + GST" : "A$4,299/mo + GST",
    trans_enterprise: cycle === "annual" ? "A$69,990/yr + GST" : "A$6,999/mo + GST",
    health_solo: cycle === "annual" ? "A$24,990/yr + GST" : "A$2,499/mo + GST",
    health_small: cycle === "annual" ? "A$49,990/yr + GST" : "A$4,999/mo + GST",
    health_multi: cycle === "annual" ? "A$79,990/yr + GST" : "A$7,999/mo + GST",
    health_enterprise: cycle === "annual" ? "A$179,990/yr + GST" : "A$17,999/mo + GST",
  };
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
