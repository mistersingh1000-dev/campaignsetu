"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "YOUR_META_APP_ID";
const CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || "YOUR_CONFIG_ID";
const GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v26.0";

export default function EmbeddedSignupButton({ onConnected }: { onConnected?: () => void }) {
  const [status, setStatus] = useState<string>("");
  const codeRef = useRef<string | null>(null);
  const signupRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});
  const submittingRef = useRef(false);

  const ready =
    APP_ID !== "YOUR_META_APP_ID" &&
    CONFIG_ID !== "YOUR_CONFIG_ID" &&
    Boolean(APP_ID) &&
    Boolean(CONFIG_ID);

  const saveIfReady = useCallback(async () => {
    const code = codeRef.current;
    const { waba_id, phone_number_id } = signupRef.current;
    if (!code || !waba_id || !phone_number_id || submittingRef.current) return;

    submittingRef.current = true;
    setStatus("Finishing your WhatsApp API connection…");

    try {
      const res = await fetch("/api/embedded-signup/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, waba_id, phone_number_id }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus(
          data?.message ||
            "Meta completed signup, but the final API provisioning step failed. Please contact support before retrying with the same number."
        );
        return;
      }

      if (data?.registered === true) {
        setStatus("Connected ✓ Your WhatsApp Business Account, phone number and webhook are connected.");
      } else if (data?.needsRegistration) {
        setStatus(
          data?.message ||
            "Meta signup is complete, but final phone activation is still pending. Your dashboard will show the current status."
        );
      } else {
        setStatus("Meta signup completed. Checking activation status…");
      }
      onConnected?.();
    } catch {
      setStatus("Could not reach the server to finish setup. Please try again.");
    } finally {
      submittingRef.current = false;
    }
  }, [onConnected]);

  useEffect(() => {
    if (!ready) return;

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId: APP_ID,
        autoLogAppEvents: true,
        xfbml: false,
        version: GRAPH_VERSION,
      });
    };

    if (!window.FB && !document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
    } else if (window.FB) {
      window.fbAsyncInit?.();
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com") return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;

        if (data?.event === "FINISH") {
          const waba_id = data?.data?.waba_id;
          const phone_number_id = data?.data?.phone_number_id;
          if (waba_id && phone_number_id) {
            signupRef.current = { waba_id, phone_number_id };
            void saveIfReady();
          } else {
            setStatus("Meta finished signup but did not return the WhatsApp account IDs. Please contact support before retrying.");
          }
        } else if (data?.event === "CANCEL") {
          setStatus("Signup was cancelled before completion.");
        } else if (data?.event === "ERROR") {
          setStatus(data?.data?.error_message || "Meta reported an Embedded Signup error.");
        }
      } catch {
        // Ignore unrelated browser postMessage traffic.
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ready, saveIfReady]);

  const launch = () => {
    if (!ready || !window.FB) {
      setStatus("Meta Embedded Signup is not enabled yet. Please contact support.");
      return;
    }

    codeRef.current = null;
    signupRef.current = {};
    submittingRef.current = false;
    setStatus("Opening Meta's secure WhatsApp signup…");

    window.FB.login(
      (response: any) => {
        if (response?.authResponse?.code) {
          codeRef.current = response.authResponse.code;
          void saveIfReady();
        } else {
          setStatus("Signup was cancelled or Meta did not return an authorization code.");
        }
      },
      {
        config_id: CONFIG_ID,
        auth_type: "rerequest",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: "3",
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--line)" }}>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Meta WhatsApp Embedded Signup</h3>
          <p className="muted mt-1 max-w-2xl text-sm leading-relaxed">
            A secure Meta popup will open so you can select or create your Business Portfolio, WhatsApp Business Account and phone number.
          </p>
        </div>
        <button
          onClick={launch}
          disabled={!ready}
          title={ready ? "Open Meta Embedded Signup" : "Meta Embedded Signup is being configured"}
          className="btn-primary shrink-0 bg-[#1877F2] bg-none text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon.link className="h-5 w-5" />
          Connect WhatsApp
        </button>
      </div>

      {status && (
        <div className="mt-5 rounded-2xl border border-emerald/30 bg-emerald/[0.06] px-4 py-3 text-sm">
          {status}
        </div>
      )}

      {!ready && (
        <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
          <p className="text-sm font-semibold text-amber-300">Meta Embedded Signup is not enabled yet</p>
          <p className="muted mt-1.5 text-sm leading-relaxed">
            The site administrator must complete the Meta Business app and Embedded Signup configuration first. Once enabled, this button opens the Meta-hosted popup directly.
          </p>
        </div>
      )}
    </div>
  );
}
