import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { HardHat, House, FileText, Warning, Users, IdentificationBadge, SignOut } from "@phosphor-icons/react";

const NAV = [
  { to: "/dashboard", end: true, label: "Overview", icon: House },
  { to: "/dashboard/documents", label: "Documents", icon: FileText },
  { to: "/dashboard/incidents", label: "Incidents", icon: Warning },
  { to: "/dashboard/workers", label: "Workers", icon: Users },
  { to: "/dashboard/licences", label: "Licences", icon: IdentificationBadge },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <div className="min-h-screen bg-muted">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink text-white hidden lg:flex flex-col" data-testid="dashboard-sidebar">
        <Link to="/dashboard" className="h-16 flex items-center gap-2 px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={20} /></div>
          <span className="font-display font-black">SAFETRADIE</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-warning text-ink font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <item.icon size={18} weight="bold" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-sm font-bold truncate">{user?.name}</div>
          <div className="text-xs text-white/50 truncate">{user?.email}</div>
          <div className="label-eyebrow text-warning mt-1">/ {user?.role}</div>
          <Button onClick={handleLogout} variant="outline" className="w-full btn-sharp mt-3 border-white/20 bg-transparent text-white hover:bg-white hover:text-ink" data-testid="logout-btn"><SignOut className="mr-2" />Log out</Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden bg-ink text-white sticky top-0 z-30 h-14 flex items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2"><div className="w-7 h-7 bg-warning flex items-center justify-center"><HardHat weight="fill" className="text-ink" size={16} /></div><span className="font-display font-black text-sm">SAFETRADIE</span></Link>
        <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white hover:text-ink hover:bg-warning" data-testid="mobile-logout-btn">Log out</Button>
      </header>

      <main className="lg:ml-64 min-h-screen">
        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-ink text-white z-40 grid grid-cols-5 border-t border-white/10">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 text-[10px] gap-1 ${isActive ? "text-warning" : "text-white/60"}`
              }
            >
              <item.icon size={20} weight="bold" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
