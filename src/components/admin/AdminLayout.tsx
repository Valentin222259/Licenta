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
  Mountain,
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
    navigate("/admin/login");
  };

  const currentPage = navItems.find((n) => isActive(n.to));

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`h-16 flex items-center border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center px-3" : "px-5 gap-3"}`}
      >
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Mountain size={16} className="text-sidebar-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-heading text-sm text-sidebar-foreground font-semibold leading-tight truncate">
              MB Admin
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              Belvedere
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? t(item.labelKey) : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                active
                  ? "bg-white/15 text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:bg-white/8 hover:text-sidebar-foreground"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon
                size={17}
                className={
                  active
                    ? "text-sidebar-foreground"
                    : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                }
              />
              {!collapsed && (
                <span className="truncate">{t(item.labelKey)}</span>
              )}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-foreground/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={handleLogout}
          title={collapsed ? t("admin.logout") : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-white/8 hover:text-sidebar-foreground transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={17} />
          {!collapsed && <span>{t("admin.logout")}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar mobil */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-56 bg-sidebar z-50 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Conținut principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 sticky top-0 z-30">
          {/* Hamburger mobil */}
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Collapse desktop */}
          <button
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Extinde sidebar" : "Restrânge sidebar"}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>

          {/* Separator */}
          <div className="hidden lg:block w-px h-5 bg-border" />

          {/* Titlu pagină */}
          <div className="flex items-center gap-2">
            {currentPage && (
              <currentPage.icon size={16} className="text-muted-foreground" />
            )}
            <h2 className="font-heading text-base font-semibold text-foreground">
              {currentPage ? t(currentPage.labelKey) : "Admin"}
            </h2>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Info user */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs">A</span>
            </div>
            <span>Administrator</span>
          </div>
        </header>

        {/* Pagina curentă */}
        <main className="flex-1 p-5 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
