import SafetyModulePage from "@/components/safety/SafetyModulePage";
import { FirstAidKit, HardHat } from "@phosphor-icons/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const INJURY_TYPES = [
  "Cut/laceration", "Burn", "Eye injury", "Strain/sprain",
  "Fracture (suspected)", "Head injury", "Heat stress",
  "Allergic reaction", "Chest pain", "Breathing difficulty", "Other",
].map((t) => ({ v: t, l: t }));

const REFERRED = [
  { v: "none", l: "No further treatment required" },
  { v: "gp", l: "Referred to GP" },
  { v: "hospital", l: "Sent to hospital" },
  { v: "ambulance", l: "Ambulance called" },
];

const PPE_TYPES = [
  "Safety helmet (hard hat)", "Safety harness", "Safety boots (steel cap)",
  "Hi-vis vest/jacket", "Safety glasses/goggles", "Hearing protection",
  "Respirator/dust mask", "Cut-resistant gloves", "Electrical gloves",
  "Welding helmet", "Fall arrest lanyard",
].map((t) => ({ v: t, l: t }));

const PPE_CONDITIONS = [
  { v: "new", l: "New" },
  { v: "good", l: "Good" },
  { v: "fair", l: "Fair" },
  { v: "poor", l: "Poor — replace" },
];

export default function FirstAidPpe() {
  return (
    <div className="space-y-6" data-testid="first-aid-ppe-page">
      <div className="border-b border-border pb-4">
        <div className="label-eyebrow">/ First Aid & PPE</div>
        <h1 className="font-display text-4xl font-black tracking-tighter mt-1">First Aid & PPE Registers</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Lightweight first-aid treatment log and PPE issuance tracker. Required for compliance and insurance.</p>
      </div>
      <Tabs defaultValue="first_aid" className="space-y-4">
        <TabsList className="bg-muted rounded-none border border-border p-1 h-auto">
          <TabsTrigger value="first_aid" className="rounded-none" data-testid="fa-tab-first-aid"><FirstAidKit className="mr-2" />First Aid Log</TabsTrigger>
          <TabsTrigger value="ppe" className="rounded-none" data-testid="fa-tab-ppe"><HardHat className="mr-2" />PPE Register</TabsTrigger>
        </TabsList>

        <TabsContent value="first_aid">
          <SafetyModulePage
            module="first_aid"
            title="First Aid Treatments"
            eyebrow="First-aid log"
            lead="Short log per treatment. Takes about 2 minutes on site."
            icon={FirstAidKit}
            dataTestid="first-aid-subpage"
            emptyMessage="A clean log is a healthy log."
            fields={[
              { key: "person_treated", label: "Person treated", type: "text", required: true },
              { key: "treatment_date", label: "Date & time", type: "datetime-local", required: true },
              { key: "site", label: "Site", type: "text" },
              { key: "injury_type", label: "Injury / illness", type: "select", options: INJURY_TYPES, required: true },
              { key: "treatment_given", label: "Treatment given", type: "textarea", span: 2 },
              { key: "first_aider", label: "First aider", type: "text" },
              { key: "referred_to", label: "Referred to", type: "select", options: REFERRED, default: "none" },
            ]}
            columns={[
              { key: "treatment_date", label: "Date", render: (i) => i.treatment_date ? new Date(i.treatment_date).toLocaleString("en-AU") : "—" },
              { key: "person_treated", label: "Person", render: (i) => <span className="font-bold">{i.person_treated}</span> },
              { key: "injury_type", label: "Injury" },
              { key: "site", label: "Site" },
              { key: "first_aider", label: "First aider" },
              { key: "referred_to", label: "Referred", render: (i) => (i.referred_to && i.referred_to !== "none") ? <span className="bg-warning text-ink px-2 py-0.5 text-[10px] font-bold tracking-widest">{i.referred_to.toUpperCase()}</span> : "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="ppe">
          <SafetyModulePage
            module="ppe"
            title="PPE Issued"
            eyebrow="PPE register"
            lead="Track what has been issued to which worker, with inspection and replacement dates."
            icon={HardHat}
            dataTestid="ppe-subpage"
            emptyMessage="No PPE issued yet."
            fields={[
              { key: "worker_name", label: "Worker name", type: "text", required: true },
              { key: "ppe_type", label: "PPE type", type: "select", options: PPE_TYPES, required: true },
              { key: "brand_model", label: "Brand & model", type: "text" },
              { key: "size", label: "Size", type: "text" },
              { key: "date_issued", label: "Date issued", type: "date", required: true },
              { key: "next_inspection", label: "Next inspection", type: "date" },
              { key: "condition", label: "Condition at issue", type: "select", options: PPE_CONDITIONS, default: "new" },
            ]}
            columns={[
              { key: "worker_name", label: "Worker", render: (i) => <span className="font-bold">{i.worker_name}</span> },
              { key: "ppe_type", label: "PPE" },
              { key: "brand_model", label: "Brand/Model" },
              { key: "date_issued", label: "Issued" },
              { key: "next_inspection", label: "Next inspection", render: (i) => {
                if (!i.next_inspection) return "—";
                const days = i.next_inspection_days;
                const cls = days == null ? "" : days < 0 ? "bg-red-600 text-white" : days <= 14 ? "bg-warning text-ink" : "bg-muted";
                return <span className={`px-2 py-0.5 text-[10px] font-bold ${cls}`}>{i.next_inspection}{days != null && ` · ${days}d`}</span>;
              }},
              { key: "condition", label: "Condition", render: (i) => (i.condition || "new").toUpperCase() },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
