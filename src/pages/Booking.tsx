// src/pages/Booking.tsx — versiune actualizată cu extras (mic dejun, cină, paturi, ciubăr)
// ÎNLOCUIEȘTE complet fișierul existent src/pages/Booking.tsx

import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CreditCard,
  Building2,
  Receipt,
  Coffee,
  UtensilsCrossed,
  BedDouble,
  Waves,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/lib/hooks";
import { useSettings } from "@/lib/useSettings";
import { apiPost } from "@/lib/api";
import heroImage from "@/assets/hero-mountains.jpg";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type PaymentMethod = "card" | "bank_transfer" | "reception";
type PaymentSplit = "full" | "advance";

interface Extras {
  breakfast: boolean;
  dinner: boolean;
  extra_beds: 0 | 1 | 2;
  jacuzzi: boolean;
}

const ADVANCE_PERCENT = 0.3;

const Booking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomSlug = searchParams.get("room");

  const { rooms, loading: roomsLoading } = useRooms();
  const { settings, loading: settingsLoading } = useSettings();
  const room = rooms.find((r) => r.slug === roomSlug) || rooms[0];

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>("full");

  // ── Extras ────────────────────────────────────────────────────────────────
  const [extras, setExtras] = useState<Extras>({
    breakfast: false,
    dinner: false,
    extra_beds: 0,
    jacuzzi: false,
  });

  const toggleExtra = (key: keyof Extras, value?: number) => {
    setExtras((prev) => {
      if (key === "extra_beds") {
        return { ...prev, extra_beds: (value as 0 | 1 | 2) ?? 0 };
      }
      return {
        ...prev,
        [key]: !prev[key as "breakfast" | "dinner" | "jacuzzi"],
      };
    });
  };

  // ── B2B ──────────────────────────────────────────────────────────────────
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
    guests: 2,
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

  // ── Calcul preț ──────────────────────────────────────────────────────────
  const roomPrice = room ? room.price * nights : 0;

  const extrasPrice = useMemo(() => {
    let total = 0;
    if (extras.breakfast)
      total += settings.price_breakfast * form.guests * nights;
    if (extras.dinner) total += settings.price_dinner * form.guests * nights;
    if (extras.extra_beds > 0)
      total += settings.price_extra_bed * extras.extra_beds * nights;
    if (extras.jacuzzi) total += settings.price_jacuzzi;
    return total;
  }, [extras, form.guests, nights, settings]);

  const totalPrice = roomPrice + extrasPrice;
  const advanceAmount = Math.round(totalPrice * ADVANCE_PERCENT);
  const remainingAmount = totalPrice - advanceAmount;
  const stripeAmount = paymentSplit === "advance" ? advanceAmount : totalPrice;
  const receptionAmount = paymentSplit === "advance" ? remainingAmount : 0;

  const maxGuests = 2 + extras.extra_beds;

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
        needs_invoice: needsInvoice,
        company_name: needsInvoice ? company.name : undefined,
        company_cui: needsInvoice ? company.cui : undefined,
        company_reg_no: needsInvoice ? company.regNo : undefined,
        company_address: needsInvoice ? company.address : undefined,
        // ── EXTRAS ───────────────────────────────────────────────────────
        extras: {
          breakfast: extras.breakfast,
          dinner: extras.dinner,
          extra_beds: extras.extra_beds,
          jacuzzi: extras.jacuzzi,
        },
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

  if (roomsLoading || settingsLoading) {
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
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "persoană" : "persoane"}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Fiecare cameră are 2 locuri standard. Puteți adăuga paturi
                suplimentare mai jos.
              </p>
            </div>

            {/* ── SECȚIUNEA EXTRAS ── */}
            <div>
              <h2 className="font-heading text-xl mb-3">
                Opțiuni suplimentare
              </h2>

              <div className="space-y-3">
                {/* Mic dejun */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    extras.breakfast
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={extras.breakfast}
                    onChange={() => toggleExtra("breakfast")}
                    className="accent-primary mt-0.5 shrink-0 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Coffee size={15} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold">
                        Mic dejun inclus
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_breakfast} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          /persoană/noapte
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mic dejun tradițional românesc servit în pensiune.
                    </p>
                    {extras.breakfast && nights > 0 && (
                      <p className="text-xs text-primary mt-1 font-medium">
                        = {settings.price_breakfast * form.guests * nights} RON
                        ({form.guests} pers × {nights} nopți)
                      </p>
                    )}
                  </div>
                </label>

                {/* Cină */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    extras.dinner
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={extras.dinner}
                    onChange={() => toggleExtra("dinner")}
                    className="accent-primary mt-0.5 shrink-0 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed
                        size={15}
                        className="text-primary shrink-0"
                      />
                      <span className="text-sm font-semibold">
                        Cină inclusă
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_dinner} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          /persoană/noapte
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Masă de seară cu preparate tradiționale maramureșene.
                    </p>
                    {extras.dinner && nights > 0 && (
                      <p className="text-xs text-primary mt-1 font-medium">
                        = {settings.price_dinner * form.guests * nights} RON (
                        {form.guests} pers × {nights} nopți)
                      </p>
                    )}
                  </div>
                </label>

                {/* Paturi suplimentare */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    extras.extra_beds > 0
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <BedDouble size={15} className="text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        Paturi suplimentare
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_extra_bed} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          /loc/noapte
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      Fiecare cameră are 2 locuri standard. Puteți adăuga maxim
                      2 paturi suplimentare.
                    </p>
                    <div className="flex gap-2">
                      {([0, 1, 2] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleExtra("extra_beds", n)}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                            extras.extra_beds === n
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {n === 0 ? "Fără" : n === 1 ? "+1 loc" : "+2 locuri"}
                        </button>
                      ))}
                    </div>
                    {extras.extra_beds > 0 && nights > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        ={" "}
                        {settings.price_extra_bed * extras.extra_beds * nights}{" "}
                        RON ({extras.extra_beds} loc × {nights} nopți)
                      </p>
                    )}
                  </div>
                </div>

                {/* Ciubăr / Jacuzzi */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    extras.jacuzzi
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={extras.jacuzzi}
                    onChange={() => toggleExtra("jacuzzi")}
                    className="accent-primary mt-0.5 shrink-0 w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Waves size={15} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold">
                        Ciubăr / Jacuzzi
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_jacuzzi} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          /sesiune
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O sesiune relaxantă în ciubărul cu apă termală sub cerul
                      liber. Programul se confirmă la check-in.
                    </p>
                  </div>
                </label>
              </div>
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

            {/* Metodă de plată */}
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
                              Avans 30%
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
                      Plată integrală · datele contului pe email
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* B2B */}
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
                {/* Preț cameră */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {room.price} RON × {nights}{" "}
                    {nights > 1 ? t("booking.nights") : t("booking.night")}
                  </span>
                  <span>{roomPrice} RON</span>
                </div>

                {/* Extras breakdown */}
                {extras.breakfast && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      ☕ Mic dejun × {form.guests} pers × {nights} nopți
                    </span>
                    <span>
                      {settings.price_breakfast * form.guests * nights} RON
                    </span>
                  </div>
                )}
                {extras.dinner && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      🍽️ Cină × {form.guests} pers × {nights} nopți
                    </span>
                    <span>
                      {settings.price_dinner * form.guests * nights} RON
                    </span>
                  </div>
                )}
                {extras.extra_beds > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      🛏️ +{extras.extra_beds} pat(uri) × {nights} nopți
                    </span>
                    <span>
                      {settings.price_extra_bed * extras.extra_beds * nights}{" "}
                      RON
                    </span>
                  </div>
                )}
                {extras.jacuzzi && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>🌊 Ciubăr (1 sesiune)</span>
                    <span>{settings.price_jacuzzi} RON</span>
                  </div>
                )}

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

              <Button
                variant="hero"
                type="submit"
                className="w-full text-xs tracking-wide"
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
