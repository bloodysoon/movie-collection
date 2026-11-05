"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Film, Loader2, LockKeyhole, Mail } from "lucide-react";
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
          setNotice("Check your email to confirm your account.");
        }
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-[#F2D6A6]/20 bg-black/30 " +
    "pl-11 pr-4 text-sm text-[#FFF4E7] backdrop-blur-md outline-none " +
    "placeholder:text-[#E9D3B7]/45 transition-all duration-200 " +
    "focus:border-[#E6B56C]/60 focus:bg-black/40 " +
    "focus:ring-2 focus:ring-[#E6B56C]/12 focus:shadow-[0_0_24px_rgba(230,181,108,0.1)]";

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12 sm:px-10 lg:justify-start lg:px-[10%]">
      {/* Background image with subtle zoom-in on load */}
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[#17130F]">
        <Image
          src="/images/hogwarts-login.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="animate-bg-zoom object-cover object-center lg:object-[center_48%]"
        />
      </div>

      {/* Dark gradient overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0B0908]/80 via-[#0B0908]/25 to-[#0B0908]/10 lg:bg-gradient-to-r lg:from-[#0B0908]/75 lg:via-[#0B0908]/30 lg:to-transparent"
      />

      {/* Warm ambient glow — slow pulse */}
      <div
        aria-hidden="true"
        className="animate-glow-pulse pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 75% at 12% 55%, rgba(167,119,63,0.12) 0%, transparent 65%)",
        }}
      />

      {/* Form wrapper — fade + slide up on mount */}
      <div className="animate-fade-slide-up w-full max-w-[340px]">
        <div className="lg:translate-y-10">
          {/* Logo mark */}


          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-900/25 px-3 py-2.5 text-sm text-red-200 backdrop-blur-sm"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg bg-[#A7773F]/20 px-3 py-2.5 text-sm text-[#FFF0DC] backdrop-blur-sm"
              >
                {notice}
              </p>
            )}

            <div className="relative">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]/65"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className={inputClass}
              />
            </div>

            <div className="relative">
              <LockKeyhole
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]/65"
              />
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "signup" ? 6 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className={inputClass}
              />
            </div>

            {mode === "signup" && (
              <div className="relative animate-fade-slide-up">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E6BB7B]/65"
                />
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm password"
                  className={inputClass}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D6AB70]/45 bg-[#A7773F]/90 text-sm font-semibold text-[#FFF8ED] shadow-lg shadow-black/20 transition-all duration-200 hover:bg-[#BC894D] hover:shadow-[0_0_28px_rgba(167,119,63,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6BB7B] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              )}
              {loading
                ? "Please wait…"
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>

            <p className="pt-0.5 text-center text-sm">
              <button
                type="button"
                onClick={switchMode}
                disabled={loading}
                className="text-[#F3C783]/80 underline-offset-4 transition-colors hover:text-[#F3C783] hover:underline disabled:opacity-50"
              >
                {mode === "login" ? "Create an account" : "Sign in instead"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
