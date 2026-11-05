"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const switchMode = () => {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setNotice("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        router.replace("/");
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace("/");
        } else {
          setNotice("Check your email to confirm your account, then sign in.");
        }
      }
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-[#F2D6A6]/25 bg-black/35 " +
    "pl-11 pr-4 text-sm text-[#FFF4E7] shadow-lg shadow-black/10 " +
    "backdrop-blur-md outline-none placeholder:text-[#E9D3B7]/60 " +
    "transition-colors focus:border-[#E6B56C] focus:bg-black/45 " +
    "focus:ring-2 focus:ring-[#E6B56C]/20";

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12 sm:px-10 lg:justify-start lg:px-[10%]">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat lg:bg-[position:center_48%]"
        style={{ backgroundImage: 'url("/images/hogwarts-login.jpg")' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B0908]/65 via-[#0B0908]/15 to-[#0B0908]/10 lg:bg-gradient-to-r lg:from-[#0B0908]/65 lg:via-[#0B0908]/20 lg:to-transparent"
      />

      <div className="w-full max-w-[360px] lg:translate-y-10">
        <div className="mb-7 text-center lg:text-left">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E6BB7B] drop-shadow-md">
            Your Private Cinema
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#FFF4E7] drop-shadow-lg sm:text-4xl">
            {mode === "login" ? "Welcome Back" : "Join the Collection"}
          </h1>
          <p className="mt-2 text-sm text-[#F1DFCA] drop-shadow-md">
            Every great story deserves a place.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-lg border border-red-300/30 bg-black/55 px-3 py-2 text-sm text-red-200 backdrop-blur-sm">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-lg border border-[#E6BB7B]/40 bg-black/55 px-3 py-2 text-sm text-[#FFF0DC] backdrop-blur-sm">
              {notice}
            </p>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#FFF0DC] drop-shadow-md">Email</label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]" />
              <input id="email" type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={inputClass} />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#FFF0DC] drop-shadow-md">Password</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]" />
              <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                required minLength={mode === "signup" ? 6 : undefined} value={password}
                onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className={inputClass} />
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-[#FFF0DC] drop-shadow-md">Confirm Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]" />
                <input id="confirm-password" type="password" autoComplete="new-password" required minLength={6}
                  value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password" className={inputClass} />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D6AB70]/60 bg-[#A7773F]/95 text-sm font-semibold text-[#FFF8ED] shadow-lg shadow-black/25 transition-colors hover:bg-[#BC894D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BB7B] disabled:cursor-not-allowed disabled:opacity-70">
            {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <p className="pt-1 text-center text-sm text-[#F1DFCA] drop-shadow-md">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={switchMode} disabled={loading}
              className="font-semibold text-[#F3C783] underline-offset-4 hover:underline disabled:opacity-60">
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
