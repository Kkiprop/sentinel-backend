import { useEffect, useState, useRef, useCallback } from "react";
import { FiSend, FiPaperclip, FiUser, FiWifi, FiWifiOff } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  sendChatMessage,
  saveCachedMessages,
  loadCachedMessages,
  getPendingCountForConversation,
} from "../../lib/offlineChat";
import ChatMessage from "./ChatMessage";

/**
 * Real-time chat window for a single conversation.
 *
 * Offline capabilities:
 *   - Messages are cached in IndexedDB (per conversation)
 *   - When offline, messages are queued and sent automatically when back online
 *   - Pending messages are shown with a "sending..." indicator
 *
 * @param {object} props
 * @param {number} props.conversationId
 * @param {object} props.currentUser  - { id, email, name }
 * @param {function} props.onBack   - Optional callback for mobile back button
 */
export default function ChatWindow({ conversationId, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // --- WebSocket for real-time messages ---
  const handleWsMessage = useCallback(
    (data) => {
      if (data.type === "chat_message" && data.message) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === data.message.id)) return prev;
          const updated = [...prev, data.message];
          // Cache to IndexedDB
          saveCachedMessages(conversationId, updated).catch(() => {});
          return updated;
        });
      }
      if (data.type === "read_receipt") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          )
        );
      }
    },
    [conversationId]
  );

  const { connected, send } = useWebSocket(
    `chat/${conversationId}/`,
    handleWsMessage
  );

  // --- Check online status ---
  useEffect(() => {
    const updateOnlineStatus = () => {
      setOffline(!navigator.onLine);
      setPendingCount(getPendingCountForConversation(conversationId));
    };
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [conversationId]);

  // --- Load conversation + messages via REST (with offline cache fallback) ---
  const loadConversation = useCallback(async () => {
    setLoading(true);

    // Try to load cached messages first (for offline display)
    const cachedMessages = await loadCachedMessages(conversationId);
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }

    if (!navigator.onLine) {
      setOffline(true);
      setLoading(false);
      setPendingCount(getPendingCountForConversation(conversationId));
      return;
    }

    try {
      const convResponse = await api.get(
        `${endpoints.communication.conversations}${conversationId}/`
      );
      const conv = convResponse.data;
      setParticipants(conv.participants || []);

      const msgResponse = await api.get(endpoints.communication.messages, {
        params: { conversation: conversationId },
      });
      const msgs = msgResponse.data || [];
      setMessages(msgs);
      // Cache to IndexedDB
      await saveCachedMessages(conversationId, msgs);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      // If we have cached messages, show them
      if (cachedMessages.length === 0) {
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
    // Mark messages as read
    if (navigator.onLine) {
      api
        .post(endpoints.communication.chatMarkRead, {
          conversation_id: conversationId,
        })
        .catch(() => {});
    }
  }, [loadConversation, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // --- Send message (with offline queuing) ---
  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    setInputValue("");

    try {
      const result = await sendChatMessage(conversationId, content);

      if (result.offline) {
        // Message was queued for offline sending
        setMessages((prev) => {
          const updated = [...prev, result.message];
          saveCachedMessages(conversationId, updated).catch(() => {});
          return updated;
        });
        setPendingCount((prev) => prev + 1);
      }
      // If online and sent successfully, the WebSocket will broadcast the message back
    } catch (error) {
      console.error("Failed to send message:", error);
      setInputValue(content);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, conversationId]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const participantNames = participants
    .filter((p) => p.id !== currentUser?.id)
    .map((p) => p.name || p.email?.split("@")[0])
    .join(", ");

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window-header">
        {onBack && (
          <button
            className="chat-back-button"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            ←
          </button>
        )}
        <div className="chat-window-title">
          <FiUser size={16} />
          <span>
            {participantNames ||
              participants
                .map((p) => p.email?.split("@")[0])
                .join(", ")}
          </span>
        </div>
        <div className="chat-window-status">
          <span
            className={`status-dot ${connected ? "online" : "offline"}`}
          />
          <span className="status-text">
            {offline ? "Offline" : connected ? "Online" : "Connecting..."}
          </span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount} pending</span>
          )}
        </div>
      </div>

      {/* Offline warning */}
      {offline && (
        <div className="chat-offline-warning">
          <FiWifiOff size={14} />
          <span>You are offline. Messages will be sent when you reconnect.</span>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id || `pending-${Math.random()}`}
              message={msg}
              isOwn={msg.sender === currentUser?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input">
        <button
          className="chat-input-button"
          onClick={() => {}}
          aria-label="Attach file"
          disabled
        >
          <FiPaperclip size={18} />
        </button>
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={offline ? "Offline - messages will queue..." : "Type a message..."}
          className="chat-input-field"
          rows={1}
          maxLength={2000}
        />
        <button
          className="chat-input-button send-button"
          onClick={sendMessage}
          disabled={!inputValue.trim() || sending}
          aria-label="Send message"
        >
          <FiSend size={18} />
        </button>
      </div>

      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ffffff;
          border-radius: 1rem;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }
        .chat-window-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
        }
        .chat-back-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #475569;
          padding: 0.25rem;
        }
        .chat-window-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.9rem;
          flex: 1;
        }
        .chat-window-status {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.7rem;
          color: #64748b;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.online {
          background: #10b981;
        }
        .status-dot.offline {
          background: #94a3b8;
        }
        .pending-badge {
          background: #f59e0b;
          color: #ffffff;
          font-size: 0.6rem;
          padding: 0.1rem 0.4rem;
          border-radius: 0.5rem;
        }
        .chat-offline-warning {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          color: #92400e;
          font-size: 0.78rem;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
        }
        .chat-loading,
        .chat-empty {
          text-align: center;
          color: #94a3b8;
          padding: 2rem;
          font-size: 0.85rem;
        }
        .chat-input {
          display: flex;
          align-items: flex-end;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .chat-input-button {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
        }
        .chat-input-button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chat-input-button.send-button {
          background: #2563eb;
          color: #ffffff;
        }
        .chat-input-button.send-button:disabled {
          background: #93c5fd;
        }
        .chat-input-field {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          resize: none;
          outline: none;
          min-height: 36px;
          max-height: 120px;
        }
        .chat-input-field:focus {
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
}
