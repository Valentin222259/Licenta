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
  ChevronLeft,
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
  all: "toate",
  confirmed: "confirmate",
  pending: "în așteptare",
  cancelled: "anulate",
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

// ─── Subcomponentă: Scanner Buletin ──────────────────────────────────────────

const ScannerBuletin = ({
  bookingId,
  onClose,
}: {
  bookingId: string;
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
      setError("Fișierul depășește limita de 10MB.");
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
      const missing = required.filter((f) => !data[f]?.trim());
      if (missing.length > 0) {
        setWarning(
          "Datele extrase par incomplete. Verificați că fotografia este clară și că documentul este o carte de identitate românească.",
        );
      }

      setIdData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={16} />
          Înapoi
        </button>
        <div className="flex-1 h-px bg-border" />
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ScanLine size={16} className="text-primary" />
          Scanare Buletin — {bookingId}
        </span>
      </div>

      {/* Upload zone */}
      {!preview ? (
        <div className="bg-muted/40 border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <ScanLine size={26} className="text-primary" />
          </div>
          <div>
            <p className="font-heading text-base font-semibold mb-1">
              Fotografiați sau încărcați buletinul oaspetelui
            </p>
            <p className="text-xs text-muted-foreground">
              Gemini AI extrage automat datele de pe carte de identitate
              românească
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <button
              type="button"
              onClick={openCamera}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Camera size={16} />
              Fă o poză
            </button>
            <button
              type="button"
              onClick={openGallery}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ImageIcon size={16} />
              Alege din galerie
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Preview */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="relative bg-muted aspect-video flex items-center justify-center">
              <img
                src={preview}
                alt="Buletin oaspete"
                className="w-full h-full object-contain"
              />
              {loading && (
                <div className="absolute inset-0 bg-background/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 size={36} className="text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    Se extrag datele...
                  </p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-border">
              <button
                type="button"
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <X size={15} />
                Înlătură imaginea
              </button>
            </div>
          </div>

          {/* Date extrase */}
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-sm font-semibold">Date extrase</span>
              {idData && !loading && (
                <CheckCircle size={18} className="text-emerald-500" />
              )}
            </div>

            {warning && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2 shrink-0">
                <AlertTriangle
                  size={14}
                  className="text-amber-600 shrink-0 mt-0.5"
                />
                <p className="text-xs text-amber-700">{warning}</p>
              </div>
            )}

            {idData && !loading ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {FIELD_ORDER.map((key) => {
                  const value = idData[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {FIELD_LABELS[key]}
                        </p>
                        <p className="text-sm font-medium text-foreground truncate">
                          {value || "—"}
                        </p>
                      </div>
                      {value && (
                        <button
                          type="button"
                          onClick={() => copy(value, key)}
                          className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
            ) : !loading ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Datele vor apărea aici după procesare
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-muted-foreground">
                  Se procesează...
                </p>
              </div>
            )}

            {idData && !loading && (
              <div className="p-3 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={saveData}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Salvează datele buletinului
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <X size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Eroare la procesare
            </p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center px-4">
        Datele sunt prelucrate conform GDPR și stocate exclusiv în scopul
        înregistrării obligatorii a oaspeților (OG 97/2005).
      </p>
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
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          Status:
        </span>
        {filterKeys.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              statusFilter === s
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {filterLabels[s]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} rezultate
        </span>
      </div>

      {/* Tabel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[8%]">
                  ID
                </th>
                <th className="text-left   px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]">
                  Oaspete
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%] hidden md:table-cell">
                  Cameră
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%] hidden sm:table-cell">
                  Check-in
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[13%] hidden sm:table-cell">
                  Check-out
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                  Total
                </th>
                <th className="text-center px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[16%]">
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

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm w-full h-full border-0 p-0 cursor-default"
            onClick={closeModal}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeModal();
            }}
          />
          <div
            className={`relative bg-card border border-border rounded-2xl p-4 sm:p-6 w-full z-50 shadow-2xl animate-fade-in-up ${
              scannerOpen ? "max-w-3xl" : "max-w-md"
            }`}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Închide"
            >
              <X size={18} />
            </button>

            {scannerOpen ? (
              <ScannerBuletin
                bookingId={selected.id}
                onClose={() => setScannerOpen(false)}
              />
            ) : (
              <>
                <h3 className="font-heading text-lg font-semibold mb-1 pr-8">
                  Rezervare {selected.id}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 sm:mb-5">
                  Detalii complete rezervare
                </p>

                <div className="divide-y divide-border">
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
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-0"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span className="text-sm font-medium text-foreground break-all sm:break-normal">
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-1 sm:gap-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text} w-fit`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${s.dot}`}
                          />
                          {statusLabel[selected.status] ?? selected.status}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-5">
                  <Button size="sm" className="flex-1">
                    Confirmă
                  </Button>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-md text-sm font-medium transition-colors"
                  >
                    <ScanLine size={15} />
                    Scanează Buletin
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive hover:text-white"
                  >
                    Anulează
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
