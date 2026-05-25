import { useState, useRef, useEffect, useCallback } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
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
  Phone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Umbrella,
  Users,
  Lock,
  Unlock,
  Calendar,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { ApiResponse, Booking, Room } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

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

const CANCEL_REASONS = [
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
const fixDiacritics = (str: string) =>
  (str || "")
    .replace(/[ăĂ]/g, (c) => (c === "ă" ? "a" : "A"))
    .replace(/[âÂ]/g, (c) => (c === "â" ? "a" : "A"))
    .replace(/[îÎ]/g, (c) => (c === "î" ? "i" : "I"))
    .replace(/[șşȘŞ]/g, (c) => (/[șş]/.test(c) ? "s" : "S"))
    .replace(/[țţȚŢ]/g, (c) => (/[țţ]/.test(c) ? "t" : "T"))
    .replace(/\^/g, "S");

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
  const green = [30, 77, 43],
    darkText = [22, 48, 29],
    mutedText = [100, 115, 104],
    borderColor = [220, 215, 208],
    rowEven = [248, 246, 242];
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
  const labelColW = 65,
    valueColX = 20 + labelColW + 5,
    valueColW = 170 - labelColW - 5;
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
    if (i % 2 === 0) doc.setFillColor(...rowEven);
    else doc.setFillColor(255, 255, 255);
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

// ─── ScannerBuletin ──────────────────────────────────────────────────────────
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
      const r = await fetch(`${API_URL}/api/extract`, {
        method: "POST",
        body: fd,
      });
      const res = await r.json();
      if (!res.success) throw new Error(res.error);
      setFormData({
        ...res.data,
        country_of_issue: translateCountry(res.data.country_of_issue || ""),
        nationality: translateNationality(res.data.nationality || ""),
      });
      if (GUEST_FIELDS.filter((f) => !res.data[f.key]?.trim()).length > 3)
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
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
        {warning && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle
              size={14}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <p className="text-xs text-amber-800">{warning}</p>
          </div>
        )}
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
                  placeholder="—"
                  onChange={(e) => {
                    setSaved(false);
                    setFormData((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }));
                  }}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            );
          })}
        </div>
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <X size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
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

// ─── Calendar disponibilitate ─────────────────────────────────────────────────
type OccupiedInterval = { check_in: string; check_out: string; type?: string };

const MONTHS_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];
const DAYS_RO = ["D", "L", "M", "M", "J", "V", "S"];

const AvailabilityCalendar = ({
  roomId,
  checkIn,
  checkOut,
  onSelectRange,
}: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  onSelectRange: (ci: string, co: string) => void;
}) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [occupied, setOccupied] = useState<OccupiedInterval[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<"start" | "end" | null>(null);

  useEffect(() => {
    if (!roomId) return;
    setLoadingCal(true);
    // Folosim noul endpoint care include și blocked_periods
    apiFetchRaw(`/api/blocked/availability/${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setOccupied(data.data);
        else setOccupied([]);
      })
      .catch(() => setOccupied([]))
      .finally(() => setLoadingCal(false));
  }, [roomId]);

  const isOccupied = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      return occupied.some((o) => {
        const ci = new Date(o.check_in),
          co = new Date(o.check_out);
        // Rezervări: check-out exclusiv (clientul pleacă în ziua respectivă)
        // Blocări: end_date inclusiv (toată ziua e blocată)
        if (o.type === "booking") return d >= ci && d < co;
        return d >= ci && d <= co;
      });
    },
    [occupied],
  );

  const getOccupiedType = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      const found = occupied.find((o) => {
        const ci = new Date(o.check_in),
          co = new Date(o.check_out);
        if (o.type === "booking") return d >= ci && d < co;
        return d >= ci && d <= co;
      });
      return found?.type || null;
    },
    [occupied],
  );

  const isInSelectedRange = (dateStr: string) => {
    if (!checkIn) return false;
    const end = checkOut || hoverDate;
    if (!end) return dateStr === checkIn;
    const d = new Date(dateStr),
      ci = new Date(checkIn),
      co = new Date(end);
    if (ci > co) return d >= co && d <= ci;
    return d >= ci && d <= co;
  };
  const isRangeStart = (dateStr: string) => dateStr === checkIn;
  const isRangeEnd = (dateStr: string) => {
    const end = checkOut || (selecting === "end" ? hoverDate : null);
    return dateStr === end;
  };

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const today = new Date(todayStr);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay();

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    const d = new Date(dateStr);
    if (d < today) return;
    if (!checkIn || selecting === "start" || (checkIn && checkOut)) {
      onSelectRange(dateStr, "");
      setSelecting("end");
    } else if (selecting === "end") {
      const ci = new Date(checkIn),
        co = new Date(dateStr);
      if (co <= ci) {
        onSelectRange(dateStr, "");
        setSelecting("end");
      } else {
        onSelectRange(checkIn, dateStr);
        setSelecting(null);
      }
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold">
          {MONTHS_RO[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {loadingCal ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-3">
          <div className="grid grid-cols-7 mb-1">
            {DAYS_RO.map((d, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-bold text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const occ = isOccupied(dateStr);
              const occType = getOccupiedType(dateStr);
              const isPast = new Date(dateStr) < today;
              const inRange = isInSelectedRange(dateStr);
              const isStart = isRangeStart(dateStr);
              const isEnd = isRangeEnd(dateStr);
              const isToday = dateStr === todayStr;

              let cellCls =
                "relative h-8 w-full flex items-center justify-center text-xs transition-all select-none ";
              if (isPast)
                cellCls += "text-muted-foreground/40 cursor-not-allowed ";
              else if (occ) {
                if (occType === "maintenance")
                  cellCls +=
                    "bg-amber-100 text-amber-700 cursor-not-allowed rounded ";
                else if (occType === "holiday")
                  cellCls +=
                    "bg-blue-100 text-blue-700 cursor-not-allowed rounded ";
                else
                  cellCls +=
                    "bg-red-100 text-red-600 cursor-not-allowed rounded ";
              } else if (isStart || isEnd)
                cellCls +=
                  "bg-primary text-primary-foreground font-bold rounded-lg cursor-pointer z-10 ";
              else if (inRange)
                cellCls +=
                  "bg-primary/15 text-primary font-medium cursor-pointer ";
              else
                cellCls +=
                  "hover:bg-emerald-50 hover:text-emerald-700 text-foreground cursor-pointer rounded ";
              if (isToday && !isStart && !isEnd && !inRange)
                cellCls +=
                  "ring-1 ring-inset ring-primary/40 rounded font-semibold ";

              return (
                <div
                  key={dateStr}
                  className={cellCls}
                  onClick={() => !isPast && !occ && handleDayClick(dateStr)}
                  onMouseEnter={() =>
                    selecting === "end" &&
                    !occ &&
                    !isPast &&
                    setHoverDate(dateStr)
                  }
                  onMouseLeave={() => setHoverDate(null)}
                  title={
                    occ
                      ? occType === "maintenance"
                        ? "Reparații"
                        : occType === "holiday"
                          ? "Concediu"
                          : "Ocupată"
                      : dateStr
                  }
                >
                  {day}
                  {isToday && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded bg-white border border-border inline-block ring-1 ring-primary/30" />
              Astăzi
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block" />
              Rezervată
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
              Reparații
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
              Concediu
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-3 h-3 rounded bg-primary inline-block" />
              Selectată
            </div>
          </div>
        </div>
      )}
      {(checkIn || checkOut) && (
        <div className="px-3 pb-3 flex gap-2">
          <div
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium border ${checkIn ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
          >
            {checkIn
              ? `Check-in: ${checkIn.split("-").reverse().join("/")}`
              : "Alege check-in"}
          </div>
          <div
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium border ${checkOut ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}
          >
            {checkOut
              ? `Check-out: ${checkOut.split("-").reverse().join("/")}`
              : "Alege check-out"}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── BlockedPeriodsList ───────────────────────────────────────────────────────
type BlockedPeriod = {
  id: string;
  room_id: string | null;
  room_name: string | null;
  reason: string;
  reason_note: string | null;
  start_date: string;
  end_date: string;
  all_rooms: boolean;
  created_at: string;
};

const REASON_LABELS: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  maintenance: {
    label: "Reparații",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: <Wrench size={12} />,
  },
  holiday: {
    label: "Concediu",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    icon: <Umbrella size={12} />,
  },
  other: {
    label: "Alt motiv",
    color: "text-slate-600 bg-slate-50 border-slate-200",
    icon: <Lock size={12} />,
  },
};

const BlockedPeriodsList = ({
  rooms,
  onRefreshCalendar,
}: {
  rooms: Room[];
  onRefreshCalendar: () => void;
}) => {
  const [blocked, setBlocked] = useState<BlockedPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBlocked = async () => {
    setLoading(true);
    try {
      const r = await apiFetchRaw("/api/blocked");
      const data = await r.json();
      if (data.success) setBlocked(data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const r = await apiFetchRaw(`/api/blocked/${id}`, { method: "DELETE" });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: "🔓 Perioadă deblocată cu succes" });
      fetchBlocked();
      onRefreshCalendar();
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Eroare",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const fmt = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y.slice(2)}`;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin text-primary" />
      </div>
    );

  if (blocked.length === 0)
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Unlock size={24} className="mx-auto mb-2 opacity-40" />
        Nicio perioadă blocată activă.
      </div>
    );

  return (
    <div className="space-y-2">
      {blocked.map((bp) => {
        const r = REASON_LABELS[bp.reason] || REASON_LABELS.other;
        return (
          <div
            key={bp.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${r.color}`}
              >
                {r.icon}
                {r.label}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {bp.all_rooms ? (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> Toate camerele
                    </span>
                  ) : (
                    bp.room_name
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {fmt(bp.start_date)} → {fmt(bp.end_date)}
                </p>
                {bp.reason_note && (
                  <p className="text-[10px] text-muted-foreground italic truncate">
                    {bp.reason_note}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(bp.id)}
              disabled={!!deletingId}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 shrink-0"
            >
              {deletingId === bp.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Unlock size={12} />
              )}
              Deblochează
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ─── Modal Rezervare Manuală ──────────────────────────────────────────────────
type BookingType = "phone" | "maintenance" | "holiday";
type ModalTab = "booking" | "blocked";

const ManualBookingModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>("phone");
  const [blockAll, setBlockAll] = useState(false);
  const [tab, setTab] = useState<ModalTab>("booking");
  const [calendarKey, setCalendarKey] = useState(0);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    room_id: "",
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    check_in: "",
    check_out: "",
    notes: "",
  });

  useEffect(() => {
    apiGet<ApiResponse<Room[]>>("/api/rooms/admin")
      .then((res) => {
        const active = res.data.filter((r) => r.status === "active");
        setRooms(active);
        if (active.length > 0)
          setForm((f) => ({ ...f, room_id: active[0].id }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (bookingType !== "phone") setForm((f) => ({ ...f, guest_name: "" }));
    else setForm((f) => ({ ...f, guest_name: "" }));
    setBlockAll(false);
  }, [bookingType]);

  const nights =
    form.check_in && form.check_out
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.check_out).getTime() -
              new Date(form.check_in).getTime()) /
              86400000,
          ),
        )
      : 0;
  const selectedRoom = rooms.find((r) => r.id === form.room_id);
  const totalPrice = selectedRoom ? selectedRoom.price * nights : 0;

  const handleSubmitPhone = async () => {
    if (!form.guest_name.trim() || !form.check_in || !form.check_out) {
      setError("Completați: cameră, nume, check-in și check-out.");
      return;
    }
    if (form.check_out <= form.check_in) {
      setError("Check-out trebuie să fie după check-in.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/bookings", {
        room_id: form.room_id,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || "admin@belvedere.ro",
        guest_phone: form.guest_phone.trim() || null,
        check_in: form.check_in,
        check_out: form.check_out,
        guests: 2,
        special_requests: form.notes.trim() || null,
        source: "phone",
        payment_method: "reception",
        payment_split: "full",
        stripe_amount: null,
        remaining_amount: totalPrice,
        preferred_language: "ro",
      });
      toast({ title: "✅ Rezervare telefonică creată!" });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBlock = async () => {
    if (!form.check_in || !form.check_out) {
      setError("Selectați datele de blocare.");
      return;
    }
    if (form.check_out <= form.check_in) {
      setError("Check-out trebuie să fie după check-in.");
      return;
    }
    if (!blockAll && !form.room_id) {
      setError("Selectați o cameră.");
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        reason: bookingType,
        reason_note: form.notes.trim() || null,
        start_date: form.check_in,
        end_date: form.check_out,
        all_rooms: blockAll,
      };
      if (!blockAll) body.room_id = form.room_id;
      const r = await apiFetchRaw("/api/blocked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!data.success) throw new Error(data.error);
      toast({
        title: blockAll
          ? `🔒 Toate camerele blocate (${rooms.length})`
          : "🔒 Cameră blocată cu succes",
      });
      setCalendarKey((k) => k + 1);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    setError(null);
    if (bookingType === "phone") handleSubmitPhone();
    else handleSubmitBlock();
  };

  const TYPES = [
    {
      key: "phone" as BookingType,
      icon: <Phone size={15} />,
      label: "Telefonic",
      active: "bg-primary text-primary-foreground border-primary",
      idle: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
    },
    {
      key: "maintenance" as BookingType,
      icon: <Wrench size={15} />,
      label: "Reparații",
      active: "bg-amber-500 text-white border-amber-500",
      idle: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    },
    {
      key: "holiday" as BookingType,
      icon: <Umbrella size={15} />,
      label: "Concediu",
      active: "bg-blue-500 text-white border-blue-500",
      idle: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    },
  ];

  const btnColor =
    bookingType === "phone"
      ? "bg-primary hover:bg-primary/90"
      : bookingType === "maintenance"
        ? "bg-amber-500 hover:bg-amber-600"
        : "bg-blue-500 hover:bg-blue-600";
  const showBlockAll = bookingType !== "phone";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-lg z-50 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Phone size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">
                Rezervare Manuală
              </h3>
              <p className="text-xs text-muted-foreground">
                Telefonic · Reparații · Concediu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => setTab("booking")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors border-b-2 ${tab === "booking" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Plus size={14} /> Rezervare / Blocare
          </button>
          <button
            type="button"
            onClick={() => setTab("blocked")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors border-b-2 ${tab === "blocked" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Lock size={14} /> Perioade Blocate
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          {tab === "blocked" ? (
            <BlockedPeriodsList
              rooms={rooms}
              onRefreshCalendar={() => setCalendarKey((k) => k + 1)}
            />
          ) : loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Tip rezervare */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Tip
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(({ key, icon, label, active, idle }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBookingType(key)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${bookingType === key ? active : idle}`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cameră */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Cameră <span className="text-destructive">*</span>
                  </label>
                  {showBlockAll && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">
                        Toate camerele
                      </span>
                      <div
                        className={`relative w-8 h-4 rounded-full transition-colors ${blockAll ? "bg-primary" : "bg-muted border border-border"}`}
                        onClick={() => setBlockAll((v) => !v)}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${blockAll ? "translate-x-4" : ""}`}
                        />
                      </div>
                    </label>
                  )}
                </div>
                {blockAll ? (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-700 flex items-center gap-2">
                    <Users size={14} /> Toate camerele active ({rooms.length}{" "}
                    camere) vor fi blocate
                  </div>
                ) : (
                  <select
                    value={form.room_id}
                    onChange={(e) =>
                      setForm({ ...form, room_id: e.target.value })
                    }
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.price} RON/noapte
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Calendar */}
              {!blockAll && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                    Disponibilitate — selectează datele
                  </label>
                  <AvailabilityCalendar
                    key={`${form.room_id}-${calendarKey}`}
                    roomId={form.room_id}
                    checkIn={form.check_in}
                    checkOut={form.check_out}
                    onSelectRange={(ci, co) =>
                      setForm((f) => ({ ...f, check_in: ci, check_out: co }))
                    }
                  />
                </div>
              )}

              {/* Date manuale (doar când blockAll) */}
              {blockAll && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Data început <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={form.check_in}
                      onChange={(e) =>
                        setForm({ ...form, check_in: e.target.value })
                      }
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Data sfârșit <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      min={form.check_in || today}
                      value={form.check_out}
                      onChange={(e) =>
                        setForm({ ...form, check_out: e.target.value })
                      }
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* Câmpuri client (doar telefonic) */}
              {bookingType === "phone" && (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                      Nume Client <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.guest_name}
                      onChange={(e) =>
                        setForm({ ...form, guest_name: e.target.value })
                      }
                      placeholder="Ion Popescu"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                        Telefon
                      </label>
                      <div className="phone-input-admin">
                        <PhoneInput
                          international
                          defaultCountry="RO"
                          value={form.guest_phone}
                          onChange={(val) =>
                            setForm({ ...form, guest_phone: val || "" })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                        Email{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          (opțional)
                        </span>
                      </label>
                      <input
                        type="email"
                        value={form.guest_email}
                        onChange={(e) =>
                          setForm({ ...form, guest_email: e.target.value })
                        }
                        placeholder="client@email.com"
                        className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sumar preț telefonic */}
              {bookingType === "phone" && nights > 0 && selectedRoom && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {nights} {nights === 1 ? "noapte" : "nopți"} ×{" "}
                    {selectedRoom.price} RON
                  </span>
                  <span className="font-heading text-base font-bold text-primary">
                    {totalPrice} RON
                  </span>
                </div>
              )}

              {/* Sumar blocare */}
              {bookingType !== "phone" && nights > 0 && (
                <div
                  className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${bookingType === "maintenance" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}
                >
                  {bookingType === "maintenance" ? (
                    <Wrench size={15} className="text-amber-600 shrink-0" />
                  ) : (
                    <Umbrella size={15} className="text-blue-600 shrink-0" />
                  )}
                  <span
                    className={`text-sm font-medium ${bookingType === "maintenance" ? "text-amber-700" : "text-blue-700"}`}
                  >
                    {blockAll
                      ? `Toate camerele (${rooms.length})`
                      : selectedRoom?.name}{" "}
                    — {nights} {nights === 1 ? "noapte" : "nopți"} blocate
                  </span>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Note interne
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={
                    bookingType === "phone"
                      ? "Ex: Client fidel, a sunat pe 23 mai..."
                      : bookingType === "maintenance"
                        ? "Ex: Instalator vine pentru țeava spartă..."
                        : "Ex: Concediu echipă 1-14 august..."
                  }
                  rows={2}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle
                    size={14}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {tab === "booking" && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors ${btnColor}`}
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : bookingType === "phone" ? (
                <CheckCircle size={15} />
              ) : (
                <Lock size={15} />
              )}
              {submitting
                ? "Se procesează..."
                : bookingType === "phone"
                  ? "Creează Rezervarea"
                  : blockAll
                    ? `Blochează toate (${rooms.length}) camerele`
                    : "Blochează Camera"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Anulează
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
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

// ─── AdminBookings ────────────────────────────────────────────────────────────
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
  const [manualModalOpen, setManualModalOpen] = useState(false);

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
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtrare:
          </span>
          {filterKeys.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
            >
              {s !== "all" && statusFilter !== s && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${S[s]?.dot}`}
                />
              )}
              {FILTER_LABEL[s]}
            </button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
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
        <button
          type="button"
          onClick={() => setManualModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={15} /> Rezervare Manuală
        </button>
      </div>

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

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => setSelected(b)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{b.guest_name}</p>
                <p className="text-xs text-muted-foreground">{b.guest_email}</p>
              </div>
              <StatusBadge status={b.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                🏠 {b.room_name}
              </span>
              <span className="text-sm font-bold text-foreground">
                {b.total_price} RON
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                📅 Check-in: <strong>{fmt(b.check_in)}</strong>
              </span>
              <span>→</span>
              <span>
                📅 Check-out: <strong>{fmt(b.check_out)}</strong>
              </span>
            </div>
            {b.source === "phone" && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <Phone size={11} /> Rezervare telefonică
              </div>
            )}
            <p className="text-xs text-muted-foreground font-mono border-t border-border pt-2">
              Ref: {b.booking_ref}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop */}
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
                    {[
                      "Ref",
                      "Oaspete",
                      "Cameră",
                      "Check-in",
                      "Check-out",
                      "Total",
                      "Status",
                      "Acțiuni",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center ${i === 2 || i === 7 ? "hidden md:table-cell" : ""} ${i === 3 || i === 4 ? "hidden sm:table-cell" : ""} ${i === 7 ? "min-w-[200px]" : ""} ${i === 0 ? "w-28" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
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
                          <td className="px-4 py-3.5 text-center">
                            <p className="text-xs text-muted-foreground font-mono">
                              {b.booking_ref}
                            </p>
                            {b.source === "phone" && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium mt-0.5">
                                <Phone size={9} /> telefonic
                              </span>
                            )}
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
                                    <AlertTriangle size={13} /> Motiv anulare
                                    pentru{" "}
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
                                        title={description}
                                        onClick={() => {
                                          setQuickCancelReason(label);
                                          setQuickCancelCustom("");
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${quickCancelReason === label ? "bg-red-500 text-white border-red-500 shadow-sm" : "bg-white text-red-700 border-red-200 hover:border-red-400 hover:bg-red-50"}`}
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
                                    autoFocus
                                    className="w-full max-w-xl px-3 py-2 text-sm border border-red-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-muted-foreground"
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

      {/* Modal detalii */}
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
              <div className="px-6 pb-3 shrink-0 flex items-center gap-3">
                <StatusBadge status={selected.status} size="md" />
                {selected.source === "phone" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    <Phone size={11} /> Rezervare telefonică
                  </span>
                )}
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
                {selected.special_requests && (
                  <div className="py-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                      Note interne
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {selected.special_requests}
                    </p>
                  </div>
                )}
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
                              className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${cancelReason === label ? "border-red-400 bg-red-100" : "border-border bg-card hover:border-red-300"}`}
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
                            placeholder="Descrie motivul exact..."
                            rows={3}
                            autoFocus
                            className="w-full px-3 py-2.5 text-sm border border-red-300 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-muted-foreground"
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
                              const fr =
                                cancelReason === OTHER_REASON_KEY
                                  ? cancelCustomText.trim()
                                  : cancelReason;
                              handleCancel(selected.id, fr, true);
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

      {manualModalOpen && (
        <ManualBookingModal
          onClose={() => setManualModalOpen(false)}
          onSuccess={fetchBookings}
        />
      )}
    </div>
  );
};

export default AdminBookings;
