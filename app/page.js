"use client";

import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [error, setError] = useState("");
  
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [downloading, setDownloading] = useState(false);

  const fetchInfo = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoadingInfo(true);
    setError("");
    setVideoInfo(null);
    
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch info");
      
      setVideoInfo(data);
      setStartTime(0);
      setEndTime(data.duration);
      if (data.qualities && data.qualities.length > 0) {
        setSelectedFormat(data.qualities[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    
    try {
      const formatTime = (seconds) => {
        const d = new Date(seconds * 1000);
        return d.toISOString().substring(11, 19);
      };

      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          quality: selectedFormat,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Download failed");
      }

      // Handle file download via stream
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = "cropped_video.mp4";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartChange = (e) => {
    const val = Math.min(Number(e.target.value), endTime - 1);
    setStartTime(val);
  };

  const handleEndChange = (e) => {
    const val = Math.max(Number(e.target.value), startTime + 1);
    setEndTime(val);
  };

  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ maxWidth: "800px", width: "100%", textAlign: "center", marginBottom: "40px" }}>
        <h1 className="animate-fade-in" style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "16px", background: "linear-gradient(to right, var(--primary), var(--secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          YT Cropper
        </h1>
        <p className="animate-fade-in" style={{ color: "var(--text-muted)", fontSize: "1.1rem", animationDelay: "0.1s" }}>
          Download and crop YouTube videos with ease. Premium quality, zero hassle.
        </p>
      </div>

      <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "800px", padding: "32px", animationDelay: "0.2s" }}>
        <form onSubmit={fetchInfo} style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <input 
            type="url" 
            className="glass-input" 
            placeholder="Paste YouTube URL here..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1 }}
            required
          />
          <button type="submit" className="btn-primary" disabled={loadingInfo || downloading}>
            {loadingInfo ? "Fetching..." : "Load Video"}
          </button>
        </form>

        {error && (
          <div style={{ background: "rgba(255, 61, 0, 0.1)", color: "var(--error)", padding: "16px", borderRadius: "var(--radius-md)", marginBottom: "24px", border: "1px solid rgba(255, 61, 0, 0.2)" }}>
            {error}
          </div>
        )}

        {videoInfo && (
          <div className="animate-fade-in">
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
              {/* Video Player */}
              <div style={{ width: "100%", borderRadius: "var(--radius-md)", overflow: "hidden", position: "relative", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", aspectRatio: "16/9", background: "#000" }}>
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoInfo.id}?start=${startTime}&end=${endTime}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                ></iframe>
              </div>

              <div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "16px", lineHeight: 1.4 }}>{videoInfo.title}</h3>
                
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "8px" }}>Select Quality</label>
                  <select 
                    className="glass-input" 
                    value={selectedFormat} 
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    style={{ width: "100%", appearance: "none", cursor: "pointer" }}
                  >
                    {videoInfo.qualities.map((q) => (
                      <option key={q} value={q} style={{ color: "#000" }}>
                        {q} (Best Audio + Video)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.2)", padding: "24px", borderRadius: "var(--radius-lg)", marginBottom: "32px" }}>
              <h4 style={{ marginBottom: "24px", fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
                <span>Crop Video Range</span>
                <span style={{ color: "var(--primary)" }}>{formatSeconds(endTime - startTime)} selected</span>
              </h4>
              
              {/* Custom Range Slider */}
              <div style={{ position: "relative", width: "100%", height: "40px", marginBottom: "20px" }}>
                <div style={{ 
                  position: "absolute", top: "50%", left: 0, right: 0, height: "6px", 
                  background: "var(--surface-hover)", borderRadius: "3px", transform: "translateY(-50%)" 
                }}></div>
                <div style={{ 
                  position: "absolute", top: "50%", 
                  left: `${(startTime / videoInfo.duration) * 100}%`, 
                  right: `${100 - (endTime / videoInfo.duration) * 100}%`, 
                  height: "6px", background: "var(--primary)", borderRadius: "3px", transform: "translateY(-50%)" 
                }}></div>
                <input 
                  type="range" 
                  min="0" max={videoInfo.duration} 
                  value={startTime} 
                  onChange={handleStartChange}
                  className="dual-slider"
                />
                <input 
                  type="range" 
                  min="0" max={videoInfo.duration} 
                  value={endTime} 
                  onChange={handleEndChange}
                  className="dual-slider"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px" }}>Start Time</label>
                  <div style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace" }}>{formatSeconds(startTime)}</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "8px" }}>End Time</label>
                  <div style={{ fontSize: "1.2rem", fontWeight: "bold", fontFamily: "monospace" }}>{formatSeconds(endTime)}</div>
                </div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }} 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <span className="animate-pulse">Processing & Downloading...</span>
              ) : (
                "Download Video"
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
