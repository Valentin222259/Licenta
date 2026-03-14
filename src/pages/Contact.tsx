import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Navigation } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const directions = [
  { city: "Cluj-Napoca", distance: "160 km", time: "~2.5h" },
  { city: "Baia Mare", distance: "45 km", time: "~50 min" },
  { city: "Satu Mare", distance: "80 km", time: "~1.5h" },
  { city: "Budapest", distance: "380 km", time: "~5h" },
];

const Contact = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: t("contact.messageSent"), description: t("contact.messageSentDesc") });
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <h1 className="font-heading text-4xl md:text-5xl text-center mb-4">{t("contact.title")}</h1>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">{t("contact.subtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">{t("contact.name")}</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">{t("contact.email")}</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">{t("contact.message")}</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>
            <Button variant="hero" type="submit">{t("contact.sendMessage")}</Button>
          </form>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.address")}</p>
                  <p className="text-sm text-muted-foreground">Str. Hera, Nr. 2, Petrova, Maramureș, România</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.phone")}</p>
                  <p className="text-sm text-muted-foreground">+40 262 330 123</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-primary mt-0.5" />
                <div>
                  <p className="font-heading text-sm">{t("contact.email")}</p>
                  <p className="text-sm text-muted-foreground">contact@maramures-belvedere.ro</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-border">
              <iframe title="Location Map" src="https://www.openstreetmap.org/export/embed.html?bbox=24.3700%2C47.7600%2C24.4200%2C47.7900&layer=mapnik&marker=47.7750%2C24.3950" className="w-full h-56" />
            </div>

            <div>
              <h3 className="font-heading text-lg mb-3 flex items-center gap-2">
                <Navigation size={16} className="text-primary" />
                {t("contact.gettingHere")}
              </h3>
              <div className="space-y-2">
                {directions.map((d) => (
                  <div key={d.city} className="flex justify-between text-sm bg-muted rounded-md px-4 py-2">
                    <span>{t("contact.from", { city: d.city })}</span>
                    <span className="text-muted-foreground">{d.distance} · {d.time}</span>
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
