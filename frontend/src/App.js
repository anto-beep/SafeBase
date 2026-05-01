import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/HomeMultiIndustry";
import IndustriesOverview from "@/pages/industries/IndustriesOverview";
import IndustryTrades from "@/pages/industries/IndustryTrades";
import IndustryHospitality from "@/pages/industries/IndustryHospitality";
import IndustryTransport from "@/pages/industries/IndustryTransport";
import IndustryHealthcare from "@/pages/industries/IndustryHealthcare";
import IndustryRetail from "@/pages/industries/IndustryRetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import DashboardLayout from "@/pages/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import DocumentView from "@/pages/DocumentView";
import Incidents from "@/pages/Incidents";
import IncidentRegister from "@/pages/incident/IncidentRegister";
import SubmitIncident from "@/pages/incident/SubmitIncident";
import IncidentDetail from "@/pages/incident/IncidentDetail";
import Workers from "@/pages/Workers";
import Licences from "@/pages/Licences";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import ToolboxTalks from "@/pages/safety/ToolboxTalks";
import Plant from "@/pages/safety/Plant";
import Substances from "@/pages/safety/Substances";
import Inspections from "@/pages/safety/Inspections";
import RiskRegister from "@/pages/safety/RiskRegister";
import FirstAidPpe from "@/pages/safety/FirstAidPpe";
import Reports from "@/pages/Reports";
import NewEmployee from "@/pages/workflows/NewEmployee";
import IncidentResolution from "@/pages/workflows/IncidentResolution";
import SwmsJobStart from "@/pages/workflows/SwmsJobStart";
import AnnualReview from "@/pages/workflows/AnnualReview";
import Subcontractor from "@/pages/workflows/Subcontractor";
import Tradeinduct from "@/pages/Tradeinduct";import InductionPublic from "@/pages/InductionPublic";
import AddOnsMarketplace from "@/pages/AddOnsMarketplace";
import AcademyApp from "@/pages/Academy";
import AIDocsPage from "@/pages/AIDocsPage";
import IndustryResourcesPage from "@/pages/IndustryResourcesPage";
import HospitalityFoodSafety from "@/pages/hospitality/FoodSafetyPage";
import TransportFleetCoR from "@/pages/transport/FleetCoRPage";
import HealthcareCareQuality from "@/pages/healthcare/CareQualityPage";
import RetailInductionsLoneWorker from "@/pages/retail/InductionsLoneWorkerPage";
import ComplianceInboxPage from "@/pages/ComplianceInboxPage";
import TradecheckMarketplace from "@/pages/TradecheckMarketplace";
import TradecheckMy from "@/pages/TradecheckMy";
import AcademyLMS from "@/pages/AcademyLMS";
import PartnerPortal from "@/pages/PartnerPortal";
import PartnerBranding from "@/pages/PartnerBranding";
import MobileWorker from "@/pages/MobileWorker";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import TemplatesLibrary from "@/pages/TemplatesLibrary";
import Compare from "@/pages/Compare";
import StateGuide from "@/pages/StateGuide";
import FineCalculator from "@/pages/FineCalculator";
import Integrations from "@/pages/Integrations";
import Enterprise from "@/pages/Enterprise";
import Webhooks from "@/pages/Webhooks";
import Automations from "@/pages/Automations";
import LibraryPage from "@/pages/risk/LibraryPage";
import RiskRegisterPage from "@/pages/risk/RiskRegisterPage";
import RiskForm from "@/pages/risk/RiskForm";
import RiskDetail from "@/pages/risk/RiskDetail";
import ReviewForm from "@/pages/risk/ReviewForm";
import SwmsRevisionsPage from "@/pages/risk/SwmsRevisionsPage";
import CompetencyMatrix from "@/pages/CompetencyMatrix";
import SwmsLibraryPage from "@/pages/swms/SwmsLibraryPage";
import SwmsGenerator from "@/pages/swms/SwmsGenerator";
import SwmsSignPublic from "@/pages/swms/SwmsSignPublic";
import DocumentLibraryHub from "@/pages/docs/DocumentLibraryHub";
import DocumentListPage from "@/pages/docs/DocumentListPage";
import DocumentForm from "@/pages/docs/DocumentForm";
import ServiceSwms from "@/pages/services/ServiceSwms";
import ServiceIncidents from "@/pages/services/ServiceIncidents";
import ServicePeople from "@/pages/services/ServicePeople";
import ServiceIntelligence from "@/pages/services/ServiceIntelligence";
import Pricing from "@/pages/Pricing";
import Partners from "@/pages/Partners";
import Franchises from "@/pages/Franchises";
import Resources from "@/pages/Resources";
import ResourceArticle from "@/pages/ResourceArticle";
import About from "@/pages/About";
import Ecosystem from "@/pages/Ecosystem"; // kept as import for redirect only
import PlanRightsizer from "@/pages/PlanRightsizer";
import IndustryRiskCalculator from "@/pages/IndustryRiskCalculator";
import BookDemo from "@/pages/BookDemo";
import CredentialExpiryCalculator from "@/pages/CredentialExpiryCalculator";
import InsuranceDiscountCalculator from "@/pages/InsuranceDiscountCalculator";
import RegulatoryDigest from "@/pages/RegulatoryDigest";
import AdminDemoRequests from "@/pages/AdminDemoRequests";
import NdisCompliancePage from "@/pages/seo/NdisCompliancePage";
import CorCompliancePage from "@/pages/seo/CorCompliancePage";
import HaccpCompliancePage from "@/pages/seo/HaccpCompliancePage";
import Consulting from "@/pages/Consulting";
import Academy from "@/pages/products/Academy";
import TradeInduct from "@/pages/products/TradeInduct";
import TradeCheck from "@/pages/products/TradeCheck";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center label-eyebrow">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/industries" element={<IndustriesOverview />} />
      <Route path="/industries/trades" element={<IndustryTrades />} />
      <Route path="/industries/hospitality" element={<IndustryHospitality />} />
      <Route path="/industries/transport" element={<IndustryTransport />} />
      <Route path="/industries/healthcare" element={<IndustryHealthcare />} />
      <Route path="/industries/retail" element={<IndustryRetail />} />
      <Route path="/ecosystem" element={<Navigate to="/services/swms" replace />} />
      <Route path="/plan-rightsizer" element={<PlanRightsizer />} />
      <Route path="/risk-calculator" element={<IndustryRiskCalculator />} />
      <Route path="/credential-expiry-calculator" element={<CredentialExpiryCalculator />} />
      <Route path="/insurance-discount-calculator" element={<InsuranceDiscountCalculator />} />
      <Route path="/regulatory-digest" element={<RegulatoryDigest />} />
      <Route path="/seo/ndis-compliance" element={<NdisCompliancePage />} />
      <Route path="/seo/cor-compliance" element={<CorCompliancePage />} />
      <Route path="/seo/haccp-compliance" element={<HaccpCompliancePage />} />
      <Route path="/book-demo" element={<BookDemo />} />
      <Route path="/services/swms" element={<ServiceSwms />} />
      <Route path="/services/incidents" element={<ServiceIncidents />} />
      <Route path="/services/people" element={<ServicePeople />} />
      <Route path="/services/intelligence" element={<ServiceIntelligence />} />
      <Route path="/products/tradeinduct" element={<TradeInduct />} />
      <Route path="/products/tradecheck" element={<TradeCheck />} />
      <Route path="/products/academy" element={<Academy />} />
      <Route path="/consulting" element={<Consulting />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/partners" element={<Partners />} />
      <Route path="/franchises" element={<Franchises />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/resources/:industry" element={<IndustryResourcesPage />} />
      <Route path="/resources/:industry/:slug" element={<ResourceArticle />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/tradecheck" element={<TradecheckMarketplace />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/templates" element={<TemplatesLibrary />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/guides" element={<StateGuide />} />
      <Route path="/guides/:state" element={<StateGuide />} />
      <Route path="/tools/fine-calculator" element={<FineCalculator />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/enterprise" element={<Enterprise />} />
      <Route path="/induct/:code" element={<InductionPublic />} />
      <Route path="/swms/sign/:token" element={<SwmsSignPublic />} />
      <Route path="/worker" element={<Protected><MobileWorker /></Protected>} />
      <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/:documentId" element={<DocumentView />} />
        <Route path="incidents" element={<IncidentRegister />} />
        <Route path="incidents/legacy" element={<Incidents />} />
        <Route path="incidents/new" element={<SubmitIncident />} />
        <Route path="incidents/:incident_id" element={<IncidentDetail />} />
        <Route path="workers" element={<Workers />} />
        <Route path="licences" element={<Licences />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="toolbox-talks" element={<ToolboxTalks />} />
        <Route path="plant" element={<Plant />} />
        <Route path="substances" element={<Substances />} />
        <Route path="inspections" element={<Inspections />} />
        <Route path="risks" element={<RiskRegister />} />
        <Route path="first-aid-ppe" element={<FirstAidPpe />} />
        <Route path="reports" element={<Reports />} />
        <Route path="workflows/new-employee" element={<NewEmployee />} />
        <Route path="workflows/incident-resolution" element={<IncidentResolution />} />
        <Route path="workflows/swms-job-start" element={<SwmsJobStart />} />
        <Route path="workflows/annual-review" element={<AnnualReview />} />
        <Route path="workflows/subcontractor" element={<Subcontractor />} />
        <Route path="tradeinduct" element={<Tradeinduct />} />
        <Route path="tradecheck" element={<TradecheckMy />} />
        <Route path="academy" element={<AcademyLMS />} />
        <Route path="partner" element={<PartnerPortal />} />
        <Route path="partner/branding" element={<PartnerBranding />} />
        <Route path="library/processes" element={<LibraryPage kind="process" />} />
        <Route path="library/activities" element={<LibraryPage kind="activity" />} />
        <Route path="library/tasks" element={<LibraryPage kind="task" />} />
        <Route path="library/controls" element={<LibraryPage kind="control" />} />
        <Route path="risk-register" element={<RiskRegisterPage />} />
        <Route path="risk-register/new" element={<RiskForm />} />
        <Route path="risk-register/reviews/new" element={<ReviewForm />} />
        <Route path="risk-register/reviews/:review_id" element={<ReviewForm />} />
        <Route path="risk-register/:risk_id" element={<RiskDetail />} />
        <Route path="risk-register/:risk_id/edit" element={<RiskForm />} />
        <Route path="swms-revisions" element={<SwmsRevisionsPage />} />
        <Route path="competency-matrix" element={<CompetencyMatrix />} />
        <Route path="swms" element={<SwmsLibraryPage />} />
        <Route path="swms/new" element={<SwmsGenerator />} />
        <Route path="swms/:swms_id" element={<SwmsGenerator />} />
        <Route path="document-library" element={<DocumentLibraryHub />} />
        <Route path="document-library/:doc_type" element={<DocumentListPage />} />
        <Route path="document-library/:doc_type/new" element={<DocumentForm />} />
        <Route path="document-library/doc/:doc_id" element={<DocumentForm />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="automations" element={<Automations />} />
        <Route path="addons" element={<AddOnsMarketplace />} />
        <Route path="academy-app" element={<AcademyApp />} />
        <Route path="ai-docs" element={<AIDocsPage />} />
        <Route path="food-safety" element={<HospitalityFoodSafety />} />
        <Route path="cor" element={<TransportFleetCoR />} />
        <Route path="care-quality" element={<HealthcareCareQuality />} />
        <Route path="inductions" element={<RetailInductionsLoneWorker />} />
        <Route path="compliance-inbox" element={<ComplianceInboxPage />} />
        <Route path="admin/demos" element={<AdminDemoRequests />} />
      </Route>
      <Route path="/products/safeinduct" element={<Navigate to="/addon/safeinduct" replace />} />
      <Route path="/products/safecheck" element={<Navigate to="/addon/safecheck" replace />} />
      <Route path="/addon/safeinduct" element={<Navigate to="/products/tradeinduct" replace />} />
      <Route path="/addon/safecheck" element={<Navigate to="/products/tradecheck" replace />} />
      <Route path="/addon/academy" element={<Navigate to="/products/academy" replace />} />
      <Route path="/safetradie" element={<Navigate to="/" replace />} />
      <Route path="/features" element={<Navigate to="/industries" replace />} />
      <Route path="/contact" element={<Navigate to="/about" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
