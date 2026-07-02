export default function Account({ session, profile, onSignOut, onBuyCredits }) {
  const email = session?.user?.email || "—";
  const isOwner = profile?.role === "owner";

  return (
    <div className="card">
      <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Account</h2>

      <div className="acct-row">
        <span className="k">Email</span>
        <span className="v">{email}</span>
      </div>
      <div className="acct-row">
        <span className="k">Plan</span>
        <span className="v">
          {isOwner ? "Owner · unlimited upscales" : "Pay-as-you-go"}
        </span>
      </div>
      <div className="acct-row">
        <span className="k">Credit balance</span>
        <span className="v">
          {isOwner ? "Unlimited" : profile ? `${profile.credits} credits` : "…"}
        </span>
      </div>

      {!isOwner && (
        <button className="btn btn-primary btn-block mt-24" onClick={onBuyCredits}>
          Buy more credits
        </button>
      )}

      <button className="btn btn-block mt-16" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
