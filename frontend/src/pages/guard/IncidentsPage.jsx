import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiSend, FiLoader, FiAlertTriangle, FiPaperclip, FiImage, FiX, FiUser } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { loadOfflineIncidents } from "../../lib/offline.js";
import {
  appendLocalRecord,
  enqueueOfflineAction,
  isOnline,
  isNetworkError,
} from "../../lib/offline.js";

const INCIDENT_TYPES = [
  { value: "other", label: "Other" },
  { value: "suspicious", label: "Suspicious Activity" },
  { value: "theft", label: "Theft" },
  { value: "fire", label: "Fire" },
];

export default function IncidentsPage() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [busy, setBusy] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); 

  const [messages, setMessages] = useState([
    {
      id: "init",
      sender: "system",
      text: "HQ Dispatch Active. Select an incident class below, type your report, or attach media logs to broadcast live to security operations.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Fetch historic feed entries on terminal instantiation
  useEffect(() => {
    api.get(endpoints.patrols.incidents)
      .then((response) => {
        const historyData = response.data.results || response.data;
        
        // Map historical database records into the chat message bubble array format
        const formattedHistory = historyData.map((incident) => {
          // If your API provides a marker or if we deduce authorship via name matching:
          // e.g., mapping guard_is_me property or guard_name comparison
          const isCurrentUser = incident.is_me || false; 

          return {
            id: incident.id || `hist-${Math.random()}`,
            sender: isCurrentUser ? "guard" : "peer",
            authorName: incident.guard_name || `Officer #${incident.guard}`,
            type: incident.type,
            text: incident.description,
            time: incident.created_at ? incident.created_at.replace("T", " ").substring(11, 16) : "Prior",
            attachment: incident.image ? { url: incident.image, type: "image" } : null
          };
        });

        // Retain the initialized system baseline broadcast notice at index 0
        setMessages(prev => [prev[0], ...formattedHistory.reverse()]);
      })
      .catch((err) => {
        const cached = loadOfflineIncidents();
        if (cached.length) {
          const formattedHistory = cached.map((incident) => ({
            id: incident.id || `hist-${Math.random()}`,
            sender: "guard",
            authorName: incident.guard_name || `Officer #${incident.guard || "me"}`,
            type: incident.type || incident.type || "other",
            text: incident.description || incident.notes || "Offline incident record",
            time: incident.created_at ? incident.created_at.replace("T", " ").substring(11, 16) : "Offline",
            attachment: incident.image ? { url: incident.image, type: "image" } : null,
          }));
          setMessages(prev => [prev[0], ...formattedHistory.reverse()]);
        } else {
          console.error("Could not trace historic dispatch recordings:", err);
        }
      });
  }, []);

  const getLocation = () =>
    new Promise((resolve, reject) => {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith("video/") ? "video" : "image";
    const previewUrl = URL.createObjectURL(file);

    setAttachedFile({
      file,
      previewUrl,
      type: fileType
    });
  };

  const removeAttachment = () => {
    if (attachedFile?.previewUrl) {
      URL.revokeObjectURL(attachedFile.previewUrl);
    }
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitIncident = async (event) => {
    event.preventDefault();
    if (!description.trim() && !attachedFile) return;

    const currentText = description;
    const currentType = type;
    const currentAttachment = attachedFile;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessageId = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        sender: "guard",
        authorName: "Me",
        type: currentType,
        text: currentText,
        time: timestamp,
        attachment: currentAttachment ? {
          url: currentAttachment.previewUrl,
          type: currentAttachment.type
        } : null
      }
    ]);

    setDescription("");
    setAttachedFile(null);
    setBusy(true);

    try {
      const { latitude, longitude } = await getLocation();
      
      const payload = {
        description: currentText,
        type: currentType,
        latitude,
        longitude,
        created_at: new Date().toISOString(),
        client_id: `incident-${Date.now()}`
      };

      await api.post(endpoints.patrols.incidents, payload);

      appendLocalRecord("incidents", { ...payload, pending: false });
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-success-${Date.now()}`,
          sender: "system",
          text: `Logged [${currentType.toUpperCase()}]. Digital telemetry logs and media links synchronized with cloud dashboards.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          success: true
        }
      ]);

    } catch (error) {
      if (!isOnline() || isNetworkError(error)) {
        const fallbackPayload = {
          description: currentText,
          type: currentType,
          latitude: null,
          longitude: null,
          created_at: new Date().toISOString(),
          client_id: `incident-${Date.now()}`,
        };
        enqueueOfflineAction({
          endpoint: endpoints.patrols.incidents,
          payload: fallbackPayload,
          category: "incidents",
          type: "incident",
          method: "post",
        });
        appendLocalRecord("incidents", { ...fallbackPayload, pending: true });
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-success-${Date.now()}`,
            sender: "system",
            text: "Offline: incident queued locally and will transmit when connectivity returns.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            success: true
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-err-${Date.now()}`,
            sender: "system",
            text: error?.response?.data?.error || error.message || "Failed to broadcast incident payload logs.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            error: true
          }
        ]);
      }
    } finally {
      setBusy(false);
    }
  };

  const nativeTapStyle = `
    .btn-tap-effect:active {
      transform: scale(0.96);
      opacity: 0.8;
      transition: transform 0.1s ease;
    }
  `;

  return (
    <div style={{ 
      backgroundColor: "#f1f5f9", 
      minHeight: "100vh", 
      paddingBottom: "9rem",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitUserSelect: "none",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <style>{nativeTapStyle}</style>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,video/*" 
        style={{ display: "none" }} 
      />

      {/* Top Header Panel */}
      <header style={{ 
        display: "flex", 
        alignItems: "center",
        backgroundColor: "#ffffff",
        padding: "0.85rem 1.25rem",
        borderBottom: "1px solid #e2e8f0",
        flexShrink: 0
      }}>
        <button 
          onClick={() => navigate(-1)}
          className="btn-tap-effect"
          style={{ border: "none", background: "none", cursor: "pointer", padding: "0.25rem", marginRight: "0.5rem" }}
        >
          <FiChevronLeft size={24} color="#0f172a" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "50%", background: "#0f172a", display: "grid", placeItems: "center" }}>
            <FiAlertTriangle size={14} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>HQ Dispatch Logs</h2>
            <span style={{ fontSize: "0.7rem", color: "#22c55e", display: "block", fontWeight: 600 }}>● Online Collaborative Feed</span>
          </div>
        </div>
      </header>

      {/* Chat Messages Log Board Area */}
      <div style={{ 
        flexGrow: 1, 
        overflowY: "auto", 
        padding: "1rem 1rem 8.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        {messages.map((msg) => {
          if (msg.sender === "system") {
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <div style={{ 
                  backgroundColor: msg.error ? "#fef2f2" : msg.success ? "#f0fdf4" : "#ffffff",
                  border: msg.error ? "1px solid #fee2e2" : msg.success ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  color: msg.error ? "#991b1b" : msg.success ? "#166534" : "#64748b",
                  fontSize: "0.75rem",
                  padding: "0.5rem 0.85rem",
                  borderRadius: "0.75rem",
                  maxWidth: "85%",
                  textAlign: "center",
                  fontWeight: 500
                }}>
                  {msg.text} <span style={{ fontSize: "0.65rem", opacity: 0.6, marginLeft: "0.25rem" }}>{msg.time}</span>
                </div>
              </div>
            );
          }

          // Compute message layout context values based on sender alignment (Me vs Other Guards)
          const isMe = msg.sender === "guard";

          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                
                {/* Peer Guard Badge Tag */}
                {!isMe && (
                  <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <FiUser size={10} /> {msg.authorName || "Active Guard"}
                  </span>
                )}

                <div style={{ 
                  backgroundColor: isMe ? "#0f172a" : "#ffffff",
                  color: isMe ? "#ffffff" : "#0f172a",
                  border: isMe ? "none" : "1px solid #e2e8f0",
                  padding: "0.75rem 1rem",
                  borderRadius: isMe ? "1rem 1rem 0rem 1rem" : "1rem 1rem 1rem 0rem",
                  fontSize: "0.95rem",
                  boxShadow: "0 2px 4px rgba(15,23,42,0.04)",
                  wordBreak: "break-word"
                }}>
                  {msg.type && (
                    <span style={{ 
                      display: "inline-block", 
                      backgroundColor: isMe ? "#334155" : "#f1f5f9", 
                      color: isMe ? "#94a3b8" : "#64748b", 
                      fontSize: "0.65rem", 
                      fontWeight: 700, 
                      padding: "0.15rem 0.35rem", 
                      borderRadius: "0.25rem",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase"
                    }}>
                      Type: {msg.type}
                    </span>
                  )}
                  
                  {msg.attachment && (
                    <div style={{ marginBottom: "0.5rem", borderRadius: "0.5rem", overflow: "hidden", backgroundColor: "#1e293b" }}>
                      {msg.attachment.type === "image" ? (
                        <img src={msg.attachment.url} alt="Evidence" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", display: "block" }} />
                      ) : (
                        <video src={msg.attachment.url} controls style={{ width: "100%", maxHeight: "150px", display: "block" }} />
                      )}
                    </div>
                  )}

                  {msg.text && <div>{msg.text}</div>}
                </div>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.25rem", paddingLeft: isMe ? 0 : "0.25rem", paddingRight: isMe ? "0.25rem" : 0 }}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Base Shell Menu Bar */}
      <div style={{ 
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "5rem",
        zIndex: 20,
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        padding: "0.75rem 1rem",
        boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(12px)"
      }}>
        
        {/* Horizontal Category Selector list row */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.6rem", marginBottom: "0.4rem" }}>
          {INCIDENT_TYPES.map((t) => {
            const isSelected = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "2rem",
                  border: isSelected ? "1px solid #0f172a" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#0f172a" : "#f8fafc",
                  color: isSelected ? "#ffffff" : "#475569",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer"
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Attachment Floating Micro Tray */}
        {attachedFile && (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            padding: "0.5rem 0.75rem", 
            backgroundColor: "#f1f5f9", 
            borderRadius: "0.5rem", 
            marginBottom: "0.5rem" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
              <FiImage size={16} color="#2563eb" />
              <span>Media Attachment Queued ({attachedFile.type})</span>
            </div>
            <button 
              type="button" 
              onClick={removeAttachment}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}
            >
              <FiX size={16} />
            </button>
          </div>
        )}

        {/* Chat Control Input Form Layout */}
        <form onSubmit={submitIncident} style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.5rem"
        }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-tap-effect"
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              border: "none",
              backgroundColor: attachedFile ? "#dbeafe" : "#f1f5f9",
              color: attachedFile ? "#2563eb" : "#475569",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <FiPaperclip size={18} />
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            flexGrow: 1,
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "1.5rem",
            padding: "0.25rem 0.25rem 0.25rem 0.85rem"
          }}>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={attachedFile ? "Add details or send attachment..." : "Type incident notes..."}
              disabled={busy}
              style={{
                flexGrow: 1,
                border: "none",
                background: "none",
                outline: "none",
                fontSize: "0.95rem",
                color: "#0f172a",
                padding: "0.4rem 0"
              }}
            />
            <button
              type="submit"
              disabled={busy || (!description.trim() && !attachedFile)}
              className="btn-tap-effect"
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "50%",
                border: "none",
                background: (description.trim() || attachedFile) && !busy ? "#0f172a" : "#cbd5e1",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                cursor: "pointer"
              }}
            >
              <FiSend size={14} style={{ marginLeft: "1px" }} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}