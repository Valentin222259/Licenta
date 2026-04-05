import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Calendar, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";

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
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const ref = params.get("ref");

  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [data, setData] = useState<PaymentVerification | null>(null);

  useEffect(() => {
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
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-4">
          <Loader2 size={48} className="animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Se verifică plata...</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle size={40} className="text-red-500" />
          </div>
          <div>
            <h1 className="font-heading text-2xl mb-2">
              Plata nu a fost procesată
            </h1>
            <p className="text-muted-foreground text-sm">
              Rezervarea ta (Ref: <strong>{ref}</strong>) nu a fost confirmată.
              Poți încerca din nou sau ne contactezi direct.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild variant="hero">
              <Link to="/booking">Încearcă din nou</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Contactează-ne</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const booking = data?.booking;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-20">
      <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-md w-full shadow-lg">
        {/* Header verde */}
        <div className="bg-emerald-500 px-8 py-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl text-white font-semibold mb-1">
            Rezervare Confirmată!
          </h1>
          <p className="text-white/80 text-sm">
            Plata a fost procesată cu succes
          </p>
        </div>

        {/* Detalii */}
        <div className="px-8 py-6 space-y-4">
          {booking && (
            <>
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Referință
                  </span>
                  <span className="font-mono font-bold text-primary text-sm">
                    {booking.booking_ref}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Oaspete
                  </span>
                  <span className="text-sm font-medium">
                    {booking.guest_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cameră
                  </span>
                  <span className="text-sm font-medium">
                    {booking.room_name}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Check-in
                  </span>
                  <span className="text-sm">
                    {booking.check_in?.split("T")[0] || booking.check_in}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Check-out
                  </span>
                  <span className="text-sm">
                    {booking.check_out?.split("T")[0] || booking.check_out}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nopți
                  </span>
                  <span className="text-sm">{booking.nights}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Total plătit</span>
                  <span className="font-heading text-lg text-accent font-bold">
                    {booking.total_price} RON
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                📧 Un email de confirmare a fost trimis la adresa ta de email.
              </p>
            </>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild variant="hero" className="w-full">
              <Link to="/account">
                <Calendar size={16} />
                Vezi rezervările mele
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                <Home size={16} />
                Înapoi acasă
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
