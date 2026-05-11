import { useState, useRef, useEffect } from "react";
import {
  X,
  ScanLine,
  Camera,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckSquare,
  Search,
  XSquare,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import type { ApiResponse, Booking } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

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

const CANCEL_REASONS: { label: string; description: string }[] = [
  {
    label: "Anulat de către client",
    description: "S-a răzgândit, a intervenit o problemă personală etc.",
  },
  {
    label: "Neprezentare",
    description: "Nu a dat niciun semn și nu a apărut în ziua de check-in.",
  },
  {
    label: "Neplata transferului bancar",
    description: "A ales transfer bancar, dar nu a trimis banii în termen.",
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
    label: "Fenomene meteo intense",
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

// ─── Câmpuri universale act identitate ───────────────────────────────────────
const GUEST_FIELDS = [
  { key: "document_type", label: "Tip Document" },
  { key: "country_of_issue", label: "Tara Emitenta" },
  { key: "document_number", label: "Numar Document" },
  { key: "personal_identification_number", label: "CNP / Nr. Identificare" },
  { key: "last_name", label: "Nume" },
  { key: "first_names", label: "Prenume" },
  { key: "date_of_birth", label: "Data Nasterii" },
  { key: "nationality", label: "Nationalitate" },
  { key: "address", label: "Domiciliu" },
  { key: "sex", label: "Sex" },
  { key: "date_of_expiry", label: "Data Expirarii" },
] as const;

type UniversalGuestData = Record<string, string>;

function getPinLabel(country: string) {
  return country?.toLowerCase().includes("roman")
    ? "CNP"
    : "Nr. Identificare National";
}

// ─── Export PDF cu jsPDF ──────────────────────────────────────────────────────
const fixDiacritics = (str: string) =>
  (str || "")
    .replace(/[ăĂ]/g, (c) => (c === "ă" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "â" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "î" ? "i" : "I"))
    .replace(/[șşȘŞ]/g, (c) => (/[șş]/.test(c) ? "s" : "S"))
    .replace(/[țţȚŢ]/g, (c) => (/[țţ]/.test(c) ? "t" : "T"))
    .replace(/\^/g, "S"); // pașaport românesc folosește ^ pentru Ș
const translateNationality = (val: string) => {
  const map: Record<string, string> = {
    ROU: "Romana",
    Romanian: "Romana",
    MDA: "Moldoveana",
    Moldovan: "Moldoveana",
    HUN: "Maghiara",
    Hungarian: "Maghiara",
    DEU: "Germana",
    German: "Germana",
    FRA: "Franceza",
    French: "Franceza",
    ITA: "Italiana",
    Italian: "Italiana",
    ESP: "Spaniola",
    Spanish: "Spaniola",
    BGR: "Bulgara",
    Bulgarian: "Bulgara",
    UKR: "Ucraineana",
    Ukrainian: "Ucraineana",
    GBR: "Engleza",
    British: "Engleza",
    English: "Engleza",
    AUT: "Austriaca",
    Austrian: "Austriaca",
    NLD: "Olandeza",
    Dutch: "Olandeza",
    BEL: "Belgiana",
    Belgian: "Belgiana",
    CZE: "Ceha",
    Czech: "Ceha",
    SVK: "Slovaca",
    Slovak: "Slovaca",
    POL: "Poloneza",
    Polish: "Poloneza",
    HRV: "Croata",
    Croatian: "Croata",
    SRB: "Sarba",
    Serbian: "Sarba",
    GRC: "Greaca",
    Greek: "Greaca",
    TUR: "Turca",
    Turkish: "Turca",
    USA: "Americana",
    American: "Americana",
  };
  return map[val] || val;
};

const translateCountry = (val: string) => {
  const map: Record<string, string> = {
    ROU: "Romania",
    ROM: "Romania",
    Romania: "Romania",
    MDA: "Moldova",
    Moldova: "Moldova",
    HUN: "Ungaria",
    Hungary: "Ungaria",
    DEU: "Germania",
    Germany: "Germania",
    FRA: "Franta",
    France: "Franta",
    ITA: "Italia",
    Italy: "Italia",
    ESP: "Spania",
    Spain: "Spania",
    BGR: "Bulgaria",
    Bulgaria: "Bulgaria",
    UKR: "Ucraina",
    Ukraine: "Ucraina",
    GBR: "Marea Britanie",
    "United Kingdom": "Marea Britanie",
    AUT: "Austria",
    Austria: "Austria",
    NLD: "Olanda",
    Netherlands: "Olanda",
    BEL: "Belgia",
    Belgium: "Belgia",
    CZE: "Cehia",
    "Czech Republic": "Cehia",
    SVK: "Slovacia",
    Slovakia: "Slovacia",
    POL: "Polonia",
    Poland: "Polonia",
    HRV: "Croatia",
    Croatia: "Croatia",
    SRB: "Serbia",
    Serbia: "Serbia",
    GRC: "Grecia",
    Greece: "Grecia",
    TUR: "Turcia",
    Turkey: "Turcia",
    USA: "Statele Unite",
    "United States": "Statele Unite",
  };
  return map[val] || val;
};

async function exportGuestPDF(
  data: UniversalGuestData,
  guestName: string,
  bookingRef: string,
) {
  const { jsPDF } = await import(
    "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm" as any
  );
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const green = [30, 77, 43];
  const darkText = [22, 48, 29];
  const mutedText = [100, 115, 104];
  const borderColor = [220, 215, 208];
  const rowEven = [248, 246, 242];

  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PENSIUNEA", 105, 12, { align: "center" });
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Maramures Belvedere", 105, 22, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Str. Hera, Nr. 2, Petrova, Maramures", 105, 30, {
    align: "center",
  });

  doc.setTextColor(...darkText);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Fisa de Inregistrare Oaspete", 20, 52);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text(
    `Rezervare: ${bookingRef}   |   Oaspete: ${fixDiacritics(guestName)}   |   Data: ${new Date().toLocaleDateString("ro-RO")}`,
    20,
    59,
  );
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(20, 63, 190, 63);

  let y = 72;
  const labelColW = 65;
  const valueColX = 20 + labelColW + 5;
  const valueColW = 170 - labelColW - 5;

  GUEST_FIELDS.forEach((field, i) => {
    const label =
      field.key === "personal_identification_number"
        ? getPinLabel(data.country_of_issue || "")
        : field.label;

    const value = fixDiacritics(
      field.key === "nationality"
        ? translateNationality(data[field.key] || "—")
        : field.key === "country_of_issue"
          ? translateCountry(data[field.key] || "—")
          : data[field.key] || "—",
    );

    doc.setFontSize(9.5);
    const valueLines: string[] = doc.splitTextToSize(value, valueColW);
    const cellH = Math.max(11, valueLines.length * 5.5 + 4);

    if (i % 2 === 0) {
      doc.setFillColor(...rowEven);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(20, y - 7, 170, cellH, "F");
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.2);
    doc.rect(20, y - 7, 170, cellH);
    doc.line(20 + labelColW, y - 7, 20 + labelColW, y - 7 + cellH);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mutedText);
    doc.text(label.toUpperCase(), 25, y);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkText);
    doc.text(valueLines, valueColX, y);

    y += cellH;
  });

  y += 12;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(20, y, 190, y);
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text(
    "Document generat conform OG 97/2005 privind evidenta persoanelor.",
    20,
    y,
  );
  doc.text(
    `Generat automat la ${new Date().toLocaleString("ro-RO")}`,
    20,
    y + 5,
  );
  doc.save(
    `fisa-oaspete-${bookingRef}-${fixDiacritics(guestName).replace(/\s+/g, "-")}.pdf`,
  );
}

// ─── ScannerBuletin ───────────────────────────────────────────────────────────
const ScannerBuletin = ({
  bookingId,
  guestName,
  bookingRef,
  onClose,
}: {
  bookingId: string;
  guestName: string;
  bookingRef: string;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<UniversalGuestData>({});
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setWarning(null);
    setSaved(false);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      const res = await r.json();
      if (!res.success) throw new Error(res.error);
      // Traducem țara și naționalitatea direct la primire
      const translated = {
        ...res.data,
        country_of_issue: translateCountry(res.data.country_of_issue || ""),
        nationality: translateNationality(res.data.nationality || ""),
      };
      setFormData(translated);
      const missing = GUEST_FIELDS.filter(
        (f) => !res.data[f.key]?.trim(),
      ).length;
      if (missing > 3)
        setWarning("Unele câmpuri nu au putut fi citite. Completați manual.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la procesare.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("token");
      const r = await fetch(`${API_URL}/api/bookings/${bookingId}/guest`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });
      if (!r.ok) throw new Error("Eroare la salvare");
      setSaved(true);
      setTimeout(() => onClose(), 1500);
    } catch {
      setError("Nu s-au putut salva datele.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportGuestPDF(formData, guestName, bookingRef);
    } catch {
      setError("Nu s-a putut genera PDF-ul.");
    } finally {
      setExporting(false);
    }
  };

  const hasData = Object.values(formData).some((v) => v?.trim());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} /> Înapoi
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold leading-tight">Act Identitate</p>
          <p className="text-xs text-muted-foreground">
            {guestName} · {bookingRef}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Butoane scanare */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={scanning}
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {scanning ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Camera size={15} />
            )}
            {scanning ? "Analizează..." : "Fă o poză"}
          </button>

          <button
            type="button"
            disabled={scanning}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <ImageIcon size={15} /> Din galerie
          </button>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
        </div>

        {/* Warning */}
        {warning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle
              size={14}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-800">{warning}</p>
          </div>
        )}

        {/* Formular */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GUEST_FIELDS.map((field) => {
            const label =
              field.key === "personal_identification_number"
                ? getPinLabel(formData.country_of_issue || "")
                : field.label;
            return (
              <div
                key={field.key}
                className={field.key === "address" ? "sm:col-span-2" : ""}
              >
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                  {label}
                </label>
                <input
                  type="text"
                  value={formData[field.key] || ""}
                  onChange={(e) => {
                    setSaved(false);
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }));
                  }}
                  placeholder="—"
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            );
          })}
        </div>

        {/* Eroare */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <X size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Acțiuni + GDPR */}
        <div className="space-y-3 pt-1">
          <div className="flex gap-2">
            {saved ? (
              <div className="flex-1 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle size={15} /> Salvat cu succes!
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasData}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Salvează
              </button>
            )}

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !hasData}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span>📄</span>
              )}
              Export PDF
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Prelucrate conform <strong>GDPR</strong> · OG 97/2005
            </p>
          </div>
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
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelCustomText, setCancelCustomText] = useState("");
  const [quickCancelId, setQuickCancelId] = useState<string | null>(null);
  const [quickCancelReason, setQuickCancelReason] = useState("");
  const [quickCancelCustom, setQuickCancelCustom] = useState("");
  const [search, setSearch] = useState("");

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
    const s = String(d).substring(0, 10);
    const [y, m, day] = s.split("-");
    return `${day}/${m}/${y.slice(2)}`;
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

  const filtered = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.guest_name?.toLowerCase().includes(q) ||
      b.guest_email?.toLowerCase().includes(q) ||
      b.booking_ref?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* ── Filtre ── */}
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

      {/* ── Legendă ── */}
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

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută după nume, email sau referință..."
          className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring pl-9"
        />
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Tabel ── */}
      <div className="md:hidden space-y-3">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => setSelected(b)}
          >
            {/* Rând 1: Nume + Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{b.guest_name}</p>
                <p className="text-xs text-muted-foreground">{b.guest_email}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>

            {/* Rând 2: Cameră + Preț */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                🏠 {b.room_name}
              </span>
              <span className="text-sm font-bold text-foreground">
                {b.total_price} RON
              </span>
            </div>

            {/* Rând 3: Date */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                📅 Check-in: <strong>{fmt(b.check_in)}</strong>
              </span>
              <span>→</span>
              <span>
                📅 Check-out: <strong>{fmt(b.check_out)}</strong>
              </span>
            </div>

            {/* Rând 4: Referință */}
            <p className="text-xs text-muted-foreground font-mono border-t border-border pt-2">
              Ref: {b.booking_ref}
            </p>
          </div>
        ))}
      </div>

      {/* ── Tabel desktop ── */}
      <div className="hidden md:block">
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
                    <th className="px-4 py-3 text-xs text-center font-semibold uppercase tracking-wider text-muted-foreground w-28">
                      Ref
                    </th>
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
                  {filtered.map((b) => {
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
                          <td className="px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                            {b.booking_ref}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <p className="text-sm font-semibold text-foreground">
                              {b.guest_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {b.guest_email}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden md:table-cell">
                            {b.room_name}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                            {fmt(b.check_in)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground text-center hidden sm:table-cell">
                            {fmt(b.check_out)}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="text-sm font-semibold">
                              {b.total_price} RON
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <StatusBadge status={b.status} />
                          </td>
                          <td
                            className="px-3 py-3 text-center hidden lg:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {b.status === "pending" && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() =>
                                    updateStatus(b.id, "confirmed")
                                  }
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                >
                                  <CheckSquare size={12} /> Confirmă
                                </button>
                              )}
                              {canCancel(b) && !isQuickCancel && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => {
                                    setQuickCancelId(b.id);
                                    setQuickCancelReason("");
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <XSquare size={12} /> Anulează
                                </button>
                              )}
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
                                >
                                  <Trash2 size={12} /> Șterge
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

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
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                                    <AlertTriangle size={13} /> Selectează
                                    motivul anulării pentru{" "}
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
                                {quickCancelReason && (
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
      </div>

      {/* ── Modal detalii ── */}
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
                bookingRef={selected.booking_ref}
                onClose={async () => {
                  setScannerOpen(false);
                  await fetchBookings();
                  // reîncarcă selected cu datele noi
                  const res = await fetch(
                    `${API_URL}/api/bookings/${selected.id}`,
                  );
                  const data = await res.json();
                  if (data.success) setSelected(data.data);
                }}
              />
            </div>
          ) : (
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-md z-50 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
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

              <div className="px-6 pb-3 shrink-0">
                <StatusBadge status={selected.status} size="md" />
              </div>

              <div className="px-6 pb-2 divide-y divide-border overflow-y-auto flex-1">
                {[
                  ["Oaspete", selected.guest_name],
                  ["Email", selected.guest_email],
                  ["Telefon", selected.guest_phone || "—"],
                  ["Cameră", selected.room_name],
                  ["Check-in", fmt(selected.check_in)],
                  ["Check-out", fmt(selected.check_out)],
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

                {selected.extras_json &&
                  (() => {
                    const ex =
                      typeof selected.extras_json === "string"
                        ? JSON.parse(selected.extras_json)
                        : selected.extras_json;
                    const fmtD = (iso: string) => {
                      const [y, m, d] = iso.split("-");
                      return `${d}/${m}/${y.slice(2)}`;
                    };
                    const totalBreakfast =
                      ex.breakfast && typeof ex.breakfast === "object"
                        ? Object.values(
                            ex.breakfast as Record<string, number>,
                          ).reduce((s, n) => s + n, 0)
                        : 0;
                    const totalDinner =
                      ex.dinner && typeof ex.dinner === "object"
                        ? Object.values(
                            ex.dinner as Record<string, number>,
                          ).reduce((s, n) => s + n, 0)
                        : 0;
                    const jacuzziDates: string[] = Array.isArray(
                      ex.jacuzzi_dates,
                    )
                      ? ex.jacuzzi_dates
                      : [];
                    if (
                      !totalBreakfast &&
                      !totalDinner &&
                      !ex.extra_beds &&
                      !jacuzziDates.length
                    )
                      return null;
                    return (
                      <div className="py-3 border-t border-border">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                          Servicii Suplimentare
                        </span>
                        <div className="space-y-2">
                          {totalBreakfast > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-amber-800 mb-1">
                                ☕ Mic dejun — {totalBreakfast} meniuri
                              </p>
                              {Object.entries(
                                ex.breakfast as Record<string, number>,
                              )
                                .filter(([, n]) => n > 0)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([date, n]) => (
                                  <p
                                    key={date}
                                    className="text-xs text-amber-700"
                                  >
                                    {fmtD(date)}: {n}{" "}
                                    {n === 1 ? "meniu" : "meniuri"}
                                  </p>
                                ))}
                            </div>
                          )}
                          {totalDinner > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-orange-800 mb-1">
                                🍽️ Cină — {totalDinner} meniuri
                              </p>
                              {Object.entries(
                                ex.dinner as Record<string, number>,
                              )
                                .filter(([, n]) => n > 0)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([date, n]) => (
                                  <p
                                    key={date}
                                    className="text-xs text-orange-700"
                                  >
                                    {fmtD(date)}: {n}{" "}
                                    {n === 1 ? "meniu" : "meniuri"}
                                  </p>
                                ))}
                            </div>
                          )}
                          {ex.extra_beds > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-blue-800">
                                🛏️ Paturi suplimentare: {ex.extra_beds}
                              </p>
                            </div>
                          )}
                          {jacuzziDates.length > 0 && (
                            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                              <p className="text-xs font-semibold text-teal-800 mb-1">
                                🫧 Ciubăr — {jacuzziDates.length}{" "}
                                {jacuzziDates.length === 1
                                  ? "sesiune"
                                  : "sesiuni"}
                              </p>
                              {jacuzziDates.sort().map((date) => (
                                <p key={date} className="text-xs text-teal-700">
                                  {fmtD(date)}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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

                {(selected as any).guest_data &&
                  (() => {
                    const gd =
                      typeof (selected as any).guest_data === "string"
                        ? JSON.parse((selected as any).guest_data)
                        : (selected as any).guest_data;
                    const fields = [
                      { key: "document_type", label: "Tip Document" },
                      { key: "country_of_issue", label: "Tara Emitenta" },
                      { key: "document_number", label: "Numar Document" },
                      {
                        key: "personal_identification_number",
                        label: gd.country_of_issue
                          ?.toLowerCase()
                          .includes("roman")
                          ? "CNP"
                          : "Nr. Identificare",
                      },
                      { key: "last_name", label: "Nume" },
                      { key: "first_names", label: "Prenume" },
                      { key: "date_of_birth", label: "Data Nasterii" },
                      { key: "nationality", label: "Nationalitate" },
                      { key: "address", label: "Domiciliu" },
                      { key: "sex", label: "Sex" },
                      { key: "date_of_expiry", label: "Data Expirarii" },
                    ];
                    return (
                      <div className="py-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Date Identitate
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              exportGuestPDF(
                                gd,
                                selected.guest_name,
                                selected.booking_ref,
                              )
                            }
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-lg text-xs font-medium hover:bg-muted transition-colors"
                          >
                            📄 Export PDF
                          </button>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1.5">
                          {fields
                            .filter((f) => gd[f.key]?.trim())
                            .map((f) => (
                              <div key={f.key} className="flex gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 w-28 shrink-0 pt-0.5">
                                  {f.label}
                                </span>
                                <span className="text-xs text-emerald-900 font-medium">
                                  {gd[f.key]}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })()}
              </div>

              <div className="px-6 py-5 space-y-3 shrink-0 border-t border-border">
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

                {selected.status === "finished" && (
                  <div className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm text-center">
                    ✓ Rezervare finalizată — sejur încheiat
                  </div>
                )}

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
