"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icons";

const perks = [
  "Full API access for 7 days",
  "Meta Embedded Signup included",
  "Send real WhatsApp messages",
  "No credit card required",
];

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Return people to where they came from (e.g. mid-purchase). Same-site only.
  const raw = params.get("next") || "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Signup failed");
      router.push(next);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <section className="container-px grid min-h-[82vh] items-center gap-12 py-16 lg:grid-cols-2">
      <div>
        <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-emerald" /> 7-day free trial</span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
          Start sending on the <span className="gradient-text">official API</span> — free for 7 days
        </h1>
        <p className="muted mt-5 max-w-md text-base leading-relaxed">
          Create your account in seconds. Your trial unlocks the dashboard and API immediately and
          auto-expires after 7 days — no charges, no surprises.
        </p>
        <ul className="mt-8 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm">
              <Icon.check className="h-4 w-4 shrink-0 text-emerald" />
              <span className="muted">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Create your free account</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input className="field" value={form.name} onChange={update("name")} placeholder="Your name" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Work email</label>
            <input className="field" type="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input className="field" type="password" required value={form.password} onChange={update("password")} placeholder="Create a password" />
          </div>
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-xs text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? "Creating account…" : "Start 7-day free trial"}
          </button>
          <p className="muted text-center text-xs">
            Already started?{" "}
            <Link href="/login" className="text-emerald hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="container-px py-20 text-center muted">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
