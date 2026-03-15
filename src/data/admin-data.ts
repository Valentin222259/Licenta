export interface BookingData {
  id: string;
  guest: string;
  email: string;
  room: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: "confirmed" | "pending" | "cancelled";
}

export const bookings: BookingData[] = [
  { id: "B001", guest: "Anna Müller", email: "anna@email.com", room: "Deluxe Mountain View", checkIn: "2026-03-10", checkOut: "2026-03-14", total: 720, status: "confirmed" },
  { id: "B002", guest: "Cristian Popescu", email: "cristian@email.com", room: "Fireplace Suite", checkIn: "2026-03-12", checkOut: "2026-03-15", total: 840, status: "confirmed" },
  { id: "B003", guest: "Sophie Laurent", email: "sophie@email.com", room: "Classic Comfort", checkIn: "2026-03-18", checkOut: "2026-03-20", total: 240, status: "pending" },
  { id: "B004", guest: "Thomas Weber", email: "thomas@email.com", room: "Deluxe Mountain View", checkIn: "2026-03-22", checkOut: "2026-03-25", total: 540, status: "pending" },
  { id: "B005", guest: "Elena Stanescu", email: "elena@email.com", room: "Fireplace Suite", checkIn: "2026-03-05", checkOut: "2026-03-08", total: 840, status: "confirmed" },
  { id: "B006", guest: "Marco Rossi", email: "marco@email.com", room: "Classic Comfort", checkIn: "2026-02-28", checkOut: "2026-03-02", total: 240, status: "cancelled" },
  { id: "B007", guest: "Julia Schneider", email: "julia@email.com", room: "Deluxe Mountain View", checkIn: "2026-04-01", checkOut: "2026-04-05", total: 720, status: "pending" },
  { id: "B008", guest: "Andrei Vasile", email: "andrei@email.com", room: "Fireplace Suite", checkIn: "2026-03-28", checkOut: "2026-04-01", total: 1120, status: "confirmed" },
];

export const revenueByMonth = [
  { month: "Oct", revenue: 4200 },
  { month: "Nov", revenue: 5800 },
  { month: "Dec", revenue: 8200 },
  { month: "Ian", revenue: 6100 },
  { month: "Feb", revenue: 7400 },
  { month: "Mar", revenue: 9200 },
];

export const occupancyByRoom = [
  { room: "Deluxe", occupancy: 78 },
  { room: "Suite", occupancy: 85 },
  { room: "Classic", occupancy: 62 },
];

export const bookingSources = [
  { source: "Website",     value: 40 },
  { source: "Booking.com", value: 25 },
  { source: "Travelminit", value: 16 },
  { source: "TuristInfo",  value:  9 },
  { source: "Direct",      value: 10 },
];

export const adminRooms = [
  { id: "deluxe-mountain-view", name: "Deluxe Mountain View", price: 180, status: "active" as const, image: "room-deluxe" },
  { id: "fireplace-suite", name: "Fireplace Suite", price: 280, status: "active" as const, image: "room-suite" },
  { id: "classic-comfort", name: "Classic Comfort", price: 120, status: "active" as const, image: "room-standard" },
];