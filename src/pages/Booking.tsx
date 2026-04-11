import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Building2, Receipt } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/lib/hooks";
import { apiPost } from "@/lib/api";
import heroImage from "@/assets/hero-mountains.jpg";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type PaymentMethod = "card" | "bank_transfer" | "reception";
type PaymentSplit = "full" | "advance";

const ADVANCE_PERCENT = 0.3;

const Booking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomSlug = searchParams.get("room");

  const { rooms, loading: roomsLoading } = useRooms();
  const room = rooms.find((r) => r.slug === roomSlug) || rooms[0];

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>("full");

  // ── B2B / Factură pe firmă ───────────────────────────────────────────
  const [needsInvoice, setNeedsInvoice] = useState(false);
  const [company, setCompany] = useState({
    name: "",
    cui: "",
    regNo: "",
    address: "",
  });
  const updateCompany = (field: string, value: string) =>
    setCompany((c) => ({ ...c, [field]: value }));

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

  const totalPrice = room ? room.price * nights : 0;
  const advanceAmount = Math.round(totalPrice * ADVANCE_PERCENT);
  const remainingAmount = totalPrice - advanceAmount;
  const stripeAmount = paymentSplit === "advance" ? advanceAmount : totalPrice;
  const receptionAmount = paymentSplit === "advance" ? remainingAmount : 0;

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const b2bValid =
    !needsInvoice ||
    (company.name.trim() !== "" &&
      company.cui.trim() !== "" &&
      company.regNo.trim() !== "" &&
      company.address.trim() !== "");

  const isFormValid =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.phone !== "" &&
    form.phone !== undefined &&
    form.checkIn !== "" &&
    form.checkOut !== "" &&
    !dateErrors.checkIn &&
    !dateErrors.checkOut &&
    b2bValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !room) return;
    setSubmitting(true);

    try {
      const userId = sessionStorage.getItem("userId") || undefined;

      const booking = await apiPost<{
        data: { id: string; booking_ref: string };
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
        payment_split: paymentMethod === "card" ? paymentSplit : "full",
        stripe_amount: paymentMethod === "card" ? stripeAmount : 0,
        remaining_amount:
          paymentMethod === "card" ? receptionAmount : totalPrice,
        // ── B2B ─────────────────────────────────────────────────────
        needs_invoice: needsInvoice,
        company_name: needsInvoice ? company.name : undefined,
        company_cui: needsInvoice ? company.cui : undefined,
        company_reg_no: needsInvoice ? company.regNo : undefined,
        company_address: needsInvoice ? company.address : undefined,
      });

      if (paymentMethod === "card") {
        const { checkout_url } = await apiPost<{ checkout_url: string }>(
          "/api/payments/create-checkout",
          { booking_id: booking.data.id },
        );
        window.location.href = checkout_url;
      } else {
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

            {/* Telefon */}
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

            {/* Oaspeți */}
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

            {/* ── Metodă de plată ── */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                Metodă de plată
              </label>
              <div className="grid grid-cols-1 gap-2">
                {/* Card online */}
                <div
                  className={`rounded-xl border-2 overflow-hidden transition-all ${paymentMethod === "card" ? "border-primary" : "border-border"}`}
                >
                  <label className="flex items-center gap-3 px-4 py-3.5 cursor-pointer bg-card">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="accent-primary shrink-0"
                    />
                    <CreditCard size={15} className="text-primary shrink-0" />
                    <span className="text-sm font-semibold">
                      Plată online cu cardul
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
                      Stripe · securizat 🔒
                    </span>
                  </label>

                  {paymentMethod === "card" && (
                    <div className="px-4 pb-4 pt-3 bg-muted/20 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`flex flex-col gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentSplit === "full" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="paymentSplit"
                              value="full"
                              checked={paymentSplit === "full"}
                              onChange={() => setPaymentSplit("full")}
                              className="accent-primary shrink-0"
                            />
                            <span className="text-xs font-semibold">
                              Integral acum
                            </span>
                          </div>
                          {totalPrice > 0 && (
                            <div className="pl-5">
                              <span className="text-sm font-bold text-foreground">
                                {totalPrice} RON
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                fără restanță
                              </span>
                            </div>
                          )}
                        </label>

                        <label
                          className={`flex flex-col gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentSplit === "advance" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="paymentSplit"
                              value="advance"
                              checked={paymentSplit === "advance"}
                              onChange={() => setPaymentSplit("advance")}
                              className="accent-primary shrink-0"
                            />
                            <span className="text-xs font-semibold">
                              Avans 30% acum
                            </span>
                          </div>
                          {totalPrice > 0 && (
                            <div className="pl-5">
                              <span className="text-sm font-bold text-primary">
                                {advanceAmount} RON
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                + {remainingAmount} RON la check-in
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transfer bancar */}
                <label
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40"}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank_transfer"
                    checked={paymentMethod === "bank_transfer"}
                    onChange={() => {
                      setPaymentMethod("bank_transfer");
                      setPaymentSplit("full");
                    }}
                    className="accent-primary shrink-0"
                  />
                  <Building2 size={15} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-semibold block">
                      Transfer bancar
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Plată integrală · datele contului pe email · confirmare
                      după primirea plății
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Secțiunea B2B / Factură pe firmă ── */}
            <div className="pt-1">
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${needsInvoice ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/30"}`}
              >
                <input
                  type="checkbox"
                  checked={needsInvoice}
                  onChange={(e) => setNeedsInvoice(e.target.checked)}
                  className="accent-primary mt-0.5 shrink-0 w-4 h-4"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt size={15} className="text-primary shrink-0" />
                    <span className="text-sm font-semibold">
                      Doresc factură pe firmă / persoană juridică
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completează datele firmei pentru emiterea facturii fiscale.
                  </p>
                </div>
              </label>

              {needsInvoice && (
                <div className="mt-3 space-y-3 px-1">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Denumire firmă <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required={needsInvoice}
                      value={company.name}
                      onChange={(e) => updateCompany("name", e.target.value)}
                      placeholder="SC Exemplu SRL"
                      className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                        CUI / CIF <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required={needsInvoice}
                        value={company.cui}
                        onChange={(e) => updateCompany("cui", e.target.value)}
                        placeholder="RO12345678"
                        className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                        Nr. Reg. Comerțului{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        required={needsInvoice}
                        value={company.regNo}
                        onChange={(e) => updateCompany("regNo", e.target.value)}
                        placeholder="J40/1234/2020"
                        className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      Adresa sediului social{" "}
                      <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required={needsInvoice}
                      value={company.address}
                      onChange={(e) => updateCompany("address", e.target.value)}
                      placeholder="Str. Exemplu nr. 1, București, Sector 1"
                      className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    💡 Factura va fi emisă manual de echipa noastră și trimisă
                    pe email în termen de 24h de la check-in.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar sumar ── */}
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

              <div className="border-t border-border pt-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {room.price} RON × {nights}{" "}
                    {nights > 1 ? t("booking.nights") : t("booking.night")}
                  </span>
                  <span>{totalPrice} RON</span>
                </div>
                <div className="flex justify-between font-heading text-lg pt-2 border-t border-border">
                  <span>{t("booking.total")}</span>
                  <span className="text-accent">{totalPrice} RON</span>
                </div>

                {paymentMethod === "card" &&
                  paymentSplit === "advance" &&
                  totalPrice > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-border space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Acum online
                        </span>
                        <span className="font-semibold text-primary">
                          {advanceAmount} RON
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          La check-in
                        </span>
                        <span className="font-semibold">
                          {remainingAmount} RON
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {paymentMethod === "card" && totalPrice > 0 && (
                <div className="mb-4 bg-primary/8 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {paymentSplit === "advance"
                      ? "Plătești acum"
                      : "Total online"}
                  </span>
                  <span className="font-heading text-lg font-bold text-primary">
                    {stripeAmount} RON
                  </span>
                </div>
              )}

              {needsInvoice && company.name && (
                <div className="mb-4 flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Receipt size={13} className="text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    Factură ·{" "}
                    <span className="font-medium text-foreground">
                      {company.name}
                    </span>
                  </span>
                </div>
              )}

              <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                {paymentMethod === "card" ? (
                  <CreditCard size={13} className="text-primary shrink-0" />
                ) : (
                  <Building2 size={13} className="text-primary shrink-0" />
                )}
                <span>
                  {paymentMethod === "card" &&
                    paymentSplit === "advance" &&
                    `Avans 30% · ${remainingAmount} RON la check-in`}
                  {paymentMethod === "card" &&
                    paymentSplit === "full" &&
                    "Plată integrală online (Stripe)"}
                  {paymentMethod === "bank_transfer" &&
                    "Transfer bancar · integral"}
                </span>
              </div>

              <Button
                variant="hero"
                type="submit"
                className="w-full tracking-wide"
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Se
                    procesează...
                  </span>
                ) : paymentMethod === "card" ? (
                  paymentSplit === "advance" ? (
                    `Avans ${advanceAmount} RON · Rezervă`
                  ) : (
                    t("booking.payNow")
                  )
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
