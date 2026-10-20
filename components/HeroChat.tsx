"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";

type Msg = {
  id: number;
  side: "out" | "in";
  text: string;
  time: string;
  kind?: "otp" | "campaign" | "support";
};

const script: Msg[] = [
  { id: 1, side: "out", text: "Your OTP is 488 213. Valid for 5 minutes.", time: "10:24", kind: "otp" },
  { id: 2, side: "in", text: "Thanks! Message received ✅", time: "10:24" },
  { id: 3, side: "out", text: "🎉 Diwali Sale is live — flat 30% off, today only.", time: "10:25", kind: "campaign" },
  { id: 4, side: "in", text: "Do you ship to Pune?", time: "10:26", kind: "support" },
  { id: 5, side: "out", text: "Yes! Free delivery on orders above ₹999.", time: "10:26", kind: "support" },
];

const tag: Record<string, string> = {
  otp: "OTP",
  campaign: "Marketing",
  support: "Support",
};

export default function HeroChat() {
  const [count, setCount] = useState(0);
  const [readUpTo, setReadUpTo] = useState(0);

  useEffect(() => {
    if (count >= script.length) {
      const reset = setTimeout(() => {
        setCount(0);
        setReadUpTo(0);
      }, 4200);
      return () => clearTimeout(reset);
    }
    const t = setTimeout(() => {
      setCount((c) => c + 1);
      // mark previous outgoing as read shortly after next message
      setTimeout(() => setReadUpTo(count + 1), 600);
    }, count === 0 ? 500 : 1300);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* glow */}
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-radial-glow blur-2xl" />
      {/* phone */}
      <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#0b141a] shadow-[0_40px_120px_-30px_rgba(0,0,0,.8)]">
        {/* chat header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 font-display text-sm font-bold">
            BK
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Bright Kart</p>
            <p className="text-[11px] text-white/70">example customer</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34ff8f]" /> demo
          </span>
        </div>

        {/* messages */}
        <div
          className="flex h-[400px] flex-col gap-2 overflow-hidden px-3 py-4"
          style={{
            background:
              "linear-gradient(rgba(11,20,26,.92),rgba(11,20,26,.92)), repeating-linear-gradient(45deg,#13202b 0 12px,#0f1a22 12px 24px)",
          }}
        >
          {script.slice(0, count).map((m, i) => {
            const isRead = m.side === "out" && i < readUpTo;
            return (
              <div
                key={m.id}
                className={`flex animate-pop-in ${m.side === "out" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow ${
                    m.side === "out"
                      ? "rounded-br-sm bg-[#005c4b] text-white"
                      : "rounded-bl-sm bg-[#202c33] text-white/90"
                  }`}
                >
                  {m.kind && m.side === "out" && (
                    <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-[#7fe7b0]">
                      {tag[m.kind]}
                    </span>
                  )}
                  {m.text}
                  <span className="ml-2 inline-flex items-center gap-1 align-bottom text-[10px] text-white/55">
                    {m.time}
                    {m.side === "out" && (
                      <Icon.doubleTick
                        className="h-3.5 w-3.5"
                        style={{ color: isRead ? "#34B7F1" : "rgba(255,255,255,.55)" }}
                      />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* input bar */}
        <div className="flex items-center gap-2 bg-[#0b141a] px-3 py-3">
          <div className="flex-1 rounded-full bg-[#202c33] px-4 py-2 text-xs text-white/40">
            Type a message
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366]">
            <Icon.send className="h-4 w-4 text-[#0b141a]" />
          </span>
        </div>
      </div>

      {/* floating badge */}
      <div className="absolute -left-6 top-24 hidden animate-float rounded-2xl glass px-3 py-2 text-xs font-medium shadow-card sm:block">
        <span className="flex items-center gap-1.5">
          <Icon.doubleTick className="h-4 w-4" style={{ color: "#34B7F1" }} /> Read receipts
        </span>
      </div>
      <div className="absolute -right-4 bottom-28 hidden animate-float rounded-2xl glass px-3 py-2 text-xs font-medium shadow-card sm:block" style={{ animationDelay: "1.4s" }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald" /> Delivery status tracking
        </span>
      </div>
    </div>
  );
}
