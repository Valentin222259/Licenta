/**
 * ChatBot.tsx — Widget de chat plutitor pentru Pensiunea Maramureș Belvedere
 *
 * Arhitectură și decizii de design:
 *
 * 1. MANAGEMENTUL STĂRII (State Management):
 *    - `messages[]` — istoricul conversației, păstrat în useState (React)
 *    - Istoricul NU este persistat în DB — se resetează la refresh
 *    - La fiecare mesaj trimis, întregul istoric e trimis backend-ului
 *    - Backend-ul este STATELESS — nu ține minte conversații între request-uri
 *
 * 2. COMUNICAREA CU LLM-UL:
 *    - Frontend → POST /api/ai/chat cu { messages[], isAdmin, lang }
 *    - Backend construiește systemPrompt + adaugă context din DB
 *    - Backend trimite la Azure OpenAI și returnează { reply, quick_actions }
 *    - Frontend adaugă răspunsul în messages[] și re-renderizează
 *
 * 3. DETECTAREA LIMBII:
 *    - Limba e detectată din primul mesaj al utilizatorului
 *    - Setată în state `lang` și trimisă la fiecare request
 *    - Backend-ul adaptează systemPrompt și quick_actions la limbă
 *
 * 4. MOD ADMIN:
 *    - Detectat automat dacă URL-ul conține "/admin"
 *    - Backend primește `isAdmin: true` și folosește alt systemPrompt
 *    - Răspunsuri cu date operative (rezervări, venituri, ocupare)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiPost } from "@/lib/api";

// ─── Tipuri TypeScript ────────────────────────────────────────────────────────

/** Mesaj în conversație — compatibil cu formatul OpenAI Chat */
interface Message {
  role: "user" | "assistant";
  content: string;
  quick_actions?: QuickAction[]; // butoane afișate sub mesajele asistentului
  timestamp: Date;
}

/** Buton de acțiune rapidă atașat unui răspuns al asistentului */
interface QuickAction {
  label: string;
  url: string;
}

/** Răspunsul primit de la backend */
interface ChatResponse {
  success: boolean;
  reply: string;
  quick_actions: QuickAction[];
}

// ─── Constante ────────────────────────────────────────────────────────────────

/** Mesaj de întâmpinare afișat la deschiderea chat-ului */
const WELCOME_MESSAGE_RO: Message = {
  role: "assistant",
  content:
    "Bună ziua! 👋 Sunt asistentul virtual al Pensiunii Belvedere. Vă pot ajuta cu informații despre camere, prețuri, disponibilitate sau zona Maramureșului. Cu ce vă pot fi de folos?",
  quick_actions: [
    { label: "🏠 Vezi Camere", url: "/rooms" },
    { label: "🛏 Rezervă Acum", url: "/booking" },
    { label: "ℹ️ Despre Pensiune", url: "/about" },
  ],
  timestamp: new Date(),
};

const WELCOME_MESSAGE_ADMIN: Message = {
  role: "assistant",
  content:
    "Salut! 👋 Sunt asistentul tău pentru operațiunile pensiunii. Pot să îți spun statistici despre rezervări, ocupare, venituri sau să răspund la întrebări despre administrare.",
  quick_actions: [],
  timestamp: new Date(),
};

// ─── Componenta principală ────────────────────────────────────────────────────
const ChatBot = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Detectare context ──────────────────────────────────────────────────────
  /** Mod admin — activat când URL-ul conține /admin */
  const isAdmin = location.pathname.startsWith("/admin");

  // ── State management ───────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Limba conversației — detectată din primul mesaj al utilizatorului.
   * "ro" implicit, se schimbă la "en" dacă utilizatorul scrie în engleză.
   */
  const [lang, setLang] = useState<"ro" | "en">("ro");

  /**
   * messages[] — sursa de adevăr a conversației.
   * Fiecare element are role, content, quick_actions și timestamp.
   * Inițializat cu mesajul de întâmpinare specific contextului.
   */
  const [messages, setMessages] = useState<Message[]>([
    isAdmin ? WELCOME_MESSAGE_ADMIN : WELCOME_MESSAGE_RO,
  ]);

  /**
   * scrollRef — referință la containerul de mesaje.
   * Folosit pentru auto-scroll la ultimul mesaj când apare unul nou.
   */
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto-scroll la ultimul mesaj ──────────────────────────────────────────
  /**
   * useEffect se declanșează ori de câte ori se schimbă messages[].
   * Scrollează containerul la capăt pentru a afișa ultimul mesaj.
   */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Focus pe input la deschidere ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Detectare limbă ────────────────────────────────────────────────────────
  /**
   * Detectăm limba din mesajul utilizatorului.
   * Strategie simplă: dacă mesajul conține cuvinte comune englezești → "en"
   * O implementare mai robustă ar folosi o librărie de language detection.
   */
  const detectLang = useCallback((text: string): "ro" | "en" => {
    const englishPattern =
      /\b(hello|hi|what|how|is|are|can|do|have|when|where|room|book|price|available)\b/i;
    return englishPattern.test(text) ? "en" : "ro";
  }, []);

  // ── Funcția principală: trimitere mesaj ───────────────────────────────────
  /**
   * handleSend — gestionează ciclul complet al unui mesaj:
   *  1. Adaugă mesajul utilizatorului în messages[]
   *  2. Detectează limba și actualizează state-ul `lang`
   *  3. Trimite întregul istoric la /api/ai/chat
   *  4. Primește { reply, quick_actions } și adaugă răspunsul în messages[]
   *  5. Gestionează starea de loading și erorile
   */
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Detectăm limba din mesajul curent
    const detectedLang = detectLang(trimmed);
    setLang(detectedLang);

    // Construim mesajul utilizatorului
    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    // Actualizăm messages[] cu mesajul utilizatorului
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      /**
       * Trimitem la backend:
       *  - messages: istoricul în format OpenAI (fără timestamp și quick_actions
       *    — acestea sunt doar pentru UI, nu pentru LLM)
       *  - isAdmin: flag pentru a selecta systemPrompt-ul potrivit
       *  - lang: pentru adaptarea limbii în răspuns și quick_actions
       */
      const payload = {
        messages: updatedMessages.map(({ role, content }) => ({
          role,
          content,
        })),
        isAdmin,
        lang: detectedLang,
      };

      const response = await apiPost<ChatResponse>("/api/ai/chat", payload);

      // Adăugăm răspunsul asistentului în messages[]
      const assistantMessage: Message = {
        role: "assistant",
        content: response.reply,
        quick_actions: response.quick_actions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      // Afișăm eroarea ca mesaj al asistentului (nu alert/toast)
      const errorMessage: Message = {
        role: "assistant",
        content:
          detectedLang === "ro"
            ? "Ne pare rău, a apărut o eroare. Vă rugăm să ne contactați direct la +40 755 123 456. 📞"
            : "Sorry, an error occurred. Please contact us directly at +40 755 123 456. 📞",
        quick_actions: [{ label: "📞 Contact", url: "/contact" }],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, isAdmin, detectLang]);

  // ── Trimitere cu Enter ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Handler quick action ───────────────────────────────────────────────────
  const handleQuickAction = (action: QuickAction) => {
    navigate(action.url);
    setIsOpen(false);
  };

  // ── Format timestamp ───────────────────────────────────────────────────────
  const formatTime = (date: Date) =>
    date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Fereastra de chat ────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="w-[360px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">
                  {isAdmin ? "Asistent Admin" : "Asistent Belvedere"}
                </p>
                <p className="text-white/70 text-xs">
                  {isAdmin ? "Panou de control" : "Pensiunea Maramureș"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Lista de mesaje — ScrollArea pentru scroll custom */}
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Bula de mesaj */}
                  <div
                    className={`flex items-end gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white ${
                        msg.role === "assistant"
                          ? "bg-primary"
                          : "bg-muted-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <Bot size={12} />
                      ) : (
                        <User size={12} />
                      )}
                    </div>

                    {/* Conținut */}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-muted-foreground px-8">
                    {formatTime(msg.timestamp)}
                  </span>

                  {/* Quick Actions — butoane sub mesajele asistentului */}
                  {msg.role === "assistant" &&
                    msg.quick_actions &&
                    msg.quick_actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-8 mt-1">
                        {msg.quick_actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickAction(action)}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-medium"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {/* Indicator "Asistentul scrie..." */}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary shrink-0 flex items-center justify-center">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex items-center gap-1.5">
                      {/* Puncte animate — CSS animation */}
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input mesaj */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isAdmin
                    ? "Întreabă despre rezervări, ocupare..."
                    : "Scrieți un mesaj..."
                }
                disabled={isLoading}
                className="text-sm rounded-xl border-border focus-visible:ring-primary"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-xl shrink-0 h-9 w-9"
              >
                {isLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Powered by Azure OpenAI
            </p>
          </div>
        </div>
      )}

      {/* ── Buton plutitor (minimizat) ───────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default ChatBot;
