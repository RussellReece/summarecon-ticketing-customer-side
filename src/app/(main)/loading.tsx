// src/app/(main)/loading.tsx
//
// Instant loading state for the main catalog page (App Router convention).
// Next.js displays this while the Server Component / page streams its initial data.

export default function Loading() {
  return (
    <div className="page-container" style={{ paddingBlock: "48px" }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow eyebrow-dark">MEMUAT DATA...</span>
          <h2>Daftar Acara</h2>
        </div>
      </div>

      <div className="event-grid" aria-busy="true" aria-label="Memuat daftar acara">
        {[1, 2, 3].map((item) => (
          <article
            className="event-card"
            key={item}
            style={{ opacity: 0.6, pointerEvents: "none" }}
          >
            <div
              className="event-art"
              style={{
                background: "linear-gradient(135deg, #e9e7e3, #dcd9d2)",
                height: "210px",
              }}
            />
            <div className="event-card-body" style={{ padding: "19px 18px 16px" }}>
              <div
                style={{
                  height: "14px",
                  width: "40%",
                  background: "#e9e7e3",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              />
              <div
                style={{
                  height: "22px",
                  width: "80%",
                  background: "#dcd9d2",
                  borderRadius: "4px",
                  marginBottom: "12px",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "60%",
                  background: "#e9e7e3",
                  borderRadius: "4px",
                  marginBottom: "8px",
                }}
              />
              <div
                style={{
                  height: "12px",
                  width: "50%",
                  background: "#e9e7e3",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              />
              <div
                style={{
                  height: "20px",
                  width: "35%",
                  background: "#dcd9d2",
                  borderRadius: "4px",
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

