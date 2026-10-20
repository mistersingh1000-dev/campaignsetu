"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { plans, site } from "@/lib/site";
import { Icon } from "@/components/Icons";

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.getElementById("razorpay-checkout-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get("plan") || "";
  const plan = plans.find((p) => p.id === planId);

  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [instantDone, setInstantDone] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!plan) {
    return (
      <div className="container-px py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Plan not found</h1>
        <p className="muted mt-3 text-sm">Pick a plan from the pricing page to continue.</p>
        <Link href="/pricing" className="btn-primary mt-6 inline-flex">See pricing</Link>
      </div>
    );
  }

  async function startOnlinePayment() {
    setOnlineBusy(true);
    setError("");
    try {
      const orderRes = await fetch("/api/payments/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan!.id }),
      });
      const order = await orderRes.json().catch(() => ({}));
      if (orderRes.status === 401) {
        router.push(`/signup?next=/checkout?plan=${plan!.id}`);
        return;
      }
      if (!orderRes.ok) {
        throw new Error(order?.message || "Online checkout is not available right now. Use UPI below.");
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        throw new Error("Secure checkout could not load. Please use the UPI option below.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: site.name,
        description: `${order.planName} subscription`,
        order_id: order.orderId,
        prefill: {
          name: order.customer?.name || "",
          email: order.customer?.email || "",
        },
        notes: { plan: plan!.name },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/payments/razorpay", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verified = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok) {
              throw new Error(
                verified?.message ||
                  "Payment was received but activation is still being verified. Refresh your dashboard shortly."
              );
            }
            setInstantDone(true);
          } catch (e: any) {
            setError(e?.message || "Payment verification is still pending. Please check your dashboard shortly.");
          } finally {
            setOnlineBusy(false);
          }
        },
        modal: {
          ondismiss: () => setOnlineBusy(false),
        },
      });
      checkout.open();
    } catch (e: any) {
      setError(e?.message || "Could not start online payment.");
      setOnlineBusy(false);
    }
  }

  async function submit() {
    const ref = reference.trim();
    if (ref.length < 6) {
      setError("Please enter the transaction / UTR number shown in your payment app.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan!.id, reference: ref, note }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push(`/signup?next=/checkout?plan=${plan!.id}`);
        return;
      }
      if (!res.ok) {
        setError(data?.message || "Could not submit your payment. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function copyUpi() {
    navigator.clipboard?.writeText(site.upiId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  if (instantDone) {
    return (
      <div className="container-px py-20">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald/15 text-emerald"><Icon.check className="h-7 w-7" /></span>
          <h1 className="font-display mt-4 text-2xl font-bold">Payment verified — plan active</h1>
          <p className="muted mt-3 text-sm leading-relaxed">Your <b>{plan.name}</b> subscription was verified server-side and your access has been extended automatically.</p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex">Open dashboard</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-px py-20">
        <div className="card mx-auto max-w-lg p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald/15 text-emerald"><Icon.check className="h-7 w-7" /></span>
          <h1 className="font-display mt-4 text-2xl font-bold">Payment submitted</h1>
          <p className="muted mt-3 text-sm leading-relaxed">Your <b>{plan.name}</b> UPI payment is under review. You will receive an email when the admin activates it.</p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-px py-14">
      <div className="mx-auto max-w-4xl">
        <Link href="/pricing" className="muted text-sm hover:text-emerald">← Back to pricing</Link>
        <h1 className="font-display mt-4 text-3xl font-bold">Complete your payment</h1>
        <p className="muted mt-2 text-sm">Choose instant secure checkout or use the manual UPI fallback.</p>

        {error && <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-300">{error}</div>}

        <div className="mt-8 card border-emerald/40 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-emerald">RECOMMENDED · INSTANT ACTIVATION</p>
              <h2 className="font-display mt-1 text-xl font-semibold">Pay securely online</h2>
              <p className="muted mt-2 text-sm">Razorpay verifies the payment and activates your plan automatically when online checkout is configured.</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-3xl font-bold">₹{plan.price.toLocaleString("en-IN")}</p>
              <button onClick={startOnlinePayment} disabled={onlineBusy} className="btn-primary mt-3 disabled:opacity-50">
                {onlineBusy ? "Opening secure checkout…" : "Pay & Activate Instantly"}
              </button>
            </div>
          </div>
        </div>

        <div className="my-8 flex items-center gap-4"><div className="h-px flex-1 bg-white/10" /><span className="muted text-xs">OR MANUAL UPI</span><div className="h-px flex-1 bg-white/10" /></div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-baseline justify-between">
              <div><p className="muted text-xs">You are buying</p><p className="font-display text-lg font-semibold">{plan.name}</p></div>
              <p className="font-display text-3xl font-bold">₹{plan.price.toLocaleString("en-IN")}</p>
            </div>
            <div className="mt-6 rounded-2xl bg-white p-4"><img src={site.upiQrImage} alt={`UPI QR code to pay ${site.upiName}`} className="mx-auto h-56 w-56 object-contain" /></div>
            <div className="mt-4 text-center">
              <p className="muted text-xs">Or pay to this UPI ID</p>
              <button onClick={copyUpi} className="mt-1 font-mono text-sm font-semibold text-emerald hover:underline">{site.upiId} {copied ? "· copied" : "· tap to copy"}</button>
              <p className="muted mt-1 text-xs">{site.upiName}</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-base font-semibold">Submit manual UPI payment</h2>
            <p className="muted mt-2 text-sm leading-relaxed">Enter the UTR/reference shown by your payment app. Manual UPI requires admin verification before plan activation.</p>
            <label className="mt-5 block text-sm font-medium">Transaction / UTR number
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 412345678901" className="field mt-1.5" disabled={busy} />
            </label>
            <label className="mt-4 block text-sm font-medium">Anything we should know? (optional)
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Paid from a different number, etc." className="field mt-1.5" disabled={busy} />
            </label>
            <button onClick={submit} disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-50">{busy ? "Submitting…" : "I have paid — submit for review"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="container-px py-20 text-center muted">Loading…</div>}><Checkout /></Suspense>;
}
