import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckSquare2, Sparkles, ShieldCheck, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { signInWithGoogle } from '@/features/auth/services/auth-service'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch {
      toast.error('Unable to sign in with Google. Please try again.')
      setSigningIn(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center px-4 py-12">
      {/* Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[480px] w-[480px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden rounded-2xl border-border/70 bg-card/85 p-2 shadow-2xl backdrop-blur-2xl">
        <CardHeader className="items-center pb-4 text-center">
          <div className="mb-2 flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <CheckSquare2 className="size-7" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Personal Task Manager
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            High-performance, single-user task management workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 pt-2">
          {/* Features highlight */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-primary" />
              <span>Lightning fast with offline persistence</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Private & secure with Row-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Recurring tasks & Google Calendar sync</span>
            </div>
          </div>

          <Button
            className="h-11 w-full gap-3 rounded-xl border border-border/70 bg-background/80 font-medium text-foreground shadow-xs transition-all hover:bg-accent active:scale-[0.99]"
            variant="outline"
            onClick={handleSignIn}
            disabled={loading || signingIn}
          >
            <GoogleIcon />
            {signingIn ? 'Signing in…' : 'Continue with Google'}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Sign in to synchronize your tasks across devices.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.74z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11C3.24 21.3 7.28 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.26A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.26 5.39l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  )
}
