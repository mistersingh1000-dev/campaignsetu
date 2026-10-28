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
  const [pending, setPending] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [access, setAccess] = useState<"checking" | "allowed" | "sign_in" | "inactive" | "unavailable">("checking");
  const codeRef = useRef<string | null>(null);
  const signupRef = useRef<{ waba_id?: string; phone_number_id?: string; coexistence?: boolean }>({});
  const submittingRef = useRef(false);

  const ready =
    APP_ID !== "YOUR_META_APP_ID" &&
    CONFIG_ID !== "YOUR_CONFIG_ID" &&
    Boolean(APP_ID) &&
    Boolean(CONFIG_ID);

  const checkPending = useCallback(async () => {
    try {
      const response = await fetch("/api/embedded-signup/exchange", { cache: "no-store" });
      if (response.status === 401) {
        setAccess("sign_in");
      } else if (response.ok) {
        const state = await response.json();
        setPending(state.pending === true);
        setAccess(state.canConnect === true ? "allowed" : "inactive");
      } else {
        setAccess("unavailable");
      }
    } catch {
      setAccess("unavailable");
    }
  }, []);

  useEffect(() => { void checkPending(); }, [checkPending]);

  const resumeConnection = async () => {
    if (recovering || access !== "allowed") return;
    setRecovering(true);
    setStatus("Resuming the saved Meta connection…");
    try {
      const res = await fetch("/api/embedded-signup/exchange", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.pending) setPending(true);
        setStatus(data?.message || "Could not complete the saved connection. Contact support.");
      } else {
        setStatus("Meta account details are saved. Message delivery still requires Meta approval and end-to-end testing.");
        onConnected?.();
      }
      await checkPending();
    } catch {
      setStatus("Could not reach the server. Your saved connection may still be pending; contact support before restarting signup.");
    } finally {
      setRecovering(false);
    }
  };

  const saveIfReady = useCallback(async () => {
    const code = codeRef.current;
    const { waba_id, phone_number_id, coexistence } = signupRef.current;
    if (!code || !waba_id || (!coexistence && !phone_number_id) || submittingRef.current) return;

    submittingRef.current = true;
    setStatus("Finishing your WhatsApp API connection…");

    try {
      const res = await fetch("/api/embedded-signup/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, waba_id, phone_number_id, coexistence: coexistence === true }),
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
        setStatus("Meta account details are saved. Message delivery still requires Meta approval and end-to-end testing.");
        setPending(false);
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
      setStatus("Could not reach the server to finish setup. Check for a saved connection before starting signup again.");
      await checkPending();
    } finally {
      submittingRef.current = false;
    }
  }, [onConnected, checkPending]);

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

        if (data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
          const waba_id = data?.data?.waba_id;
          if (!waba_id) {
            setStatus("Meta did not return the WhatsApp account ID. Contact support before retrying.");
          } else {
            signupRef.current = { waba_id, phone_number_id: data?.data?.phone_number_id, coexistence: true };
            void saveIfReady();
          }
        } else if (data?.event === "FINISH") {
          // This button is exclusively for the existing Business App flow.
          // Do not send a standard FINISH result to the registration endpoint.
          codeRef.current = null;
          signupRef.current = {};
          setStatus("Meta did not confirm an existing Business App connection. No phone registration was started. Contact support before retrying.");
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

  const launch = (existingBusinessApp = false) => {
    if (access !== "allowed") {
      setStatus("Sign in with an active account before starting WhatsApp signup.");
      return;
    }
    if (pending) {
      setStatus("A connection is already pending. Use Resume connection instead of starting again.");
      return;
    }
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
          ...(existingBusinessApp ? { featureType: "whatsapp_business_app_onboarding" } : {}),
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
          onClick={() => launch(true)}
          disabled={!ready || pending || recovering || access !== "allowed"}
          title={ready ? "Open Meta Embedded Signup" : "Meta Embedded Signup is being configured"}
          className="btn-primary shrink-0 bg-[#1877F2] bg-none text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon.link className="h-5 w-5" />
          Connect WhatsApp
        </button>
      </div>

      <p className="muted mt-4 text-sm">
        Connect your existing WhatsApp Business App using the Meta-hosted coexistence flow. Keep the WhatsApp Business app installed and active on your phone.
      </p>

      {access === "sign_in" && (
        <p className="mt-4 text-sm">Please <a href="/login" className="text-emerald underline">sign in</a> to your CampaignSetu account before connecting WhatsApp.</p>
      )}
      {access === "inactive" && <p className="mt-4 text-sm">An active trial or subscription is required to connect WhatsApp.</p>}
      {access === "unavailable" && <p className="mt-4 text-sm">Connection status is unavailable. Please refresh or contact support.</p>}
      {pending && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 p-4 text-sm">
          <p>A previous Meta connection is saved but still needs completion. Do not start signup again.</p>
          <button type="button" onClick={resumeConnection} disabled={recovering || access !== "allowed"} className="btn-ghost mt-3">
            {recovering ? "Resuming…" : "Resume connection"}
          </button>
        </div>
      )}

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
