import { DollarSign, BedDouble, CalendarCheck, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { bookings, revenueByMonth, occupancyByRoom } from "@/data/admin-data";
import { useTranslation } from "react-i18next";

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const AdminDashboard = () => {
  const { t } = useTranslation();

  const stats = [
    { labelKey: "admin.totalRevenue", value: "€41,900", icon: DollarSign, change: "+12%" },
    { labelKey: "admin.occupancyRate", value: "75%", icon: BedDouble, change: "+5%" },
    { labelKey: "admin.bookingsThisMonth", value: "14", icon: CalendarCheck, change: "+3" },
    { labelKey: "admin.pendingBookings", value: bookings.filter((b) => b.status === "pending").length.toString(), icon: Clock, change: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.labelKey} className="bg-card border border-border rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t(s.labelKey)}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
              {s.change && <p className="text-xs text-emerald-600 mt-1">{s.change}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-heading text-base mb-4">{t("admin.revenueByMonth")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="font-heading text-base mb-4">{t("admin.occupancyPerRoom")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={occupancyByRoom}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="room" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="occupancy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-heading text-base mb-4">{t("admin.recentBookings")}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.guest")}</th>
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.room")}</th>
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">{t("admin.checkIn")}</th>
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">{t("admin.checkOut")}</th>
                <th className="pb-3 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.total")}</th>
                <th className="pb-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">{t("admin.status")}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 5).map((b) => (
                <tr key={b.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4 font-medium">{b.guest}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{b.room}</td>
                  <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">{b.checkIn}</td>
                  <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{b.checkOut}</td>
                  <td className="py-3 pr-4">€{b.total}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor[b.status]}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
