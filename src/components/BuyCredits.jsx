import { useState } from "react";
import { CREDIT_PACKS, FUNCTIONS_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";

export default function BuyCredits({ session, onClose }) {
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  const buy = async (pack) => {
    setError(null);
    setLoadingId(pack.id);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/create-checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price_id: pack.price_id }),
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        throw new Error(payload?.error || `Could not start checkout (HTTP ${res.status}).`);
      }

      const url = payload?.url || payload?.checkout_url;
      if (!url) throw new Error("Checkout session did not return a URL.");
      window.location.href = url; // redirect to Stripe Checkout
    } catch (err) {
      setError(err.message || "Something went wrong starting checkout.");
      setLoadingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>Buy credits</h2>
            <p>1 credit = 1 upscale. Pick a pack — you'll be taken to secure Stripe checkout.</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="packs">
          {CREDIT_PACKS.map((pack) => (
            <div className={`pack ${pack.popular ? "popular" : ""}`} key={pack.id}>
              {pack.popular && <div className="tag">Most popular</div>}
              <div className="name">{pack.name}</div>
              <div className="credits">{pack.credits}</div>
              <div className="credits-label">credits</div>
              <div className="blurb">{pack.blurb}</div>
              <button
                className="btn btn-primary btn-block"
                onClick={() => buy(pack)}
                disabled={loadingId !== null}
              >
                {loadingId === pack.id ? "Redirecting…" : "Buy"}
              </button>
            </div>
          ))}
        </div>

        <p className="muted center mt-16" style={{ fontSize: 13 }}>
          Prices shown at checkout. Payments handled securely by Stripe.
        </p>
      </div>
    </div>
  );
}
