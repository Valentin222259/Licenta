import { useState, useEffect } from "react";
import {
  Star,
  Loader2,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiGet } from "@/lib/api";

interface Review {
  id: string;
  guest_name: string;
  rating: number;
  text: string;
  created_at: string;
  room_name: string | null;
  is_visible: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const apiFetch = (path: string, options?: RequestInit) =>
  fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={14}
        className={
          s <= rating ? "fill-amber-400 text-amber-400" : "text-muted/30"
        }
      />
    ))}
  </div>
);

const AdminReviews = () => {
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [pending, setPending] = useState<Review[]>([]);
  const [approved, setApproved] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        apiGet<{ success: boolean; data: Review[] }>("/api/reviews/pending"),
        apiGet<{ success: boolean; data: Review[] }>("/api/reviews"),
      ]);
      setPending(pendingRes.data || []);
      setApproved(approvedRes.data || []);
    } catch {
      toast({
        title: "Eroare la încărcarea recenziilor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const approveReview = async (id: string) => {
    try {
      await apiFetch(`/api/reviews/${id}/approve`, { method: "PATCH" });
      toast({ title: "Recenzie aprobată și publicată" });
      fetchAll();
    } catch {
      toast({ title: "Eroare la aprobare", variant: "destructive" });
    }
  };

  const hideReview = async (id: string) => {
    try {
      await apiFetch(`/api/reviews/${id}/hide`, { method: "PATCH" });
      toast({ title: "Recenzie ascunsă — nu mai e vizibilă public" });
      fetchAll();
    } catch {
      toast({ title: "Eroare", variant: "destructive" });
    }
  };

  const deleteReview = async (id: string) => {
    setDeleting(true);
    try {
      await apiFetch(`/api/reviews/${id}`, { method: "DELETE" });
      toast({ title: "Recenzie ștearsă definitiv" });
      setDeleteConfirmId(null);
      fetchAll();
    } catch {
      toast({ title: "Eroare la ștergere", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const reviews = tab === "pending" ? pending : approved;

  return (
    <div className="space-y-5">
      {/* Statistici */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "În așteptare",
            value: pending.length,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Publicate",
            value: approved.length,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Total",
            value: pending.length + approved.length,
            color: "text-primary",
            bg: "bg-primary/5",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-xl p-4 text-center border border-border`}
          >
            <p className={`font-heading text-2xl font-bold ${s.color}`}>
              {s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-card border border-border rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab("pending")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            tab === "pending"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye size={14} />
          În așteptare
          {pending.length > 0 && (
            <span className="bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            tab === "approved"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle size={14} />
          Publicate
        </button>
        <button
          onClick={fetchAll}
          className="px-3 text-muted-foreground hover:text-foreground transition-colors"
          title="Reîncarcă"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Lista recenzii */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
          <Star size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">
            {tab === "pending"
              ? "Nicio recenzie în așteptare. Bravo!"
              : "Nicio recenzie publicată încă."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card border border-border rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-heading text-base font-semibold">
                      {review.guest_name}
                    </span>
                    {review.room_name && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {review.room_name}
                      </span>
                    )}
                    {tab === "pending" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        Necesită aprobare
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <StarDisplay rating={review.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Butoane acțiuni */}
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  {tab === "pending" && (
                    <button
                      onClick={() => approveReview(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle size={13} />
                      Aprobă
                    </button>
                  )}

                  {tab === "approved" && (
                    <button
                      onClick={() => hideReview(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors"
                    >
                      <EyeOff size={13} />
                      Ascunde
                    </button>
                  )}

                  {/* Buton Șterge sau confirmare */}
                  {deleteConfirmId === review.id ? (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5">
                      <AlertTriangle size={13} className="text-destructive" />
                      <span className="text-xs text-destructive font-medium">
                        Sigur?
                      </span>
                      <button
                        onClick={() => deleteReview(review.id)}
                        disabled={deleting}
                        className="text-xs bg-destructive text-white px-2 py-0.5 rounded font-semibold hover:bg-destructive/90 transition-colors"
                      >
                        {deleting ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          "Da"
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Nu
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(review.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-destructive/40 text-destructive rounded-lg text-xs font-semibold hover:bg-destructive hover:text-white transition-colors"
                    >
                      <Trash2 size={13} />
                      Șterge
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
                "{review.text}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
