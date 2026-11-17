export default function MovedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#000000",
        color: "#ffffff",
        textAlign: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section style={{ maxWidth: "720px" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", lineHeight: 1.25, fontWeight: 700, margin: "0 0 18px" }}>
          Website Moved
        </h1>
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", lineHeight: 1.7, color: "#d1d1d1", margin: "0 0 28px" }}>
          This website has moved to the official Las Media Agency domain.
          Please visit and use our new website for all future access.
        </p>
        <div style={{ height: "1px", background: "#444444", margin: "0 auto 28px", maxWidth: "420px" }} />
        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", lineHeight: 1.3, fontWeight: 700, margin: "0 0 16px" }}>
          यह वेबसाइट स्थानांतरित हो चुकी है
        </h2>
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", lineHeight: 1.7, color: "#d1d1d1", margin: "0 0 28px" }}>
          यह वेबसाइट अब Las Media Agency की आधिकारिक वेबसाइट पर स्थानांतरित हो चुकी है।
          कृपया आगे से सभी सेवाओं और जानकारी के लिए हमारी नई वेबसाइट का ही उपयोग करें।
        </p>
        <a href="https://lasmediaagency.online" style={{ display: "inline-block", color: "#ffffff", fontSize: "18px", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "5px", overflowWrap: "anywhere" }}>
          https://lasmediaagency.online
        </a>
      </section>
    </main>
  );
}
