import { useEffect, useRef, useState } from "react";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "../lib/supabase.js";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

const ENGINES = [
  { id: "clarity", title: "Clarity Upscaler", desc: "Best detail (default)" },
  { id: "real-esrgan", title: "Real-ESRGAN", desc: "Faster & cheaper" },
];
const SCALES = [2, 4, 8];

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Upscaler({ session, profile, onCreditsChanged, onNeedCredits }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // object URL for the original
  const [engine, setEngine] = useState("clarity");
  const [scale, setScale] = useState(4);
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { download_url }

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const isOwner = profile?.role === "owner";
  const noCredits = !isOwner && (profile?.credits ?? 0) < 1;

  // Clean up object URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Elapsed-time ticker while processing.
  useEffect(() => {
    if (status === "uploading") {
      const start = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const pickFile = (f) => {
    setError(null);
    setResult(null);
    setStatus("idle");
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("Unsupported file type. Use PNG, JPG, or WebP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`File is too large (${humanSize(f.size)}). Max is 20 MB.`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    pickFile(f);
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setStatus("idle");
  };

  const runUpscale = async () => {
    if (!file) return;
    if (noCredits) {
      onNeedCredits?.();
      return;
    }
    setError(null);
    setResult(null);
    setStatus("uploading");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("engine", engine);
      form.append("scale", String(scale));

      const res = await fetch(`${FUNCTIONS_URL}/upscale`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: form,
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        /* non-JSON response */
      }

      if (!res.ok) {
        if (res.status === 402) {
          setStatus("idle");
          setError("You're out of credits. Buy more to keep upscaling.");
          onNeedCredits?.();
          return;
        }
        throw new Error(payload?.error || `Upscale failed (HTTP ${res.status}).`);
      }

      if (!payload?.download_url) {
        throw new Error(payload?.error || "Upscale finished but no result was returned.");
      }

      setResult(payload);
      setStatus("done");
      onCreditsChanged?.(); // refresh balance (a credit was spent unless owner)
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong during upscaling.");
    }
  };

  const busy = status === "uploading";
  // Reassuring progress that eases toward ~92% over ~100s while we wait.
  const pct = Math.min(92, Math.round((1 - Math.exp(-elapsed / 45)) * 100));

  return (
    <div>
      {/* ── Result view ─────────────────────────────────────── */}
      {status === "done" && result ? (
        <div className="card">
          <div className="alert alert-success">
            Done! Upscaled {scale}× with{" "}
            {engine === "clarity" ? "Clarity Upscaler" : "Real-ESRGAN"}.
          </div>
          <div className="ba-grid">
            <div className="ba-col">
              <div className="ba-cap">Before</div>
              <div className="ba-img">
                {previewUrl && <img src={previewUrl} alt="Original" />}
              </div>
            </div>
            <div className="ba-col">
              <div className="ba-cap">After · {scale}×</div>
              <div className="ba-img">
                <img src={result.download_url} alt="Upscaled result" />
              </div>
            </div>
          </div>
          <div className="options-row" style={{ marginBottom: 0 }}>
            <a
              className="btn btn-primary btn-lg"
              href={result.download_url}
              target="_blank"
              rel="noreferrer"
              download
            >
              ⬇ Download result
            </a>
            <button className="btn btn-lg" onClick={reset}>
              Upscale another
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          {noCredits && !error && (
            <div className="alert alert-info">
              You have no credits left.{" "}
              <a onClick={onNeedCredits} style={{ cursor: "pointer" }}>
                Buy a credit pack
              </a>{" "}
              to continue.
            </div>
          )}

          {/* Upload zone / preview */}
          {!file ? (
            <div
              className={`dropzone ${dragging ? "drag" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="icon">🖼️</div>
              <div className="big">Drop an image here, or tap to browse</div>
              <div className="hint">PNG, JPG or WebP · up to 20 MB</div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="preview-thumb">
              {previewUrl && <img src={previewUrl} alt="Selected" />}
              <div className="preview-meta">
                <span title={file.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name} · {humanSize(file.size)}
                </span>
                {!busy && (
                  <button className="btn btn-ghost" onClick={reset}>
                    Change
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          {file && !busy && (
            <>
              <div className="options-row">
                <div className="opt-group">
                  <div className="opt-label">Engine</div>
                  <div className="seg">
                    {ENGINES.map((e) => (
                      <button
                        key={e.id}
                        className={`seg-btn ${engine === e.id ? "active" : ""}`}
                        onClick={() => setEngine(e.id)}
                      >
                        <span className="t">{e.title}</span>
                        <span className="d">{e.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="opt-group">
                  <div className="opt-label">Scale</div>
                  <div className="seg scale">
                    {SCALES.map((s) => (
                      <button
                        key={s}
                        className={`seg-btn ${scale === s ? "active" : ""}`}
                        onClick={() => setScale(s)}
                      >
                        <span className="t">{s}×</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={runUpscale}
                disabled={busy}
              >
                {noCredits
                  ? "Buy credits to upscale"
                  : isOwner
                  ? `Upscale ${scale}× — free (owner)`
                  : `Upscale ${scale}× — 1 credit`}
              </button>
            </>
          )}

          {/* Loading */}
          {busy && (
            <div className="progress-wrap">
              <div className="spinner" />
              <div className="progress-note">
                Upscaling with {engine === "clarity" ? "Clarity Upscaler" : "Real-ESRGAN"}…
              </div>
              <div className="progress-bar">
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="progress-elapsed">
                {elapsed}s elapsed · this usually takes 30–120 seconds. Keep this tab open.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
