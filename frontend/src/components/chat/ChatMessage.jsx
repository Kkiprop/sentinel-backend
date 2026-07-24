import { useMemo } from "react";

/**
 * Renders a single chat message bubble.
 *
 * @param {object} props
 * @param {object} props.message  - ChatMessage serializer data
 * @param {boolean} props.isOwn    - Whether the message was sent by the current user
 */
export default function ChatMessage({ message, isOwn }) {
  const displayName = useMemo(() => {
    if (message.sender_name) return message.sender_name;
    if (message.sender?.email) return message.sender.email.split("@")[0];
    return "Unknown";
  }, [message]);

  const formattedTime = useMemo(() => {
    if (!message.created_at) return "";
    const date = new Date(message.created_at);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.created_at]);

  const bubbleClass = isOwn
    ? "chat-bubble-own"
    : "chat-bubble-other";

  return (
    <div className={`chat-message ${bubbleClass}`}>
      {!isOwn && (
        <div className="chat-message-sender">{displayName}</div>
      )}
      <div className="chat-message-content">
        {message.content}
        {message.attachment && (
          <a
            href={message.attachment}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-attachment-link"
          >
            📎 Attachment
          </a>
        )}
      </div>
      <div className="chat-message-meta">
        {isOwn && (
          <span className={`chat-read-receipt ${message.is_read ? "read" : "sent"}`}>
            {message.is_read ? "✓✓" : "✓"}
          </span>
        )}
        <span className="chat-message-time">{formattedTime}</span>
      </div>

      <style>{`
        .chat-message {
          margin-bottom: 0.75rem;
          max-width: 75%;
          word-break: break-word;
        }
        .chat-message-own {
          margin-left: auto;
          text-align: right;
        }
        .chat-message-other {
          margin-right: auto;
        }
        .chat-message-sender {
          font-size: 0.65rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 0.15rem;
        }
        .chat-message-content {
          display: inline-block;
          padding: 0.5rem 0.85rem;
          border-radius: 1rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }
        .chat-bubble-own .chat-message-content {
          background: #2563eb;
          color: #ffffff;
          border-bottom-right-radius: 0.25rem;
        }
        .chat-bubble-other .chat-message-content {
          background: #f1f5f9;
          color: #0f172a;
          border-bottom-left-radius: 0.25rem;
        }
        .chat-message-meta {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.15rem;
          font-size: 0.6rem;
          opacity: 0.6;
        }
        .chat-message-own .chat-message-meta {
          justify-content: flex-end;
        }
        .chat-read-receipt.read {
          color: #3b82f6;
        }
        .chat-attachment-link {
          display: block;
          margin-top: 0.3rem;
          font-size: 0.75rem;
          color: inherit;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
