import type { Metadata } from "next"
import { AuthProvider } from "@/components/auth/AuthProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Admin Request Platform",
  description: "Enterprise admin request management platform",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
