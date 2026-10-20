"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not reset password.");
      setMessage(data.message || "Password updated. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card p-6 sm:p-8">
        <p className="text-sm text-red-300">Reset token is missing. Request a new password reset link.</p>
        <Link href="/forgot-password" className="btn-primary mt-5 block w-full text-center">Request new reset link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
      <div>
        <label className="mb-1.5 block text-sm font-medium">New password</label>
        <input
          className="field"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
        <input
          className="field"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
        />
      </div>

      {message && <p className="rounded-xl border border-emerald/30 bg-emerald/[0.06] px-3 py-2.5 text-sm text-emerald">{message}</p>}
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-sm text-red-300">{error}</p>}

      {!message && (
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? "Updating…" : "Set new password"}
        </button>
      )}

      <Link href="/login" className="btn-ghost block w-full text-center">Go to login</Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="container-px grid min-h-[80vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold">Choose a new password</h1>
          <p className="muted mt-2 text-sm">Reset links expire after 30 minutes and can be used only once.</p>
        </div>
        <Suspense fallback={<div className="card p-8 text-center muted">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </section>
  );
}
