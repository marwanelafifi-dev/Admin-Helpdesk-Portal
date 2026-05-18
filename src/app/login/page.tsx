"use client"

import { Suspense, useState, useEffect } from "react"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export const dynamic = "force-dynamic"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const SETTINGS_KEY = "arp_platform_settings"
const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH !== "false"

const LOGIN_DEFAULTS = {
  loginTitle: "Admin Helpdesk Portal",
  loginSubtitle: "Welcome to the Si-Ware Systems administrative support portal. Sign in with your corporate credentials to securely manage helpdesk requests and operational workflows.",
  loginCardTitle: "Sign in securely",
  loginCardSubtitle: "Authorized Si-Ware Employees only.\nPlease use your corporate credentials to continue.",
  loginFooterLine1: "Operated by IT Team",
  loginFooterLine2: "For assistance, please contact the IT Helpdesk.",
  loginFooterEmail: "ithelpdesk@si-ware.com",
  showGoogleLogin: GOOGLE_AUTH_ENABLED,
}

interface LoginFormProps {
  callbackUrl: string
  oauthError?: string | null
}

function LoginFormContent({ callbackUrl, oauthError }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loadingProvider, setLoadingProvider] = useState<"google" | "credentials" | null>(null)
  const [cfg, setCfg] = useState(LOGIN_DEFAULTS)
  const [logoSrc, setLogoSrc] = useState("/siware-logo.png")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setCfg({ ...LOGIN_DEFAULTS, ...JSON.parse(raw) })
      const customLogo = localStorage.getItem("arp_logo_login")
      if (customLogo) setLogoSrc(customLogo)
    } catch {}
  }, [])

  const handleGoogleSignIn = async () => {
    setError("")
    setLoadingProvider("google")
    await signIn("google", { callbackUrl, redirect: true })
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoadingProvider("credentials")

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    })

    setLoadingProvider(null)

    if (result?.error) {
      setError("Invalid email or password.")
      return
    }

    window.location.href = result?.url ?? callbackUrl
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="flex flex-col items-center gap-4 mb-10 animate-slide-up">
          <div className="relative h-24 w-48">
            {logoSrc.startsWith("data:") ? (
              <img src={logoSrc} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <Image src={logoSrc} alt="Si-Ware Systems logo" fill className="object-contain" />
            )}
          </div>
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{cfg.loginTitle}</h1>
            <p className="text-sm text-slate-700 max-w-md mx-auto">{cfg.loginSubtitle}</p>
          </div>
        </div>

        <Card className="border border-slate-200 bg-white shadow-xl shadow-slate-200/50 rounded-[1.75rem] animate-slide-up">
          <CardHeader className="space-y-2 pb-5 text-center">
            <CardTitle className="text-2xl">{cfg.loginCardTitle}</CardTitle>
            <CardDescription className="text-slate-600">
              {cfg.loginCardSubtitle.split("\n").map((line, i) => (
                <span key={i}>{line}{i < cfg.loginCardSubtitle.split("\n").length - 1 && <br />}</span>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cfg.showGoogleLogin && <Button
              type="button"
              variant="secondary"
              className="w-full rounded-xl border-slate-300 bg-slate-950 text-white hover:bg-slate-800"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={loadingProvider !== null}
            >
              {loadingProvider === "google" ? (
                "Opening Google..."
              ) : (
                <>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21.35 11.1H12v2.8h5.35c-.23 1.2-.92 2.22-1.96 2.9v2.4h3.17c1.86-1.72 2.95-4.24 2.95-7.3 0-.52-.05-1.03-.14-1.52z" fill="#4285F4"/>
                      <path d="M12 22c2.64 0 4.86-.87 6.48-2.35l-3.17-2.4c-.88.6-2.02.95-3.31.95-2.55 0-4.71-1.72-5.48-4.04H3.1v2.53C4.75 19.95 8.12 22 12 22z" fill="#34A853"/>
                      <path d="M6.52 13.16a5.99 5.99 0 010-3.28V7.35H3.1a9.997 9.997 0 000 9.3l3.42-2.4z" fill="#FBBC04"/>
                      <path d="M12 6.02c1.43 0 2.72.49 3.74 1.45l2.8-2.8C16.84 3.15 14.64 2 12 2 8.12 2 4.75 4.05 3.1 7.35l3.42 2.53C7.29 7.74 9.45 6.02 12 6.02z" fill="#EA4335"/>
                    </svg>
                  </span>
                  Continue with Google
                </>
              )}
            </Button>}

            {cfg.showGoogleLogin && <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or</span>
              </div>
            </div>}

            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loadingProvider !== null}
              >
                {loadingProvider === "credentials" ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500 mt-6 space-y-1">
          <p className="font-medium text-slate-700">{cfg.loginFooterLine1}</p>
          <p>{cfg.loginFooterLine2}</p>
          <p className="text-slate-500">{cfg.loginFooterEmail}</p>
        </div>
      </div>
    </div>
  )
}

function LoginFormWrapper() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/landing"
  const errorParam = searchParams.get("error")
  return <LoginFormContent callbackUrl={callbackUrl} oauthError={errorParam} />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>}>
      <LoginFormWrapper />
    </Suspense>
  )
}
