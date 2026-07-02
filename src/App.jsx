import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";
import Auth from "./components/Auth.jsx";
import Upscaler from "./components/Upscaler.jsx";
import History from "./components/History.jsx";
import Account from "./components/Account.jsx";
import BuyCredits from "./components/BuyCredits.jsx";
import BrandMark from "./components/BrandMark.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState(null); // { credits, role }
  const [tab, setTab] = useState("upscale");
  const [showBuy, setShowBuy] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState(null);

  // ── Session bootstrap ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Credit / profile fetch ─────────────────────────────────
  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("credits, role")
      .eq("id", uid)
      .single();
    if (!error && data) setProfile(data);
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) refreshProfile();
    else setProfile(null);
  }, [session?.user?.id, refreshProfile]);

  // ── Handle Stripe checkout return (?checkout=success|cancel) ─
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const co = params.get("checkout");
    if (!co) return;
    if (co === "success") {
      setCheckoutNotice({
        type: "success",
        msg: "Payment received — credits are being added. Balance updates within a few seconds.",
      });
      // Webhook may lag a moment; poll a few times.
      let tries = 0;
      const iv = setInterval(() => {
        refreshProfile();
        if (++tries >= 5) clearInterval(iv);
      }, 2000);
    } else if (co === "cancel") {
      setCheckoutNotice({ type: "info", msg: "Checkout canceled — no charge was made." });
    }
    // Clean the URL.
    window.history.replaceState({}, "", window.location.pathname);
  }, [refreshProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTab("upscale");
  };

  if (!authReady) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const isOwner = profile?.role === "owner";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <BrandMark className="brand-mark" />
          <div>
            SYNFX <span className="sub">Upscaler</span>
          </div>
        </div>
        <div className="topbar-right">
          <button
            className="credit-pill"
            onClick={() => setShowBuy(true)}
            title="Buy more credits"
          >
            <span className="dot" />
            {isOwner ? (
              <span className="owner">Owner · Unlimited</span>
            ) : (
              <span>{profile ? profile.credits : "…"} credits</span>
            )}
          </button>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${tab === "upscale" ? "active" : ""}`}
          onClick={() => setTab("upscale")}
        >
          Upscale
        </button>
        <button
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          History
        </button>
        <button
          className={`tab ${tab === "account" ? "active" : ""}`}
          onClick={() => setTab("account")}
        >
          Account
        </button>
      </nav>

      {checkoutNotice && (
        <div className={`alert alert-${checkoutNotice.type}`}>
          {checkoutNotice.msg}
        </div>
      )}

      {tab === "upscale" && (
        <Upscaler
          session={session}
          profile={profile}
          onCreditsChanged={refreshProfile}
          onNeedCredits={() => setShowBuy(true)}
        />
      )}
      {tab === "history" && <History session={session} />}
      {tab === "account" && (
        <Account
          session={session}
          profile={profile}
          onSignOut={signOut}
          onBuyCredits={() => setShowBuy(true)}
        />
      )}

      {showBuy && (
        <BuyCredits
          session={session}
          onClose={() => setShowBuy(false)}
        />
      )}
    </div>
  );
}
