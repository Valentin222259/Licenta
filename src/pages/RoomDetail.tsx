import { useParams, Link } from "react-router-dom";
import { rooms } from "@/data/rooms";
import { Button } from "@/components/ui/button";
import { Star, Check, Eye } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import heroImage from "@/assets/hero-mountains.jpg";
import { useTranslation } from "react-i18next";

const RoomDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const room = rooms.find((r) => r.id === id);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tourOpen, setTourOpen] = useState(false);

  if (!room) {
    return (
      <div className="pt-24 pb-20 px-4 text-center">
        <h1 className="font-heading text-3xl mb-4">{t("roomDetail.notFound")}</h1>
        <Button asChild>
          <Link to="/rooms">{t("roomDetail.backToRooms")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="rounded-lg overflow-hidden mb-3">
            <img src={room.images[selectedImage]} alt={room.name} className="w-full h-72 md:h-[28rem] object-cover" />
          </div>
          <div className="flex gap-3">
            {room.images.map((img, i) => (
              <button key={i} onClick={() => setSelectedImage(i)} className={`w-20 h-14 rounded overflow-hidden border-2 transition-colors ${selectedImage === i ? "border-primary" : "border-transparent"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            <button onClick={() => setTourOpen(true)} className="w-20 h-14 rounded border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Eye size={16} />
              <span className="text-[10px] ml-1">360°</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="font-heading text-3xl md:text-4xl mb-4">{room.name}</h1>
            <p className="text-muted-foreground leading-relaxed mb-8">{room.description}</p>

            <h2 className="font-heading text-xl mb-4">{t("roomDetail.amenities")}</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {room.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm">
                  <Check size={14} className="text-primary" />
                  <span>{a}</span>
                </div>
              ))}
            </div>

            <h2 className="font-heading text-xl mb-4">{t("roomDetail.guestReviews")}</h2>
            <div className="space-y-4">
              {room.reviews.map((r, i) => (
                <div key={i} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, j) => (
                        <Star key={j} size={14} className="fill-primary text-primary" />
                      ))}
                    </div>
                    <span className="font-heading text-sm">{r.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{r.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 h-fit sticky top-24">
            <p className="text-muted-foreground text-sm mb-1">{t("roomDetail.from")}</p>
            <p className="font-heading text-3xl text-accent mb-1">{room.price} RON</p>
            <p className="text-sm text-muted-foreground mb-6">{t("roomDetail.perNight")}</p>
            <Button variant="hero" className="w-full" asChild>
              <Link to={`/booking?room=${room.id}`}>{t("roomDetail.reserveNow")}</Link>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={tourOpen} onOpenChange={setTourOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{t("roomDetail.tourTitle")}</DialogTitle>
            <DialogDescription>{t("roomDetail.tourSubtitle", { name: room.name })}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden">
            <img src={heroImage} alt="Virtual tour placeholder — mountain landscape" className="w-full h-64 md:h-80 object-cover" />
          </div>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">{t("roomDetail.tourPlaceholder")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomDetail;
