"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Info,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [urlWarning, setUrlWarning] = useState(false)

  useEffect(() => {
    const nextAuthUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || "http://localhost:3003"
    if (typeof window !== "undefined" && !window.location.href.startsWith(nextAuthUrl)) {
      console.warn(
        `URL mismatch: Current origin is ${window.location.origin}, but NEXTAUTH_URL is ${nextAuthUrl}`
      )
      setUrlWarning(true)
    }
  }, [])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Invalid email or password.")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(135deg,_#031226_0%,_#082a52_45%,_#04111f_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-10%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-12%] right-[-6%] h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[length:72px_100%] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.95)] backdrop-blur-xl lg:grid-cols-[1.08fr_minmax(420px,520px)] lg:p-6">
          <div className="relative hidden min-h-[680px] overflow-hidden rounded-[1.75rem] border border-white/10 lg:block">
            <div
              className="absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: [
                  "linear-gradient(135deg, rgba(2,6,23,0.12) 0%, rgba(2,6,23,0.68) 100%)",
                  "radial-gradient(circle at 15% 18%, rgba(125,211,252,0.28), transparent 24%)",
                  "radial-gradient(circle at 82% 24%, rgba(59,130,246,0.22), transparent 22%)",
                  "url('/login-bg-tech.png')",
                ].join(", "),
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_28%,rgba(2,6,23,0.55)_100%)]" />
            <div className="absolute -left-16 top-10 h-72 w-72 rounded-full border border-cyan-200/20 bg-cyan-300/10 blur-2xl" />
            <div className="absolute bottom-[-4rem] right-[-2rem] h-80 w-80 rounded-full border border-blue-200/20 bg-blue-500/10 blur-3xl" />

            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Smart Enterprise Access
              </div>

              <div className="max-w-lg space-y-4">
                <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                  A fluid sign-in experience that feels native to the platform.
                </h2>
                <p className="text-sm leading-7 text-blue-100/78">
                  Put your image in
                  {" "}
                  <span className="font-semibold text-white">public/login-bg-tech.png</span>
                  {" "}
                  and it will blend into this section automatically with the overlays and fade effects.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_22px_45px_-20px_rgba(59,130,246,0.9)]">
                <Building2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Request Platform</h1>
              <p className="mt-1 text-sm text-slate-300">SI-Ware Enterprise</p>
            </div>

            <Card className="border-white/14 bg-white/92 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.8)] backdrop-blur-xl">
              <CardHeader className="space-y-1 pb-4 text-center">
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>Access the platform with your account</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {urlWarning && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-bold">URL Mismatch Warning</p>
                      <p>
                        You are accessing the app from a URL that does not match the configured
                        {" "}
                        NEXTAUTH_URL. This may prevent login from working.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  variant="outline"
                  size="lg"
                  className="w-full border-2 border-slate-200/80 bg-white/90 font-medium hover:bg-slate-50"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  <span className="font-medium text-blue-600">@si-ware.com</span> accounts only
                </p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">or external user</span>
                  </div>
                </div>

                <form onSubmit={handleCredentials} className="space-y-3">
                  {error && (
                    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="........"
                        className="pl-9 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-xs text-slate-400 lg:text-left">
              SI-Ware employees only &bull; SI-Ware &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent" />
      <div className="pointer-events-none absolute right-6 top-6 h-24 w-24 rounded-full border border-white/10 bg-white/5 blur-2xl lg:hidden" />
    </div>
  )
}
