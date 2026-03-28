import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/api";
import type { ApiResponse, Room } from "@/lib/types";
import heroImage from "@/assets/hero-mountains.jpg";

const statusLabel: Record<string, string> = {
  active: "activă",
  inactive: "inactivă",
  maintenance: "mentenanță",
};

const AdminRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ApiResponse<Room[]>>("/api/rooms/admin");
      setRooms(res.data);
    } catch (err) {
      console.error("Eroare la încărcarea camerelor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const toggleStatus = async (room: Room) => {
    const newStatus = room.status === "active" ? "inactive" : "active";
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/rooms/${room.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      await fetchRooms();
      toast({ title: `Camera setată ca ${statusLabel[newStatus]}` });
    } catch {
      toast({
        title: "Eroare la actualizarea statusului",
        variant: "destructive",
      });
    }
  };

  const deleteRoom = async (id: string) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/rooms/${id}`,
        { method: "DELETE" },
      );
      await fetchRooms();
      toast({ title: "Cameră dezactivată" });
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {rooms.length} camere total
        </p>
        <Button
          size="sm"
          onClick={() => toast({ title: "Funcționalitate în dezvoltare" })}
        >
          <Plus size={16} />
          Adaugă Cameră
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <img
              src={room.primary_image || heroImage}
              alt={room.name}
              className="w-full h-40 object-cover"
            />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading text-base truncate">
                    {room.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {room.price} RON/noapte
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    👥 {room.capacity}{" "}
                    {room.capacity === 1 ? "persoană" : "persoane"}
                    {room.image_count > 0 && ` · 📷 ${room.image_count} poze`}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                    room.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {statusLabel[room.status] || room.status}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => toggleStatus(room)}
                >
                  <Pencil size={14} />
                  {room.status === "active" ? "Dezactivează" : "Activează"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => deleteRoom(room.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRooms;
