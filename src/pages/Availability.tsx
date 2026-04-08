import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface OccupiedPeriod {
  room_id: string;
  room_name: string;
  check_in: string;
  check_out: string;
}

interface Room {
  id: string;
  name: string;
  slug: string;
  price: number;
}

const DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];
const MONTHS = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// O zi e ocupata daca: check_in <= ziua < check_out
// Ziua de checkout NU e ocupata — oaspetii pleaca, camera e libera
const isDayOccupied = (
  dateStr: string,
  periods: OccupiedPeriod[],
  roomId: string,
) =>
  periods.some((p) => {
    if (String(p.room_id) !== String(roomId)) return false;
    const ci = p.check_in.substring(0, 10);
    const co = p.check_out.substring(0, 10);
    return dateStr >= ci && dateStr < co;
  });

interface RoomCalendarProps {
  room: Room;
  occupied: OccupiedPeriod[];
  year: number;
  month: number;
}

const RoomCalendar = ({ room, occupied, year, month }: RoomCalendarProps) => {
  const today = new Date();
  const todayISO = toISO(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const freeDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).filter(
    (d) => {
      const iso = toISO(year, month, d);
      return iso >= todayISO && !isDayOccupied(iso, occupied, room.id);
    },
  ).length;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-heading text-base">{room.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            de la{" "}
            <span className="font-semibold text-accent">{room.price} RON</span>{" "}
            / noapte
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${freeDays > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}
        >
          {freeDays > 0 ? `${freeDays} zile libere` : "Complet ocupat"}
        </span>
      </div>

      <div className="grid grid-cols-7 bg-muted/40 border-b border-border">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 p-3 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const iso = toISO(year, month, day);
          const isPast = iso < todayISO;
          const isOccupied = isDayOccupied(iso, occupied, room.id);
          const isToday = iso === todayISO;

          let cls =
            "aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all select-none ";

          if (isPast) {
            cls += "text-muted-foreground/25";
          } else if (isOccupied) {
            cls += "bg-red-100 text-red-600";
          } else if (isToday) {
            cls +=
              "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1";
          } else {
            cls += "bg-emerald-50 text-emerald-700";
          }

          const label = isPast
            ? "Trecut"
            : isOccupied
              ? "Ocupat"
              : isToday
                ? "Astazi"
                : "Disponibil";

          return (
            <div key={day} className={cls} title={label}>
              {day}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Check-out = disponibil din aceeasi zi
        </span>
        <Button variant="hero" size="sm" asChild>
          <Link to={`/booking?room=${room.slug}`}>Rezerva</Link>
        </Button>
      </div>
    </div>
  );
};

const Availability = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [occupied, setOccupied] = useState<OccupiedPeriod[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<{ success: boolean; data: OccupiedPeriod[] }>(
        "/api/bookings/availability",
      ),
      apiGet<{ success: boolean; data: Room[] }>("/api/rooms"),
    ])
      .then(([avail, roomsRes]) => {
        setOccupied(avail.data || []);
        setRooms(roomsRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const today = new Date();
  const canGoPrev =
    new Date(year, month, 1) >
    new Date(today.getFullYear(), today.getMonth(), 1);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <h1 className="font-heading text-4xl md:text-5xl text-center mb-3">
          Disponibilitate
        </h1>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Verificati disponibilitatea fiecarei camere pentru luna dorita. Ziua
          de check-out este considerata libera pentru noi rezervari.
        </p>

        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-heading text-2xl min-w-[200px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-6 mb-8 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200" />
                <span className="text-muted-foreground">Disponibil</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-muted-foreground">Ocupat</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-primary" />
                <span className="text-muted-foreground">Astazi</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded bg-muted/40 border border-border" />
                <span className="text-muted-foreground">Trecut</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <RoomCalendar
                  key={room.id}
                  room={room}
                  occupied={occupied}
                  year={year}
                  month={month}
                />
              ))}
            </div>

            {rooms.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                Nu s-au putut incarca camerele.
              </p>
            )}

            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground mb-4">
                Aveti intrebari despre disponibilitate? Contactati-ne direct.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button variant="hero" asChild>
                  <Link to="/booking">Rezerva Acum</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/contact">Contactati-ne</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Availability;
