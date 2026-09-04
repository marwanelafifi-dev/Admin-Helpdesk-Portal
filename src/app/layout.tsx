import type { Metadata } from "next"
import { AuthProvider } from "@/components/auth/AuthProvider"
import { RootClientProvider } from "@/components/layout/RootClientProvider"
import { ThemeProvider } from "@/components/layout/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Si-Ware Company Portal",
  description: "Si-Ware Systems support functions and company services portal",
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
