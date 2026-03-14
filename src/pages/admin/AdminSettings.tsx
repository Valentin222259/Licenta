import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";

const AdminSettings = () => {
  const { t } = useTranslation();
  const [guesthouse, setGuesthouse] = useState({
    name: "Maramureș Belvedere",
    address: "Str. Hera, Nr. 2, Petrova, Maramureș, România",
    phone: "+40 262 330 123",
    email: "contact@maramures-belvedere.ro",
  });

  const [notifications, setNotifications] = useState({
    newBooking: true, cancellation: true, review: false, dailySummary: true,
  });

  const [chatbotKB, setChatbotKB] = useState(
    `Maramureș Belvedere is a boutique mountain guesthouse located in Petrova, Maramureș, Romania.\n\nWe have 8 rooms:\n- Rooms 1, 2, 3, 4, 6, 7: 250 RON/night (capacity 2)\n- Rooms 5 and 8: 300 RON/night (with bathtub and sofa bed, capacity 3)\n- Extra bed available in any room for +50 RON/night.\n\nCheck-in: 15:00, Check-out: 11:00.\nBreakfast included. Free parking. Free Wi-Fi.\n\nFacilities: Jacuzzi/ciubăr, 8 free bicycles, ping pong table, sleds (winter), grill/ceaun, free parking, children's playground.\n\nNearby attractions: UNESCO wooden churches, hiking trails, Merry Cemetery (Săpânța), traditional village tours.`
  );

  const save = () => toast({ title: t("admin.settingsSaved") });

  const inputCls = "w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

  const notifItems = [
    { key: "newBooking" as const, labelKey: "admin.newBookingReceived" },
    { key: "cancellation" as const, labelKey: "admin.bookingCancellation" },
    { key: "review" as const, labelKey: "admin.newGuestReview" },
    { key: "dailySummary" as const, labelKey: "admin.dailySummary" },
  ];

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="font-heading text-xl mb-4">{t("admin.guesthouseInfo")}</h2>
        <div className="space-y-4">
          {(["name", "address", "phone", "email"] as const).map((field) => (
            <div key={field}>
              <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block capitalize">{field}</label>
              <input value={guesthouse[field]} onChange={(e) => setGuesthouse({ ...guesthouse, [field]: e.target.value })} className={inputCls} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-4">{t("admin.emailNotifications")}</h2>
        <div className="space-y-3">
          {notifItems.map((n) => (
            <label key={n.key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifications[n.key]} onChange={(e) => setNotifications({ ...notifications, [n.key]: e.target.checked })} className="w-4 h-4 accent-primary rounded" />
              <span className="text-sm">{t(n.labelKey)}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-2">{t("admin.chatbotKB")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("admin.chatbotKBDesc")}</p>
        <textarea value={chatbotKB} onChange={(e) => setChatbotKB(e.target.value)} rows={8} className={`${inputCls} resize-y`} />
      </section>

      <Button onClick={save}><Save size={16} />{t("admin.saveSettings")}</Button>
    </div>
  );
};

export default AdminSettings;
