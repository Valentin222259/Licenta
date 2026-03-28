import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRooms } from "@/lib/hooks";
import roomPlaceholder from "@/assets/hero-mountains.jpg";

const Rooms = () => {
  const { t } = useTranslation();
  const { rooms, loading, error } = useRooms();
  const [maxPrice, setMaxPrice] = useState(500);
  const [capacity, setCapacity] = useState(0);

  const filtered = rooms.filter(
    (r) => r.price <= maxPrice && (capacity === 0 || r.capacity >= capacity),
  );

  if (loading) {
    return (
      <div className="pt-24 pb-20 flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-24 pb-20 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle size={32} className="text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <h1 className="font-heading text-4xl md:text-5xl text-center mb-4">
          {t("roomsPage.title")}
        </h1>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          {t("roomsPage.subtitle")}
        </p>

        {/* Filtre */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 items-start sm:items-end mb-12 bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex flex-col gap-1 min-w-0 flex-1 sm:flex-initial">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("roomsPage.maxPrice")}
            </label>
            <input
              type="range"
              min={50}
              max={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-sm text-foreground">
              {t("roomsPage.upTo", { price: maxPrice })} RON
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("roomsPage.minGuests")}
            </label>
            <select
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground min-w-[120px]"
            >
              <option value={0}>{t("roomsPage.any")}</option>
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
            </select>
          </div>
        </div>

        {/* Grid camere */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((room) => (
            <div
              key={room.id}
              className="bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <img
                src={room.primary_image || roomPlaceholder}
                alt={room.name}
                className="w-full h-56 object-cover"
              />
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-heading text-xl mb-2">{room.name}</h3>
                <p className="text-muted-foreground text-sm mb-3 flex-1">
                  {room.short_description}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users size={14} />
                  <span>
                    {t("roomsPage.upToGuests", { count: room.capacity })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg text-accent">
                    {room.price} RON
                    <span className="text-sm text-muted-foreground font-body">
                      {t("ourRooms.perNight")}
                    </span>
                  </span>
                  <Button size="sm" asChild>
                    <Link to={`/rooms/${room.slug}`}>
                      {t("ourRooms.viewRoom")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-12">
              {t("roomsPage.noResults")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Rooms;
