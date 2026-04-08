import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const AdminSettings = () => {
  const [guesthouse, setGuesthouse] = useState({
    name: "Maramureș Belvedere",
    address: "Str. Hera, Nr. 2, Petrova, Maramureș, România",
    phone: "+40 262 330 123",
    email: "contact@maramures-belvedere.ro",
  });

  const [notifications, setNotifications] = useState({
    newBooking: true,
    cancellation: true,
    review: false,
    dailySummary: true,
  });

  const [chatbotKB, setChatbotKB] = useState(
    `Pensiunea Maramureș Belvedere este situată în Petrova, Maramureș, România.\nAdresă: Str. Hera, Nr. 2, Petrova, Maramureș, România.\n\nAvem 8 camere:\n- Camerele 1, 2, 3, 4, 6, 7: 250 RON/noapte (capacitate 2 persoane)\n- Camerele 5 și 8: 300 RON/noapte (cu cadă și canapea extensibilă, capacitate 3 persoane)\n- Pat suplimentar disponibil în orice cameră cu +50 RON/noapte.\n\nCheck-in: 15:00, Check-out: 11:00.\nMicul dejun inclus. Parcare gratuită. Wi-Fi gratuit.\n\nFacilități: Jacuzzi/ciubăr, 8 biciclete gratuite, masă ping pong, săniuțe (iarnă), grătar/ceaun, parcare gratuită, loc de joacă copii.\n\nAtracții în apropiere: Biserici de lemn UNESCO, trasee montane, Cimitirul Vesel (Săpânța), tururi tradiționale de sat.`,
  );

  const save = () => toast({ title: "Setările au fost salvate cu succes" });

  const inputCls =
    "w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

  const fieldLabels: Record<string, string> = {
    name: "Nume pensiune",
    address: "Adresă",
    phone: "Telefon",
    email: "Email",
  };

  const notifItems = [
    { key: "newBooking" as const, label: "Rezervare nouă primită" },
    { key: "cancellation" as const, label: "Anulare rezervare" },
    { key: "review" as const, label: "Recenzie nouă oaspete" },
    { key: "dailySummary" as const, label: "Raport sumar zilnic" },
  ];

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Informații pensiune */}
      <section>
        <h2 className="font-heading text-xl mb-4">Informații Pensiune</h2>
        <div className="space-y-4">
          {(["name", "address", "phone", "email"] as const).map((field) => (
            <div key={field}>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">
                {fieldLabels[field]}
              </label>
              <input
                value={guesthouse[field]}
                onChange={(e) =>
                  setGuesthouse({ ...guesthouse, [field]: e.target.value })
                }
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Notificări email */}
      <section>
        <h2 className="font-heading text-xl mb-2">Notificări Email</h2>
        <div className="bg-muted/40 border border-border rounded-xl px-5 py-4 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sistemul trimite automat următoarele emailuri:
          </p>
          {[
            {
              label: "Confirmare rezervare",
              desc: "Trimis clientului după plata Stripe",
            },
            {
              label: "Alertă rezervare nouă",
              desc: "Trimis adminului la fiecare rezervare confirmată",
            },
            {
              label: "Reminder check-in",
              desc: "Trimis clientului cu o zi înainte de sosire (zilnic 10:00)",
            },
            {
              label: "Solicitare recenzie",
              desc: "Trimis clientului în ziua check-out-ului (zilnic 12:00)",
            },
            {
              label: "Anulare rezervare",
              desc: "Trimis clientului când rezervarea e anulată",
            },
            { label: "Bun venit", desc: "Trimis la crearea unui cont nou" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Baza de cunoștințe chatbot */}
      <section>
        <h2 className="font-heading text-xl mb-2">
          Baza de Cunoștințe Chatbot
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Actualizați informațiile pe care Ion (chatbot-ul AI) le cunoaște
          despre proprietatea dumneavoastră.
        </p>
        <textarea
          value={chatbotKB}
          onChange={(e) => setChatbotKB(e.target.value)}
          rows={8}
          className={`${inputCls} resize-y`}
        />
      </section>

      <Button onClick={save}>
        <Save size={16} />
        Salvează Setările
      </Button>
    </div>
  );
};

export default AdminSettings;
