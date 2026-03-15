import { useState } from "react";
import { bookings, BookingData } from "@/data/admin-data";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

const filterLabels: Record<string, string> = {
  all: "toate",
  confirmed: "confirmate",
  pending: "în așteptare",
  cancelled: "anulate",
};

const AdminBookings = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BookingData | null>(null);

  const filtered = bookings.filter(
    (b) => statusFilter === "all" || b.status === statusFilter,
  );
  const filterKeys = ["all", "confirmed", "pending", "cancelled"] as const;

  return (
    <div className="space-y-5">
      {/* Filtre */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Status:
        </span>
        {filterKeys.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {filterLabels[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} rezultate
        </span>
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[8%]">
                  ID
                </th>
                <th className="text-left   px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">
                  Oaspete
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%] hidden md:table-cell">
                  Cameră
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%] hidden sm:table-cell">
                  Check-in
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%] hidden sm:table-cell">
                  Check-out
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                  Total
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[16%]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => {
                const s = statusStyle[b.status] ?? {
                  bg: "bg-muted",
                  text: "text-muted-foreground",
                  dot: "bg-muted-foreground",
                };
                return (
                  <tr
                    key={b.id}
                    onClick={() => setSelected(b)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelected(b);
                    }}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                      {b.id}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {b.guest}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {b.email}
                      </p>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden md:table-cell">
                      {b.room}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkIn}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkOut}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        €{b.total}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
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

      {/* Modal detalii */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={() => setSelected(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
            }}
          />
          <div className="relative bg-card border border-border rounded-2xl p-4 sm:p-6 w-full max-w-md z-50 shadow-2xl animate-fade-in-up">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Închide"
            >
              <X size={18} />
            </button>
            <h3 className="font-heading text-lg font-semibold mb-1 pr-8">
              Rezervare {selected.id}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 sm:mb-5">
              Detalii complete rezervare
            </p>

            <div className="divide-y divide-border">
              {[
                ["Oaspete", selected.guest],
                ["Email", selected.email],
                ["Cameră", selected.room],
                ["Check-in", selected.checkIn],
                ["Check-out", selected.checkOut],
                ["Total", `€${selected.total}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-0"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-foreground break-all sm:break-normal">
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                {(() => {
                  const s = statusStyle[selected.status] ?? {
                    bg: "bg-muted",
                    text: "text-muted-foreground",
                    dot: "bg-muted-foreground",
                  };
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text} w-fit`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {statusLabel[selected.status] ?? selected.status}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button size="sm" className="flex-1">
                Confirmă
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-destructive hover:bg-destructive hover:text-white"
              >
                Anulează Rezervarea
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
