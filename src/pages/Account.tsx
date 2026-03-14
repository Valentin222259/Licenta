import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  CalendarCheck,
  Settings,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// Date mock — vor fi înlocuite cu API call real
const mockBookings = [
  {
    id: "RZ-2024-001",
    room: "Camera 2 — Balcon & Belvedere",
    checkIn: "2026-05-10",
    checkOut: "2026-05-13",
    nights: 3,
    total: 750,
    status: "confirmed" as const,
  },
  {
    id: "RZ-2024-002",
    room: "Camera 5 — Suite cu Cadă",
    checkIn: "2026-06-20",
    checkOut: "2026-06-22",
    nights: 2,
    total: 600,
    status: "pending" as const,
  },
  {
    id: "RZ-2023-018",
    room: "Camera 1 — Comfort",
    checkIn: "2025-12-26",
    checkOut: "2025-12-29",
    nights: 3,
    total: 750,
    status: "completed" as const,
  },
];

const statusConfig = {
  confirmed: {
    label: "Confirmat",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  pending: {
    label: "În așteptare",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  completed: {
    label: "Finalizat",
    color: "bg-muted text-muted-foreground",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Anulat",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

type TabType = "bookings" | "profile";

const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("bookings");
  const [editMode, setEditMode] = useState(false);
  const clientName = sessionStorage.getItem("clientName") || "Oaspete";

  const [profile, setProfile] = useState({
    name: clientName,
    email: "",
    phone: "",
  });
  const [profileDraft, setProfileDraft] = useState(profile);

  useEffect(() => {
    const isClient = sessionStorage.getItem("isClient") === "true";
    if (!isClient) navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("isClient");
    sessionStorage.removeItem("clientName");
    navigate("/");
    toast({ title: t("account.loggedOut") });
  };

  const handleSaveProfile = () => {
    setProfile(profileDraft);
    setEditMode(false);
    toast({ title: t("account.profileSaved") });
  };

  const handleCancelBooking = (id: string) => {
    toast({
      title: t("account.cancelRequest"),
      description: t("account.cancelRequestDesc", { id }),
    });
  };

  const upcomingBookings = mockBookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );
  const pastBookings = mockBookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled",
  );

  return (
    <div className="pt-24 pb-20 px-4 min-h-screen">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl">
                {t("account.hello")}, {profile.name}!
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("account.subtitle")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground"
          >
            <LogOut size={15} />
            {t("account.logout")}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-lg p-1 mb-8">
          <button
            onClick={() => setTab("bookings")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
              tab === "bookings"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarCheck size={15} />
            {t("account.myBookings")}
          </button>
          <button
            onClick={() => setTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${
              tab === "profile"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings size={15} />
            {t("account.myProfile")}
          </button>
        </div>

        {/* ── BOOKINGS TAB ── */}
        {tab === "bookings" && (
          <div className="space-y-8">
            {/* Rezervări viitoare */}
            <div>
              <h2 className="font-heading text-lg mb-4">
                {t("account.upcomingBookings")}
              </h2>
              {upcomingBookings.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
                  <CalendarCheck
                    size={32}
                    className="mx-auto mb-3 opacity-40"
                  />
                  <p className="text-sm">{t("account.noUpcoming")}</p>
                  <Button variant="hero" size="sm" className="mt-4" asChild>
                    <Link to="/rooms">{t("account.bookNow")}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((b) => {
                    const cfg = statusConfig[b.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={b.id}
                        className="bg-card border border-border rounded-lg p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-heading text-base">
                                {b.room}
                              </span>
                              <span
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                              >
                                <StatusIcon size={11} />
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {b.checkIn} → {b.checkOut} · {b.nights}{" "}
                              {b.nights === 1 ? "noapte" : "nopți"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              #{b.id}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-heading text-lg text-accent">
                              {b.total} RON
                            </p>
                            {b.status !== "completed" && (
                              <button
                                onClick={() => handleCancelBooking(b.id)}
                                className="text-xs text-destructive hover:underline mt-1"
                              >
                                {t("account.cancel")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rezervări trecute */}
            {pastBookings.length > 0 && (
              <div>
                <h2 className="font-heading text-lg mb-4 text-muted-foreground">
                  {t("account.pastBookings")}
                </h2>
                <div className="space-y-3">
                  {pastBookings.map((b) => {
                    const cfg = statusConfig[b.status];
                    return (
                      <div
                        key={b.id}
                        className="bg-card border border-border rounded-lg p-5 opacity-70"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-heading text-base">
                                {b.room}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                              >
                                {cfg.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {b.checkIn} → {b.checkOut} · {b.nights}{" "}
                              {b.nights === 1 ? "noapte" : "nopți"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              #{b.id}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-heading text-base text-muted-foreground">
                              {b.total} RON
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs"
                              asChild
                            >
                              <Link to="/booking">
                                {t("account.bookAgain")}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-lg">
                {t("account.personalData")}
              </h2>
              {!editMode ? (
                <button
                  onClick={() => {
                    setProfileDraft(profile);
                    setEditMode(true);
                  }}
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Edit2 size={14} />
                  {t("account.edit")}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Save size={14} />
                    {t("account.save")}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                    {t("account.cancelEdit")}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {[
                {
                  label: t("booking.fullName"),
                  field: "name" as const,
                  type: "text",
                  placeholder: "Ion Popescu",
                },
                {
                  label: t("loginPage.emailLabel"),
                  field: "email" as const,
                  type: "email",
                  placeholder: "you@example.com",
                },
                {
                  label: t("booking.phone"),
                  field: "phone" as const,
                  type: "tel",
                  placeholder: "+40 7xx xxx xxx",
                },
              ].map((f) => (
                <div key={f.field}>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    {f.label}
                  </label>
                  {editMode ? (
                    <input
                      type={f.type}
                      value={profileDraft[f.field]}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          [f.field]: e.target.value,
                        })
                      }
                      placeholder={f.placeholder}
                      className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  ) : (
                    <p className="text-sm text-foreground py-2.5 px-4 bg-muted/50 rounded-md border border-border/50">
                      {profile[f.field] || (
                        <span className="text-muted-foreground italic">
                          {t("account.notSet")}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                {t("account.dangerZone")}
              </p>
              <button
                onClick={handleLogout}
                className="text-sm text-destructive hover:underline flex items-center gap-1.5"
              >
                <LogOut size={14} />
                {t("account.logout")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
