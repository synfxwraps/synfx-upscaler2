import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

const ENGINE_LABEL = { clarity: "Clarity", "real-esrgan": "Real-ESRGAN" };

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function History({ session }) {
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("upscale_jobs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setJobs([]);
    } else {
      setJobs(data || []);
    }
  }, [session.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (job) => {
    if (!job.output_path) return;
    setDownloadingId(job.id);
    setError(null);
    try {
      const { data, error } = await supabase.storage
        .from("results")
        .createSignedUrl(job.output_path, 3600);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Could not create a download link.");
      }
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err) {
      setError(err.message || "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (jobs === null) {
    return (
      <div className="card">
        <div className="progress-wrap">
          <div className="spinner" />
          <div className="progress-note">Loading your history…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Upscale history</h2>
        <button className="btn btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {jobs.length === 0 ? (
        <div className="empty">
          <div className="icon">🗂️</div>
          <div>No upscales yet.</div>
          <div className="muted">Your finished jobs will appear here.</div>
        </div>
      ) : (
        jobs.map((job) => (
          <div className="job-row" key={job.id}>
            <div className="job-main">
              <div className="job-title">
                <span className={`badge badge-${job.status}`}>{job.status}</span>
                {(ENGINE_LABEL[job.engine] || job.engine)} · {job.scale}×
              </div>
              <div className="job-sub">
                {fmtDate(job.created_at)}
                {job.status === "failed" && job.error ? " · failed" : ""}
              </div>
            </div>
            {job.status === "succeeded" && job.output_path && (
              <button
                className="btn"
                onClick={() => download(job)}
                disabled={downloadingId === job.id}
              >
                {downloadingId === job.id ? "…" : "⬇ Download"}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
