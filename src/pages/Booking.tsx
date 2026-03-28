import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/lib/hooks";
import { apiPost } from "@/lib/api";
import heroImage from "@/assets/hero-mountains.jpg";

const Booking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomSlug = searchParams.get("room");

  const { rooms, loading: roomsLoading } = useRooms();
  const room = rooms.find((r) => r.slug === roomSlug) || rooms[0];

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: sessionStorage.getItem("clientName") || "",
    email: sessionStorage.getItem("userEmail") || "",
    phone: "",
    checkIn: "",
    checkOut: "",
    guests: 1,
    requests: "",
  });

  const update = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const today = new Date().toISOString().split("T")[0];

  const dateErrors = useMemo(() => {
    const errors: { checkIn?: string; checkOut?: string } = {};
    if (form.checkIn && form.checkIn < today)
      errors.checkIn = t("booking.checkInPast");
    if (form.checkIn && form.checkOut && form.checkOut <= form.checkIn)
      errors.checkOut = t("booking.checkOutBeforeIn");
    return errors;
  }, [form.checkIn, form.checkOut, today, t]);

  const nights =
    form.checkIn && form.checkOut && !dateErrors.checkIn && !dateErrors.checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(form.checkOut).getTime() -
              new Date(form.checkIn).getTime()) /
              86400000,
          ),
        )
      : 1;

  const isFormValid =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.checkIn !== "" &&
    form.checkOut !== "" &&
    !dateErrors.checkIn &&
    !dateErrors.checkOut;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !room) return;
    setSubmitting(true);

    try {
      const userId = sessionStorage.getItem("userId") || undefined;

      await apiPost("/api/bookings", {
        room_id: room.id,
        user_id: userId,
        guest_name: form.name,
        guest_email: form.email,
        guest_phone: form.phone,
        check_in: form.checkIn,
        check_out: form.checkOut,
        guests: form.guests,
        special_requests: form.requests || undefined,
        source: "website",
      });

      toast({
        title: t("booking.submitted"),
        description: t("booking.submittedDesc"),
      });

      // Dacă e logat, îl trimitem la cont să vadă rezervarea
      if (sessionStorage.getItem("isClient")) {
        navigate("/account");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast({
        title: "Eroare",
        description:
          err instanceof Error ? err.message : "Nu s-a putut salva rezervarea",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (roomsLoading) {
    return (
      <div className="pt-24 pb-20 flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="font-heading text-4xl text-center mb-12">
          {t("booking.title")}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-5">
            <h2 className="font-heading text-xl mb-2">
              {t("booking.guestInfo")}
            </h2>

            {/* Nume */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("booking.fullName")}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ion Popescu"
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("booking.email")}
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("booking.phone")}
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+40 7xx xxx xxx"
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t("booking.checkIn")}
                </label>
                <input
                  type="date"
                  required
                  min={today}
                  value={form.checkIn}
                  onChange={(e) => update("checkIn", e.target.value)}
                  className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring ${
                    dateErrors.checkIn ? "border-destructive" : "border-border"
                  }`}
                />
                {dateErrors.checkIn && (
                  <p className="text-xs text-destructive mt-1">
                    {dateErrors.checkIn}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t("booking.checkOut")}
                </label>
                <input
                  type="date"
                  required
                  min={form.checkIn || today}
                  value={form.checkOut}
                  onChange={(e) => update("checkOut", e.target.value)}
                  className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring ${
                    dateErrors.checkOut ? "border-destructive" : "border-border"
                  }`}
                />
                {dateErrors.checkOut && (
                  <p className="text-xs text-destructive mt-1">
                    {dateErrors.checkOut}
                  </p>
                )}
              </div>
            </div>

            {/* Număr oaspeți */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                Număr oaspeți
              </label>
              <select
                value={form.guests}
                onChange={(e) => update("guests", Number(e.target.value))}
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                {Array.from(
                  { length: room?.capacity || 2 },
                  (_, i) => i + 1,
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persoană" : "persoane"}
                  </option>
                ))}
              </select>
            </div>

            {/* Cereri speciale */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("booking.specialRequests")}
              </label>
              <textarea
                value={form.requests}
                onChange={(e) => update("requests", e.target.value)}
                placeholder={t("booking.specialRequestsPlaceholder")}
                rows={3}
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Sidebar sumar */}
          {room && (
            <div className="bg-card border border-border rounded-lg p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-heading text-lg mb-4">
                {t("booking.orderSummary")}
              </h2>
              <img
                src={room.primary_image || heroImage}
                alt={room.name}
                className="w-full h-32 object-cover rounded mb-4"
              />
              <p className="font-heading text-base mb-1">{room.name}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {nights} {nights > 1 ? t("booking.nights") : t("booking.night")}
              </p>
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {room.price} RON × {nights}{" "}
                    {nights > 1 ? t("booking.nights") : t("booking.night")}
                  </span>
                  <span>{room.price * nights} RON</span>
                </div>
                <div className="flex justify-between font-heading text-lg mt-3 pt-3 border-t border-border">
                  <span>{t("booking.total")}</span>
                  <span className="text-accent">{room.price * nights} RON</span>
                </div>
              </div>
              <Button
                variant="hero"
                type="submit"
                className="w-full"
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Se procesează...
                  </span>
                ) : (
                  t("booking.payNow")
                )}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Booking;
