"use client"

import { useState } from "react"
import { Eye, EyeOff, ShieldCheck, Lock, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"credentials" | "totp">("credentials")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totp, setTotp] = useState("")

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // UI demo: advance to TOTP step
    setStep("totp")
  }

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // UI demo: redirect to dashboard
    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Request Platform</h1>
          <p className="text-slate-400 text-sm mt-1">Si-Ware Systems</p>
        </div>

        <Card className="border-slate-200 shadow-2xl">
          {step === "credentials" ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>Enter your credentials to access the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@si-ware.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Continue
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
                </div>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app (Google Authenticator / TOTP)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTotpSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totp">Authentication Code</Label>
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                      value={totp}
                      onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Open your authenticator app and enter the current code
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={totp.length !== 6}
                  >
                    Verify & Sign In
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep("credentials")}
                  >
                    Back to sign in
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by 2FA &bull; Si-Ware Systems &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
