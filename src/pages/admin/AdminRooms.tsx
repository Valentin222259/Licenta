import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, DollarSign, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Room } from "@/lib/types";
import heroImage from "@/assets/hero-mountains.jpg";

const statusLabel: Record<string, string> = {
  active: "activă",
  inactive: "inactivă",
  maintenance: "mentenanță",
};

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const AdminRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal editare preț
  const [priceModal, setPriceModal] = useState<{
    room: Room;
    value: string;
  } | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);

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
      await fetch(`${API}/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchRooms();
      toast({ title: `Camera setată ca ${statusLabel[newStatus]}` });
    } catch {
      toast({
        title: "Eroare la actualizarea statusului",
        variant: "destructive",
      });
    }
  };

  const saveBasePrice = async () => {
    if (!priceModal) return;
    const newPrice = parseInt(priceModal.value);
    if (isNaN(newPrice) || newPrice < 50 || newPrice > 5000) {
      toast({ title: "Preț invalid (50–5000 RON)", variant: "destructive" });
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(
        `${API}/api/rooms/${priceModal.room.id}/base-price`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ price: newPrice }),
        },
      );
      if (!res.ok) throw new Error();
      toast({ title: `✅ Preț de bază actualizat: ${newPrice} RON` });
      setPriceModal(null);
      await fetchRooms();
    } catch {
      toast({ title: "Eroare la salvarea prețului", variant: "destructive" });
    } finally {
      setSavingPrice(false);
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
                  <p className="text-sm text-muted-foreground mt-0.5">
                    <span className="font-medium text-foreground">
                      {room.price} RON
                    </span>
                    /noapte
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
                {/* Editează preț de bază */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() =>
                    setPriceModal({ room, value: String(room.price) })
                  }
                >
                  <DollarSign size={13} />
                  Preț
                </Button>

                {/* Toggle status */}
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => toggleStatus(room)}
                >
                  <Pencil size={13} />
                  {room.status === "active" ? "Dezactivează" : "Activează"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal editare preț de bază */}
      {priceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={() => setPriceModal(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm z-50 shadow-2xl p-6 space-y-4">
            <h3 className="font-heading text-lg font-semibold">
              Editează preț de bază
            </h3>
            <p className="text-sm text-muted-foreground">
              {priceModal.room.name}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preț de bază (RON/noapte)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={priceModal.value}
                  onChange={(e) =>
                    setPriceModal({ ...priceModal, value: e.target.value })
                  }
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-lg font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveBasePrice()}
                />
                <span className="text-muted-foreground font-medium">RON</span>
              </div>
              {priceModal.room.current_price &&
                priceModal.room.current_price !== priceModal.room.price && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Există un preț Smart Pricing activ (
                    {priceModal.room.current_price} RON). Salvarea prețului de
                    bază nu îl resetează automat.
                  </p>
                )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={saveBasePrice}
                disabled={savingPrice}
                className="flex-1 gap-2"
              >
                {savingPrice ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : null}
                Salvează
              </Button>
              <Button
                variant="outline"
                onClick={() => setPriceModal(null)}
                className="flex-1"
              >
                Anulează
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRooms;
