import { useState, useRef } from "react";
import { bookings, BookingData } from "@/data/admin-data";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

// ─── Tipuri ──────────────────────────────────────────────────────────────────

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

// ─── Constante ───────────────────────────────────────────────────────────────

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmat",
  pending: "În așteptare",
  cancelled: "Anulat",
};

const filterLabels: Record<string, string> = {
  all: "Toate",
  confirmed: "Confirmate",
  pending: "În așteptare",
  cancelled: "Anulate",
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

const FIELD_ORDER: (keyof GuestIdData)[] = [
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
];

// ─── Scanner Buletin ─────────────────────────────────────────────────────────

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIdData(null);
    setWarning(null);

    if (!file.type.startsWith("image/")) {
      setError("Selectați un fișier imagine (JPEG, PNG sau WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Fișierul depășește limita de 10 MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Eroare server: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const data: GuestIdData = result.data;
      const required: (keyof GuestIdData)[] = ["cnp", "nume", "prenume"];
      if (required.some((f) => !data[f]?.trim())) {
        setWarning(
          "Unele câmpuri nu au putut fi citite. Verificați că fotografia este clară și bine iluminată.",
        );
      }

      setIdData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setLoading(false);
    }
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  const reset = () => {
    setPreview(null);
    setIdData(null);
    setError(null);
    setWarning(null);
  };

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const saveData = () => {
    if (!idData) return;
    // TODO: POST /api/bookings/:bookingId/guest-id
    alert(`Datele buletinului au fost salvate pentru rezervarea ${bookingId}.`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Înapoi
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <ScanLine size={16} className="text-primary" />
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Scanare Buletin
            </p>
            <p className="text-xs text-muted-foreground leading-tight">
              {guestName} · {bookingId}
            </p>
          </div>
        </div>
      </div>

      {/* ── Corp ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Zona upload */}
        {!preview ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ScanLine size={30} className="text-primary" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground mb-1">
                Fotografiați buletinul oaspetelui
              </p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Gemini AI extrage automat toate datele de pe cartea de
                identitate românească
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={openCamera}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Camera size={17} />
                Fă o poză
              </button>
              <button
                type="button"
                onClick={openGallery}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-foreground rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
              >
                <ImageIcon size={17} />
                Din galerie
              </button>
            </div>
            <input
              ref={fileInputRef}
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
            {/* Preview imagine */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="relative bg-slate-900 flex items-center justify-center"
                style={{ minHeight: "200px" }}
              >
                <img
                  src={preview}
                  alt="Buletin oaspete"
                  className="max-w-full max-h-64 object-contain"
                />
                {loading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="text-primary animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">
                        Se procesează...
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Gemini AI analizează documentul
                      </p>
                    </div>
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
                  onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors py-1"
                >
                  <X size={13} />
                  Înlătură
                </button>
              </div>
            </div>

            {/* Warning */}
            {warning && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle
                  size={16}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <p className="text-sm text-amber-800">{warning}</p>
              </div>
            )}

            {/* Date extrase */}
            {idData && !loading && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={17} className="text-emerald-500" />
                    <span className="text-sm font-semibold text-foreground">
                      Date extrase cu succes
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {FIELD_ORDER.filter((k) => idData[k]?.trim()).length}/
                    {FIELD_ORDER.length} câmpuri
                  </span>
                </div>

                {/* Grid 2 coloane pe desktop */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FIELD_ORDER.map((key) => {
                    const value = idData[key];
                    const isEmpty = !value?.trim();
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg ${
                          isEmpty ? "bg-muted/20" : "bg-muted/50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                            {FIELD_LABELS[key]}
                          </p>
                          <p
                            className={`text-sm font-medium truncate ${isEmpty ? "text-muted-foreground italic" : "text-foreground"}`}
                          >
                            {value || "Nedisponibil"}
                          </p>
                        </div>
                        {!isEmpty && (
                          <button
                            type="button"
                            onClick={() => copy(value, key)}
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                            aria-label={`Copiază ${FIELD_LABELS[key]}`}
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

                {/* Buton salvare */}
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={saveData}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Salvează datele buletinului
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Eroare */}
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

      {/* ── Footer GDPR ── */}
      <div className="px-5 py-3.5 border-t border-border bg-muted/20 shrink-0">
        <div className="flex items-start gap-2">
          <ShieldCheck
            size={14}
            className="text-muted-foreground shrink-0 mt-0.5"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Datele sunt prelucrate conform{" "}
            <span className="font-medium">GDPR</span> și stocate exclusiv în
            scopul înregistrării obligatorii a oaspeților (
            <span className="font-medium">OG 97/2005</span>).
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Componentă principală ───────────────────────────────────────────────────

const AdminBookings = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<BookingData | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const filtered = bookings.filter(
    (b) => statusFilter === "all" || b.status === statusFilter,
  );
  const filterKeys = ["all", "confirmed", "pending", "cancelled"] as const;

  const closeModal = () => {
    setSelected(null);
    setScannerOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Filtre */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filtrare:
        </span>
        {filterKeys.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {filterLabels[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "rezervare" : "rezervări"}
        </span>
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  ID
                </th>
                <th className="text-left   px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Oaspete
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Cameră
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Check-in
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                  Check-out
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => {
                const s = statusStyle[b.status] ?? {
                  bg: "bg-muted",
                  text: "text-muted-foreground",
                  dot: "bg-muted-foreground",
                };
                return (
                  <tr
                    key={b.id}
                    onClick={() => {
                      setSelected(b);
                      setScannerOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setSelected(b);
                        setScannerOpen(false);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/20 cursor-pointer transition-colors"
                  >
                    <td className="px-3 sm:px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                      {b.id}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {b.guest}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {b.email}
                      </p>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden md:table-cell">
                      {b.room}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkIn}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center text-sm text-muted-foreground hidden sm:table-cell">
                      {b.checkOut}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span className="text-sm font-semibold text-foreground">
                        €{b.total}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}
                        />
                        {statusLabel[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Închide"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={closeModal}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeModal();
            }}
          />

          {scannerOpen ? (
            /* ────── VIEW SCANNER ────── */
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl z-50 shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
              <ScannerBuletin
                bookingId={selected.id}
                guestName={selected.guest}
                onClose={() => setScannerOpen(false)}
              />
            </div>
          ) : (
            /* ────── VIEW DETALII ────── */
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-md z-50 shadow-2xl animate-fade-in-up overflow-hidden">
              {/* Header modal */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-foreground">
                    Rezervare {selected.id}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Detalii complete
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted ml-4 shrink-0"
                  aria-label="Închide"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Conținut */}
              <div className="px-6 pb-2 divide-y divide-border">
                {[
                  ["Oaspete", selected.guest],
                  ["Email", selected.email],
                  ["Cameră", selected.room],
                  ["Check-in", selected.checkIn],
                  ["Check-out", selected.checkOut],
                  ["Total", `€${selected.total}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-foreground text-right break-all">
                      {value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 gap-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
                    Status
                  </span>
                  {(() => {
                    const s = statusStyle[selected.status] ?? {
                      bg: "bg-muted",
                      text: "text-muted-foreground",
                      dot: "bg-muted-foreground",
                    };
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {statusLabel[selected.status] ?? selected.status}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Acțiuni */}
              <div className="px-6 py-5 space-y-3">
                {/* Buton scanare — proeminent, separat */}
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-primary/8 hover:bg-primary/15 border border-primary/25 hover:border-primary/50 text-primary rounded-xl text-sm font-semibold transition-all"
                >
                  <ScanLine size={17} />
                  Scanează Buletinul Oaspetelui
                </button>

                {/* Confirma / Anulează */}
                <div className="grid grid-cols-2 gap-3">
                  <Button size="sm" className="h-10">
                    Confirmă
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive"
                  >
                    Anulează
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
