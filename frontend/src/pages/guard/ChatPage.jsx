import { useEffect, useState, useCallback } from "react";
import { FiMessageSquare, FiPlus, FiSearch, FiUser, FiWifiOff } from "react-icons/fi";
import api from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import {
  saveCachedConversations,
  loadCachedConversations,
} from "../../lib/offlineChat";
import ChatWindow from "../../components/chat/ChatWindow";

/**
 * Full-page chat interface for guards.
 *
 * Offline capabilities:
 *   - Conversations are cached in IndexedDB
 *   - When offline, cached conversations are displayed
 *   - Offline indicator is shown
 *
 * Layout:
 *   - Desktop: sidebar (conversations) + main (chat window)
 *   - Mobile:  toggle between sidebar and chat window
 */
export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [showList, setShowList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const currentUser = JSON.parse(
    localStorage.getItem("senti_user") || "{}"
  );

  // --- Check online status ---
  useEffect(() => {
    const updateOnlineStatus = () => {
      setOffline(!navigator.onLine);
    };
    updateOnlineStatus();
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // --- Load conversations (with offline cache fallback) ---
  const loadConversations = useCallback(async () => {
    setLoading(true);

    // Load cached conversations first (for offline display)
    const cached = await loadCachedConversations();
    if (cached.length > 0) {
      setConversations(cached);
    }

    if (!navigator.onLine) {
      setOffline(true);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(endpoints.communication.conversations);
      const convs = response.data || [];
      setConversations(convs);
      // Cache to IndexedDB
      await saveCachedConversations(convs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      // Fall back to cached conversations
      if (cached.length > 0) {
        setConversations(cached);
      } else {
        setConversations([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // --- Search users ---
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await api.get(endpoints.communication.searchUsers, {
        params: { q: query },
      });
      setSearchResults(response.data || []);
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // --- Start a new conversation ---
  const startConversation = useCallback(
    async (participantId) => {
      try {
        const response = await api.post(endpoints.communication.startConversation, {
          participant_ids: [participantId],
        });
        const newConv = response.data;
        setConversations((prev) => [newConv, ...prev]);
        // Update cache
        saveCachedConversations([newConv, ...conversations]).catch(() => {});
        setActiveConversation(newConv);
        setShowList(false);
        setSearchQuery("");
        setSearchResults([]);
      } catch (error) {
        console.error("Failed to start conversation:", error);
      }
    },
    [conversations]
  );

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setShowList(false);
  };

  const handleBackToList = () => {
    setShowList(true);
    setActiveConversation(null);
  };

  return (
    <div className="chat-page">
      {/* Offline indicator */}
      {offline && (
        <div className="chat-page-offline-bar">
          <FiWifiOff size={14} />
          <span>You are offline. Showing cached conversations.</span>
        </div>
      )}

      {/* Sidebar: Conversation list */}
      <div
        className={`chat-sidebar ${!showList ? "hidden" : ""}`}
      >
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
          <button
            className="chat-new-button"
            onClick={() => setSearchQuery("")}
            title="New conversation"
          >
            <FiPlus size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="chat-search">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Search results */}
        {searchQuery && (
          <div className="chat-search-results">
            {searching ? (
              <div className="chat-search-loading">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="chat-search-empty">No users found</div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="chat-search-result-item"
                  onClick={() => startConversation(user.id)}
                >
                  <div className="chat-user-avatar">
                    <FiUser size={12} />
                  </div>
                  <div className="chat-user-info">
                    <span className="chat-user-name">
                      {user.name}
                    </span>
                    <span className="chat-user-role">{user.role}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Conversation list */}
        <div className="chat-conversation-list">
          {loading ? (
            <div className="chat-loading">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="chat-empty">
              No conversations yet. Search for a user to start chatting.
            </div>
          ) : (
            conversations.map((conv) => {
              const otherParticipants = conv.participant_names
                ? conv.participant_names.filter(
                    (p) => p.id !== currentUser?.id
                  )
                : [];
              const displayName =
                otherParticipants.length > 0
                  ? otherParticipants[0].name
                  : conv.title || "Unknown";

              return (
                <div
                  key={conv.id}
                  className={`chat-conversation-item ${
                    activeConversation?.id === conv.id ? "active" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="chat-conv-avatar">
                    <FiUser size={14} />
                  </div>
                  <div className="chat-conv-info">
                    <div className="chat-conv-name">{displayName}</div>
                    <div className="chat-conv-preview">
                      {conv.last_message_preview ||
                        "No messages yet"}
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="chat-conv-badge">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main: Chat window */}
      <div className="chat-main">
        {activeConversation ? (
          <ChatWindow
            conversationId={activeConversation.id}
            currentUser={currentUser}
            onBack={handleBackToList}
          />
        ) : (
          <div className="chat-placeholder">
            <FiMessageSquare size={48} />
            <h3>Select a conversation to start chatting</h3>
            <p>
              Or search for a user above to start a new conversation.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .chat-page {
          display: flex;
          height: calc(100vh - 4.5rem - 5.5rem);
          background: #f8fafc;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
        }
        .chat-page-offline-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          color: #92400e;
          font-size: 0.78rem;
        }
        .chat-sidebar {
          width: 320px;
          min-width: 280px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          margin-top: 0;
        }
        .chat-sidebar.hidden {
          display: none;
        }
        .chat-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .chat-sidebar-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #0f172a;
        }
        .chat-new-button {
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 0.5rem;
          width: 2rem;
          height: 2rem;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .chat-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .chat-search input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          outline: none;
        }
        .chat-search input:focus {
          border-color: #2563eb;
        }
        .chat-search-results {
          max-height: 200px;
          overflow-y: auto;
          border-bottom: 1px solid #e2e8f0;
        }
        .chat-search-result-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          cursor: pointer;
        }
        .chat-search-result-item:hover {
          background: #f8fafc;
        }
        .chat-user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #2563eb;
          display: grid;
          place-items: center;
          color: #ffffff;
        }
        .chat-user-info {
          flex: 1;
        }
        .chat-user-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }
        .chat-user-role {
          font-size: 0.65rem;
          color: #94a3b8;
          text-transform: capitalize;
        }
        .chat-search-loading,
        .chat-search-empty {
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
          color: #94a3b8;
        }
        .chat-conversation-list {
          flex: 1;
          overflow-y: auto;
        }
        .chat-conversation-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
        }
        .chat-conversation-item:hover {
          background: #f8fafc;
        }
        .chat-conversation-item.active {
          background: #f0f6ff;
        }
        .chat-conv-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #e2e8f0;
          display: grid;
          place-items: center;
          color: #475569;
        }
        .chat-conv-info {
          flex: 1;
          min-width: 0;
        }
        .chat-conv-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-conv-preview {
          font-size: 0.7rem;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-conv-badge {
          background: #2563eb;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 700;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .chat-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: #94a3b8;
          text-align: center;
          padding: 2rem;
        }
        .chat-placeholder h3 {
          margin: 0;
          font-size: 1rem;
          color: #64748b;
        }
        .chat-placeholder p {
          margin: 0;
          font-size: 0.8rem;
          max-width: 300px;
        }
        .chat-loading,
        .chat-empty {
          padding: 2rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        @media (max-width: 768px) {
          .chat-page {
            height: auto;
            min-height: 600px;
          }
          .chat-sidebar {
            position: absolute;
            inset: 0;
            z-index: 10;
            border-right: none;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
