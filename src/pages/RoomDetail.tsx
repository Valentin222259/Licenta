import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Check, Eye, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import heroImage from "@/assets/hero-mountains.jpg";
import { useTranslation } from "react-i18next";
import { useRoom } from "@/lib/hooks";

const RoomDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams(); // id e de fapt slug-ul din URL
  const { room, loading, error } = useRoom(id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pt-24 pb-20 flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // ─── Eroare ─────────────────────────────────────────────────────────────────
  if (error || !room) {
    return (
      <div className="pt-24 pb-20 px-4 text-center">
        <AlertCircle size={32} className="text-destructive mx-auto mb-3" />
        <h1 className="font-heading text-3xl mb-4">
          {t("roomDetail.notFound")}
        </h1>
        <Button asChild>
          <Link to="/rooms">{t("roomDetail.backToRooms")}</Link>
        </Button>
      </div>
    );
  }

  // Imaginile camerei — dacă nu are poze în S3, folosim placeholder
  const images =
    room.images && room.images.length > 0
      ? room.images.map((img) => img.url)
      : [heroImage, heroImage, heroImage];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Galerie imagini */}
        <div className="mb-8">
          <div className="rounded-lg overflow-hidden mb-3">
            <img
              src={images[selectedImage]}
              alt={room.name}
              className="w-full h-72 md:h-[28rem] object-cover"
            />
          </div>
          <div className="flex gap-3">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                  selectedImage === i ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => setTourOpen(true)}
              className="w-20 h-14 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Eye size={16} />
              <span className="text-[10px] ml-1">360°</span>
            </button>
          </div>
        </div>

        {/* Conținut */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="font-heading text-3xl md:text-4xl mb-4">
              {room.name}
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-8">
              {room.description}
            </p>

            {/* Dotări */}
            <h2 className="font-heading text-xl mb-4">
              {t("roomDetail.amenities")}
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {room.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm">
                  <Check size={14} className="text-primary" />
                  <span>{a}</span>
                </div>
              ))}
            </div>

            {/* Recenzii */}
            {room.reviews && room.reviews.length > 0 && (
              <>
                <h2 className="font-heading text-xl mb-4">
                  {t("roomDetail.guestReviews")}
                </h2>
                <div className="space-y-4">
                  {room.reviews.map((r) => (
                    <div key={r.id} className="bg-muted rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: r.rating }).map((_, j) => (
                            <Star
                              key={j}
                              size={14}
                              className="fill-primary text-primary"
                            />
                          ))}
                        </div>
                        <span className="font-heading text-sm">
                          {r.guest_name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(r.created_at).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.text}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sidebar rezervare */}
          <div className="bg-card border border-border rounded-lg p-6 h-fit sticky top-24">
            <p className="text-muted-foreground text-sm mb-1">
              {t("roomDetail.from")}
            </p>
            <p className="font-heading text-3xl text-accent mb-1">
              {room.price} RON
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {t("roomDetail.perNight")}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              👥 Max {room.capacity}{" "}
              {room.capacity === 1 ? "persoană" : "persoane"}
            </p>
            <Button variant="hero" className="w-full" asChild>
              <Link to={`/booking?room=${room.slug}`}>
                {t("roomDetail.reserveNow")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal tur virtual */}
      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">
              {t("roomDetail.tourTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("roomDetail.tourSubtitle", { name: room.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden">
            <img
              src={heroImage}
              alt="Virtual tour placeholder"
              className="w-full h-64 md:h-80 object-cover"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {t("roomDetail.tourPlaceholder")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomDetail;
