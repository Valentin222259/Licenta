import { useState } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import ChatBot from "@/components/ChatBot";
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
import { Star } from "lucide-react";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Panou de Control" },
  { to: "/admin/bookings", icon: CalendarCheck, label: "Rezervări" },
  { to: "/admin/rooms", icon: BedDouble, label: "Camere" },
  { to: "/admin/images", icon: ImageIcon, label: "Imagini" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analitice" },
  { to: "/admin/settings", icon: Settings, label: "Setări" },
  { to: "/admin/reviews", icon: Star, label: "Recenzii" },
];

const AdminLayout = () => {
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

      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
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
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-foreground/60" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Deconectare" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-white/8 hover:text-sidebar-foreground transition-all ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={17} />
          {!collapsed && <span>Deconectare</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0 ${collapsed ? "w-16" : "w-56"}`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar mobil */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Închide meniu"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMobileOpen(false);
            }}
          />
          <aside className="relative w-56 bg-sidebar z-50 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Conținut principal */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0 sticky top-0 z-30">
          <button
            type="button"
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Deschide meniu"
          >
            <Menu size={20} />
          </button>

          <button
            type="button"
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Extinde meniu" : "Restrânge meniu"}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>

          <div className="hidden lg:block w-px h-5 bg-border" />

          <div className="flex items-center gap-2">
            {currentPage && (
              <currentPage.icon size={16} className="text-muted-foreground" />
            )}
            <h2 className="font-heading text-base font-semibold text-foreground">
              {currentPage?.label ?? "Admin"}
            </h2>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-xs">A</span>
            </div>
            <span>Administrator</span>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </div>
  );
};

export default AdminLayout;
