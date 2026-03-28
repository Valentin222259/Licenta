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
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useMyBookings } from "@/lib/hooks";
import { apiGet } from "@/lib/api";
import type { ApiResponse, User as UserType } from "@/lib/types";

type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled";

const statusConfig: Record<
  BookingStatus,
  {
    label: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
    icon: any;
  }
> = {
  confirmed: {
    label: "Confirmat",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  pending: {
    label: "În așteptare",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  completed: {
    label: "Finalizat",
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    dot: "bg-slate-400",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Anulat",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
    icon: XCircle,
  },
};

type TabType = "bookings" | "profile";

const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("bookings");
  const [editMode, setEditMode] = useState(false);

  const userEmail = sessionStorage.getItem("userEmail");
  const { bookings, loading: bookingsLoading } = useMyBookings(userEmail);

  const [profile, setProfile] = useState({
    name: sessionStorage.getItem("clientName") || "",
    email: userEmail || "",
    phone: "",
  });
  const [profileDraft, setProfileDraft] = useState(profile);

  // Încarcă datele reale ale userului
  useEffect(() => {
    const isClient = sessionStorage.getItem("isClient") === "true";
    if (!isClient) {
      navigate("/login");
      return;
    }

    const token = sessionStorage.getItem("token");
    if (token) {
      apiGet<ApiResponse<UserType>>("/api/auth/me")
        .then((res) => {
          const u = res.user;
          const p = {
            name: u.name,
            email: u.email,
            phone: u.phone || "",
          };
          setProfile(p);
          setProfileDraft(p);
        })
        .catch(() => {});
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
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

  const today = new Date().toISOString().split("T")[0];
  const upcomingBookings = bookings.filter(
    (b) =>
      (b.status === "confirmed" || b.status === "pending") &&
      b.check_out >= today,
  );
  const pastBookings = bookings.filter(
    (b) =>
      b.status === "completed" ||
      b.status === "cancelled" ||
      b.check_out < today,
  );

  const BookingCard = ({ b, past = false }: { b: any; past?: boolean }) => {
    const cfg = statusConfig[b.status as BookingStatus] || statusConfig.pending;
    return (
      <div
        className={`bg-card border border-border rounded-xl overflow-hidden transition-all ${past ? "opacity-70 hover:opacity-100" : "hover:shadow-sm"}`}
      >
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-heading text-sm font-semibold text-foreground">
              {b.room_name}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`}
              />
              {cfg.label}
            </span>
          </div>
          <span
            className={`shrink-0 font-heading text-base font-bold ${past ? "text-muted-foreground" : "text-accent"}`}
          >
            {b.total_price} RON
          </span>
        </div>
        <div className="mx-5 h-px bg-border/60" />
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>
              <span className="font-medium">Check-in:</span>{" "}
              {b.check_in?.split("T")[0] || b.check_in}
            </span>
            <span className="text-border">|</span>
            <span>
              <span className="font-medium">Check-out:</span>{" "}
              {b.check_out?.split("T")[0] || b.check_out}
            </span>
            <span className="text-border">|</span>
            <span>
              {b.nights} {b.nights === 1 ? "noapte" : "nopți"}
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-muted-foreground/50 hidden sm:inline">
              #{b.booking_ref}
            </span>
          </div>
          {!past ? (
            <button
              onClick={() => handleCancelBooking(b.booking_ref)}
              className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              {t("account.cancel")}
            </button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 text-xs px-3"
              asChild
            >
              <Link to={`/booking?room=${b.room_slug}`}>
                {t("account.bookAgain")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 pt-24 pb-20">
      <div className="container mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl px-6 py-5 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-lg leading-tight">
                {t("account.hello")},{" "}
                <span className="text-primary font-semibold">
                  {profile.name}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("account.subtitle")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive shrink-0"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">{t("account.logout")}</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex bg-card border border-border rounded-xl p-1 mb-5 gap-1">
          {[
            {
              key: "bookings" as TabType,
              icon: CalendarCheck,
              label: t("account.myBookings"),
            },
            {
              key: "profile" as TabType,
              icon: Settings,
              label: t("account.myProfile"),
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>

        {/* TAB REZERVĂRI */}
        {tab === "bookings" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("account.upcomingBookings")}
                </h2>
                {upcomingBookings.length > 0 && (
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                    {upcomingBookings.length}
                  </span>
                )}
              </div>

              {bookingsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
                  <CalendarCheck
                    size={32}
                    className="mx-auto mb-3 text-muted-foreground/30"
                  />
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("account.noUpcoming")}
                  </p>
                  <Button variant="hero" size="sm" asChild>
                    <Link to="/rooms">{t("account.bookNow")}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map((b) => (
                    <BookingCard key={b.id} b={b} />
                  ))}
                </div>
              )}
            </div>

            {pastBookings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-muted-foreground/25 rounded-full" />
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {t("account.pastBookings")}
                  </h2>
                </div>
                <div className="space-y-2">
                  {pastBookings.map((b) => (
                    <BookingCard key={b.id} b={b} past />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB PROFIL */}
        {tab === "profile" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">
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
                  <Edit2 size={13} /> {t("account.edit")}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                  >
                    <Save size={13} /> {t("account.save")}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} /> {t("account.cancelEdit")}
                  </button>
                </div>
              )}
            </div>
            <div className="divide-y divide-border">
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
                <div
                  key={f.field}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <p className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </p>
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
                      className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  ) : (
                    <p className="flex-1 text-sm text-foreground">
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
            <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("account.dangerZone")}
              </p>
              <button
                onClick={handleLogout}
                className="text-sm text-destructive hover:underline flex items-center gap-1.5"
              >
                <LogOut size={13} /> {t("account.logout")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
