import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark petal-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false">
              <path d="M20 22C13 16 15 7 20 3c5 4 7 13 0 19Z" />
              <path d="M19 22C10 22 5 15 5 9c7-1 14 3 14 13Z" />
              <path d="M21 22c9 0 14-7 14-13-7-1-14 3-14 13Z" />
              <path d="M19 23C12 28 12 35 17 38c4-3 6-9 2-15Z" />
              <path d="M21 23c7 5 7 12 2 15-4-3-6-9-2-15Z" />
            </svg>
          </span>
          <span className="brand-name">temu<span className="brand-light">tiket</span></span>
        </Link>
        <p>Temukan acara seru di Summarecon Mall Bandung.</p>
        <span className="footer-copy">© 2026 SummareconTicket</span>
      </div>
    </footer>
  );
}
