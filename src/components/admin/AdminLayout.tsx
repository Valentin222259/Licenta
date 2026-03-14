import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  ImageIcon,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, labelKey: "admin.dashboard" },
  { to: "/admin/bookings", icon: CalendarCheck, labelKey: "admin.bookings" },
  { to: "/admin/rooms", icon: BedDouble, labelKey: "admin.rooms" },
  { to: "/admin/images", icon: ImageIcon, labelKey: "admin.images" },
  { to: "/admin/analytics", icon: BarChart3, labelKey: "admin.analytics" },
  { to: "/admin/settings", icon: Settings, labelKey: "admin.settings" },
];

const AdminLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const handleLogout = () => {
    sessionStorage.removeItem("isAdmin");
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="font-heading text-lg text-sidebar-foreground tracking-wide truncate">
            MB Admin
          </span>
        )}
        {collapsed && (
          <span className="font-heading text-lg text-sidebar-foreground mx-auto">
            MB
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              isActive(item.to)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <item.icon size={18} />
            {!collapsed && <span>{t(item.labelKey)}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={18} />
          {!collapsed && <span>{t("admin.logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-60 bg-sidebar z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <button
            className="lg:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <button
            className="hidden lg:flex items-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              size={18}
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
          <h2 className="font-heading text-lg">
            {navItems.find((n) => isActive(n.to))
              ? t(navItems.find((n) => isActive(n.to))!.labelKey)
              : "Admin"}
          </h2>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
