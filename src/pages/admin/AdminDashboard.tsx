import { Link } from "react-router-dom";
import {
  DollarSign,
  BedDouble,
  CalendarCheck,
  Clock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { bookings, revenueByMonth, occupancyByRoom } from "@/data/admin-data";
import { useTranslation } from "react-i18next";

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const getStatusLabel = (status: string, t: (key: string) => string): string => {
  if (status === "confirmed") return t("admin.confirmed");
  if (status === "pending") return t("admin.pending");
  return t("admin.cancelled");
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <p className="text-primary font-semibold">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const { t } = useTranslation();

  const stats = [
    {
      labelKey: "admin.totalRevenue",
      value: "41.900 RON",
      icon: DollarSign,
      change: "+12%",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      labelKey: "admin.occupancyRate",
      value: "75%",
      icon: BedDouble,
      change: "+5%",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      labelKey: "admin.bookingsThisMonth",
      value: "14",
      icon: CalendarCheck,
      change: "+3",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      labelKey: "admin.pendingBookings",
      value: String(bookings.filter((b) => b.status === "pending").length),
      icon: Clock,
      change: null,
      positive: null,
      desc: "necesită confirmare",
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Carduri statistici ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.labelKey}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t(s.labelKey)}
              </p>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon size={17} className="text-primary" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {s.value}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {s.change && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${s.positive ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {s.positive ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {s.change}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{s.desc}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grafice ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t("admin.revenueByMonth")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ultimele 6 luni
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={revenueByMonth}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {t("admin.occupancyPerRoom")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ocupare medie (%)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={occupancyByRoom}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="room"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="occupancy"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={52}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Tabel rezervări recente ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header tabel */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("admin.recentBookings")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ultimele 5 rezervări
            </p>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs text-primary hover:underline font-medium"
          >
            Vezi toate →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left   px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">
                  {t("admin.guest")}
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%] hidden md:table-cell">
                  {t("admin.room")}
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%] hidden sm:table-cell">
                  {t("admin.checkIn")}
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%] hidden sm:table-cell">
                  {t("admin.checkOut")}
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[12%]">
                  {t("admin.total")}
                </th>
                <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%]">
                  {t("admin.status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.slice(0, 5).map((b) => {
                const s = statusStyle[b.status] ?? {
                  bg: "bg-muted",
                  text: "text-muted-foreground",
                  dot: "bg-muted-foreground",
                };
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    {/* Oaspete — aliniat stânga */}
                    <td className="px-5 py-3.5 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {b.guest}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.email}</p>
                    </td>
                    {/* Cameră — centrat */}
                    <td className="px-5 py-3.5 text-center text-sm text-muted-foreground hidden md:table-cell">
                      {b.room}
                    </td>
                    {/* Check-in — centrat */}
                    <td className="px-5 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkIn}
                    </td>
                    {/* Check-out — centrat */}
                    <td className="px-5 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkOut}
                    </td>
                    {/* Total — centrat */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        €{b.total}
                      </span>
                    </td>
                    {/* Status — centrat */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}
                        />
                        {getStatusLabel(b.status, t)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
