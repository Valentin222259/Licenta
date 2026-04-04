import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Trash2,
  Star,
  Loader2,
  ImageIcon,
  BedDouble,
  Mountain,
  Waves,
  Info,
  AlertCircle,
  Camera,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Room } from "@/lib/types";
import {
  Bike,
  Utensils,
  Snowflake,
  ParkingCircle,
  Gamepad2,
  Baby,
  Shirt,
} from "lucide-react";

// ─── Tipuri ──────────────────────────────────────────────────────────────────
type Category = "rooms" | "hero" | "facility" | "about";

interface GenericImage {
  id: string;
  url: string;
  s3_key?: string;
  caption?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  category?: string;
  room_id?: string | null;
}

// Facilitățile în ordine fixă — trebuie să fie EXACT aceeași ordine ca în About.tsx
const FACILITIES = [
  { key: "jacuzzi", label: "Jacuzzi / Ciubăr", icon: Waves },
  { key: "bikes", label: "Biciclete Gratuite", icon: Bike },
  { key: "pingpong", label: "Masă de Ping Pong", icon: Gamepad2 },
  { key: "sleds", label: "Săniuțe (Iarnă)", icon: Snowflake },
  { key: "grill", label: "Grătar & Ceaun", icon: Utensils },
  { key: "parking", label: "Parcare Gratuită", icon: ParkingCircle },
  { key: "playground", label: "Loc de Joacă Copii", icon: Baby },
  { key: "traditional", label: "Port Tradițional", icon: Shirt },
];

// Proxy Vite
const apiFetch = (path: string, options?: RequestInit) =>
  fetch(`/api${path}`, options);

// ─── Config tab-uri ───────────────────────────────────────────────────────────
const TABS: {
  key: Category;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    key: "rooms",
    label: "Camere",
    icon: BedDouble,
    desc: "Pozele fiecărei camere. Selectează camera și uploadează. Prima poză marcată ⭐ apare în grid și pe pagina de listare.",
  },
  {
    key: "hero",
    label: "Hero / Copertă",
    icon: Mountain,
    desc: "O singură imagine afișată ca banner principal pe pagina de start și în secțiunea Povestea Noastră. Imaginea nouă o înlocuiește pe cea veche.",
  },
  {
    key: "about",
    label: "Despre Noi",
    icon: Info,
    desc: "O singură fotografie afișată în secțiunea Povestea Pensiunii de pe pagina Despre Noi. Imaginea nouă o înlocuiește pe cea veche.",
  },
  {
    key: "facility",
    label: "Facilități",
    icon: Waves,
    desc: "Câte o fotografie pentru fiecare facilitate. Apasă butonul de upload de lângă facilitatea dorită.",
  },
];

// ─── SingleImageUploader ──────────────────────────────────────────────────────
// Folosit pentru Hero și Despre Noi — afișează imaginea curentă + buton înlocuire
const SingleImageUploader = ({
  fetchPath,
  uploadPath,
  label,
}: {
  fetchPath: string;
  uploadPath: string;
  label: string;
}) => {
  const [image, setImage] = useState<GenericImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchImage = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ApiResponse<GenericImage[]>>(`/api${fetchPath}`);
      // Luăm prima imagine (dacă există mai multe rămase din trecut)
      setImage(res.data[0] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImage();
  }, [fetchPath]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Doar fișiere imagine (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fișierul depășește limita de 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    // Dacă există o imagine, o ștergem mai întâi
    if (image?.id) {
      try {
        await apiFetch(`/images/${image.id}`, { method: "DELETE" });
      } catch (e) {
        console.error("Eroare la ștergerea imaginii vechi:", e);
      }
    }

    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await apiFetch(uploadPath, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload eșuat");
      }
      await fetchImage();
      toast({ title: "Imagine adăugată" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Eroare la upload",
        description: e instanceof Error ? e.message : "Verifică S3",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async () => {
    if (!image) return;
    try {
      await apiFetch(`/images/${image.id}`, { method: "DELETE" });
      setImage(null);
      toast({ title: "Imagine ștearsă" });
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {image ? (
        // Imagine existentă
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card">
          <img
            src={image.url}
            alt={label}
            className="w-full h-72 object-cover"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            <CheckCircle size={11} />
            Imagine activă
          </div>
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow"
            >
              {uploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              Înlocuiește
            </button>
            <button
              type="button"
              onClick={deleteImage}
              className="p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors shadow"
              title="Șterge"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        // Nicio imagine
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30 ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={36} className="animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Se uploadează...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera size={28} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Apasă pentru a adăuga imaginea
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WebP — max 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        ℹ️ Poți adăuga o singură imagine. Dacă uploadezi una nouă, o va înlocui
        automat pe cea existentă.
      </p>
    </div>
  );
};

// ─── FacilitiesTab ────────────────────────────────────────────────────────────
// Un card per facilitate cu imagine individuală
const FacilitiesTab = () => {
  // images[index] = imaginea pentru facilitatea cu acel index
  const [images, setImages] = useState<(GenericImage | null)[]>(
    Array(FACILITIES.length).fill(null),
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ApiResponse<GenericImage[]>>(
        "/api/images?category=facility",
      );
      // Asociem imaginile în ordine (sort_order sau created_at)
      const sorted = [...res.data].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      const mapped: (GenericImage | null)[] = Array(FACILITIES.length).fill(
        null,
      );
      sorted.forEach((img, i) => {
        if (i < FACILITIES.length) mapped[i] = img;
      });
      setImages(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFile = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Doar fișiere imagine (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }
    setUploading(index);

    // Ștergem imaginea existentă pentru această facilitate
    const existing = images[index];
    if (existing?.id) {
      try {
        await apiFetch(`/images/${existing.id}`, { method: "DELETE" });
      } catch (e) {
        console.error(e);
      }
    }

    const fd = new FormData();
    fd.append("image", file);
    // Adăugăm sort_order ca să știm poziția
    fd.append("caption", FACILITIES[index].label);

    try {
      const res = await apiFetch("/images/facility", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload eșuat");

      // Actualizăm sort_order în DB prin PATCH dacă e necesar
      // (deocamdată folosim ordinea din array)
      await fetchImages();
      toast({ title: "Imagine adăugată" });
    } catch (e) {
      toast({ title: "Eroare la upload", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const deleteImage = async (index: number) => {
    const img = images[index];
    if (!img) return;
    try {
      await apiFetch(`/images/${img.id}`, { method: "DELETE" });
      setImages((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      toast({ title: "Imagine ștearsă" });
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        ℹ️ Fiecare facilitate are câte un slot de imagine. Imaginile apar în
        pagina <strong>Despre Noi</strong> în același card cu descrierea
        facilității.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FACILITIES.map((facility, index) => {
          const img = images[index];
          const Icon = facility.icon;
          const isUploading = uploading === index;

          return (
            <div
              key={facility.key}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Imagine sau placeholder */}
              <div className="relative h-40 bg-muted">
                {img ? (
                  <>
                    <img
                      src={img.url}
                      alt={facility.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => fileRefs.current[index]?.click()}
                        disabled={isUploading}
                        className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        title="Înlocuiește"
                      >
                        <Upload size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteImage(index)}
                        className="p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                        title="Șterge"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    onClick={() =>
                      !isUploading && fileRefs.current[index]?.click()
                    }
                    className={`w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/80 transition-colors ${isUploading ? "pointer-events-none" : ""}`}
                  >
                    {isUploading ? (
                      <Loader2
                        size={24}
                        className="animate-spin text-primary"
                      />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Upload size={18} className="text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Click pentru upload
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Input ascuns */}
                <input
                  ref={(el) => (fileRefs.current[index] = el)}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFile(index, e.target.files[0])
                  }
                />
              </div>

              {/* Info facilitate */}
              <div className="p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {facility.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {img ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={10} /> Imagine adăugată
                      </span>
                    ) : (
                      "Nicio imagine"
                    )}
                  </p>
                </div>
                {img && (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[index]?.click()}
                    disabled={isUploading}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Schimbă
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── DropZone ─────────────────────────────────────────────────────────────────
const DropZone = ({
  onFiles,
  uploading,
}: {
  onFiles: (files: FileList) => void;
  uploading: boolean;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!uploading && e.dataTransfer.files.length)
          onFiles(e.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all select-none
        ${uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
    >
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) =>
          !uploading && e.target.files?.length && onFiles(e.target.files)
        }
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Se uploadează...
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Trage pozele aici sau apasă pentru upload
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WebP — max 10MB per imagine · poți selecta mai multe
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ImageGrid ─────────────────────────────────────────────────────────────────
const ImageGrid = ({
  images,
  loading,
  showPrimary,
  onSetPrimary,
  onDelete,
}: {
  images: GenericImage[];
  loading: boolean;
  showPrimary?: boolean;
  onSetPrimary?: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon size={36} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nicio imagine uploadată încă.</p>
        <p className="text-xs opacity-60 mt-1">
          Folosește zona de upload de mai sus.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {images.map((img) => (
        <div
          key={img.id}
          className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
            img.is_primary
              ? "border-primary shadow-md shadow-primary/10"
              : "border-transparent hover:border-border"
          }`}
        >
          {img.is_primary && (
            <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
              <Star size={9} />
              Principală
            </div>
          )}
          <img
            src={img.url}
            alt={img.caption || "Imagine"}
            className="w-full h-36 object-cover bg-muted"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
          <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {showPrimary && !img.is_primary && onSetPrimary && (
              <button
                type="button"
                onClick={() => onSetPrimary(img.id)}
                className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                title="Setează ca principală"
              >
                <Star size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(img.id)}
              className="p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              title="Șterge"
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="px-2 py-1.5 bg-card border-t border-border">
            <p className="text-[10px] text-muted-foreground truncate">
              {img.caption || (
                <span className="italic opacity-40">Fără descriere</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Tab Camere ───────────────────────────────────────────────────────────────
const RoomsTab = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [images, setImages] = useState<GenericImage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    apiGet<ApiResponse<Room[]>>("/api/rooms/admin")
      .then((res) => {
        setRooms(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, []);

  const fetchImages = async (roomId: string) => {
    setLoadingImages(true);
    try {
      const res = await apiGet<ApiResponse<GenericImage[]>>(
        `/api/images?category=room&room_id=${roomId}`,
      );
      setImages(res.data);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    if (selectedId) fetchImages(selectedId);
  }, [selectedId]);

  const handleUpload = async (files: FileList) => {
    if (!selectedId) return;
    setUploading(true);
    let ok = 0,
      fail = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      try {
        const res = await apiFetch(`/images/room/${selectedId}`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error();
        ok++;
      } catch {
        fail++;
      }
    }
    await fetchImages(selectedId);
    setUploading(false);
    if (ok > 0) toast({ title: "Imagine adăugată" });
    if (fail > 0) toast({ title: "Eroare la upload", variant: "destructive" });
  };

  const setPrimary = async (imageId: string) => {
    try {
      await apiFetch(`/images/${imageId}/primary`, { method: "PATCH" });
      fetchImages(selectedId);
      toast({ title: "Imagine principală setată!" });
    } catch {
      toast({ title: "Eroare", variant: "destructive" });
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      await apiFetch(`/images/${imageId}`, { method: "DELETE" });
      setImages((p) => p.filter((i) => i.id !== imageId));
      toast({ title: "Imagine ștearsă" });
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    }
  };

  if (loadingRooms)
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );

  const selected = rooms.find((r) => r.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Selectează camera
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedId(room.id)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all border ${
                selectedId === room.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              <p className="truncate leading-snug">{room.name}</p>
              <p
                className={`text-xs mt-0.5 ${selectedId === room.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {room.image_count} {room.image_count === 1 ? "poză" : "poze"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base">{selected.name}</h3>
            <span className="text-xs text-muted-foreground">
              {images.length} {images.length === 1 ? "imagine" : "imagini"} ·
              Prima cu ⭐ = thumbnail
            </span>
          </div>
          <DropZone onFiles={handleUpload} uploading={uploading} />
          <ImageGrid
            images={images}
            loading={loadingImages}
            showPrimary
            onSetPrimary={setPrimary}
            onDelete={deleteImage}
          />
        </>
      )}
    </div>
  );
};

// ─── Componentă principală ────────────────────────────────────────────────────
const AdminImages = () => {
  const [activeTab, setActiveTab] = useState<Category>("rooms");
  const currentTab = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Card principal */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-6 pb-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <currentTab.icon size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-lg leading-tight">
              {currentTab.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-xl">
              {currentTab.desc}
            </p>
          </div>
        </div>

        {activeTab === "rooms" && <RoomsTab />}
        {activeTab === "hero" && (
          <SingleImageUploader
            fetchPath="/images?category=hero"
            uploadPath="/images/hero"
            label="Hero / Copertă"
          />
        )}
        {activeTab === "about" && (
          <SingleImageUploader
            fetchPath="/images?category=about"
            uploadPath="/images/about"
            label="Despre Noi"
          />
        )}
        {activeTab === "facility" && <FacilitiesTab />}
      </div>
    </div>
  );
};

export default AdminImages;
