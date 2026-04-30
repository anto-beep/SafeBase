import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import DashboardLayout from "@/pages/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Documents from "@/pages/Documents";
import DocumentView from "@/pages/DocumentView";
import Incidents from "@/pages/Incidents";
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
import Tradeinduct from "@/pages/Tradeinduct";
import InductionPublic from "@/pages/InductionPublic";
import TradecheckMarketplace from "@/pages/TradecheckMarketplace";
import TradecheckMy from "@/pages/TradecheckMy";
import AcademyLMS from "@/pages/AcademyLMS";
import PartnerPortal from "@/pages/PartnerPortal";
import MobileWorker from "@/pages/MobileWorker";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import TemplatesLibrary from "@/pages/TemplatesLibrary";
import Compare from "@/pages/Compare";
import StateGuide from "@/pages/StateGuide";
import FineCalculator from "@/pages/FineCalculator";
import Integrations from "@/pages/Integrations";
import Webhooks from "@/pages/Webhooks";
import Automations from "@/pages/Automations";
import ServiceSwms from "@/pages/services/ServiceSwms";
import ServiceIncidents from "@/pages/services/ServiceIncidents";
import ServicePeople from "@/pages/services/ServicePeople";
import ServiceIntelligence from "@/pages/services/ServiceIntelligence";
import Pricing from "@/pages/Pricing";
import Partners from "@/pages/Partners";
import Franchises from "@/pages/Franchises";
import Resources from "@/pages/Resources";
import About from "@/pages/About";
import Ecosystem from "@/pages/Ecosystem";
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
      <Route path="/ecosystem" element={<Ecosystem />} />
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
      <Route path="/induct/:code" element={<InductionPublic />} />
      <Route path="/worker" element={<Protected><MobileWorker /></Protected>} />
      <Route path="/dashboard" element={<Protected><DashboardLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/:documentId" element={<DocumentView />} />
        <Route path="incidents" element={<Incidents />} />
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
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="automations" element={<Automations />} />
      </Route>
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
