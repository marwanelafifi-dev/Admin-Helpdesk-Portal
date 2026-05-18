"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Bot, X, Send, Minimize2, Loader2, ExternalLink, RotateCcw } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { AgentRequestBody, AgentResponseBody } from "@/lib/agent/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant"
  content: string
  requestId?: string
  requestModule?: string
}

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME: Message = {
  role: "assistant",
  content: `مرحباً! أنا مساعدك الذكي في برنامج Admin Portal.

أقدر أساعدك في:
- **إرسال طلب جديد** (شحن، صيانة، مشتريات، فعالية، سفر، HR)
- **متابعة طلب موجود** - اكتب رقم الطلب أو نوعه
- **إحصائيات البرنامج** (للمديرين والإدارة)

اكتب لي ما الذي تحتاجه.`,
}

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("- ")) {
      return (
        <li key={i} className="ml-3 list-disc">
          {applyInline(line.slice(2))}
        </li>
      )
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />
    return <p key={i}>{applyInline(line)}</p>
  })
}

function applyInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="bg-muted text-foreground px-1 rounded text-xs font-mono">
          {match[3]}
        </code>,
      )
    }
    last = regex.lastIndex
  }

  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 ? parts[0] : parts
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AiChat() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [open, setOpen]                     = useState(false)
  const [messages, setMessages]             = useState<Message[]>([WELCOME])
  const [input, setInput]                   = useState("")
  const [loading, setLoading]               = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      inputRef.current?.focus()
    }
  }, [open, messages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: "user", content: text }
    const updatedMessages  = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)

    try {
      const body: AgentRequestBody = {
        message:        text,
        conversationId: conversationId,
        history: messages
          .slice(1)
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content })),
      }

      const res = await fetch("/api/ai-assistant", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = (await res.json()) as AgentResponseBody
      if (data.conversationId) setConversationId(data.conversationId)

      setMessages((prev) => [
        ...prev,
        {
          role:          "assistant",
          content:       data.content,
          requestId:     data.requestId,
          requestModule: data.requestModule,
        },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ غير متوقع"
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${msg}` }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, conversationId])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const resetConversation = () => {
    setMessages([WELCOME])
    setInput("")
    setConversationId(null)
  }

  if (status !== "authenticated") return null

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-2xl hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center group"
          title="AI Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-8 right-0 bg-popover text-popover-foreground border border-border text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
            AI Assistant
          </span>
        </button>
      )}

      {/* ── Chat window ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-96 h-[580px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-scale-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Admin Portal Assistant</p>
                <p className="text-[10px] text-blue-200 leading-tight">
                  {session.user?.name ?? session.user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={resetConversation}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="New conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Minimise"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-muted/30">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex animate-fade-up", msg.role === "user" ? "justify-end" : "justify-start")}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {msg.role === "assistant" && (
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-card text-card-foreground shadow-sm border border-border rounded-tl-sm",
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-0.5 leading-relaxed">
                      {renderMarkdown(msg.content)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}

                  {msg.requestId && msg.requestModule && (
                    <button
                      onClick={() => router.push(`/${msg.requestModule}/${msg.requestId}`)}
                      className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Request
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start animate-fade-up">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-3 border-t border-border bg-card/95 backdrop-blur-sm shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="اكتب رسالتك هنا..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28 overflow-y-auto disabled:opacity-50 transition-colors"
                dir="auto"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  )
}
