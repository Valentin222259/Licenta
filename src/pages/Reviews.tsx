import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Star, Loader2, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface Review {
  id: string;
  guest_name: string;
  rating: number;
  text: string;
  created_at: string;
  room_name?: string;
}

const StarRating = ({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={onChange ? 28 : 16}
            className={`transition-colors ${(hover || value) >= s ? "fill-primary text-primary" : "fill-transparent text-primary/30"}`}
          />
        </button>
      ))}
    </div>
  );
};

const Reviews = () => {
  const { t, i18n } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [searchParams] = useSearchParams();

  const bookingIdFromUrl = searchParams.get("ref") || "";
  const emailFromUrl = searchParams.get("email") || "";
  const starsFromUrl = parseInt(searchParams.get("stars") || "0");
  const validStars = starsFromUrl >= 1 && starsFromUrl <= 5 ? starsFromUrl : 0;

  const isFromEmail = !!bookingIdFromUrl;

  const [form, setForm] = useState({
    name: "",
    email: emailFromUrl,
    rating: validStars,
    text: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    apiGet<{ success: boolean; data: Review[] }>("/api/reviews")
      .then((res) => setReviews(res.data || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t("reviews.nameRequired");
    if (!form.email.trim()) errs.email = t("reviews.emailRequired");
    if (form.rating === 0) errs.rating = t("reviews.ratingRequired");
    if (form.text.trim().length < 10) errs.text = t("reviews.textTooShort");
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await apiPost("/api/reviews", {
        booking_id: bookingIdFromUrl,
        guest_name: form.name,
        guest_email: form.email,
        rating: form.rating,
        text: form.text,
      });
      setSubmitted(true);
      toast({ title: t("reviews.submitted") });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("reviews.submitError"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const dateLocale = i18n.language === "en" ? "en-GB" : "ro-RO";

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <h1 className="font-heading text-4xl md:text-5xl text-center mb-3">
          {t("reviews.pageTitle")}
        </h1>
        <p className="text-center text-muted-foreground mb-10 max-w-lg mx-auto">
          {t("reviews.pageSubtitle")}
        </p>

        {/* Statistici */}
        {!loading && reviews.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center sm:border-r sm:border-border sm:pr-6">
              <p className="font-heading text-5xl font-bold text-primary">
                {avgRating}
              </p>
              <StarRating value={Math.round(Number(avgRating))} />
              <p className="text-xs text-muted-foreground mt-1">
                {t("reviews.reviewsCount", { count: reviews.length })}
              </p>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length;
                const pct = reviews.length
                  ? Math.round((count / reviews.length) * 100)
                  : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-3 text-muted-foreground text-xs">
                      {star}
                    </span>
                    <Star
                      size={12}
                      className="fill-primary text-primary shrink-0"
                    />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-muted-foreground text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Formular */}
          <div>
            <h2 className="font-heading text-2xl mb-6">
              {t("reviews.leaveReview")}
            </h2>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <CheckCircle
                  size={40}
                  className="text-emerald-500 mx-auto mb-3"
                />
                <h3 className="font-heading text-xl mb-2">
                  {t("reviews.thankYou")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("reviews.thankYouDesc")}
                </p>
              </div>
            ) : !isFromEmail ? (
              <div className="bg-muted/40 border border-border rounded-2xl p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail size={24} className="text-primary" />
                </div>
                <h3 className="font-heading text-lg">
                  {t("reviews.fromEmail")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("reviews.fromEmailDesc")}
                </p>
                <a
                  href="mailto:contact@maramures-belvedere.ro"
                  className="inline-block text-sm text-primary underline"
                >
                  contact@maramures-belvedere.ro
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                    {t("reviews.nameLabel")} *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ion Popescu"
                    className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.name ? "border-destructive" : "border-border"}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                    {t("reviews.emailLabel")} *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    readOnly={!!emailFromUrl}
                    placeholder="you@example.com"
                    className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring ${
                      emailFromUrl ? "opacity-60 cursor-not-allowed" : ""
                    } ${errors.email ? "border-destructive" : "border-border"}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reviews.emailNotPublic")}
                  </p>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                    {t("reviews.ratingLabel")} *
                  </label>
                  <StarRating
                    value={form.rating}
                    onChange={(v) => setForm({ ...form, rating: v })}
                  />
                  {errors.rating && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.rating}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                    {t("reviews.yourReview")} *
                  </label>
                  <textarea
                    rows={4}
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    placeholder={t("reviews.reviewPlaceholder")}
                    className={`w-full bg-muted border rounded-md px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none ${errors.text ? "border-destructive" : "border-border"}`}
                  />
                  {errors.text && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.text}
                    </p>
                  )}
                </div>

                <Button
                  variant="hero"
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />{" "}
                      {t("reviews.submitting")}
                    </span>
                  ) : (
                    t("reviews.submitReview")
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Lista recenzii */}
          <div>
            <h2 className="font-heading text-2xl mb-6">
              {t("reviews.whatGuestsSay")}
            </h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>{t("reviews.noReviews")}</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-card border border-border rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-heading text-sm font-semibold">
                          {r.guest_name}
                        </p>
                        {r.room_name && (
                          <p className="text-xs text-muted-foreground">
                            {r.room_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <StarRating value={r.rating} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleDateString(
                            dateLocale,
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      "{r.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
