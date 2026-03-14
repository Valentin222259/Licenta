import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

const SYSTEM_PROMPT = `You are Ion, a friendly and knowledgeable AI concierge for Maramureș Belvedere, a boutique mountain guesthouse in Petrova, Maramureș, Romania.

Here is what you know about the property:
Maramureș Belvedere is a boutique mountain guesthouse located in Petrova, Maramureș, Romania. Address: Str. Hera, Nr. 2, Petrova, Maramureș, România.

We have 8 rooms:
- Rooms 1, 2, 3, 4, 6, 7: 250 RON/night (capacity 2)
- Rooms 5 and 8: 300 RON/night (with bathtub and sofa bed, capacity 3)
- Extra bed available in any room for +50 RON/night.

Check-in: 15:00, Check-out: 11:00.
Breakfast included. Free parking. Free Wi-Fi.

Facilities: Jacuzzi/ciubăr, 8 free bicycles, ping pong table, sleds (winter), grill/ceaun, free parking, children's playground.

Nearby attractions: UNESCO wooden churches, hiking trails, Merry Cemetery (Săpânța), traditional village tours.

Rules:
- Respond in the same language the user writes in (Romanian or English).
- Be warm, helpful, and concise.
- If you don't know something, say so politely and suggest contacting the front desk.
- You can help with room information, booking questions, local area recommendations, and general hospitality queries.`;

const ChatBot = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([
    { from: "bot", text: "Bună ziua! Sunt Ion, ghidul tău din Maramureș. Cu ce te pot ajuta?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const send = async () => {
    if (!input.trim() || isTyping) return;
    const userText = input.trim();
    setMessages((m) => [...m, { from: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    try {
      const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
      const key = import.meta.env.VITE_AZURE_OPENAI_KEY;
      const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT;
      const apiVersion = import.meta.env.VITE_AZURE_OPENAI_VERSION || "2024-02-15-preview";

      if (!endpoint || !key || !deployment) throw new Error("missing_config");

      const conversationHistory = messages.map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const response = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": key },
          body: JSON.stringify({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...conversationHistory, { role: "user", content: userText }],
            max_tokens: 500,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) throw new Error("api_error");
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();
      setMessages((m) => [...m, { from: "bot", text: reply || t("chatbot.errorResponse") }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: t("chatbot.fallback") }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:bg-forest-light transition-colors">
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card rounded-lg shadow-2xl border border-border animate-fade-in-up flex flex-col max-h-[28rem]">
          <div className="bg-primary text-primary-foreground px-4 py-3 rounded-t-lg">
            <p className="font-heading text-lg">{t("chatbot.title")}</p>
            <p className="text-xs text-primary-foreground/80">{t("chatbot.subtitle")}</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[12rem]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2 flex gap-1 items-center">
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("chatbot.placeholder")} className="flex-1 bg-muted rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring text-foreground" disabled={isTyping} />
            <Button size="icon" onClick={send} disabled={isTyping}><Send size={16} /></Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
