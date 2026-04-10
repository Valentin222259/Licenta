import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Building2, ConciergeBell } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/lib/hooks";
import { apiPost } from "@/lib/api";
import heroImage from "@/assets/hero-mountains.jpg";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type PaymentMethod = "card" | "bank_transfer" | "reception";

const Booking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomSlug = searchParams.get("room");

  const { rooms, loading: roomsLoading } = useRooms();
  const room = rooms.find((r) => r.slug === roomSlug) || rooms[0];

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

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

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const isFormValid =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone !== "" &&
    form.phone !== undefined &&
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

      // Creăm rezervarea trimițând și metoda de plată
      const booking = await apiPost<{
        data: { id: string; booking_ref: string };
        payment_method: string;
      }>("/api/bookings", {
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
        payment_method: paymentMethod,
      });

      // Flux diferit în funcție de metoda de plată
      if (paymentMethod === "card") {
        // Flux Stripe — generăm sesiunea de checkout
        const { checkout_url } = await apiPost<{ checkout_url: string }>(
          "/api/payments/create-checkout",
          { booking_id: booking.data.id },
        );
        window.location.href = checkout_url;
      } else {
        // Flux transfer bancar — redirectăm la o pagină de confirmare specială
        navigate(
          `/booking/success?method=bank_transfer&ref=${booking.data.booking_ref}&booking_id=${booking.data.id}`,
        );
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

            {/* Telefon cu prefix */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("booking.phone")}
              </label>
              <PhoneInput
                international
                defaultCountry="RO"
                value={form.phone}
                onChange={(value) => update("phone", value || "")}
                className="phone-input-wrapper"
              />
            </div>

            {/* Date check-in / check-out */}
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
                  className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring ${dateErrors.checkIn ? "border-destructive" : "border-border"}`}
                />
                {form.checkIn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(form.checkIn)}
                  </p>
                )}
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
                  className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring ${dateErrors.checkOut ? "border-destructive" : "border-border"}`}
                />
                {form.checkOut && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(form.checkOut)}
                  </p>
                )}
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

            {/* ── Metodă de plată ───────────────────────────────────────── */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                Metodă de plată
              </label>
              <div className="grid grid-cols-1 gap-3">
                {/* Card online */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold">
                        Plată online cu cardul
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Plată securizată prin Stripe. Rezervarea se confirmă
                      automat după plată.
                    </p>
                  </div>
                </label>

                {/* Transfer bancar */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => setPaymentMethod("bank_transfer")}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold">
                        Transfer bancar
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Veți primi un email cu datele contului bancar. Rezervarea
                      se confirmă după primirea plății.
                    </p>
                  </div>
                </label>

                {/* Plată la recepție */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "reception"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="reception"
                    checked={paymentMethod === "reception"}
                    onChange={() => setPaymentMethod("reception")}
                    className="mt-0.5 accent-primary shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ConciergeBell
                        size={16}
                        className="text-primary shrink-0"
                      />
                      <span className="text-sm font-semibold">
                        Plată la recepție (card sau cash)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Plătiți la sosire. Rezervarea intră în așteptare până la
                      confirmarea de către echipa noastră.
                    </p>
                  </div>
                </label>
              </div>

              {/* Note informative per metodă */}
              {paymentMethod === "bank_transfer" && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <span className="text-amber-500 text-base shrink-0">ℹ️</span>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Rezervarea rămâne <strong>„În așteptare"</strong> până la
                    confirmarea plății. Vă vom trimite datele de cont bancar pe
                    email imediat după rezervare.
                  </p>
                </div>
              )}
              {paymentMethod === "reception" && (
                <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <span className="text-blue-500 text-base shrink-0">ℹ️</span>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Rezervarea rămâne <strong>„În așteptare"</strong> până la
                    confirmarea de către echipa noastră. Plata se efectuează la
                    sosire, cu cardul sau cash.
                  </p>
                </div>
              )}
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
              {form.checkIn &&
                form.checkOut &&
                !dateErrors.checkIn &&
                !dateErrors.checkOut && (
                  <div className="text-xs text-muted-foreground mb-3 space-y-1">
                    <p>
                      📅 Check-in:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(form.checkIn)}
                      </span>
                    </p>
                    <p>
                      📅 Check-out:{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(form.checkOut)}
                      </span>
                    </p>
                  </div>
                )}
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

              {/* Metodă selectată */}
              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                {paymentMethod === "card" && (
                  <>
                    <CreditCard size={13} className="text-primary" />
                    <span>Plată online cu cardul (Stripe)</span>
                  </>
                )}
                {paymentMethod === "bank_transfer" && (
                  <>
                    <Building2 size={13} className="text-primary" />
                    <span>Transfer bancar</span>
                  </>
                )}
                {paymentMethod === "reception" && (
                  <>
                    <ConciergeBell size={13} className="text-primary" />
                    <span>Plată la recepție</span>
                  </>
                )}
              </div>

              <Button
                variant="hero"
                type="submit"
                className="w-full tracking-wide text-sm"
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Se
                    procesează...
                  </span>
                ) : paymentMethod === "card" ? (
                  t("booking.payNow")
                ) : (
                  "Rezervă Acum"
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
