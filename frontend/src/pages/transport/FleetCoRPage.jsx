/**
 * TransportFleetCoR — main transport operations page.
 * Charcoal command-centre theme: dark + teal + safety orange.
 * Tabs: Fleet, Pre-trip, Fatigue, Fitness-for-duty, Load Restraint,
 * Mass Mgmt, CoR Due Diligence, NHVR Occurrences.
 */
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { IndustryListTab, StatChip, pill } from "../_shared/IndustryListTab";

const CHARCOAL = "#1C2526";
const TEAL = "#0DC4B5";
const ORANGE = "#FF6B35";
const PANEL = "#0F1719";

function FatigueSummary() {
  const [breaches, setBreaches] = useState(0);
  useEffect(() => {
    api.get("/transport/fatigue-logs/breaches")
      .then(({ data }) => setBreaches(data.total || 0))
      .catch(() => {});
  }, []);
  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatChip label="Breaches logged" value={breaches} color={ORANGE} testid="trans-fatigue-breaches" />
      <StatChip label="Std Hours limit" value="12h/day" color={TEAL} testid="trans-fatigue-limit" />
      <StatChip label="Min rest" value="7h cont." color={TEAL} testid="trans-fatigue-rest" />
    </div>
  );
}

export default function TransportFleetCoR() {
  return (
    <div className="min-h-screen p-6" style={{ background: CHARCOAL }} data-testid="trans-fleet-cor-page">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider" style={{ color: TEAL }}>Transport · Operations</div>
        <h1 className="font-display font-black text-4xl mt-1 text-white">Fleet & Chain of Responsibility</h1>
        <p className="text-sm text-white/60 mt-2 max-w-2xl">HVNL-grade logs covering your fleet, fatigue (Std/BFM/AFM), pre-trip inspections, load restraint, mass management, executive due-diligence, and NHVR Notifiable Occurrences.</p>
      </div>

      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="border-2 p-1 h-auto flex-wrap" style={{ background: PANEL, borderColor: "rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="fleet" data-testid="trans-tab-fleet" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Fleet</TabsTrigger>
          <TabsTrigger value="pretrip" data-testid="trans-tab-pretrip" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Pre-trip</TabsTrigger>
          <TabsTrigger value="fatigue" data-testid="trans-tab-fatigue" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Fatigue</TabsTrigger>
          <TabsTrigger value="ffd" data-testid="trans-tab-ffd" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Fitness-for-duty</TabsTrigger>
          <TabsTrigger value="restraint" data-testid="trans-tab-restraint" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Load restraint</TabsTrigger>
          <TabsTrigger value="mass" data-testid="trans-tab-mass" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">Mass mgmt</TabsTrigger>
          <TabsTrigger value="cor" data-testid="trans-tab-cor" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">CoR DD</TabsTrigger>
          <TabsTrigger value="nhvr" data-testid="trans-tab-nhvr" className="data-[state=active]:bg-white data-[state=active]:text-[#1C2526] text-white/70">NHVR</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="fleet">
            <IndustryListTab
              title="Fleet Vehicles"
              endpoint="/transport/vehicles"
              testPrefix="trans-fleet"
              accent={TEAL}
              headerBg="#F4F6F7"
              columns={[
                { key: "rego", label: "Rego" },
                { key: "vehicle_class", label: "Class" },
                { key: "make", label: "Make/Model", render: r => `${r.make || ""} ${r.model || ""}`.trim() || "—" },
                { key: "gvm_kg", label: "GVM (kg)" },
                { key: "next_service_due", label: "Next service", render: r => r.next_service_due ? new Date(r.next_service_due).toLocaleDateString() : "—" },
              ]}
              formFields={[
                { key: "rego", label: "Rego", required: true },
                { key: "vehicle_class", label: "Class", type: "select", options: ["HR", "HC", "MC", "B-Double", "Road Train", "LR"] },
                { key: "make", label: "Make" }, { key: "model", label: "Model" },
                { key: "gvm_kg", label: "GVM (kg)", type: "number" },
                { key: "next_service_due", label: "Next service due", type: "date" },
                { key: "rego_expires_at", label: "Rego expiry", type: "date" },
              ]}
            />
          </TabsContent>

          <TabsContent value="pretrip">
            <IndustryListTab
              title="Pre-trip Inspections"
              endpoint="/transport/pretrip-inspections"
              testPrefix="trans-pretrip"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "vehicle_rego", label: "Rego" },
                { key: "driver_name", label: "Driver" },
                { key: "fit_to_drive", label: "Status", render: r => r.fit_to_drive ? pill("Fit", TEAL) : pill("Defects", ORANGE) },
                { key: "defects", label: "Defects", render: r => (r.defects || []).join(", ") || "—" },
                { key: "inspected_at", label: "When", render: r => new Date(r.inspected_at).toLocaleString() },
              ]}
              transformSubmit={(f) => {
                const cl = {};
                ["tyres", "lights", "brakes", "coupling", "load_secure", "mirrors", "horn", "fluids"].forEach(k => {
                  cl[k] = f[`cl_${k}`] === "pass";
                });
                return {
                  vehicle_rego: f.vehicle_rego, driver_name: f.driver_name,
                  odometer_km: f.odometer_km ? Number(f.odometer_km) : null,
                  checklist: cl, notes: f.notes,
                };
              }}
              formFields={[
                { key: "vehicle_rego", label: "Rego", required: true },
                { key: "driver_name", label: "Driver", required: true },
                { key: "odometer_km", label: "Odometer (km)", type: "number" },
                { key: "cl_tyres", label: "Tyres", type: "select", options: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }] },
                { key: "cl_lights", label: "Lights", type: "select", options: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }] },
                { key: "cl_brakes", label: "Brakes", type: "select", options: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }] },
                { key: "cl_coupling", label: "Coupling", type: "select", options: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }] },
                { key: "cl_load_secure", label: "Load secure", type: "select", options: [{ value: "pass", label: "Pass" }, { value: "fail", label: "Fail" }] },
                { key: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </TabsContent>

          <TabsContent value="fatigue">
            <FatigueSummary />
            <IndustryListTab
              title="Fatigue / EWD Logs"
              endpoint="/transport/fatigue-logs"
              testPrefix="trans-fatigue"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "driver_name", label: "Driver" },
                { key: "day_date", label: "Date" },
                { key: "work_hours", label: "Work (h)" },
                { key: "continuous_rest_hours", label: "Rest (h)" },
                { key: "standard", label: "Scheme" },
                { key: "breach", label: "Status", render: r => r.breach ? pill("BREACH", ORANGE) : pill("OK", TEAL) },
              ]}
              transformSubmit={(f) => ({
                ...f,
                work_hours: Number(f.work_hours),
                continuous_rest_hours: Number(f.continuous_rest_hours),
              })}
              formFields={[
                { key: "driver_name", label: "Driver", required: true },
                { key: "vehicle_rego", label: "Vehicle" },
                { key: "day_date", label: "Date", type: "date" },
                { key: "work_hours", label: "Work hours in day", type: "number", required: true },
                { key: "continuous_rest_hours", label: "Continuous rest (h)", type: "number", required: true },
                { key: "standard", label: "Scheme", type: "select", options: ["standard", "bfm", "afm"] },
                { key: "source", label: "Source", type: "select", options: ["manual", "ewd"] },
              ]}
            />
          </TabsContent>

          <TabsContent value="ffd">
            <IndustryListTab
              title="Fitness-for-duty Declarations"
              endpoint="/transport/fitness-for-duty"
              testPrefix="trans-ffd"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "driver_name", label: "Driver" },
                { key: "hours_slept_24h", label: "Slept (h/24)" },
                { key: "fit_to_drive", label: "Status", render: r => r.fit_to_drive ? pill("Fit", TEAL) : pill("Unfit", ORANGE) },
                { key: "declared_at", label: "When", render: r => new Date(r.declared_at).toLocaleString() },
              ]}
              transformSubmit={(f) => ({
                driver_name: f.driver_name,
                hours_slept_24h: Number(f.hours_slept_24h),
                alcohol_last_8h: f.alcohol_last_8h === "yes",
                on_medication_affecting: f.on_medication_affecting === "yes",
                unwell: f.unwell === "yes",
                fit_to_drive: f.fit_to_drive !== "no",
              })}
              formFields={[
                { key: "driver_name", label: "Driver", required: true },
                { key: "hours_slept_24h", label: "Hours slept in 24h", type: "number", required: true },
                { key: "alcohol_last_8h", label: "Alcohol last 8h?", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
                { key: "on_medication_affecting", label: "Medication?", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
                { key: "unwell", label: "Unwell?", type: "select", options: [{ value: "no", label: "No" }, { value: "yes", label: "Yes" }] },
                { key: "fit_to_drive", label: "Self-declare fit?", type: "select", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
              ]}
            />
          </TabsContent>

          <TabsContent value="restraint">
            <IndustryListTab
              title="Load Restraint Records"
              endpoint="/transport/load-restraint"
              testPrefix="trans-restraint"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "vehicle_rego", label: "Vehicle" },
                { key: "load_description", label: "Load" },
                { key: "load_weight_kg", label: "Weight (kg)" },
                { key: "restraint_method", label: "Method" },
                { key: "performance_standard_met", label: "Std met?", render: r => r.performance_standard_met ? pill("Yes", TEAL) : pill("No", ORANGE) },
              ]}
              formFields={[
                { key: "vehicle_rego", label: "Vehicle rego", required: true },
                { key: "load_description", label: "Load description", required: true },
                { key: "load_weight_kg", label: "Weight (kg)", type: "number" },
                { key: "restraint_method", label: "Method", type: "select", options: ["tie_down", "direct", "blocking", "containment"] },
                { key: "number_of_straps", label: "Straps", type: "number" },
              ]}
            />
          </TabsContent>

          <TabsContent value="mass">
            <IndustryListTab
              title="Mass Declarations"
              endpoint="/transport/mass-declarations"
              testPrefix="trans-mass"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "vehicle_rego", label: "Vehicle" },
                { key: "scheme", label: "Scheme" },
                { key: "declared_mass_kg", label: "Declared" },
                { key: "allowed_mass_kg", label: "Allowed" },
                { key: "overweight", label: "Status", render: r => r.overweight ? pill("OVERWEIGHT", ORANGE) : pill("OK", TEAL) },
              ]}
              transformSubmit={(f) => ({ ...f, declared_mass_kg: Number(f.declared_mass_kg), allowed_mass_kg: Number(f.allowed_mass_kg || 0) })}
              formFields={[
                { key: "vehicle_rego", label: "Vehicle", required: true },
                { key: "scheme", label: "Scheme", type: "select", options: ["GML", "CML", "HML", "PBS"] },
                { key: "declared_mass_kg", label: "Declared (kg)", type: "number", required: true },
                { key: "allowed_mass_kg", label: "Allowed (kg)", type: "number" },
                { key: "route", label: "Route" },
                { key: "consigner", label: "Consigner" },
              ]}
            />
          </TabsContent>

          <TabsContent value="cor">
            <IndustryListTab
              title="CoR Executive Due Diligence"
              endpoint="/transport/cor-due-diligence"
              testPrefix="trans-cor"
              accent={TEAL} headerBg="#F4F6F7"
              columns={[
                { key: "party", label: "Party" },
                { key: "hazard", label: "Hazard" },
                { key: "action", label: "Action" },
                { key: "next_review_at", label: "Next review", render: r => r.next_review_at ? new Date(r.next_review_at).toLocaleDateString() : "—" },
              ]}
              formFields={[
                { key: "party", label: "Party", type: "select", options: ["Consigner", "Packer", "Loader", "Driver", "Scheduler", "Operator", "Executive"], required: true },
                { key: "hazard", label: "Hazard" },
                { key: "action", label: "Action taken", type: "textarea", required: true },
                { key: "evidence_link", label: "Evidence link" },
                { key: "next_review_at", label: "Next review", type: "date" },
              ]}
            />
          </TabsContent>

          <TabsContent value="nhvr">
            <IndustryListTab
              title="NHVR Notifiable Occurrences"
              endpoint="/transport/nhvr-occurrences"
              testPrefix="trans-nhvr"
              accent={ORANGE} headerBg="#F4F6F7"
              columns={[
                { key: "occurrence_type", label: "Type" },
                { key: "vehicle_rego", label: "Vehicle" },
                { key: "summary", label: "Summary" },
                { key: "notify_nhvr_by", label: "Notify by", render: r => r.notify_nhvr_by ? pill(new Date(r.notify_nhvr_by).toLocaleString(), ORANGE) : "—" },
                { key: "status", label: "Status" },
              ]}
              formFields={[
                { key: "occurrence_type", label: "Type", type: "select", options: ["death", "serious_injury", "rollover", "load_loss", "dangerous_goods_release"], required: true },
                { key: "summary", label: "Summary", type: "textarea", required: true },
                { key: "vehicle_rego", label: "Vehicle" },
                { key: "driver_name", label: "Driver" },
                { key: "occurred_at", label: "Occurred at", type: "datetime", required: true },
                { key: "location", label: "Location" },
              ]}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
