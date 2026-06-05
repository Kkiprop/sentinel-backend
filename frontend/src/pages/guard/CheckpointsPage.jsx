import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiMaximize, FiLoader, FiCheckCircle, FiAlertTriangle, FiEdit3, FiX } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error("Unable to retrieve location.")),
      { enableHighAccuracy: true }
    );
  });
}

export default function CheckpointsPage() {
  const navigate = useNavigate();
  const [checkpointQr, setCheckpointQr] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [busy, setBusy] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const handleScanSubmit = async (qrValue) => {
    if (!qrValue) return;
    setStatus(null);
    setBusy(true);

    try {
      const { latitude, longitude } = await getLocation();
      const scan = {
        checkpoint_qr: qrValue,
        latitude,
        longitude,
        scanned_at: new Date().toISOString(),
        client_id: `scan-${Date.now()}`,
      };

      const response = await api.post(endpoints.patrols.scan, scan);
      
      if (response.data.success) {
        setStatus({
          type: "success",
          message: `Checkpoint logged successfully. Valid: ${response.data.is_valid}`
        });
        setCheckpointQr("");
        setShowManualInput(false);
      } else {
        setStatus({
          type: "error",
          message: `Scan failed: ${response.data.error || "Unknown validation error"}`
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.response?.data?.error || error.message || "Scan failed."
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    handleScanSubmit(checkpointQr);
  };

  const nativeTapStyle = `
    .btn-tap-effect:active {
      transform: scale(0.96);
      opacity: 0.9;
      transition: transform 0.1s ease;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    .scanner-laser {
      animation: pulse 2s infinite ease-in-out;
    }
  `;

  return (
    <div style={{ 
      backgroundColor: "#0f172a", // Darker premium aesthetic for camera utility views
      height: "100vh", 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitUserSelect: "none",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <style>{nativeTapStyle}</style>

      {/* Native App View Top Header */}
      <header style={{ 
        display: "flex", 
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#1e293b",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid #334155",
        flexShrink: 0
      }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn-tap-effect"
          style={{ 
            border: "none",
            background: "none", 
            cursor: "pointer",
            padding: "0.25rem",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center"
          }}
        >
          <FiChevronLeft size={24} color="#ffffff" />
        </button>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ffffff", textAlign: "center" }}>
          Scan Checkpoint
        </h2>
        <div style={{ width: "24px" }} /> {/* Flex spacer for alignment */}
      </header>

      {/* Interactive Main Scan Viewport Frame */}
      <main style={{ 
        padding: "1.5rem 1.25rem", 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between", 
        flexGrow: 1 
      }}>
        
        {/* Context Prompt Text */}
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "0 0 0.25rem 0", color: "#f8fafc", fontSize: "1.1rem", fontWeight: 600 }}>
            Align QR Code
          </p>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
            Position the tag inside the frame to register location coordinates automatically.
          </p>
        </div>

        {/* Viewfinder Target Container */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          flexGrow: 1,
          margin: "1.5rem 0"
        }}>
          <div style={{
            width: "14rem",
            height: "14rem",
            borderRadius: "1.5rem",
            border: "2px dashed #3b82f6",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(30, 41, 59, 0.5)",
            boxShadow: "0 0 40px rgba(0,0,0,0.5)"
          }}>
            {busy ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <FiLoader size={36} color="#3b82f6" className="scanner-laser" style={{ animation: "spin 2s linear infinite" }} />
                <span style={{ color: "#3b82f6", fontSize: "0.85rem", fontWeight: 600 }}>Verifying GPS...</span>
              </div>
            ) : (
              <FiMaximize size={54} color="#64748b" className="scanner-laser" />
            )}
            
            {/* Corner Decorative Framing brackets */}
            <div style={{ position: "absolute", top: "1rem", left: "1rem", width: "1.5rem", height: "1.5rem", borderTop: "4px solid #3b82f6", borderLeft: "4px solid #3b82f6", borderRadius: "4px 0 0 0" }} />
            <div style={{ position: "absolute", top: "1rem", right: "1rem", width: "1.5rem", height: "1.5rem", borderTop: "4px solid #3b82f6", borderRight: "4px solid #3b82f6", borderRadius: "0 4px 0 0" }} />
            <div style={{ position: "absolute", bottom: "1rem", left: "1rem", width: "1.5rem", height: "1.5rem", borderBottom: "4px solid #3b82f6", borderLeft: "4px solid #3b82f6", borderRadius: "0 0 0 4px" }} />
            <div style={{ position: "absolute", bottom: "1rem", right: "1rem", width: "1.5rem", height: "1.5rem", borderBottom: "4px solid #3b82f6", borderRight: "4px solid #3b82f6", borderRadius: "0 0 4px 0" }} />
          </div>
        </div>

        {/* Dynamic Scan Feedback Panel Stack */}
        {status && (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: status.type === "success" ? "#065f46" : "#991b1b",
            color: "#ffffff",
            fontSize: "0.875rem",
            lineHeight: 1.4,
            marginBottom: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            {status.type === "success" ? (
              <FiCheckCircle size={20} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            ) : (
              <FiAlertTriangle size={20} style={{ flexShrink: 0, marginTop: "0.1rem" }} />
            )}
            <div style={{ flexGrow: 1, fontWeight: 500 }}>{status.message}</div>
            <button 
              onClick={() => setStatus(null)}
              style={{ border: "none", background: "none", color: "#ffffff", cursor: "pointer", opacity: 0.7 }}
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* Bottom Bar Actions Grid Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => setShowManualInput(true)}
            className="btn-tap-effect"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <FiEdit3 size={18} />
            Manual Token Entry
          </button>
        </div>
      </main>

      {/* Native Sheet Drawer Fallback Modal Overlay */}
      {showManualInput && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
          display: "flex",
          alignItems: "flex-end"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            width: "100%",
            padding: "1.5rem 1.25rem 2.5rem 1.25rem",
            borderTopLeftRadius: "1.25rem",
            borderTopRightRadius: "1.25rem",
            boxShadow: "0 -10px 25px rgba(0,0,0,0.25)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>Manual Code Entry</h3>
              <button 
                onClick={() => setShowManualInput(false)}
                style={{ border: "none", background: "#f1f5f9", padding: "0.35rem", borderRadius: "50%", cursor: "pointer" }}
              >
                <FiX size={18} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  Checkpoint Token
                </label>
                <input
                  value={checkpointQr}
                  onChange={(event) => setCheckpointQr(event.target.value)}
                  placeholder="e.g. checkpoint:mombasa-gate-04"
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "0.85rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                    fontSize: "1rem",
                    color: "#0f172a",
                    outline: "none"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-tap-effect"
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer"
                }}
              >
                {busy ? "Processing..." : "Verify & Log Tag"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}