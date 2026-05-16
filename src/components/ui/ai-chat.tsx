"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, X, Send, Minimize2, Loader2, ExternalLink } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  requestId?: string
  module?: string
}

const WELCOME = `مرحباً! أنا المساعد الذكي لمنصة الطلبات. 😊

أقدر أساعدك في:
- **إرسال طلب جديد** (شحن، صيانة، مشتريات، فعالية، سفر، HR)
- **شرح كيفية استخدام** المنصة

قولي إيه اللي تحتاجه وأنا هساعدك!`

export function AiChat() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      inputRef.current?.focus()
    }
  }, [open, messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json() as Message & { error?: string }

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: "❌ حدث خطأ. حاول مرة أخرى." }])
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.content,
          requestId: data.requestId,
          module: data.module,
        }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ تعذر الاتصال. تحقق من الإنترنت." }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  if (status !== "authenticated") return null

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center group"
          title="AI Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            AI Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-96 h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">AI Assistant</p>
                <p className="text-[10px] text-blue-200 leading-tight">
                  {session.user?.name ?? session.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setMessages([{ role: "assistant", content: WELCOME }]); setInput("") }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-[10px] font-medium px-2"
                title="New conversation"
              >
                New
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <Minimize2 className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"
                )}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.requestId && msg.module && (
                    <button
                      onClick={() => router.push(`/${msg.module}/${msg.requestId}`)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Request
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="اكتب رسالتك هنا..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24 overflow-y-auto disabled:opacity-50"
                dir="auto"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  )
}
