import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import BrandMark from "./BrandMark.jsx";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const isSignup = mode === "signup";

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (isSignup && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is required, there is no active session yet.
        if (!data.session) {
          setNotice(
            "Account created. Check your email to confirm, then sign in. New accounts start with 3 free credits."
          );
          setMode("login");
        }
        // If confirmation is off, onAuthStateChange in App takes over automatically.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="auth-brand">
          <BrandMark className="brand-mark" />
          <div className="center">
            <h1 className="auth-title">SYNFX Upscaler</h1>
            <p className="auth-tagline">AI image upscaling, studio quality</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? "At least 6 characters" : "Your password"}
            />
          </div>

          <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <div className="auth-switch">
          {isSignup ? "Already have an account?" : "New to SYNFX?"}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError(null);
              setNotice(null);
            }}
          >
            {isSignup ? "Sign in" : "Create one — 3 free credits"}
          </button>
        </div>
      </div>
    </div>
  );
}
