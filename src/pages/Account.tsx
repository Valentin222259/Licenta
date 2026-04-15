import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  User,
  CalendarCheck,
  Settings,
  LogOut,
  Edit2,
  Save,
  X,
  Loader2,
  Lock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useMyBookings } from "@/lib/hooks";
import { apiGet, apiPatch } from "@/lib/api";

type TabType = "bookings" | "profile" | "security";

const Account = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>("bookings");
  const [editMode, setEditMode] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const userEmail = sessionStorage.getItem("userEmail");
  const { bookings, loading: bookingsLoading } = useMyBookings(userEmail);

  const [profile, setProfile] = useState({
    name: sessionStorage.getItem("clientName") || "",
    email: userEmail || "",
    phone: "",
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("isClient") !== "true") {
      navigate("/login");
      return;
    }
    const token = sessionStorage.getItem("token");
    if (token) {
      apiGet<any>("/api/auth/me")
        .then((res) => {
          const u = res.user;
          const p = { name: u.name, email: u.email, phone: u.phone || "" };
          setProfile(p);
          setProfileDraft(p);
        })
        .catch(() => {});
    }
  }, [navigate]);

  const today = new Date().toISOString().split("T")[0];
  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed",
  );
  const totalSpent = confirmedBookings.reduce((s, b) => s + b.total_price, 0);
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

  const statusConfig: Record<
    string,
    { label: string; bg: string; text: string; border: string; dot: string }
  > = {
    confirmed: {
      label: t("account.statusConfirmed"),
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    },
    pending: {
      label: t("account.statusPending"),
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
    },
    completed: {
      label: t("account.statusCompleted"),
      bg: "bg-slate-50",
      text: "text-slate-500",
      border: "border-slate-200",
      dot: "bg-slate-400",
    },
    cancelled: {
      label: t("account.statusCancelled"),
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      dot: "bg-red-500",
    },
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
    toast({ title: t("account.loggedOut") });
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      setProfile(profileDraft);
      sessionStorage.setItem("clientName", profileDraft.name);
      setEditMode(false);
      toast({ title: t("account.profileSaved") });
    } catch {
      toast({ title: t("account.profileError"), variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, bookingRef: string) => {
    if (confirmCancel !== bookingId) {
      setConfirmCancel(bookingId);
      return;
    }
    setCancellingId(bookingId);
    setConfirmCancel(null);
    try {
      await apiPatch(`/api/bookings/${bookingId}/status`, {
        status: "cancelled",
      });
      toast({
        title: t("account.bookingCancelled"),
        description: t("account.bookingCancelledDesc", { ref: bookingRef }),
      });
      window.location.reload();
    } catch {
      toast({
        title: t("account.cancelError"),
        description: t("account.cancelErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const passwordRules = [
    {
      label: t("loginPage.passwordRuleLength"),
      test: (p: string) => p.length >= 8,
    },
    {
      label: t("loginPage.passwordRuleUpper"),
      test: (p: string) => /[A-Z]/.test(p),
    },
    {
      label: t("loginPage.passwordRuleLower"),
      test: (p: string) => /[a-z]/.test(p),
    },
    {
      label: t("loginPage.passwordRuleDigit"),
      test: (p: string) => /\d/.test(p),
    },
  ];
  const passwordStrong = (p: string) => passwordRules.every((r) => r.test(p));

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/account`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: deletePassword }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      sessionStorage.clear();
      toast({ title: t("account.accountDeleted") });
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!pwForm.current) errs.current = t("account.currentPasswordRequired");
    if (!passwordStrong(pwForm.next))
      errs.next = t("account.passwordRequirements");
    if (pwForm.next !== pwForm.confirm)
      errs.confirm = t("loginPage.passwordMismatch");
    if (Object.keys(errs).length) {
      setPwErrors(errs);
      return;
    }
    setPwErrors({});
    setPwLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: pwForm.current,
            new_password: pwForm.next,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      toast({ title: t("account.passwordChanged") });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (
        msg.toLowerCase().includes("curent") ||
        msg.toLowerCase().includes("current")
      ) {
        setPwErrors({ current: t("account.currentPasswordWrong") });
      } else {
        toast({ title: msg, variant: "destructive" });
      }
    } finally {
      setPwLoading(false);
    }
  };

  const BookingCard = ({ b, past = false }: { b: any; past?: boolean }) => {
    const cfg = statusConfig[b.status] || statusConfig.pending;
    const isConfirming = confirmCancel === b.id;
    const isCancelling = cancellingId === b.id;

    return (
      <div
        className={`bg-card border border-border rounded-xl overflow-hidden transition-all ${past ? "opacity-75 hover:opacity-100" : "hover:shadow-sm"}`}
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
        <div className="px-5 py-3 space-y-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>
              <span className="font-medium">{t("booking.checkIn")}:</span>{" "}
              {b.check_in?.split("T")[0] || b.check_in}
            </span>
            <span className="text-border">|</span>
            <span>
              <span className="font-medium">{t("booking.checkOut")}:</span>{" "}
              {b.check_out?.split("T")[0] || b.check_out}
            </span>
            <span className="text-border">|</span>
            <span>
              {b.nights}{" "}
              {b.nights === 1
                ? t("account.nightSingular")
                : t("account.nightPlural")}
            </span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="text-muted-foreground/50 hidden sm:inline font-mono">
              #{b.booking_ref}
            </span>
          </div>
          {b.special_requests && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span className="font-medium">
                {t("account.specialRequests")}:
              </span>{" "}
              {b.special_requests}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <div />
            {!past ? (
              isConfirming ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle size={12} /> {t("account.cancelConfirm")}
                  </span>
                  <button
                    onClick={() => handleCancelBooking(b.id, b.booking_ref)}
                    disabled={isCancelling}
                    className="text-xs px-2.5 py-1 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors"
                  >
                    {isCancelling ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      t("account.cancelYes")
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("account.cancelNo")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleCancelBooking(b.id, b.booking_ref)}
                  disabled={isCancelling || b.status === "cancelled"}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                >
                  {t("account.cancel")}
                </button>
              )
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

        {/* Stats */}
        {!bookingsLoading && bookings.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              {
                icon: CalendarCheck,
                label: t("account.totalBookings"),
                value: bookings.length,
              },
              {
                icon: CheckCircle,
                label: t("account.confirmed"),
                value: confirmedBookings.length,
              },
              {
                icon: TrendingUp,
                label: t("account.totalSpent"),
                value: `${totalSpent} RON`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-card border border-border rounded-xl px-4 py-3.5 text-center"
              >
                <s.icon size={18} className="text-primary mx-auto mb-1.5" />
                <p className="font-heading text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

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
            {
              key: "security" as TabType,
              icon: Lock,
              label: t("account.security"),
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
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* TAB BOOKINGS */}
        {tab === "bookings" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-primary rounded-full" />
                <h2 className="text-sm font-semibold">
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

        {/* TAB PROFILE */}
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
                    disabled={profileSaving}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                  >
                    {profileSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Save size={13} />
                    )}
                    {t("account.save")}
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

        {/* TAB SECURITY */}
        {tab === "security" && (
          <div className="space-y-5">
            {/* Change password */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                <Lock size={16} className="text-primary" />
                <h2 className="text-sm font-semibold">
                  {t("account.changePassword")}
                </h2>
              </div>
              <form
                onSubmit={handleChangePassword}
                className="px-6 py-5 space-y-4"
              >
                {[
                  {
                    field: "current" as const,
                    label: t("account.currentPassword"),
                    placeholder: "••••••••",
                  },
                  {
                    field: "next" as const,
                    label: t("account.newPassword"),
                    placeholder: t("loginPage.passwordRuleLength"),
                  },
                  {
                    field: "confirm" as const,
                    label: t("account.confirmNewPassword"),
                    placeholder: "••••••••",
                  },
                ].map((f) => (
                  <div key={f.field}>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      {f.label}
                    </label>
                    <input
                      type="password"
                      value={pwForm[f.field]}
                      onChange={(e) =>
                        setPwForm({ ...pwForm, [f.field]: e.target.value })
                      }
                      placeholder={f.placeholder}
                      className={`w-full bg-muted border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${pwErrors[f.field] ? "border-destructive" : "border-border"}`}
                    />
                    {pwErrors[f.field] && (
                      <p className="text-xs text-destructive mt-1">
                        {pwErrors[f.field]}
                      </p>
                    )}
                    {f.field === "next" && pwForm.next.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {passwordRules.map((rule) => {
                          const ok = rule.test(pwForm.next);
                          return (
                            <div
                              key={rule.label}
                              className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-600" : "text-muted-foreground"}`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"}`}
                              >
                                {ok ? "✓" : "·"}
                              </span>
                              {rule.label}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  type="submit"
                  disabled={pwLoading}
                  className="w-full mt-2"
                >
                  {pwLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />{" "}
                      {t("account.changingPassword")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock size={14} /> {t("account.changePassword")}
                    </span>
                  )}
                </Button>
              </form>
              <div className="px-6 py-4 bg-muted/30 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  💡 {t("account.passwordHint")}
                </p>
              </div>
            </div>

            {/* Delete account */}
            <div className="bg-card border border-destructive/30 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-destructive/20 flex items-center gap-3">
                <AlertTriangle size={16} className="text-destructive" />
                <h2 className="text-sm font-semibold text-destructive">
                  {t("account.dangerZoneTitle")}
                </h2>
              </div>
              <div className="px-6 py-5">
                <p
                  className="text-sm text-muted-foreground mb-4"
                  dangerouslySetInnerHTML={{
                    __html: t("account.deleteAccountDesc"),
                  }}
                />
                {!deleteConfirm ? (
                  <Button
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    {t("account.deleteAccount")}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-destructive">
                      {t("account.deleteConfirmPrompt")}
                    </p>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder={t("loginPage.passwordLabel")}
                      className="w-full bg-muted border border-destructive/30 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-destructive/30"
                    />
                    {deleteError && (
                      <p className="text-xs text-destructive">{deleteError}</p>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteLoading || !deletePassword}
                        className="flex-1"
                      >
                        {deleteLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />{" "}
                            {t("account.deleting")}
                          </span>
                        ) : (
                          t("account.deleteConfirm")
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDeleteConfirm(false);
                          setDeletePassword("");
                          setDeleteError("");
                        }}
                      >
                        {t("account.cancelEdit")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
