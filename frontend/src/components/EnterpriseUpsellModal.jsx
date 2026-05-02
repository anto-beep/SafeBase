import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Crown, CheckCircle } from "@phosphor-icons/react";

// Trigger-specific copy per the Enterprise-tier spec.
const COPY = {
  users: {
    title: "You've hit the 20-user limit",
    headline: "Scale past 20 workers with Enterprise.",
    body: "The Growing Business plan covers up to 20 users. Unlimited users, SSO, a dedicated Account Manager and custom onboarding come standard on Enterprise — A$3,999/mo + GST.",
    perks: [
      "Unlimited users & SSO (SAML/Okta)",
      "Dedicated Account Manager",
      "Custom onboarding & white-glove migration",
      "API access + priority support",
    ],
  },
  api: {
    title: "API access is an Enterprise feature",
    headline: "Build your own integrations.",
    body: "REST API, webhooks and custom data pipelines are bundled with Enterprise — A$3,999/mo + GST. Connect SafeBase to your ERP, HRIS or BI stack.",
    perks: [
      "Full REST API + outbound webhooks",
      "Rate-limit increases on request",
      "Priority engineer support for integrations",
      "Custom data export scheduling",
    ],
  },
  reports: {
    title: "You've generated 5+ reports this month",
    headline: "Unlimited reporting on Enterprise.",
    body: "You're clearly running a reporting-heavy operation. Enterprise removes the cap and unlocks scheduled report delivery, custom report templates and multi-entity consolidation — A$3,999/mo + GST.",
    perks: [
      "Unlimited report generations",
      "Scheduled email delivery (daily / weekly / monthly)",
      "Custom report templates built for your brand",
      "Multi-entity / multi-ABN roll-ups",
    ],
  },
  sites: {
    title: "You're managing 6+ active sites",
    headline: "Multi-site dashboards on Enterprise.",
    body: "Growing Business is sized for up to 5 active sites. Enterprise gives you a consolidated view across every site, region and ABN — A$3,999/mo + GST.",
    perks: [
      "Unlimited sites & project groups",
      "Regional / branch / franchise rollups",
      "Site-level access controls + SSO",
      "Dedicated Account Manager",
    ],
  },
};

export default function EnterpriseUpsellModal({ open, onOpenChange, trigger = "users" }) {
  const copy = COPY[trigger] || COPY.users;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none max-w-2xl border-ink p-0 overflow-hidden"
        data-testid={`enterprise-upsell-${trigger}`}
      >
        <div className="bg-ink text-white p-8">
          <div className="flex items-center gap-2 label-eyebrow text-warning">
            <Crown weight="fill" /> / Enterprise
          </div>
          <DialogHeader className="mt-3">
            <DialogTitle className="font-display text-3xl font-black tracking-tighter text-white">
              {copy.headline}
            </DialogTitle>
            <DialogDescription className="text-white/70 mt-2 text-base leading-relaxed">
              {copy.title}. {copy.body}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-8 bg-background">
          <div className="label-eyebrow mb-3">What you unlock</div>
          <ul className="space-y-2">
            {copy.perks.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" data-testid={`upsell-perk-${trigger}-${i}`}>
                <CheckCircle weight="fill" className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between flex-wrap gap-3 border-t border-border pt-6">
            <div>
              <div className="font-display text-2xl font-black tracking-tighter">A$3,999<span className="text-base font-bold">/mo + GST</span></div>
              <div className="text-xs text-muted-foreground">Annual: A$39,990 + GST (save A$7,998)</div>
            </div>
            <div className="flex gap-2">
              <Link to="/enterprise">
                <Button variant="outline" className="btn-sharp border-ink h-11" data-testid={`upsell-learn-more-${trigger}`}>
                  Learn more
                </Button>
              </Link>
              <Link to="/enterprise#demo">
                <Button
                  className="btn-sharp bg-ink text-white hover:bg-authority h-11"
                  onClick={() => onOpenChange?.(false)}
                  data-testid={`upsell-book-demo-${trigger}`}
                >
                  Book a demo <ArrowRight className="ml-2" weight="bold" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
