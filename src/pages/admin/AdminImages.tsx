import { useState } from "react";
import { Upload, Trash2, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomStandard from "@/assets/room-standard.jpg";
import heroImage from "@/assets/hero-mountains.jpg";
import { useTranslation } from "react-i18next";

const roomOptions = [
  { id: "deluxe", name: "Deluxe Mountain View" },
  { id: "suite", name: "Fireplace Suite" },
  { id: "classic", name: "Classic Comfort" },
];

const AdminImages = () => {
  const { t } = useTranslation();
  const [selectedRoom, setSelectedRoom] = useState(roomOptions[0].id);

  const roomImages: Record<string, { src: string; caption: string }[]> = {
    deluxe: [{ src: roomDeluxe, caption: "Main view" }, { src: roomSuite, caption: "Interior detail" }],
    suite: [{ src: roomSuite, caption: "Fireplace view" }, { src: roomStandard, caption: "Bedroom" }],
    classic: [{ src: roomStandard, caption: "Room overview" }],
  };

  const heroImages = [{ src: heroImage, caption: "Mountain sunrise panorama" }];
  const handleUpload = () => toast({ title: "Upload functionality coming with backend integration" });
  const handleDelete = () => toast({ title: "Image deleted" });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-heading text-xl mb-4">{t("admin.roomImages")}</h2>
        <div className="flex flex-wrap gap-4 items-end mb-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">{t("admin.selectRoom")}</label>
            <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground">
              {roomOptions.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
        </div>

        <div onClick={handleUpload} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors mb-6">
          <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t("admin.dragDropRoom")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("admin.fileLimit")}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(roomImages[selectedRoom] || []).map((img, i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden group relative">
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"><GripVertical size={16} className="text-card-foreground/60" /></div>
              <img src={img.src} alt={img.caption} className="w-full h-28 object-cover" />
              <div className="p-2 flex items-center justify-between">
                <input defaultValue={img.caption} className="text-xs bg-transparent border-none outline-none flex-1 text-foreground" placeholder="Caption..." />
                <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors ml-2"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl mb-4">{t("admin.heroImages")}</h2>
        <div onClick={handleUpload} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors mb-6">
          <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{t("admin.dragDropHero")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {heroImages.map((img, i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden group relative">
              <img src={img.src} alt={img.caption} className="w-full h-36 object-cover" />
              <div className="p-2 flex items-center justify-between">
                <input defaultValue={img.caption} className="text-xs bg-transparent border-none outline-none flex-1 text-foreground" placeholder="Caption..." />
                <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors ml-2"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminImages;
