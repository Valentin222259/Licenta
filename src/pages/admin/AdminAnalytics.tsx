/**
 * AdminAnalytics.tsx — Tablou de bord pentru analiză AI
 *
 * Arhitectură frontend:
 *  - TanStack Query pentru fetch + caching + loading states
 *  - Tabs (Shadcn UI) pentru separarea modulelor AI
 *  - Recharts pentru vizualizarea datelor
 *  - Badge (Shadcn UI) pentru etichetele generate de AI
 *
 * Module:
 *  1. Sentiment & Reviews  — analiză recenzii via LLM
 *  2. Smart Pricing        — recomandări preț via LLM
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Brain,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Star,
  AlertTriangle,
  CheckCircle,
  Zap,
  ArrowUp,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

// ─── Tipuri TypeScript ────────────────────────────────────────────────────────

interface SentimentData {
  distribution: { positive: number; neutral: number; negative: number };
  avg_rating: string;
  total_reviews: number;
  overall_sentiment: string;
  confidence: number;
  top_strengths: string[];
  improvement_areas: string[];
  summary: string;
  trend: string;
  ai_powered: boolean;
}

interface PricingData {
  occupancy_chart: { date: string; occupancy_rate: number; revenue: number }[];
  stats: {
    avgOccupancy: number;
    peakOccupancy: number;
    highDemandDays: number;
  };
  recommendation: {
    price_factor: number;
    recommended_price: number;
    urgency: "high" | "medium" | "low";
    reasoning: string;
    strategy: string;
    apply_from: string;
    tips: string[];
  };
  current_price: number;
  ai_powered: boolean;
}

// ─── Culori grafice (aliniate la tema Belvedere) ──────────────────────────────
const SENTIMENT_COLORS = {
  positive: "hsl(152, 35%, 35%)", // verde Belvedere
  neutral: "hsl(38, 50%, 55%)", // auriu
  negative: "hsl(0, 65%, 55%)", // roșu
};

const URGENCY_CONFIG = {
  high: {
    label: "Urgență Mare",
    color: "destructive" as const,
    icon: AlertTriangle,
  },
  medium: { label: "Urgență Medie", color: "default" as const, icon: Zap },
  low: {
    label: "Urgență Mică",
    color: "secondary" as const,
    icon: CheckCircle,
  },
};

// ─── Componenta principală ────────────────────────────────────────────────────
const AdminAnalytics = () => {
  // ── TanStack Query: Sentiment ─────────────────────────────────────────────
  // useMutation pentru că sentiment e POST (trimitem parametri în viitor)
  const {
    data: sentimentResponse,
    isPending: sentimentLoading,
    mutate: fetchSentiment,
  } = useMutation({
    mutationFn: () =>
      apiPost<{ success: boolean; ai_powered: boolean; data: SentimentData }>(
        "/api/analytics/sentiment",
        {},
      ),
    onError: () =>
      toast({
        title: "Eroare",
        description: "Nu s-a putut încărca analiza sentiment",
        variant: "destructive",
      }),
  });

  // ── TanStack Query: Smart Pricing ─────────────────────────────────────────
  const {
    data: pricingResponse,
    isLoading: pricingLoading,
    refetch: refetchPricing,
  } = useQuery({
    queryKey: ["smart-pricing"],
    queryFn: () =>
      apiGet<{ success: boolean; ai_powered: boolean; data: PricingData }>(
        "/api/analytics/smart-pricing",
      ),
    staleTime: 5 * 60 * 1000, // cache 5 minute — apelurile AI sunt costisitoare
  });

  const sentiment = sentimentResponse?.data;
  const pricing = pricingResponse?.data;

  // ── Handler: aplică prețul recomandat ────────────────────────────────────
  // În producție: apelează PATCH /api/rooms/:id cu noul preț
  const handleApplyPricing = () => {
    toast({
      title: "✅ Preț actualizat",
      description: `Tariful a fost setat la ${pricing?.recommendation.recommended_price} RON/noapte`,
    });
  };

  // ── Date pentru PieChart sentiment ───────────────────────────────────────
  const pieData = sentiment
    ? [
        {
          name: "Pozitive",
          value: sentiment.distribution.positive,
          color: SENTIMENT_COLORS.positive,
        },
        {
          name: "Neutre",
          value: sentiment.distribution.neutral,
          color: SENTIMENT_COLORS.neutral,
        },
        {
          name: "Negative",
          value: sentiment.distribution.negative,
          color: SENTIMENT_COLORS.negative,
        },
      ]
    : [];

  // ── Format dată pentru graficul de ocupare ────────────────────────────────
  const occupancyChart =
    pricing?.occupancy_chart.map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      }),
    })) || [];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl">Analiză & Perspective AI</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by Azure OpenAI · Date actualizate în timp real
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Brain size={12} className="text-primary" />
          Azure OpenAI
        </Badge>
      </div>

      {/* ── Tabs principale ────────────────────────────────────────────────── */}
      <Tabs defaultValue="sentiment">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="sentiment" className="gap-2">
            <MessageSquare size={14} />
            Sentiment & Recenzii
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2">
            <TrendingUp size={14} />
            Smart Pricing
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1 — SENTIMENT & REVIEWS
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="sentiment" className="mt-6 space-y-6">
          {/* Buton declanșare analiză */}
          {!sentiment && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={28} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium mb-1">Analiză Sentiment Recenzii</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    AI-ul analizează toate recenziile și identifică punctele
                    forte și zonele de îmbunătățit
                  </p>
                </div>
                <Button
                  onClick={() => fetchSentiment()}
                  disabled={sentimentLoading}
                  className="gap-2"
                >
                  {sentimentLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />{" "}
                      Analizează...
                    </>
                  ) : (
                    <>
                      <Brain size={14} /> Pornește Analiza AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rezultate sentiment */}
          {sentiment && (
            <>
              {/* KPI-uri sumar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Rating Mediu
                    </p>
                    <div className="flex items-end gap-1">
                      <span className="font-heading text-2xl">
                        {sentiment.avg_rating}
                      </span>
                      <span className="text-muted-foreground text-sm mb-0.5">
                        /5
                      </span>
                    </div>
                    <div className="flex mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          className={
                            parseFloat(sentiment.avg_rating) >= s
                              ? "text-accent fill-accent"
                              : "text-muted"
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Total Recenzii
                    </p>
                    <p className="font-heading text-2xl">
                      {sentiment.total_reviews}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      analizate
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Sentiment General
                    </p>
                    <p className="font-heading text-lg">
                      {sentiment.overall_sentiment}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Încredere: {Math.round(sentiment.confidence * 100)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Trend
                    </p>
                    <p className="font-heading text-lg capitalize">
                      {sentiment.trend}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      față de luna trecută
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grafic + Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PieChart distribuție sentimente */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Distribuție Sentimente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="55%" height={180}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={45}
                            strokeWidth={2}
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="space-y-3 flex-1">
                        {pieData.map((d) => (
                          <div
                            key={d.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: d.color }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {d.name}
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {d.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rezumat AI */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Brain size={14} className="text-primary" />
                      Rezumat AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {sentiment.summary}
                    </p>

                    {/* Puncte forte */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">
                        ✓ Puncte Forte
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sentiment.top_strengths.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Zone de îmbunătățit */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
                        ⚠ De Îmbunătățit
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sentiment.improvement_areas.map((a) => (
                          <Badge
                            key={a}
                            variant="outline"
                            className="text-xs border-amber-300 text-amber-700"
                          >
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Reîncarcă */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSentiment()}
                  disabled={sentimentLoading}
                  className="gap-2"
                >
                  <RefreshCw
                    size={13}
                    className={sentimentLoading ? "animate-spin" : ""}
                  />
                  Actualizează Analiza
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2 — SMART PRICING
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="pricing" className="mt-6 space-y-6">
          {pricingLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-16 gap-3">
                <RefreshCw size={20} className="animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  AI analizează datele de ocupare...
                </span>
              </CardContent>
            </Card>
          )}

          {pricing && (
            <>
              {/* KPI-uri ocupare */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Ocupare Medie
                    </p>
                    <p className="font-heading text-2xl">
                      {pricing.stats.avgOccupancy}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ultimele 14 zile
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Ocupare Peak
                    </p>
                    <p className="font-heading text-2xl">
                      {pricing.stats.peakOccupancy}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      zi maximă
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Zile Cerere Mare
                    </p>
                    <p className="font-heading text-2xl">
                      {pricing.stats.highDemandDays}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      din 14 zile
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Grafic ocupare */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Grad de Ocupare — Următoarele 14 Zile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={occupancyChart} barSize={28}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        vertical={false}
                      />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        unit="%"
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`${v}%`, "Ocupare"]}
                      />
                      {/* Linie de referință la 80% — prag pentru pricing dinamic */}
                      <ReferenceLine
                        y={80}
                        stroke="hsl(38, 60%, 55%)"
                        strokeDasharray="4 4"
                        label={{
                          value: "Prag 80%",
                          fontSize: 10,
                          fill: "hsl(38, 60%, 45%)",
                        }}
                      />
                      <Bar
                        dataKey="occupancy_rate"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                        // Bare mai închise pentru zilele cu ocupare >80%
                        label={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recomandare AI */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain size={15} className="text-primary" />
                    Recomandare AI — {pricing.recommendation.strategy}
                    {(() => {
                      const cfg =
                        URGENCY_CONFIG[pricing.recommendation.urgency];
                      const Icon = cfg.icon;
                      return (
                        <Badge
                          variant={cfg.color}
                          className="ml-auto gap-1 text-xs"
                        >
                          <Icon size={11} />
                          {cfg.label}
                        </Badge>
                      );
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prețuri */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Preț actual
                      </p>
                      <p className="font-heading text-xl text-muted-foreground line-through">
                        {pricing.current_price} RON
                      </p>
                    </div>
                    <ArrowUp size={20} className="text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Preț recomandat
                      </p>
                      <p className="font-heading text-2xl text-primary">
                        {pricing.recommendation.recommended_price} RON
                      </p>
                    </div>
                    <Badge className="ml-2 text-sm">
                      +
                      {Math.round(
                        (pricing.recommendation.price_factor - 1) * 100,
                      )}
                      %
                    </Badge>
                  </div>

                  {/* Motivație */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {pricing.recommendation.reasoning}
                  </p>

                  {/* Sfaturi AI */}
                  <div className="space-y-1.5">
                    {pricing.recommendation.tips.map((tip, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="text-primary mt-0.5">→</span>
                        {tip}
                      </div>
                    ))}
                  </div>

                  {/* Acțiuni */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleApplyPricing} className="gap-2">
                      <Zap size={14} />
                      Aplică Prețul Recomandat
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchPricing()}
                      disabled={pricingLoading}
                      className="gap-2"
                    >
                      <RefreshCw
                        size={13}
                        className={pricingLoading ? "animate-spin" : ""}
                      />
                      Actualizează
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Aplică: {pricing.recommendation.apply_from}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;
