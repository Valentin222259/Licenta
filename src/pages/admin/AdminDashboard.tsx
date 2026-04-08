import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  BedDouble,
  CalendarCheck,
  Clock,
  Loader2,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Booking } from "@/lib/types";

interface DashboardStats {
  total_revenue: number;
  confirmed_bookings: number;
  pending_bookings: number;
  total_rooms: number;
}

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  completed: { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400" },
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmat",
  pending: "În așteptare",
  cancelled: "Anulat",
  completed: "Finalizat",
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(2);
  return `${day}/${month}/${year}`;
};

const AdminDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_revenue: 0,
    confirmed_bookings: 0,
    pending_bookings: 0,
    total_rooms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<ApiResponse<Booking[]>>("/api/bookings?limit=5"),
      apiGet<ApiResponse<Booking[]>>("/api/bookings?limit=1000"),
      apiGet<{ success: boolean; data: any[] }>("/api/rooms"),
    ])
      .then(([recentRes, allRes, roomsRes]) => {
        const all = allRes.data || [];
        const recent = recentRes.data || [];
        const activeRooms = (roomsRes.data || []).length;

        setBookings(recent);
        setStats({
          total_revenue: all
            .filter((b) => b.status === "confirmed" || b.status === "completed")
            .reduce((sum, b) => sum + b.total_price, 0),
          confirmed_bookings: all.filter((b) => b.status === "confirmed")
            .length,
          pending_bookings: all.filter((b) => b.status === "pending").length,
          total_rooms: activeRooms,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: "Venit Total",
      value: `${stats.total_revenue.toLocaleString()} RON`,
      icon: DollarSign,
      desc: "rezervări confirmate",
    },
    {
      label: "Camere",
      value: `${stats.total_rooms}`,
      icon: BedDouble,
      desc: "camere active",
    },
    {
      label: "Rezervări Confirmate",
      value: `${stats.confirmed_bookings}`,
      icon: CalendarCheck,
      desc: "total confirmate",
    },
    {
      label: "În Așteptare",
      value: `${stats.pending_bookings}`,
      icon: Clock,
      desc: "necesită confirmare",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((s) => (
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
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabel rezervări recente */}
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

        {bookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nicio rezervare încă.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left">
                    Oaspete
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden md:table-cell">
                    Cameră
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden sm:table-cell">
                    Check-in
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden sm:table-cell">
                    Check-out
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.slice(0, 5).map((b) => {
                  const s = statusStyle[b.status] ?? statusStyle.pending;
                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium">{b.guest_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.guest_email}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden md:table-cell">
                        {b.room_name}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                        {formatDate(b.check_in)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                        {formatDate(b.check_out)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-semibold">
                          {b.total_price} RON
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
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
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
