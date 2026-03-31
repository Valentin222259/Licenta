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
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Room } from "@/lib/types";

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

// IMPORTANT: folosim /api (proxy Vite) în loc de API_URL direct
// ca să evităm problemele de CORS în development
const apiFetch = (path: string, options?: RequestInit) =>
  fetch(`/api${path}`, options);

// ─── Config tab-uri ───────────────────────────────────────────────────────────
const TABS: {
  key: Category;
  label: string;
  icon: React.ElementType;
  desc: string;
  fetchPath?: string;
  uploadPath?: string;
  showPrimary?: boolean;
}[] = [
  {
    key: "rooms",
    label: "Camere",
    icon: BedDouble,
    desc: "Pozele fiecărei camere. Selectează camera și uploadează.",
    showPrimary: true,
  },
  {
    key: "hero",
    label: "Hero / Copertă",
    icon: Mountain,
    desc: "Imaginile mari afișate în header-ul site-ului și pe pagina principală.",
    fetchPath: "/images?category=hero",
    uploadPath: "/images/hero",
    showPrimary: false,
  },
  {
    key: "facility",
    label: "Facilități",
    icon: Waves,
    desc: "Jacuzzi, biciclete, loc de joacă, grătar — facilitățile pensiunii.",
    fetchPath: "/images?category=facility",
    uploadPath: "/images/facility",
    showPrimary: false,
  },
  {
    key: "about",
    label: "Despre Noi",
    icon: Info,
    desc: "Fotografii pentru pagina Despre Noi — pensiunea, curtea, vederi.",
    fetchPath: "/images?category=about",
    uploadPath: "/images/about",
    showPrimary: false,
  },
];

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
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all select-none
        ${uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        ${
          dragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }
      `}
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

// ─── ImageGrid ────────────────────────────────────────────────────────────────
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
    if (ok > 0) toast({ title: `${ok} imagine(i) uploadată(e) cu succes!` });
    if (fail > 0)
      toast({ title: `${fail} imagine(i) eșuate`, variant: "destructive" });
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
                className={`text-xs mt-0.5 ${
                  selectedId === room.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
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
              {images.length} {images.length === 1 ? "imagine" : "imagini"}
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

// ─── Tab Generic (Hero / Facilități / Despre Noi) ─────────────────────────────
const GenericTab = ({
  fetchPath,
  uploadPath,
  label,
}: {
  fetchPath: string;
  uploadPath: string;
  label: string;
}) => {
  const [images, setImages] = useState<GenericImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await apiGet<ApiResponse<GenericImage[]>>(`/api${fetchPath}`);
      setImages(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [fetchPath]);

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    let ok = 0,
      fail = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("image", file);
      try {
        const res = await apiFetch(uploadPath, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Upload error:", err);
          throw new Error(err.error || "Upload eșuat");
        }
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    await fetchImages();
    setUploading(false);
    if (ok > 0) toast({ title: `${ok} imagine(i) uploadată(e) cu succes!` });
    if (fail > 0)
      toast({
        title: `${fail} imagine(i) eșuate`,
        description: "Verifică dacă S3 este configurat în backend/.env",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {images.length} {images.length === 1 ? "imagine" : "imagini"} în{" "}
          {label}
        </span>
      </div>
      <DropZone onFiles={handleUpload} uploading={uploading} />
      <ImageGrid images={images} loading={loading} onDelete={deleteImage} />
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
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {currentTab.desc}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Uploadul necesită AWS S3 configurat în{" "}
            <code className="font-mono font-bold">backend/.env</code>:{" "}
            <code className="font-mono">AWS_ACCESS_KEY_ID</code>,{" "}
            <code className="font-mono">AWS_SECRET_ACCESS_KEY</code>,{" "}
            <code className="font-mono">S3_BUCKET_NAME</code>.
          </p>
        </div>

        {activeTab === "rooms" && <RoomsTab />}

        {activeTab !== "rooms" &&
          currentTab.fetchPath &&
          currentTab.uploadPath && (
            <GenericTab
              fetchPath={currentTab.fetchPath}
              uploadPath={currentTab.uploadPath}
              label={currentTab.label}
            />
          )}
      </div>
    </div>
  );
};

export default AdminImages;
