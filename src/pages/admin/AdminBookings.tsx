import { useState, useRef, useEffect } from "react";
import {
  X,
  ScanLine,
  Camera,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckSquare,
  XSquare,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Booking } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

interface GuestIdData {
  cnp: string;
  nume: string;
  prenume: string;
  data_nasterii: string;
  sex: string;
  cetatenie: string;
  locul_nasterii: string;
  domiciliu: string;
  serie: string;
  numar: string;
  data_emiterii: string;
  data_expirarii: string;
  emis_de: string;
}

// ─── Stiluri per status ───────────────────────────────────────────────────────
const S: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-400",
  },
  cancelled: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  finished: {
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};

const LABEL: Record<string, string> = {
  confirmed: "Confirmat",
  pending: "În așteptare",
  cancelled: "Anulat",
  finished: "Finalizat",
};

const FILTER_LABEL: Record<string, string> = {
  all: "Toate",
  confirmed: "Confirmate",
  pending: "În așteptare",
  cancelled: "Anulate",
  finished: "Finalizate",
};

const FIELD_LABELS: Record<string, string> = {
  cnp: "CNP",
  nume: "Nume",
  prenume: "Prenume",
  data_nasterii: "Data nașterii",
  sex: "Sex",
  cetatenie: "Cetățenie",
  locul_nasterii: "Locul nașterii",
  domiciliu: "Domiciliu",
  serie: "Serie",
  numar: "Număr",
  data_emiterii: "Data emiterii",
  data_expirarii: "Data expirării",
  emis_de: "Emis de",
};

const FIELD_ORDER = [
  "cnp",
  "nume",
  "prenume",
  "data_nasterii",
  "sex",
  "cetatenie",
  "locul_nasterii",
  "domiciliu",
  "serie",
  "numar",
  "data_emiterii",
  "data_expirarii",
  "emis_de",
] as const;

// Fiecare motiv: label (buton) + description (subtext)
const CANCEL_REASONS: { label: string; description: string }[] = [
  {
    label: "Anulat de către client",
    description: "S-a răzgândit, a intervenit o problemă personală etc.",
  },
  {
    label: "Neprezentare (No-show)",
    description: "Nu a dat niciun semn și nu a apărut în ziua de check-in.",
  },
  {
    label: "Neplata transferului bancar",
    description:
      "A ales transfer bancar, dar nu a trimis banii în termenul de 48h.",
  },
  {
    label: "Cameră indisponibilă / Problemă tehnică",
    description: "Ex: s-a spart o țeavă, nu merge căldura, cameră blocată.",
  },
  {
    label: "Eroare de sistem / Suprarezervare",
    description: "Overbooking — rezervări suprapuse din greșeală.",
  },
  {
    label: "Forță majoră",
    description: "Condiții meteo extreme, drum blocat etc.",
  },
  { label: "Alt motiv...", description: "Specifică manual motivul exact." },
];

const OTHER_REASON_KEY = "Alt motiv...";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const apiFetchRaw = (path: string, options?: RequestInit) => {
  const token = sessionStorage.getItem("token");
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

// ─── Scanner Buletin ──────────────────────────────────────────────────────────
const ScannerBuletin = ({
  bookingId,
  guestName,
  onClose,
}: {
  bookingId: string;
  guestName: string;
  onClose: () => void;
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [idData, setIdData] = useState<GuestIdData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copiedField, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIdData(null);
    setWarning(null);
    setSaved(false);
    if (!file.type.startsWith("image/")) {
      setError("Selectați o imagine (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Fișierul depășește 10 MB.");
      return;
    }
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || `Eroare ${r.status}`);
      }
      const res = await r.json();
      if (!res.success) throw new Error(res.error);
      if (["cnp", "nume", "prenume"].some((f) => !res.data[f]?.trim()))
        setWarning(
          "Unele câmpuri nu au putut fi citite. Verificați că fotografia este clară.",
        );
      setIdData(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (v: string, f: string) => {
    navigator.clipboard.writeText(v);
    setCopied(f);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveData = async () => {
    if (!idData) return;
    try {
      await fetch(`/api/bookings/${bookingId}/guest-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idData),
      });
      setSaved(true);
    } catch {
      setError("Nu s-au putut salva datele.");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ScanLine size={16} className="text-primary" />
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight">
              Scanare Buletin
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {guestName} · {bookingId}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {!preview ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScanLine size={30} className="text-primary" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold mb-1">
                Fotografiați buletinul oaspetelui
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Gemini AI extrage automat datele de pe cartea de identitate
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  fileRef.current?.setAttribute("capture", "environment");
                  fileRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Camera size={17} /> Fă o poză
              </button>
              <button
                type="button"
                onClick={() => {
                  fileRef.current?.removeAttribute("capture");
                  fileRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
              >
                <ImageIcon size={17} /> Din galerie
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="relative bg-slate-900 flex items-center justify-center"
                style={{ minHeight: 200 }}
              >
                <img
                  src={preview}
                  alt="Buletin"
                  className="max-w-full max-h-64 object-contain"
                />
                {loading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="text-primary animate-spin" />
                    <p className="text-sm font-semibold">
                      Gemini AI analizează...
                    </p>
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {loading
                    ? "Analiză în curs..."
                    : idData
                      ? "Procesare completă"
                      : "Gata de procesare"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    setIdData(null);
                    setError(null);
                    setWarning(null);
                    setSaved(false);
                  }}
                  className="flex items-center gap-1.5 text-xs text-destructive py-1"
                >
                  <X size={13} /> Înlătură
                </button>
              </div>
            </div>

            {warning && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle
                  size={16}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <p className="text-sm text-amber-800">{warning}</p>
              </div>
            )}

            {idData && !loading && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={17} className="text-emerald-500" />
                    <span className="text-sm font-semibold">
                      Date extrase cu succes
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {FIELD_ORDER.filter((k) => idData[k]?.trim()).length}/
                    {FIELD_ORDER.length} câmpuri
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FIELD_ORDER.map((key) => {
                    const val = idData[key];
                    const empty = !val?.trim();
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg ${empty ? "bg-muted/20" : "bg-muted/50"}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                            {FIELD_LABELS[key]}
                          </p>
                          <p
                            className={`text-sm font-medium truncate ${empty ? "text-muted-foreground italic" : "text-foreground"}`}
                          >
                            {val || "Nedisponibil"}
                          </p>
                        </div>
                        {!empty && (
                          <button
                            type="button"
                            onClick={() => copy(val, key)}
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedField === key ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 pb-4">
                  {saved ? (
                    <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Date salvate cu succes!
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={saveData}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Salvează datele buletinului
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <X size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-0.5">
                Eroare la procesare
              </p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3.5 border-t border-border bg-muted/20 shrink-0">
        <div className="flex items-start gap-2">
          <ShieldCheck
            size={14}
            className="text-muted-foreground shrink-0 mt-0.5"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Prelucrate conform <strong>GDPR</strong> · înregistrare oaspeți (
            <strong>OG 97/2005</strong>)
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Badge Status ─────────────────────────────────────────────────────────────
const StatusBadge = ({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "md";
}) => {
  const s = S[status] ?? S.pending;
  const pad = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${pad} rounded-full font-medium border ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {LABEL[status] ?? status}
    </span>
  );
};

// ─── Componentă principală ────────────────────────────────────────────────────
const AdminBookings = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // anulare cu motiv — modal
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelCustomText, setCancelCustomText] = useState("");
  // anulare rapidă din tabel
  const [quickCancelId, setQuickCancelId] = useState<string | null>(null);
  const [quickCancelReason, setQuickCancelReason] = useState("");
  const [quickCancelCustom, setQuickCancelCustom] = useState("");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await apiGet<ApiResponse<Booking[]>>(
        `/api/bookings${params}`,
      );
      setBookings(res.data);
      setTotal(res.total || res.data.length);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetchRaw(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Eroare");
      }
      toast({ title: `Rezervare ${LABEL[newStatus].toLowerCase()}` });
      if (selected?.id === id)
        setSelected((prev) =>
          prev ? { ...prev, status: newStatus as any } : null,
        );
      await fetchBookings();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Eroare",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (
    id: string,
    reason: string,
    fromModal = false,
  ) => {
    setActionLoading(true);
    try {
      const res = await apiFetchRaw(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", reason }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "Eroare");
      }
      toast({ title: "Rezervare anulată", description: `Motiv: ${reason}` });
      if (fromModal) {
        setCancelMode(false);
        setCancelReason("");
      }
      setQuickCancelId(null);
      setQuickCancelReason("");
      setQuickCancelCustom("");
      if (selected?.id === id)
        setSelected((prev) =>
          prev ? { ...prev, status: "cancelled" as any } : null,
        );
      await fetchBookings();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Eroare",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const deleteBooking = async (id: string) => {
    setDeleting(true);
    try {
      const res = await apiFetchRaw(`/api/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Eroare la ștergere");
      toast({ title: "Rezervare ștearsă din listă" });
      closeModal();
      await fetchBookings();
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setScannerOpen(false);
    setDeleteConfirm(false);
    setCancelMode(false);
    setCancelReason("");
    setCancelCustomText("");
  };

  const fmt = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear().toString().slice(2)}`;
  };

  const canCancel = (b: Booking) =>
    b.status === "pending" || b.status === "confirmed";
  const canDelete = (b: Booking) =>
    b.status === "cancelled" || b.status === "finished";

  const filterKeys = [
    "all",
    "pending",
    "confirmed",
    "cancelled",
    "finished",
  ] as const;

  return (
    <div className="space-y-5">
      {/* ── Filtre ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filtrare:
        </span>
        {filterKeys.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {s !== "all" && statusFilter !== s && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${S[s]?.dot}`}
              />
            )}
            {FILTER_LABEL[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {total} {total === 1 ? "rezervare" : "rezervări"}
        </span>
        <button
          type="button"
          onClick={fetchBookings}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Legendă ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {["pending", "confirmed", "cancelled", "finished"].map((s) => (
          <div
            key={s}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span className={`w-2 h-2 rounded-full ${S[s].dot}`} />
            {LABEL[s]}
          </div>
        ))}
      </div>

      {/* ── Tabel ─────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Nicio rezervare găsită.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center w-28">
                    Ref
                  </th>
                  {/* Oaspete centrat */}
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Oaspete
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden md:table-cell">
                    Cameră
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden sm:table-cell">
                    Check-in
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden sm:table-cell">
                    Check-out
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center hidden lg:table-cell min-w-[200px]">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const s = S[b.status] ?? S.pending;
                  const isQuickCancel = quickCancelId === b.id;
                  return (
                    <>
                      <tr
                        key={b.id}
                        onClick={() => {
                          if (isQuickCancel) return;
                          setSelected(b);
                          setScannerOpen(false);
                          setDeleteConfirm(false);
                          setCancelMode(false);
                          setCancelReason("");
                        }}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
                      >
                        {/* REF */}
                        <td className="px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                          {b.booking_ref}
                        </td>

                        {/* OASPETE — centrat */}
                        <td className="px-4 py-3.5 text-center">
                          <p className="text-sm font-semibold text-foreground">
                            {b.guest_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.guest_email}
                          </p>
                        </td>

                        {/* CAMERĂ */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden md:table-cell">
                          {b.room_name}
                        </td>

                        {/* CHECK-IN */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                          {fmt(b.check_in)}
                        </td>

                        {/* CHECK-OUT */}
                        <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                          {fmt(b.check_out)}
                        </td>

                        {/* TOTAL */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-semibold">
                            {b.total_price} RON
                          </span>
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={b.status} />
                        </td>

                        {/* ── ACȚIUNI RAPIDE ── */}
                        <td
                          className="px-3 py-3 text-center hidden lg:table-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Confirmă — doar pending */}
                            {b.status === "pending" && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => updateStatus(b.id, "confirmed")}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                title="Confirmă"
                              >
                                <CheckSquare size={12} /> Confirmă
                              </button>
                            )}

                            {/* Anulează — pending sau confirmed */}
                            {canCancel(b) && !isQuickCancel && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setQuickCancelId(b.id);
                                  setQuickCancelReason("");
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="Anulează"
                              >
                                <XSquare size={12} /> Anulează
                              </button>
                            )}

                            {/* Anulare în curs — arată selectorul de motiv */}
                            {isQuickCancel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickCancelId(null);
                                  setQuickCancelReason("");
                                }}
                                className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-border"
                              >
                                ✕ Renunță
                              </button>
                            )}

                            {/* Șterge — cancelled sau finished */}
                            {canDelete(b) && (
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => {
                                  setSelected(b);
                                  setDeleteConfirm(true);
                                  setScannerOpen(false);
                                  setCancelMode(false);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-muted text-muted-foreground border border-border rounded-lg text-xs font-semibold hover:bg-destructive hover:text-white hover:border-destructive transition-colors disabled:opacity-50"
                                title="Șterge din listă"
                              >
                                <Trash2 size={12} /> Șterge
                              </button>
                            )}

                            {/* Fără acțiuni disponibile */}
                            {b.status === "finished" && (
                              <span className="text-xs text-muted-foreground/40 italic">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Rând expandat pentru motiv anulare rapidă ── */}
                      {isQuickCancel && (
                        <tr
                          key={`${b.id}-cancel`}
                          className="bg-red-50/50 border-t border-red-100"
                        >
                          <td
                            colSpan={8}
                            className="px-5 py-4 hidden lg:table-cell"
                          >
                            <div className="space-y-3">
                              {/* Titlu + renunță */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                                  <AlertTriangle size={13} /> Selectează motivul
                                  anulării pentru{" "}
                                  <span className="font-bold">
                                    {b.guest_name}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickCancelId(null);
                                    setQuickCancelReason("");
                                    setQuickCancelCustom("");
                                  }}
                                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border bg-white"
                                >
                                  Renunță
                                </button>
                              </div>
                              {/* Butoane motive */}
                              <div className="flex flex-wrap gap-2">
                                {CANCEL_REASONS.map(
                                  ({ label, description }) => (
                                    <button
                                      key={label}
                                      type="button"
                                      onClick={() => {
                                        setQuickCancelReason(label);
                                        setQuickCancelCustom("");
                                      }}
                                      title={description}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                        quickCancelReason === label
                                          ? "bg-red-500 text-white border-red-500 shadow-sm"
                                          : "bg-white text-red-700 border-red-200 hover:border-red-400 hover:bg-red-50"
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ),
                                )}
                              </div>

                              {/* Textarea pentru Alt motiv */}
                              {quickCancelReason === OTHER_REASON_KEY && (
                                <textarea
                                  value={quickCancelCustom}
                                  onChange={(e) =>
                                    setQuickCancelCustom(e.target.value)
                                  }
                                  placeholder="Descrie motivul exact al anulării..."
                                  rows={2}
                                  className="w-full max-w-xl px-3 py-2 text-sm border border-red-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-muted-foreground"
                                  autoFocus
                                />
                              )}
                              {/* Buton confirmare */}
                              {quickCancelReason && (
                                <div>
                                  <button
                                    type="button"
                                    disabled={
                                      (quickCancelReason === OTHER_REASON_KEY &&
                                        !quickCancelCustom.trim()) ||
                                      actionLoading
                                    }
                                    onClick={() => {
                                      const fr =
                                        quickCancelReason === OTHER_REASON_KEY
                                          ? quickCancelCustom.trim()
                                          : quickCancelReason;
                                      handleCancel(b.id, fr);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    {actionLoading ? (
                                      <Loader2
                                        size={13}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <>
                                        <XSquare size={13} /> Confirmă Anularea
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal detalii ─────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={closeModal}
          />

          {scannerOpen ? (
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl z-50 shadow-2xl flex flex-col max-h-[90vh]">
              <ScannerBuletin
                bookingId={selected.id}
                guestName={selected.guest_name}
                onClose={() => setScannerOpen(false)}
              />
            </div>
          ) : (
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-md z-50 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
                <div>
                  <h3 className="font-heading text-xl font-semibold">
                    Rezervare {selected.booking_ref}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Detalii complete
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted ml-4 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status */}
              <div className="px-6 pb-3 shrink-0">
                <StatusBadge status={selected.status} size="md" />
              </div>

              {/* Detalii */}
              <div className="px-6 pb-2 divide-y divide-border overflow-y-auto flex-1">
                {[
                  ["Oaspete", selected.guest_name],
                  ["Email", selected.guest_email],
                  ["Telefon", selected.guest_phone || "—"],
                  ["Cameră", selected.room_name],
                  [
                    "Check-in",
                    selected.check_in?.split("T")[0] || selected.check_in,
                  ],
                  [
                    "Check-out",
                    selected.check_out?.split("T")[0] || selected.check_out,
                  ],
                  ["Nopți", String(selected.nights)],
                  ["Total", `${selected.total_price} RON`],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                      {l}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right break-all">
                      {v}
                    </span>
                  </div>
                ))}
                {selected.special_requests && (
                  <div className="py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Cereri speciale
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {selected.special_requests}
                    </p>
                  </div>
                )}
              </div>

              {/* Acțiuni */}
              <div className="px-6 py-5 space-y-3 shrink-0 border-t border-border">
                {/* Scanner buletin */}
                {(selected.status === "confirmed" ||
                  selected.status === "pending") && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-primary/8 hover:bg-primary/15 border border-primary/25 hover:border-primary/50 text-primary rounded-xl text-sm font-semibold transition-all"
                  >
                    <ScanLine size={17} /> Scanează Buletinul Oaspetelui
                  </button>
                )}

                {/* Confirmare — pending, fără cancelMode */}
                {selected.status === "pending" && !cancelMode && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => updateStatus(selected.id, "confirmed")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckSquare size={15} />
                    )}
                    Confirmă Rezervarea
                  </button>
                )}

                {/* Anulare cu motiv */}
                {canCancel(selected) && (
                  <div>
                    {!cancelMode ? (
                      <button
                        type="button"
                        onClick={() => setCancelMode(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      >
                        <XSquare size={15} /> Anulează Rezervarea
                      </button>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                          <AlertTriangle size={15} /> Selectează motivul
                          anulării
                        </p>
                        <div className="space-y-1.5">
                          {CANCEL_REASONS.map(({ label, description }) => (
                            <label
                              key={label}
                              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                                cancelReason === label
                                  ? "border-red-400 bg-red-100"
                                  : "border-border bg-card hover:border-red-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="cancelReason"
                                value={label}
                                checked={cancelReason === label}
                                onChange={() => {
                                  setCancelReason(label);
                                  setCancelCustomText("");
                                }}
                                className="accent-red-500 shrink-0 mt-0.5"
                              />
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium leading-tight ${cancelReason === label ? "text-red-700" : "text-foreground"}`}
                                >
                                  {label}
                                </p>
                                {description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    {description}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                        {/* Textarea pentru Alt motiv */}
                        {cancelReason === OTHER_REASON_KEY && (
                          <textarea
                            value={cancelCustomText}
                            onChange={(e) =>
                              setCancelCustomText(e.target.value)
                            }
                            placeholder="Descrie motivul exact al anulării..."
                            rows={3}
                            className="w-full px-3 py-2.5 text-sm border border-red-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-muted-foreground"
                            autoFocus
                          />
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={
                              !cancelReason ||
                              (cancelReason === OTHER_REASON_KEY &&
                                !cancelCustomText.trim()) ||
                              actionLoading
                            }
                            onClick={() => {
                              const finalReason =
                                cancelReason === OTHER_REASON_KEY
                                  ? cancelCustomText.trim()
                                  : cancelReason;
                              handleCancel(selected.id, finalReason, true);
                            }}
                            className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                          >
                            {actionLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "Confirmă Anularea"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelMode(false);
                              setCancelReason("");
                              setCancelCustomText("");
                            }}
                            className="flex-1 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                          >
                            Înapoi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Finalizat */}
                {selected.status === "finished" && (
                  <div className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm text-center">
                    ✓ Rezervare finalizată — sejur încheiat
                  </div>
                )}

                {/* Ștergere */}
                {canDelete(selected) && (
                  <div>
                    {!deleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-destructive/30 text-destructive rounded-xl text-sm font-medium hover:bg-destructive hover:text-white transition-all"
                      >
                        <Trash2 size={15} /> Șterge din listă
                      </button>
                    ) : (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-destructive font-medium flex items-center gap-2">
                          <AlertTriangle size={15} /> Ești sigur că vrei să
                          ștergi această rezervare?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => deleteBooking(selected.id)}
                            disabled={deleting}
                            className="flex-1 py-2 bg-destructive text-white rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors"
                          >
                            {deleting ? (
                              <Loader2
                                size={14}
                                className="animate-spin mx-auto"
                              />
                            ) : (
                              "Da, șterge"
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="flex-1 py-2 bg-muted text-foreground rounded-lg text-sm font-medium"
                          >
                            Anulează
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
