"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send reset email.");
      setMessage(data.message || "If an account exists, a reset link has been sent.");
    } catch (err: any) {
      setError(err?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container-px grid min-h-[80vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold">Reset your password</h1>
          <p className="muted mt-2 text-sm">Enter your account email. We’ll send a secure one-time reset link.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          {message && <p className="rounded-xl border border-emerald/30 bg-emerald/[0.06] px-3 py-2.5 text-sm text-emerald">{message}</p>}
          {error && <p className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-sm text-red-300">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <Link href="/login" className="btn-ghost block w-full text-center">Back to login</Link>
        </form>
      </div>
    </section>
  );
}
