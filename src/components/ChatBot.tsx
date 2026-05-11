import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiPost } from "@/lib/api";
import { useTranslation } from "react-i18next";

interface Message {
  role: "user" | "assistant";
  content: string;
  quick_actions?: QuickAction[];
  timestamp: Date;
}

interface QuickAction {
  label: string;
  url: string;
}

interface ChatResponse {
  success: boolean;
  reply: string;
  quick_actions: QuickAction[];
}

const ChatBot = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.startsWith("/admin");

  const buildWelcomeMessage = useCallback((): Message => {
    if (isAdmin) {
      return {
        role: "assistant",
        content: t("chatbot.welcomeAdmin"),
        quick_actions: [],
        timestamp: new Date(),
      };
    }
    return {
      role: "assistant",
      content: t("chatbot.welcomeGuest"),
      quick_actions: [
        { label: t("chatbot.viewRooms"), url: "/rooms" },
        { label: t("chatbot.bookNow"), url: "/booking" },
        { label: t("chatbot.aboutUs"), url: "/about" },
      ],
      timestamp: new Date(),
    };
  }, [isAdmin, t]);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<"ro" | "en">(
    (i18n.language as "ro" | "en") || "ro",
  );
  const [messages, setMessages] = useState<Message[]>([buildWelcomeMessage()]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages([buildWelcomeMessage()]);
    setLang((i18n.language as "ro" | "en") || "ro");
  }, [i18n.language, buildWelcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const detectLang = useCallback((text: string): "ro" | "en" => {
    const englishPattern =
      /\b(hello|hi|what|how|is|are|can|do|have|when|where|room|book|price|available)\b/i;
    return englishPattern.test(text) ? "en" : "ro";
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const detectedLang = detectLang(trimmed);
    setLang(detectedLang);

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const payload = {
        messages: updatedMessages.map(({ role, content }) => ({
          role,
          content,
        })),
        isAdmin,
        lang: detectedLang,
      };

      const response = await apiPost<ChatResponse>("/api/ai/chat", payload);

      const assistantMessage: Message = {
        role: "assistant",
        content: response.reply,
        quick_actions: response.quick_actions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: t("chatbot.errorResponse"),
        quick_actions: [{ label: t("chatbot.contactUs"), url: "/contact" }],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, isAdmin, detectLang, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    navigate(action.url);
    setIsOpen(false);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(lang === "en" ? "en-GB" : "ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          className="w-[calc(100vw-24px)] max-w-[360px] bg-card border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
                  {isAdmin
                    ? t("chatbot.assistantAdmin")
                    : t("chatbot.assistantGuest")}
                </p>
                <p className="text-white/70 text-xs">
                  {isAdmin ? t("chatbot.adminPanel") : t("chatbot.guesthouse")}
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

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`flex items-end gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
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

                  <span className="text-xs text-muted-foreground px-8">
                    {formatTime(msg.timestamp)}
                  </span>

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

              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary shrink-0 flex items-center justify-center">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm">
                    <div className="flex items-center gap-1.5">
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

          {/* Input */}
          <div className="px-3 py-3 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isAdmin
                    ? t("chatbot.adminPlaceholder")
                    : t("chatbot.placeholder")
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
              {t("chatbot.poweredBy")}
            </p>
          </div>
        </div>
      )}

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
