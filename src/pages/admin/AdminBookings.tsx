import { useState } from "react";
import { bookings, BookingData } from "@/data/admin-data";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const AdminBookings = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BookingData | null>(null);

  const filtered = bookings.filter((b) => statusFilter === "all" || b.status === statusFilter);

  const filterKeys = ["all", "confirmed", "pending", "cancelled"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("admin.status")}:</span>
        {filterKeys.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-xs capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {t(`admin.${s}`)}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">ID</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.guest")}</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">{t("admin.room")}</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">{t("admin.checkIn")}</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">{t("admin.checkOut")}</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.total")}</th>
                <th className="p-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} onClick={() => setSelected(b)} className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="p-4 text-muted-foreground">{b.id}</td>
                  <td className="p-4 font-medium">{b.guest}</td>
                  <td className="p-4 text-muted-foreground hidden md:table-cell">{b.room}</td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{b.checkIn}</td>
                  <td className="p-4 text-muted-foreground hidden sm:table-cell">{b.checkOut}</td>
                  <td className="p-4">€{b.total}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor[b.status]}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-foreground/40" onClick={() => setSelected(null)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md z-50 animate-fade-in-up">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={18} /></button>
            <h3 className="font-heading text-xl mb-4">{t("admin.booking")} {selected.id}</h3>
            <div className="space-y-3 text-sm">
              {[
                [t("admin.guest"), selected.guest],
                [t("contact.email"), selected.email],
                [t("admin.room"), selected.room],
                [t("admin.checkIn"), selected.checkIn],
                [t("admin.checkOut"), selected.checkOut],
                [t("admin.total"), `€${selected.total}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("admin.status")}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button size="sm" className="flex-1">{t("admin.confirm")}</Button>
              <Button size="sm" variant="outline" className="flex-1">{t("admin.cancelBooking")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
