import { useState, useRef, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import type { ApiResponse, Booking } from "@/lib/types";

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

// ─── Constante ────────────────────────────────────────────────────────────────
const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  completed: { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400" },
};

const statusLabel: Record<string, string> = {
  confirmed: "Confirmat",
  pending: "În așteptare",
  cancelled: "Anulat",
  completed: "Finalizat",
};

const filterLabels: Record<string, string> = {
  all: "Toate",
  confirmed: "Confirmate",
  pending: "În așteptare",
  cancelled: "Anulate",
  completed: "Finalizate",
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIdData(null);
    setWarning(null);
    setSaved(false);
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
      if (
        ["cnp", "nume", "prenume"].some(
          (f) => !data[f as keyof GuestIdData]?.trim(),
        )
      ) {
        setWarning(
          "Unele câmpuri nu au putut fi citite. Verificați că fotografia este clară.",
        );
      }
      setIdData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
      setError("Nu s-au putut salva datele. Încearcă din nou.");
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
            <p className="text-sm font-semibold text-foreground leading-tight">
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
                Gemini AI extrage automat toate datele de pe cartea de
                identitate românească
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.setAttribute("capture", "environment");
                  fileInputRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Camera size={17} /> Fă o poză
              </button>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.removeAttribute("capture");
                  fileInputRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-foreground rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
              >
                <ImageIcon size={17} /> Din galerie
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
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="relative bg-slate-900 flex items-center justify-center"
                style={{ minHeight: "200px" }}
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
                      Gemini AI analizează documentul...
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
                  className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 py-1"
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
                    const value = idData[key];
                    const isEmpty = !value?.trim();
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg ${isEmpty ? "bg-muted/20" : "bg-muted/50"}`}
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

// ─── Componentă principală ────────────────────────────────────────────────────
const AdminBookings = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await apiGet<ApiResponse<Booking[]>>(
        `/api/bookings${params}`,
      );
      setBookings(res.data);
      setTotal(res.total || res.data.length);
    } catch (err) {
      console.error("Eroare la încărcarea rezervărilor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      await apiPatch(`/api/bookings/${id}/status`, { status });
      await fetchBookings();
      if (selected?.id === id) {
        setSelected((prev) =>
          prev ? { ...prev, status: status as any } : null,
        );
      }
    } catch (err) {
      console.error("Eroare update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setScannerOpen(false);
  };

  const filterKeys = [
    "all",
    "confirmed",
    "pending",
    "cancelled",
    "completed",
  ] as const;

  return (
    <div className="space-y-5">
      {/* Filtre + refresh */}
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
          {total} {total === 1 ? "rezervare" : "rezervări"}
        </span>
        <button
          type="button"
          onClick={fetchBookings}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Reîncarcă"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Tabel */}
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
                    "ID",
                    "Oaspete",
                    "Cameră",
                    "Check-in",
                    "Check-out",
                    "Total",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left first:text-center"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => {
                  const s = statusStyle[b.status] ?? statusStyle.pending;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => {
                        setSelected(b);
                        setScannerOpen(false);
                      }}
                      className="hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 text-center text-xs text-muted-foreground font-mono">
                        {b.booking_ref}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-foreground">
                          {b.guest_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.guest_email}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell">
                        {b.room_name}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {b.check_in?.split("T")[0] || b.check_in}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {b.check_out?.split("T")[0] || b.check_out}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold">
                          {b.total_price} RON
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
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
        )}
      </div>

      {/* Modal */}
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
            <div className="relative bg-card border border-border rounded-2xl w-full max-w-md z-50 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
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

              {/* Detalii */}
              <div className="px-6 pb-2 divide-y divide-border">
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
                    const s =
                      statusStyle[selected.status] ?? statusStyle.pending;
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
              <div className="px-6 py-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-primary/8 hover:bg-primary/15 border border-primary/25 hover:border-primary/50 text-primary rounded-xl text-sm font-semibold transition-all"
                >
                  <ScanLine size={17} /> Scanează Buletinul Oaspetelui
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    size="sm"
                    className="h-10"
                    disabled={selected.status === "confirmed" || updating}
                    onClick={() => updateStatus(selected.id, "confirmed")}
                  >
                    {updating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Confirmă"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-destructive border-destructive/30 hover:bg-destructive hover:text-white hover:border-destructive"
                    disabled={selected.status === "cancelled" || updating}
                    onClick={() => updateStatus(selected.id, "cancelled")}
                  >
                    {updating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Anulează"
                    )}
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
