"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icons";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setMsg(data.message || "Login failed.");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#2ee06f] to-[#075E54] shadow-glow">
          <Icon.whatsapp className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Welcome back</h1>
        <p className="muted mt-2 text-sm">Sign in to your Codecraft Messaging Hub dashboard.</p>
      </div>

      {expired && (
        <div className="mb-4 rounded-2xl border border-tick/40 bg-tick/[0.06] px-4 py-3 text-sm">
          Your trial or subscription has ended. Your WhatsApp connection and data remain saved, but outbound sending, campaigns and automations are locked until you upgrade.
        </div>
      )}

      <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="block text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-emerald hover:underline">Forgot password?</Link>
          </div>
          <input className="field" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <button type="submit" className="btn-primary w-full">Sign in to dashboard</button>
        {msg && (
          <p className="rounded-xl border border-emerald/30 bg-emerald/[0.06] px-3 py-2.5 text-xs">{msg}</p>
        )}

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-white/10" />
          <span className="muted text-xs">New customer?</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <Link href="/signup" className="btn-ghost block w-full text-center">
          Create Account — Start 7-Day Free Trial
        </Link>
      </form>

      <p className="muted mt-5 text-center text-xs">
        No credit card required to create your trial account.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <section className="container-px grid min-h-[80vh] place-items-center py-16">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </section>
  );
}
