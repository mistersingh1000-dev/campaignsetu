export default function HomePage() {
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
      <section style={{ maxWidth: "680px" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", lineHeight: 1.25, fontWeight: 700, margin: "0 0 18px" }}>
          यह वेबसाइट स्थानांतरित हो चुकी है
        </h1>
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", lineHeight: 1.7, color: "#d1d1d1", margin: "0 0 24px" }}>
          यह वेबसाइट अब आपकी आधिकारिक वेबसाइट Las Media Agency पर स्थानांतरित हो चुकी है।
          कृपया आगे से उसी वेबसाइट को एक्सेस करें।
        </p>
        <a
          href="https://lasmediaagency.online"
          style={{
            display: "inline-block",
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: 700,
            textDecoration: "underline",
            textUnderlineOffset: "5px",
            overflowWrap: "anywhere",
          }}
        >
          https://lasmediaagency.online
        </a>
      </section>
    </main>
  );
}
