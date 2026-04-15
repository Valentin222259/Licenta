import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Home,
  Building2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface PaymentVerification {
  success: boolean;
  paid: boolean;
  booking?: {
    booking_ref: string;
    guest_name: string;
    room_name: string;
    check_in: string;
    check_out: string;
    nights: number;
    total_price: number;
    status: string;
  };
}

const BookingSuccess = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const ref = params.get("ref");
  const method = params.get("method");

  const [status, setStatus] = useState<
    "loading" | "success" | "bank_pending" | "failed"
  >(method === "bank_transfer" ? "bank_pending" : "loading");
  const [data, setData] = useState<PaymentVerification | null>(null);

  useEffect(() => {
    if (method === "bank_transfer") {
      setStatus("bank_pending");
      return;
    }
    if (!sessionId) {
      setStatus("failed");
      return;
    }
    apiGet<PaymentVerification>(`/api/payments/verify/${sessionId}`)
      .then((res) => {
        setData(res);
        setStatus(res.paid ? "success" : "failed");
      })
      .catch(() => setStatus("failed"));
  }, [sessionId, method]);

  // Loading
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {t("bookingSuccess.verifying")}
          </p>
        </div>
      </div>
    );
  }

  // Failed
  if (status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle size={40} className="text-red-500" />
          </div>
          <div>
            <h1 className="font-heading text-2xl mb-2">
              {t("bookingSuccess.paymentFailed")}
            </h1>
            <p
              className="text-muted-foreground text-sm"
              dangerouslySetInnerHTML={{
                __html: t("bookingSuccess.paymentFailedDesc", {
                  ref: ref || "",
                }),
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="hero">
              <Link to="/booking">{t("bookingSuccess.tryAgain")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">{t("bookingSuccess.contactUs")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Bank transfer pending
  if (status === "bank_pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-20">
        <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-md w-full shadow-lg">
          <div className="bg-amber-500 px-8 py-8 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-white" />
            </div>
            <h1 className="font-heading text-2xl text-white font-semibold mb-1">
              {t("bookingSuccess.bankPendingTitle")}
            </h1>
            <p className="text-white/80 text-sm">
              {t("bookingSuccess.bankPendingSubtitle")}
            </p>
          </div>

          <div className="px-8 py-6 space-y-5">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              {ref && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("bookingSuccess.reference")}
                  </span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {ref}
                  </span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex items-start gap-3">
                <Building2
                  size={16}
                  className="text-amber-500 shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold mb-1">
                    {t("bookingSuccess.bankAccountTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("bookingSuccess.bankAccountDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">
                {t("bookingSuccess.nextSteps")}
              </p>
              {[
                t("bookingSuccess.step1"),
                t("bookingSuccess.step2"),
                t("bookingSuccess.step3"),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              📞 {t("bookingSuccess.questionsCall")}{" "}
              <a href="tel:+40262330123" className="text-primary font-medium">
                +40 262 330 123
              </a>
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Button asChild variant="hero" className="w-full">
                <Link to="/account">
                  <Calendar size={16} />
                  {t("bookingSuccess.viewMyBookings")}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  <Home size={16} />
                  {t("bookingSuccess.backHome")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success (Stripe)
  const booking = data?.booking;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-20">
      <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-md w-full shadow-lg">
        <div className="bg-emerald-500 px-8 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl text-white font-semibold mb-1">
            {t("bookingSuccess.confirmedTitle")}
          </h1>
          <p className="text-white/80 text-sm">
            {t("bookingSuccess.confirmedSubtitle")}
          </p>
        </div>

        <div className="px-8 py-6 space-y-4">
          {booking && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                {[
                  [t("bookingSuccess.reference"), booking.booking_ref],
                  [t("bookingSuccess.guest"), booking.guest_name],
                  [t("bookingSuccess.room"), booking.room_name],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
                <div className="h-px bg-border" />
                {[
                  [
                    t("bookingSuccess.checkIn"),
                    booking.check_in?.split("T")[0] || booking.check_in,
                  ],
                  [
                    t("bookingSuccess.checkOut"),
                    booking.check_out?.split("T")[0] || booking.check_out,
                  ],
                  [t("bookingSuccess.nights"), String(booking.nights)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm">{value}</span>
                  </div>
                ))}
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">
                    {t("bookingSuccess.totalPaid")}
                  </span>
                  <span className="font-heading text-lg text-accent font-bold">
                    {booking.total_price} RON
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                📧 {t("bookingSuccess.emailConfirmation")}
              </p>
            </>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="hero" className="w-full">
              <Link to="/account">
                <Calendar size={16} />
                {t("bookingSuccess.viewMyBookings")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                <Home size={16} />
                {t("bookingSuccess.backHome")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
