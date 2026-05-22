/**
 * InternalAdminApp — mounts the admin route tree under /internal-admin.
 *
 * Uses its own AdminAuthProvider so admin sessions never leak into
 * customer auth context (and vice versa).
 */
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "./lib/AdminAuthContext";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAccounts from "./pages/AdminAccounts";
import AdminAccountDetail from "./pages/AdminAccountDetail";
import { AdminTrials, AdminDemos, AdminUsers, AdminAuditLogs } from "./pages/AdminLists";

function AdminProtected({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading…</div>;
  if (!admin) return <Navigate to="/internal-admin/login" replace />;
  return children;
}

export default function InternalAdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route element={<AdminProtected><AdminLayout /></AdminProtected>}>
          <Route index element={<AdminDashboard />} />
          <Route path="accounts" element={<AdminAccounts />} />
          <Route path="accounts/:id" element={<AdminAccountDetail />} />
          <Route path="trials" element={<AdminTrials />} />
          <Route path="demos" element={<AdminDemos />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>
      </Routes>
    </AdminAuthProvider>
  );
}
