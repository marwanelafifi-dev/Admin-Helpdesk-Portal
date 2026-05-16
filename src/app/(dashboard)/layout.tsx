import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { AiChat } from "@/components/ui/ai-chat"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-enter">{children}</div>
        </main>
      </div>
      <AiChat />
    </div>
  )
}
