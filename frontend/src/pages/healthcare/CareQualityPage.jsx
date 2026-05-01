/**
 * HealthcareCareQuality — main healthcare operations page.
 * Clinical white + teal + soft green.
 * Tabs: AHPRA, Worker Screening, SIRS, NDIS, ACQSC evidence, Care minutes.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { toast } from "sonner";
import { IndustryListTab, StatChip, pill } from "../_shared/IndustryListTab";

const BG = "#F4F8FB";
const TEAL = "#2196A6";
const GREEN = "#4CAF8F";
const AMBER = "#E6A70A";
const RED = "#C7405B";

function expiryCell(r) {
  if (r._expired) return pill("EXPIRED", RED);
  if (r._expiring_soon) return pill(`${r._days_to_expiry}d`, AMBER);
  if (typeof r._days_to_expiry === "number") return pill(`${r._days_to_expiry}d`, GREEN);
  return "—";
}

export default function HealthcareCareQuality() {
  return (
    <div className="min-h-screen p-6" style={{ background: BG }} data-testid="hc-care-quality-page">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider" style={{ color: TEAL }}>Healthcare · Care Quality</div>
        <h1 className="font-display font-black text-4xl mt-1 text-[#0d2635]">Care Quality & Compliance</h1>
        <p className="text-sm text-black/60 mt-2 max-w-2xl">Aged Care Act 2024, Strengthened Quality Standards, NDIS Practice Standards, AHPRA registration, SIRS and reportable-incident timers — in one clinical workspace.</p>
      </div>

      <Tabs defaultValue="ahpra" className="w-full">
        <TabsList className="bg-white border-2 border-black/10 p-1 h-auto flex-wrap">
          <TabsTrigger value="ahpra" data-testid="hc-tab-ahpra">AHPRA</TabsTrigger>
          <TabsTrigger value="screening" data-testid="hc-tab-screening">Worker screening</TabsTrigger>
          <TabsTrigger value="sirs" data-testid="hc-tab-sirs">SIRS</TabsTrigger>
          <TabsTrigger value="ndis" data-testid="hc-tab-ndis">NDIS</TabsTrigger>
          <TabsTrigger value="acqsc" data-testid="hc-tab-acqsc">ACQSC 8</TabsTrigger>
          <TabsTrigger value="care-min" data-testid="hc-tab-care-min">Care minutes</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="ahpra">
            <IndustryListTab
              title="AHPRA Registrations"
              endpoint="/healthcare/ahpra-register"
              testPrefix="hc-ahpra"
              accent={TEAL}
              columns={[
                { key: "worker_name", label: "Clinician" },
                { key: "profession", label: "Profession" },
                { key: "registration_number", label: "Reg #" },
                { key: "expires_at", label: "Expires", render: r => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
                { key: "_status", label: "Status", render: expiryCell },
              ]}
              formFields={[
                { key: "worker_name", label: "Clinician name", required: true },
                { key: "profession", label: "Profession", type: "select", options: ["RN", "EN", "Medical", "Physiotherapist", "Occupational Therapist", "Psychologist", "Dental", "Pharmacist", "Allied Health"], required: true },
                { key: "registration_number", label: "Registration #", required: true },
                { key: "registration_type", label: "Type", type: "select", options: ["General", "Specialist", "Limited", "Provisional", "Non-practising"] },
                { key: "issued_at", label: "Issued", type: "date" },
                { key: "expires_at", label: "Expires", type: "date" },
              ]}
            />
          </TabsContent>

          <TabsContent value="screening">
            <IndustryListTab
              title="Worker Screening Clearances"
              endpoint="/healthcare/worker-screening"
              testPrefix="hc-screening"
              accent={TEAL}
              columns={[
                { key: "worker_name", label: "Worker" },
                { key: "screening_type", label: "Type" },
                { key: "clearance_number", label: "Clearance #" },
                { key: "jurisdiction", label: "State" },
                { key: "expires_at", label: "Expires", render: r => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—" },
                { key: "_status", label: "Status", render: expiryCell },
              ]}
              formFields={[
                { key: "worker_name", label: "Worker name", required: true },
                { key: "screening_type", label: "Type", type: "select", options: ["ndis", "aged_care", "wwcc"], required: true },
                { key: "clearance_number", label: "Clearance #" },
                { key: "jurisdiction", label: "State", type: "select", options: ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] },
                { key: "issued_at", label: "Issued", type: "date" },
                { key: "expires_at", label: "Expires", type: "date" },
              ]}
            />
          </TabsContent>

          <TabsContent value="sirs">
            <div className="mb-4 p-4 border-l-4 bg-white" style={{ borderColor: AMBER }}>
              <div className="font-bold text-sm">Priority 1 (high-harm) categories trigger a 24-hour notification window to the Aged Care Quality & Safety Commission. Priority 2 = 30 days.</div>
            </div>
            <IndustryListTab
              title="SIRS Incidents"
              endpoint="/healthcare/sirs-incidents"
              testPrefix="hc-sirs"
              accent={RED}
              columns={[
                { key: "category", label: "Category" },
                { key: "priority", label: "Priority", render: r => r.priority === "one" ? pill("P1 · 24h", RED) : pill("P2 · 30d", AMBER) },
                { key: "summary", label: "Summary" },
                { key: "notify_by_24h", label: "Notify by (P1)", render: r => r.notify_by_24h ? new Date(r.notify_by_24h).toLocaleString() : "—" },
                { key: "status", label: "Status", render: r => pill(r.status?.toUpperCase() || "PENDING", r.status === "submitted" ? GREEN : AMBER) },
              ]}
              formFields={[
                { key: "category", label: "Category", type: "select", options: [
                  "unreasonable_use_of_force", "unlawful_sexual_contact", "psychological_abuse",
                  "neglect_with_serious_harm", "theft_financial_coercion", "unexpected_death",
                  "inappropriate_restraint", "medication_error", "missing_consumer"
                ], required: true },
                { key: "summary", label: "Summary", type: "textarea", required: true },
                { key: "occurred_at", label: "Occurred at", type: "datetime", required: true },
                { key: "consumer_initials", label: "Consumer initials" },
                { key: "service_code", label: "Service code" },
              ]}
            />
          </TabsContent>

          <TabsContent value="ndis">
            <IndustryListTab
              title="NDIS Reportable Incidents"
              endpoint="/healthcare/ndis-reportable"
              testPrefix="hc-ndis"
              accent={TEAL}
              columns={[
                { key: "category", label: "Category" },
                { key: "is_high_risk", label: "Tier", render: r => r.is_high_risk ? pill("High · 24h", RED) : pill("Standard · 5d", AMBER) },
                { key: "summary", label: "Summary" },
                { key: "notify_commission_by", label: "Notify by", render: r => r.notify_commission_by ? new Date(r.notify_commission_by).toLocaleString() : "—" },
                { key: "status", label: "Status" },
              ]}
              formFields={[
                { key: "category", label: "Category", type: "select", options: [
                  "death", "serious_injury", "sexual_misconduct", "unauthorised_restraint",
                  "abuse_neglect", "unlawful_physical_contact",
                ], required: true },
                { key: "summary", label: "Summary", type: "textarea", required: true },
                { key: "occurred_at", label: "Occurred at", type: "datetime", required: true },
                { key: "participant_initials", label: "Participant initials" },
              ]}
            />
          </TabsContent>

          <TabsContent value="acqsc">
            <IndustryListTab
              title="ACQSC Quality Standards Evidence"
              endpoint="/healthcare/acqsc-evidence"
              testPrefix="hc-acqsc"
              accent={GREEN}
              columns={[
                { key: "standard", label: "Std" },
                { key: "title", label: "Title" },
                { key: "evidence_type", label: "Type" },
                { key: "next_review_at", label: "Review due", render: r => r.next_review_at ? new Date(r.next_review_at).toLocaleDateString() : "—" },
              ]}
              transformSubmit={(f) => ({ ...f, standard: Number(f.standard) })}
              formFields={[
                { key: "standard", label: "Standard (1-8)", type: "select", options: ["1", "2", "3", "4", "5", "6", "7", "8"], required: true },
                { key: "title", label: "Title", required: true },
                { key: "description", label: "Description", type: "textarea" },
                { key: "evidence_type", label: "Evidence type", type: "select", options: ["policy", "procedure", "record", "training", "audit"] },
                { key: "next_review_at", label: "Next review", type: "date" },
              ]}
            />
          </TabsContent>

          <TabsContent value="care-min">
            <IndustryListTab
              title="Care Minutes Log"
              endpoint="/healthcare/care-minutes"
              testPrefix="hc-caremin"
              accent={TEAL}
              columns={[
                { key: "consumer_initials", label: "Consumer" },
                { key: "care_type", label: "Type" },
                { key: "minutes", label: "Minutes" },
                { key: "clinician", label: "Clinician" },
                { key: "date", label: "Date" },
              ]}
              transformSubmit={(f) => ({ ...f, minutes: Number(f.minutes) })}
              formFields={[
                { key: "consumer_initials", label: "Consumer initials", required: true },
                { key: "care_type", label: "Care type", type: "select", options: ["rn", "direct_care", "allied_health"], required: true },
                { key: "minutes", label: "Minutes", type: "number", required: true },
                { key: "date", label: "Date", type: "date" },
                { key: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
