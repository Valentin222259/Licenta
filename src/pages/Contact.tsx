import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Navigation, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { apiPost } from "@/lib/api";

const directions = [
  { city: "Baia Mare", distance: "55 km", time: "~1h" },
  { city: "Sighetu Marmației", distance: "30 km", time: "~35 min" },
  { city: "Vișeu de Sus", distance: "25 km", time: "~25 min" },
  { city: "Cluj-Napoca", distance: "175 km", time: "~2.5h" },
];

const Contact = () => {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiPost("/api/contact", {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        subject: form.subject || undefined,
        message: form.message,
        lang: i18n.language,
      });

      toast({
        title: t("contact.messageSent"),
        description: t("contact.messageSentDesc"),
      });

      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast({
        title: t("booking.error"),
        description:
          err instanceof Error ? err.message : t("contact.errorSend"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <h1 className="font-heading text-4xl md:text-5xl text-center mb-4">
          {t("contact.title")}
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          {t("contact.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("contact.name")} *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("contact.email")} *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="adresa@email.com"
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t("contact.phone")}
                </label>
                <PhoneInput
                  international
                  defaultCountry="RO"
                  value={form.phone}
                  onChange={(value) => update("phone", value || "")}
                  className="phone-input-wrapper"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                  {t("contact.subject")}
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  placeholder={t("contact.subjectPlaceholder")}
                  className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("contact.message")} *
              </label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(e) => update("message", e.target.value)}
                placeholder={t("contact.messagePlaceholder")}
                className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <Button variant="hero" type="submit" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {t("contact.sending")}
                </span>
              ) : (
                t("contact.sendMessage")
              )}
            </Button>
          </form>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.address")}</p>
                  <p className="text-sm text-muted-foreground">
                    Str. Hera, Nr. 2, Petrova, Maramureș, România
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.phone")}</p>
                  <p className="text-sm text-muted-foreground">
                    +40 262 330 123
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.email")}</p>
                  <p className="text-sm text-muted-foreground">
                    contact@maramures-belvedere.ro
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-border">
              <iframe
                title="Location Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=24.1389%2C47.8292%2C24.1789%2C47.8692&layer=mapnik&marker=47.849263%2C24.158971"
                className="w-full h-56"
              />
            </div>

            <div>
              <h3 className="font-heading text-lg mb-3 flex items-center gap-2">
                <Navigation size={16} className="text-primary" />
                {t("contact.gettingHere")}
              </h3>
              <div className="space-y-2">
                {directions.map((d) => (
                  <div
                    key={d.city}
                    className="flex justify-between text-sm bg-muted rounded-md px-4 py-2"
                  >
                    <span>{t("contact.from", { city: d.city })}</span>
                    <span className="text-muted-foreground">
                      {d.distance} · {d.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
