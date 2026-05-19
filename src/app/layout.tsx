import type { Metadata } from "next"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { RootClientProvider } from "@/components/layout/RootClientProvider"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Admin Helpdesk Portal",
  description: "Enterprise admin helpdesk and request management portal",
  icons: {
    icon: "/Icon.png",
    shortcut: "/Icon.png",
    apple: "/Icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <RootClientProvider>{children}</RootClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
