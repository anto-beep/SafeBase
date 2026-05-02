/**
 * HACCP Compliance Software — SEO landing page.
 */
import SeoLandingPage from "@/components/seo/SeoLandingPage";

export default function HaccpCompliancePage() {
  return (
    <SeoLandingPage
      testid="seo-haccp"
      eyebrow="HACCP compliance software"
      headline={<>HACCP Software. Built for Australian Hospitality.</>}
      subheadline="FSANZ Standard 3.2.2A mandates documented food-safety programs with evidence of daily compliance. SafeBase automates temperature logs, HACCP CCPs, allergen registers, cleaning schedules and council inspection packs in one platform."
      industry="hospitality"
      accent="#7C1D3F"
      regulators={["FSANZ", "Local Councils", "State Liquor and Gaming"]}
      roiAnchor="Hospitality businesses currently pay A$400 to A$700 per month across three fragmented tools. SafeBase Single Venue at A$11,990/year + GST replaces all of them and adds full WHS."
      painPoints={[
        { title: "Temperature logs missed during rush", body: "Standard 3.2.2A requires documented temperature records. Paper clipboards get missed on Friday night. Council inspectors arrive Monday." },
        { title: "Allergen register out of date", body: "Menu changes every week. Allergen register updates every quarter. The gap is a death-response waiting to happen." },
        { title: "RSA and FSS tracking manual", body: "Every FOH staff member needs an RSA. Every kitchen needs a Food Safety Supervisor. Manual tracking misses lapses until inspection." },
      ]}
      featureList={[
        "Temperature log with FSANZ Std 3.2.2A auto-range check",
        "HACCP CCP log with critical-limit breach detection",
        "Allergen register with menu-item mapping",
        "Cleaning schedule with completion tracking",
        "Food Safety Supervisor register with expiry alerts",
        "RSA / Approved Manager register (state-aware)",
        "Supplier register with approval certification tracking",
        "Council inspection pack — one-click evidence bundle",
        "IoT temperature sensor webhook (when ready)",
      ]}
      plans={[
        { name: "Single Venue", annual: "11,990", monthly: "1,199" },
        { name: "Multi-Venue", annual: "34,990", monthly: "3,499" },
      ]}
      faq={[
        { q: "Does SafeBase replace my food-safety program?", a: "SafeBase generates the HACCP program, captures the daily evidence, and produces the council inspection pack. You retain ownership; SafeBase removes the admin." },
        { q: "Does SafeBase work for catering and events?", a: "Yes — the Hospitality module covers restaurants, cafes, bars, hotels, catering, and event venues." },
        { q: "Can I connect IoT temperature sensors?", a: "Yes — the integration webhook at /api/integrations/iot/temperature accepts readings from any sensor that can POST JSON." },
      ]}
    />
  );
}
