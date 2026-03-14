import { useState } from "react";
import { adminRooms } from "@/data/admin-data";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomStandard from "@/assets/room-standard.jpg";
import { useTranslation } from "react-i18next";

const imageMap: Record<string, string> = {
  "room-deluxe": roomDeluxe,
  "room-suite": roomSuite,
  "room-standard": roomStandard,
};

const AdminRooms = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<{ id: string; name: string; price: number; status: "active" | "inactive"; image: string }[]>(adminRooms);

  const toggleStatus = (id: string) => {
    setRooms((r) => r.map((room) => room.id === id ? { ...room, status: room.status === "active" ? "inactive" as const : "active" as const } : room));
    toast({ title: t("admin.roomStatusUpdated") });
  };

  const deleteRoom = (id: string) => {
    setRooms((r) => r.filter((room) => room.id !== id));
    toast({ title: t("admin.roomDeleted") });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{t("admin.roomsTotal", { count: rooms.length })}</p>
        <Button size="sm" onClick={() => toast({ title: "Add room dialog coming soon" })}>
          <Plus size={16} />
          {t("admin.addNewRoom")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <div key={room.id} className="bg-card border border-border rounded-lg overflow-hidden">
            <img src={imageMap[room.image]} alt={room.name} className="w-full h-40 object-cover" />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading text-base">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">€{room.price}/night</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${room.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {t(`admin.${room.status}`)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleStatus(room.id)}>
                  <Pencil size={14} />
                  {t("admin.edit")}
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteRoom(room.id)}>
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
