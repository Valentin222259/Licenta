import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Star, Loader2, ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Room, RoomImage } from "@/lib/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const AdminImages = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [images, setImages] = useState<RoomImage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Încarcă camerele ──────────────────────────────────────────────────────
  useEffect(() => {
    apiGet<ApiResponse<Room[]>>("/api/rooms/admin")
      .then((res) => {
        setRooms(res.data);
        if (res.data.length > 0) setSelectedRoomId(res.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, []);

  // ─── Încarcă imaginile camerei selectate ───────────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) return;
    setLoadingImages(true);
    apiGet<ApiResponse<RoomImage[]>>(
      `/api/images?category=room&room_id=${selectedRoomId}`,
    )
      .then((res) => setImages(res.data))
      .catch(console.error)
      .finally(() => setLoadingImages(false));
  }, [selectedRoomId]);

  // ─── Upload imagine ────────────────────────────────────────────────────────
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedRoomId) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("caption", "");

        const res = await fetch(
          `${API_URL}/api/images/room/${selectedRoomId}`,
          {
            method: "POST",
            body: formData,
          },
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload eșuat");
        }
      }

      // Reîncarcă imaginile
      const res = await apiGet<ApiResponse<RoomImage[]>>(
        `/api/images?category=room&room_id=${selectedRoomId}`,
      );
      setImages(res.data);
      toast({ title: `${files.length} imagine(i) uploadată(e) cu succes!` });
    } catch (err) {
      toast({
        title: "Eroare upload",
        description: err instanceof Error ? err.message : "Eroare necunoscută",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Setează imaginea primară ──────────────────────────────────────────────
  const setPrimary = async (imageId: string) => {
    try {
      await fetch(`${API_URL}/api/images/${imageId}/primary`, {
        method: "PATCH",
      });
      const res = await apiGet<ApiResponse<RoomImage[]>>(
        `/api/images?category=room&room_id=${selectedRoomId}`,
      );
      setImages(res.data);
      toast({ title: "Imagine primară setată!" });
    } catch {
      toast({ title: "Eroare", variant: "destructive" });
    }
  };

  // ─── Șterge imaginea ──────────────────────────────────────────────────────
  const deleteImage = async (imageId: string) => {
    try {
      await fetch(`${API_URL}/api/images/${imageId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast({ title: "Imagine ștearsă" });
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    }
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector cameră */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-heading text-lg mb-4">Selectează Camera</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedRoomId(room.id)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all border ${
                selectedRoomId === room.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              <p className="truncate">{room.name}</p>
              <p
                className={`text-xs mt-0.5 ${selectedRoomId === room.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {room.image_count} {room.image_count === 1 ? "poză" : "poze"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      {selectedRoom && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg">
              Imagini — {selectedRoom.name}
            </h2>
            <span className="text-xs text-muted-foreground">
              {images.length} {images.length === 1 ? "imagine" : "imagini"}
            </span>
          </div>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors mb-6"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleUpload(e.dataTransfer.files);
            }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Se uploadează...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload size={22} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Trage pozele aici sau click pentru upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WebP — max 10MB per imagine
                  </p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />

          {/* Grid imagini */}
          {loadingImages ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ImageIcon size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Nicio imagine uploadată încă pentru această cameră.
              </p>
              <p className="text-xs mt-1">
                Uploadează prima imagine folosind zona de mai sus.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className={`relative bg-card rounded-xl overflow-hidden border-2 transition-all group ${
                    img.is_primary
                      ? "border-primary shadow-md"
                      : "border-border"
                  }`}
                >
                  {/* Badge primară */}
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star size={9} /> Principală
                    </div>
                  )}

                  {/* Imagine */}
                  <img
                    src={img.url}
                    alt={img.caption || "Imagine cameră"}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />

                  {/* Acțiuni — apar la hover */}
                  <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.is_primary && (
                      <button
                        type="button"
                        onClick={() => setPrimary(img.id)}
                        className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        title="Setează ca principală"
                      >
                        <Star size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteImage(img.id)}
                      className="p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                      title="Șterge imaginea"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {img.caption || "Fără descriere"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminImages;
