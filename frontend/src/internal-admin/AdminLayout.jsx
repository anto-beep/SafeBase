/**
 * AdminLayout — slate sidebar + top bar + env indicator.
 * Visually distinct from the customer-facing app to prevent context confusion.
 */
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { House, Users, Stack, Receipt, Flag, FileText, ShieldCheck, SignOut, Buildings, Briefcase, ChatsCircle } from "@phosphor-icons/react";
import { useAdminAuth } from "@/internal-admin/lib/AdminAuthContext";

const ENV_LABEL = (process.env.REACT_APP_ENV || "PRODUCTION").toUpperCase();
const ENV_COLOR = ENV_LABEL === "PRODUCTION" ? "bg-red-500 text-black" : "bg-amber-400 text-black";

const NAV_GROUPS = [
  { label: null, items: [
    { to: "/internal-admin", icon: House, label: "Dashboard", end: true, testid: "admin-nav-dashboard" },
  ]},
  { label: "Customers", items: [
    { to: "/internal-admin/accounts", icon: Buildings, label: "All Accounts", testid: "admin-nav-accounts" },
    { to: "/internal-admin/users", icon: Users, label: "All Users", testid: "admin-nav-users" },
    { to: "/internal-admin/demos", icon: ChatsCircle, label: "Demo Requests", testid: "admin-nav-demos" },
    { to: "/internal-admin/trials", icon: Briefcase, label: "Trial Accounts", testid: "admin-nav-trials" },
  ]},
  { label: "Billing", items: [
    { to: "/internal-admin/subscriptions", icon: Receipt, label: "Subscriptions", testid: "admin-nav-subscriptions" },
    { to: "/internal-admin/plans", icon: Receipt, label: "View Plans", testid: "admin-nav-plans" },
  ]},
  { label: "Platform", items: [
    { to: "/internal-admin/feature-flags", icon: Flag, label: "Feature Flags", testid: "admin-nav-flags" },
  ]},
  { label: "System", items: [
    { to: "/internal-admin/audit-logs", icon: FileText, label: "Audit Logs", testid: "admin-nav-audit" },
  ]},
];

function NavItem({ item }) {
  const Icon = item.icon;
  if (item.phase2) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" data-testid={item.testid}>
        <Icon size={16} />
        <span>{item.label}</span>
        <span className="ml-auto text-[9px] font-mono uppercase tracking-widest bg-slate-800 px-1.5 py-0.5">Phase 2</span>
      </div>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.end}
      data-testid={item.testid}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive ? "bg-red-500 text-black font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`
      }
    >
      <Icon size={16} weight="duotone" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/internal-admin/login");
  };

  return (
    <div className="min-h-screen flex bg-white text-slate-900">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-950 text-white flex flex-col shrink-0">
        <Link to="/internal-admin" className="flex items-center gap-2 px-4 h-16 border-b border-slate-800">
          <div className="w-8 h-8 bg-red-500 flex items-center justify-center font-display font-black text-sm text-black">SB</div>
          <div>
            <div className="font-display font-black text-sm">SAFEBASE</div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-red-400">Admin</div>
          </div>
        </Link>
        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {NAV_GROUPS.map((g, i) => (
            <div key={i}>
              {g.label && (
                <div className="px-3 mb-1 text-[9px] font-mono uppercase tracking-widest text-slate-500">{g.label}</div>
              )}
              <div className="space-y-0.5">
                {g.items.map((item) => <NavItem key={item.to} item={item} />)}
              </div>
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          v1 · Iter49
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-500">SafeBase · Internal Operations</div>
          <div className="flex items-center gap-4">
            <div className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 ${ENV_COLOR}`} data-testid="admin-env-indicator">
              {ENV_LABEL}
            </div>
            {admin && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-bold leading-none" data-testid="admin-header-name">
                    {admin.first_name} {admin.last_name}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500" data-testid="admin-header-role">
                    {admin.role.replace(/_/g, " ")}
                  </div>
                </div>
                <button onClick={onLogout} data-testid="admin-logout-btn" className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-xs font-mono uppercase tracking-widest inline-flex items-center gap-2">
                  <SignOut size={12} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
