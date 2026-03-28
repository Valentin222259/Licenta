export interface Room {
  id: string;
  slug: string;
  name: string;
  description: string;
  short_description: string;
  price: number;
  capacity: number;
  status: "active" | "inactive" | "maintenance";
  amenities: string[];
  sort_order: number;
  primary_image: string | null;
  image_count: number;
  images?: RoomImage[];
  reviews?: Review[];
}

export interface RoomImage {
  id: string;
  url: string;
  s3_key: string;
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Booking {
  id: string;
  booking_ref: string;
  room_id: string;
  room_name: string;
  room_slug: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  source: string;
  special_requests: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  guest_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "client" | "admin";
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  total?: number;
}