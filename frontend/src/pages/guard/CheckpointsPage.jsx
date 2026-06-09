import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiMaximize, FiLoader, FiCheckCircle, FiAlertTriangle, FiEdit3, FiX, FiCamera } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import jsQR from "jsqr";

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
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannerMessage, setScannerMessage] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
      
      if (response.data?.success) {
        setStatus({
          type: "success",
          message: "Checkpoint logged successfully."
        });
        setCheckpointQr("");
        setShowManualInput(false);
      } else {
        setStatus({
          type: "error",
          message: `Scan failed: ${response.data?.error || "Unknown validation error"}`
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error?.response?.data?.error || error.message || "Scan failed."
      });
    } finally {
      setBusy(false);
      setScannerMessage("");
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    handleScanSubmit(checkpointQr);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraAvailable(false);
      setCameraError("Camera access is not available in this browser.");
      return;
    }

    const tryConstraints = [{ video: { facingMode: { ideal: "environment" } } }, { video: true }];
    let stream = null;
    let lastError = null;

    for (const constraints of tryConstraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!stream) {
      setCameraAvailable(false);
      setCameraError(
        lastError?.message || "Unable to access camera. Please allow camera permissions or use manual entry."
      );
      return;
    }

    streamRef.current = stream;
    setCameraAvailable(true);
    setCameraError("");
  };

  useEffect(() => {
    startCamera();
    return () => {
      const tracks = streamRef.current?.getTracks() || [];
      tracks.forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraAvailable || !streamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }
    video.play().catch(() => {
      // Some mobile browsers may still delay autoplay until user interacts.
    });
  }, [cameraAvailable]);

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setStatus({ type: "error", message: "Camera is not ready. Please refresh or try manual entry." });
      return;
    }
    setBusy(true);
    setStatus(null);
    setScannerMessage("Scanning for QR code...");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let qrValue = null;

      if (window.BarcodeDetector) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats();
          const detector = new window.BarcodeDetector({ formats });
          const barcodes = await detector.detect(canvas);
          qrValue = barcodes?.[0]?.rawValue || null;
        } catch (error) {
          // Fall back to jsQR if browser BarcodeDetector cannot decode.
          qrValue = null;
        }
      }

      if (!qrValue) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrResult = jsQR(imageData.data, canvas.width, canvas.height);
        qrValue = qrResult?.data || null;
      }

      if (qrValue) {
        await handleScanSubmit(qrValue);
        return;
      }

      setStatus({ type: "error", message: "No QR code detected. Please align the checkpoint tag and try again." });
    } catch (error) {
      setStatus({ type: "error", message: error?.message || "Unable to read QR code from camera." });
    } finally {
      setBusy(false);
      setScannerMessage("");
    }
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
      minHeight: "100%", 
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

        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexGrow: 1,
          margin: "1.5rem 0"
        }}>
          <div style={{
            width: "100%",
            height: "260px",
            maxWidth: "100%",
            borderRadius: "1.25rem",
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#111827",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2)"
          }}>
            {cameraAvailable ? (
              <>
                <video
                  ref={videoRef}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />
              </>
            ) : (
              <div style={{ padding: "1.25rem", textAlign: "center" }}>
                <p style={{ color: "#f8fafc", fontSize: "1rem", marginBottom: "0.5rem" }}>Camera unavailable</p>
                <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{cameraError || "Please allow camera permissions or use manual entry."}</p>
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "2px solid rgba(59, 130, 246, 0.6)", boxShadow: "0 0 0 9999px rgba(15,23,42,0.24) inset", borderRadius: "1.25rem" }} />
            <div style={{ position: "absolute", inset: "1rem", borderRadius: "1.25rem", boxSizing: "border-box", border: "2px dashed rgba(255,255,255,0.22)" }} />
          </div>
        </div>

        {scannerMessage ? (
          <div style={{ padding: "0.95rem 1rem", borderRadius: "0.75rem", backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            {scannerMessage}
          </div>
        ) : null}

        {status && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            backgroundColor: status.type === "success" ? "#065f46" : "#991b1b",
            color: "#ffffff",
            fontSize: "0.9rem",
            marginBottom: "0.75rem"
          }}>
            {status.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertTriangle size={18} />}
            <span>{status.message}</span>
          </div>
        )}

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <button
            onClick={captureFromCamera}
            disabled={busy || !cameraAvailable}
            className="btn-tap-effect"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.85rem",
              border: "none",
              background: cameraAvailable ? "#2563eb" : "#64748b",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: busy || !cameraAvailable ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <FiCamera size={18} />
            {busy ? "Scanning..." : "Capture checkpoint QR"}
          </button>

          <button
            onClick={() => setShowManualInput(true)}
            className="btn-tap-effect"
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "0.85rem",
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
            Manual token entry
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