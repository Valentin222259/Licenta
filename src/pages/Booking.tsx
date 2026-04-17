import { useState, useMemo, useEffect } from "react";
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
import { apiPost, apiGet } from "@/lib/api";
import heroImage from "@/assets/hero-mountains.jpg";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

type PaymentMethod = "card" | "bank_transfer" | "reception";
type PaymentSplit = "full" | "advance";

interface DayMenus {
  [date: string]: number;
}

interface Extras {
  breakfast: DayMenus;
  dinner: DayMenus;
  extra_beds: 0 | 1 | 2;
  jacuzzi_dates: string[];
}

const ADVANCE_PERCENT = 0.3;

const Booking = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomSlug = searchParams.get("room");

  const { rooms, loading: roomsLoading } = useRooms();
  const { settings, loading: settingsLoading } = useSettings();
  const room = rooms.find((r) => r.slug === roomSlug) || rooms[0];

  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>("full");

  const [extras, setExtras] = useState<Extras>({
    breakfast: {},
    dinner: {},
    extra_beds: 0,
    jacuzzi_dates: [],
  });
  const [jacuzziOccupied, setJacuzziOccupied] = useState<string[]>([]);
  const [jacuzziLoading, setJacuzziLoading] = useState(false);

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

  // ─── Fetch disponibilitate ciubăr când se schimbă intervalul ──────────────
  useEffect(() => {
    if (
      !form.checkIn ||
      !form.checkOut ||
      dateErrors.checkIn ||
      dateErrors.checkOut
    )
      return;
    setJacuzziLoading(true);
    apiGet<{ success: boolean; occupied: string[] }>(
      `/api/jacuzzi/availability?from=${form.checkIn}&to=${form.checkOut}`,
    )
      .then((res) => setJacuzziOccupied(res.occupied || []))
      .catch(() => setJacuzziOccupied([]))
      .finally(() => setJacuzziLoading(false));
    setExtras((prev) => ({ ...prev, jacuzzi_dates: [] }));
  }, [form.checkIn, form.checkOut, dateErrors.checkIn, dateErrors.checkOut]);

  // ─── Zile din intervalul rezervării ───────────────────────────────────────
  const bookingDays = useMemo(() => {
    if (
      !form.checkIn ||
      !form.checkOut ||
      dateErrors.checkIn ||
      dateErrors.checkOut
    )
      return [];
    const days: string[] = [];
    const current = new Date(form.checkIn);
    const end = new Date(form.checkOut);
    while (current <= end) {
      days.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [form.checkIn, form.checkOut, dateErrors.checkIn, dateErrors.checkOut]);

  // Mic dejun: nu în ziua check-in
  const breakfastDays = bookingDays.filter((d) => d !== form.checkIn);
  // Cină: nu în ziua check-out
  const dinnerDays = bookingDays.filter((d) => d !== form.checkOut);
  // Ciubăr: nu în ziua check-out
  const jacuzziDays = bookingDays.filter((d) => d !== form.checkOut);

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

  const roomPrice = room ? room.price * nights : 0;

  const totalBreakfastMenus = Object.values(extras.breakfast).reduce(
    (s, n) => s + n,
    0,
  );
  const totalDinnerMenus = Object.values(extras.dinner).reduce(
    (s, n) => s + n,
    0,
  );

  const extrasPrice = useMemo(() => {
    let total = 0;
    total += settings.price_breakfast * totalBreakfastMenus;
    total += settings.price_dinner * totalDinnerMenus;
    if (extras.extra_beds > 0)
      total += settings.price_extra_bed * extras.extra_beds * nights;
    total += settings.price_jacuzzi * extras.jacuzzi_dates.length;
    return total;
  }, [extras, nights, settings, totalBreakfastMenus, totalDinnerMenus]);

  const totalPrice = roomPrice + extrasPrice;
  const advanceAmount = Math.round(totalPrice * ADVANCE_PERCENT);
  const remainingAmount = totalPrice - advanceAmount;
  const stripeAmount = paymentSplit === "advance" ? advanceAmount : totalPrice;
  const receptionAmount = paymentSplit === "advance" ? remainingAmount : 0;

  const maxGuests = room
    ? Math.max(room.capacity, 2) + extras.extra_beds
    : 2 + extras.extra_beds;

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };

  const formatDateFull = (iso: string) => {
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
        extras: {
          breakfast: extras.breakfast,
          dinner: extras.dinner,
          extra_beds: extras.extra_beds,
          jacuzzi: extras.jacuzzi_dates.length,
          jacuzzi_dates: extras.jacuzzi_dates,
        },
        preferred_language: i18n.language?.startsWith("en") ? "en" : "ro",
      });

      // Rezervă sesiunile de ciubăr dacă există
      if (extras.jacuzzi_dates.length > 0) {
        await apiPost("/api/jacuzzi/reserve", {
          booking_id: booking.data.id,
          dates: extras.jacuzzi_dates,
        });
      }

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
        title: t("booking.error"),
        description:
          err instanceof Error ? err.message : t("booking.errorSave"),
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
          {/* ─── Coloana stângă ─────────────────────────────────────────── */}
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
                    {formatDateFull(form.checkIn)}
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
                    {formatDateFull(form.checkOut)}
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
                {t("booking.guestsLabel")}
              </label>
              <select
                value={form.guests}
                onChange={(e) => update("guests", Number(e.target.value))}
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? t("booking.person") : t("booking.persons")}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t("booking.guestsStandard")}
              </p>
            </div>

            {/* ─── EXTRAS ─────────────────────────────────────────────────── */}
            <div>
              <h2 className="font-heading text-xl mb-3">
                {t("booking.extras")}
              </h2>

              <div className="space-y-3">
                {/* ── Mic dejun ─────────────────────────────────────────── */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    totalBreakfastMenus > 0
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <Coffee size={15} className="text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {t("booking.breakfast")}
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_breakfast} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          {t("booking.breakfastUnit")}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("booking.breakfastDesc")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {t("booking.breakfastNote")}
                    </p>

                    {breakfastDays.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {breakfastDays.map((day) => {
                          const val = extras.breakfast[day] || 0;
                          return (
                            <div
                              key={day}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">
                                {formatDate(day)}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                      setExtras((prev) => ({
                                        ...prev,
                                        breakfast: {
                                          ...prev.breakfast,
                                          [day]: n,
                                        },
                                      }))
                                    }
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold border-2 transition-all ${
                                      val === n
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                    }`}
                                  >
                                    {n === 0 ? "—" : n}
                                  </button>
                                ))}
                              </div>
                              {val > 0 && (
                                <span className="text-xs text-primary font-medium">
                                  {val * settings.price_breakfast} RON
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {totalBreakfastMenus > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        Total: {totalBreakfastMenus}{" "}
                        {totalBreakfastMenus === 1
                          ? t("booking.menuLabel")
                          : t("booking.menusLabel")}{" "}
                        = {totalBreakfastMenus * settings.price_breakfast} RON
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Cină ──────────────────────────────────────────────── */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    totalDinnerMenus > 0
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <UtensilsCrossed
                    size={15}
                    className="text-primary shrink-0 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {t("booking.dinner")}
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_dinner} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          {t("booking.dinnerUnit")}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("booking.dinnerDesc")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {t("booking.dinnerNote")}
                    </p>

                    {dinnerDays.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {dinnerDays.map((day) => {
                          const val = extras.dinner[day] || 0;
                          return (
                            <div
                              key={day}
                              className="flex items-center gap-2 flex-wrap"
                            >
                              <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">
                                {formatDate(day)}
                              </span>
                              <div className="flex gap-1 flex-wrap">
                                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                      setExtras((prev) => ({
                                        ...prev,
                                        dinner: {
                                          ...prev.dinner,
                                          [day]: n,
                                        },
                                      }))
                                    }
                                    className={`w-8 h-8 rounded-lg text-xs font-semibold border-2 transition-all ${
                                      val === n
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                    }`}
                                  >
                                    {n === 0 ? "—" : n}
                                  </button>
                                ))}
                              </div>
                              {val > 0 && (
                                <span className="text-xs text-primary font-medium">
                                  {val * settings.price_dinner} RON
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {totalDinnerMenus > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        Total: {totalDinnerMenus}{" "}
                        {totalDinnerMenus === 1
                          ? t("booking.menuLabel")
                          : t("booking.menusLabel")}{" "}
                        = {totalDinnerMenus * settings.price_dinner} RON
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Paturi suplimentare ────────────────────────────────── */}
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
                        {t("booking.extraBeds")}
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_extra_bed} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          {t("booking.extraBedsUnit")}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                      {t("booking.extraBedsDesc")}
                    </p>
                    <div className="flex gap-2">
                      {([0, 1, 2] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setExtras((prev) => ({ ...prev, extra_beds: n }))
                          }
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                            extras.extra_beds === n
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {n === 0
                            ? t("booking.extraBedsNone")
                            : n === 1
                              ? t("booking.extraBeds1")
                              : t("booking.extraBeds2")}
                        </button>
                      ))}
                    </div>
                    {extras.extra_beds > 0 && nights > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        ={" "}
                        {settings.price_extra_bed * extras.extra_beds * nights}{" "}
                        RON ({extras.extra_beds} × {nights})
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Ciubăr / Jacuzzi ──────────────────────────────────── */}
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                    extras.jacuzzi_dates.length > 0
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <Waves size={15} className="text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {t("booking.jacuzzi")}
                      </span>
                      <span className="ml-auto text-sm font-bold text-primary">
                        {settings.price_jacuzzi} RON
                        <span className="text-xs text-muted-foreground font-normal">
                          {t("booking.jacuzziUnit")}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("booking.jacuzziDesc")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {t("booking.jacuzziCheckinNote")}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      {t("booking.jacuzziCheckoutNote")}
                    </p>

                    {jacuzziDays.length > 0 ? (
                      <div className="mt-3">
                        {jacuzziLoading ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 size={13} className="animate-spin" />
                            {i18n.language?.startsWith("en")
                              ? "Checking availability..."
                              : "Se verifică disponibilitatea..."}
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            {jacuzziDays.map((day) => {
                              const isOccupied = jacuzziOccupied.includes(day);
                              const isSelected =
                                extras.jacuzzi_dates.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  disabled={isOccupied}
                                  onClick={() => {
                                    if (isOccupied) return;
                                    setExtras((prev) => ({
                                      ...prev,
                                      jacuzzi_dates: isSelected
                                        ? prev.jacuzzi_dates.filter(
                                            (d) => d !== day,
                                          )
                                        : [...prev.jacuzzi_dates, day],
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                                    isOccupied
                                      ? "border-red-200 bg-red-50 text-red-400 cursor-not-allowed"
                                      : isSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                                  }`}
                                  title={
                                    isOccupied
                                      ? t("booking.jacuzziOccupied")
                                      : t("booking.jacuzziAvailable")
                                  }
                                >
                                  {formatDate(day)}
                                  {isOccupied && " ✗"}
                                  {isSelected && !isOccupied && " ✓"}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      (!form.checkIn || !form.checkOut) && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {t("booking.jacuzziSelectDates")}
                        </p>
                      )
                    )}

                    {extras.jacuzzi_dates.length > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        {extras.jacuzzi_dates.length}{" "}
                        {extras.jacuzzi_dates.length === 1
                          ? t("booking.jacuzziSession")
                          : t("booking.jacuzziSessions")}{" "}
                        = {extras.jacuzzi_dates.length * settings.price_jacuzzi}{" "}
                        RON
                      </p>
                    )}
                  </div>
                </div>
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

            {/* ─── Metodă de plată ─────────────────────────────────────── */}
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">
                {t("booking.paymentMethod")}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {/* Card */}
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
                      {t("booking.cardOnline")}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
                      {t("booking.cardSecure")}
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
                              {t("booking.payFull")}
                            </span>
                          </div>
                          {totalPrice > 0 && (
                            <div className="pl-5">
                              <span className="text-sm font-bold text-foreground">
                                {totalPrice} RON
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {t("booking.payFullDesc")}
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
                              {t("booking.payAdvance")}
                            </span>
                          </div>
                          {totalPrice > 0 && (
                            <div className="pl-5">
                              <span className="text-sm font-bold text-primary">
                                {advanceAmount} RON
                              </span>
                              <span className="text-xs text-muted-foreground block">
                                {t("booking.payAdvanceDesc", {
                                  amount: remainingAmount,
                                })}
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
                      {t("booking.bankTransfer")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("booking.bankTransferDesc")}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* ─── Factură B2B ─────────────────────────────────────────── */}
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
                      {t("booking.invoice")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("booking.invoiceDesc")}
                  </p>
                </div>
              </label>

              {needsInvoice && (
                <div className="mt-3 space-y-3 px-1">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                      {t("booking.companyName")}{" "}
                      <span className="text-destructive">*</span>
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
                        {t("booking.companyCui")}{" "}
                        <span className="text-destructive">*</span>
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
                        {t("booking.companyRegNo")}{" "}
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
                      {t("booking.companyAddress")}{" "}
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

          {/* ─── Sidebar sumar ───────────────────────────────────────────── */}
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
                      📅 {t("booking.checkIn")}:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateFull(form.checkIn)}
                      </span>
                    </p>
                    <p>
                      📅 {t("booking.checkOut")}:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateFull(form.checkOut)}
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
                  <span>{roomPrice} RON</span>
                </div>

                {totalBreakfastMenus > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      ☕ {t("booking.breakfast")} × {totalBreakfastMenus}
                    </span>
                    <span>
                      {settings.price_breakfast * totalBreakfastMenus} RON
                    </span>
                  </div>
                )}
                {totalDinnerMenus > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      🍽️ {t("booking.dinner")} × {totalDinnerMenus}
                    </span>
                    <span>{settings.price_dinner * totalDinnerMenus} RON</span>
                  </div>
                )}
                {extras.extra_beds > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      🛏️ +{extras.extra_beds} × {nights}
                    </span>
                    <span>
                      {settings.price_extra_bed * extras.extra_beds * nights}{" "}
                      RON
                    </span>
                  </div>
                )}
                {extras.jacuzzi_dates.length > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      🌊 {t("booking.jacuzzi")} × {extras.jacuzzi_dates.length}
                    </span>
                    <span>
                      {settings.price_jacuzzi * extras.jacuzzi_dates.length} RON
                    </span>
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
                          {t("booking.payOnline")}
                        </span>
                        <span className="font-semibold text-primary">
                          {advanceAmount} RON
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t("booking.payAtCheckin")}
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
                    <Loader2 size={16} className="animate-spin" />{" "}
                    {t("booking.processing")}
                  </span>
                ) : paymentMethod === "card" ? (
                  paymentSplit === "advance" ? (
                    t("booking.advanceReserve", { amount: advanceAmount })
                  ) : (
                    t("booking.payNow")
                  )
                ) : (
                  t("booking.reserveNow")
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
