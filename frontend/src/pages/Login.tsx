import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'credentials' | 'otp';

export default function Login() {
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [otpTtlSeconds, setOtpTtlSeconds] = useState(0);
  const [devFallback, setDevFallback] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'otp' || otpTtlSeconds <= 0) return undefined;
    const t = setInterval(() => setOtpTtlSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, otpTtlSeconds]);

  useEffect(() => {
    if (step === 'otp') otpInputRef.current?.focus();
  }, [step]);

  const handleCredentialsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await login(email, password);
      setPreAuthToken(data.preAuthToken);
      setOtpTtlSeconds((data.otpTtlMinutes || 5) * 60);
      setDevFallback(Boolean(data.devFallback));
      setOtp('');
      setStep('otp');
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(preAuthToken, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(extractErrorMessage(err, 'Incorrect or expired code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await resendOtp(preAuthToken);
      setPreAuthToken(data.preAuthToken);
      setOtpTtlSeconds((data.otpTtlMinutes || 5) * 60);
      setDevFallback(Boolean(data.devFallback));
      setOtp('');
      setInfo('A new code has been sent to your email.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not resend code'));
    } finally {
      setLoading(false);
    }
  };

  const backToCredentials = () => {
    setStep('credentials');
    setOtp('');
    setError('');
    setInfo('');
    setPreAuthToken('');
  };

  const mmss = `${Math.floor(otpTtlSeconds / 60)}:${String(otpTtlSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      {/* Aceternity-style subtle spotlight background, restyled to app tokens */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-10%] h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 65%)',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--sidebar-border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--sidebar-border))_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.07]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <Card className="border-border/60 bg-card shadow-lg">
          <CardContent className="p-9">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="text-lg font-bold tracking-tight">HR Onboarding &amp; KYC Portal</div>
              <div className="text-xs text-muted-foreground">Super Admin Sign In</div>
            </div>

            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                  />
                </div>
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? 'Checking…' : 'Continue'}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We emailed a 6-digit code to <strong className="text-foreground">{email}</strong>. Enter it below
                  to finish signing in.
                </p>
                {devFallback && (
                  <Alert variant="warning">
                    <AlertDescription>
                      Email is not configured on this server. Check the backend console log for the code
                      (development only).
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="otp">
                    One-Time Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="otp"
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl font-bold tracking-[0.5em]"
                    required
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {otpTtlSeconds > 0 ? `Code expires in ${mmss}` : 'Code expired — request a new one.'}
                </div>
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
                {info && <p className="text-xs font-medium text-success">{info}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </Button>
                <div className="flex items-center justify-between pt-1">
                  <Button type="button" variant="link" size="sm" onClick={handleResend} disabled={loading}>
                    Resend code
                  </Button>
                  <Button type="button" variant="link" size="sm" onClick={backToCredentials} disabled={loading}>
                    Use a different account
                  </Button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Only Super Admin accounts can access this portal. Coordinators do not have login access.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
