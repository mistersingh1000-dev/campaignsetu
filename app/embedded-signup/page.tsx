import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import SignupFlow from "@/components/SignupFlow";
import EmbeddedSignupButton from "@/components/EmbeddedSignupButton";
import CodeBlock from "@/components/CodeBlock";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Meta Embedded Signup — Connect a Customer WhatsApp Account",
  description:
    "Use Meta Embedded Signup to connect a customer's Business Portfolio, WhatsApp Business Account and phone number to Codecraft Messaging Hub.",
};

const sdkCode = `// Important: Meta returns the authorization code and the
// WA_EMBEDDED_SIGNUP FINISH event separately. Collect BOTH before
// calling your server.
let code;
let waba_id;
let phone_number_id;

function finishWhenReady() {
  if (!code || !waba_id || !phone_number_id) return;
  return fetch("/api/embedded-signup/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, waba_id, phone_number_id }),
  });
}

// FB.login callback -> save response.authResponse.code into 'code'.
// WA_EMBEDDED_SIGNUP FINISH postMessage -> save waba_id + phone_number_id.
// Then call finishWhenReady().`;

export default function EmbeddedSignupPage() {
  return (
    <>
      <PageHeader
        eyebrow="Meta Embedded Signup"
        title={<>Connect a customer account with <span className="gradient-text">Meta onboarding</span></>}
        subtitle="The Meta-hosted flow lets the customer choose the correct business and WhatsApp assets. Final activation still depends on your Meta app configuration, permissions and the customer's account eligibility."
      />

      <section className="container-px py-16">
        <SignupFlow />
      </section>

      <section className="container-px py-8">
        <div className="mx-auto max-w-3xl">
          <EmbeddedSignupButton />
        </div>
      </section>

      <section className="container-px py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5">
          <p className="text-sm font-semibold text-amber-200">Production Meta requirements</p>
          <p className="muted mt-2 text-sm leading-relaxed">
            Multi-client Embedded Signup is a Meta Tech Provider / Solution Partner style flow.
            Your Meta app must complete the required review and permissions before you can release
            it broadly to customers. Individual WABAs and phone numbers can also require additional
            verification or activation steps.
          </p>
        </div>
      </section>

      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Implementation note"
          title="Do not exchange the code too early"
          subtitle="The frontend must wait for both Meta callbacks. The production component on this site already does that."
        />
        <div className="mx-auto mt-10 max-w-3xl">
          <CodeBlock title="embedded-signup.ts" code={sdkCode} />
        </div>
      </section>
    </>
  );
}
