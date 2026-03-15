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
  TooltipProps,
} from "recharts";
import { bookings, revenueByMonth, occupancyByRoom } from "@/data/admin-data";

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmat",
  pending: "În așteptare",
  cancelled: "Anulat",
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="font-medium text-foreground mb-1">{label}</p>
        <p className="text-primary font-semibold">
          {payload[0]?.value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const AdminDashboard = () => {
  const stats = [
    {
      label: "Venit Total",
      value: "41.900 RON",
      icon: DollarSign,
      change: "+12%",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      label: "Rata de Ocupare",
      value: "75%",
      icon: BedDouble,
      change: "+5%",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      label: "Rezervări Luna Aceasta",
      value: "14",
      icon: CalendarCheck,
      change: "+3",
      positive: true,
      desc: "față de luna trecută",
    },
    {
      label: "Rezervări în Așteptare",
      value: String(bookings.filter((b) => b.status === "pending").length),
      icon: Clock,
      change: null,
      positive: null,
      desc: "necesită confirmare",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Venit pe Lună
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ultimele 6 luni
            </p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
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

        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Ocupare pe Cameră
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ocupare medie (%)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Rezervări Recente
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
                <th className="text-left   px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[25%]">
                  Oaspete
                </th>
                <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%] hidden md:table-cell">
                  Cameră
                </th>
                <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%] hidden sm:table-cell">
                  Check-in
                </th>
                <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%] hidden sm:table-cell">
                  Check-out
                </th>
                <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[12%]">
                  Total
                </th>
                <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%]">
                  Status
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
                    <td className="px-4 sm:px-5 py-3.5 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {b.guest}
                      </p>
                      <p className="text-xs text-muted-foreground">{b.email}</p>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-center text-sm text-muted-foreground hidden md:table-cell">
                      {b.room}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkIn}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkOut}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        €{b.total}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}
                        />
                        {statusLabel[b.status] ?? b.status}
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
