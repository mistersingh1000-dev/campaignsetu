"use client";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  planName: string;
  amount: number;
  reference: string;
  createdAt: string;
};

// Shows on the dashboard while a UPI payment is waiting for manual approval,
// so the customer isn't left wondering whether their money arrived.
export default function PendingOrderBanner() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.pending) setOrder(data.pending);
      } catch {
        // Silent — the banner is informational only.
      }
    })();
  }, []);

  if (!order) return null;

  return (
    <div className="mb-6 rounded-2xl border border-tick/40 bg-tick/[0.07] px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-tick">
            Your {order.planName} plan is under process
          </p>
          <p className="muted mt-1 text-xs leading-relaxed">
            We received your payment of ₹{order.amount.toLocaleString("en-IN")} (ref{" "}
            <span className="font-mono">{order.reference}</span>) and are checking it against our
            records. You will get an email as soon as your plan is active.
          </p>
        </div>
      </div>
    </div>
  );
}
