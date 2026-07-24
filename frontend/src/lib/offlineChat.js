/**
 * Offline support for chat and notifications.
 *
 * Uses the existing offline infrastructure (Dexie/IndexedDB + localStorage fallback)
 * to cache conversations, messages, and notification counts so the UI remains
 * functional when the device is offline.
 *
 * Queued chat messages are enqueued via the standard offline queue system
 * (enqueueOfflineAction) and automatically synced when the device comes back online.
 */
import {
  enqueueOfflineAction,
  removeOfflineAction,
  getPendingQueue,
  isOnline,
  saveOfflineMetadata,
  loadOfflineMetadata,
} from "./offline";
import api from "./api";
import { endpoints } from "./endpoints";

const MAX_CACHED_MESSAGES = 200;

// ------------------------------------------------------------------ #
//  Conversation caching                                              #
// ------------------------------------------------------------------ #
export async function saveCachedConversations(conversations) {
  await saveOfflineMetadata("chatConversations", conversations ?? []);
}

export async function loadCachedConversations() {
  return (await loadOfflineMetadata("chatConversations")) || [];
}

// ------------------------------------------------------------------ #
//  Message caching (per conversation)                                #
// ------------------------------------------------------------------ #
export async function saveCachedMessages(conversationId, messages) {
  const key = `chatMessages:${conversationId}`;
  const limited = (messages || []).slice(-MAX_CACHED_MESSAGES);
  await saveOfflineMetadata(key, limited);
}

export async function loadCachedMessages(conversationId) {
  const key = `chatMessages:${conversationId}`;
  return (await loadOfflineMetadata(key)) || [];
}

export async function appendCachedMessage(conversationId, message) {
  const existing = await loadCachedMessages(conversationId);
  const updated = [...existing, message].slice(-MAX_CACHED_MESSAGES);
  await saveCachedMessages(conversationId, updated);
  return updated;
}

// ------------------------------------------------------------------ #
//  Notification caching                                              #
// ------------------------------------------------------------------ #
export async function saveCachedUnreadCount(count) {
  await saveOfflineMetadata("chatUnreadCount", count ?? 0);
}

export async function loadCachedUnreadCount() {
  return (await loadOfflineMetadata("chatUnreadCount")) || 0;
}

export async function saveCachedNotifications(notifications) {
  await saveOfflineMetadata("chatNotifications", notifications ?? []);
}

export async function loadCachedNotifications() {
  return (await loadOfflineMetadata("chatNotifications")) || [];
}

// ------------------------------------------------------------------ #
//  Offline message queue                                             #
// ------------------------------------------------------------------ #

/**
 * Queue a chat message for offline sending.
 * The message will be sent automatically when the device comes back online
 * via the standard syncOfflineQueue mechanism.
 *
 * @param {number} conversationId
 * @param {string} content
 * @returns {object} The queued action
 */
export function enqueueChatMessage(conversationId, content) {
  return enqueueOfflineAction({
    endpoint: endpoints.communication.messages,
    method: "post",
    payload: {
      conversation: conversationId,
      content,
      message_type: "text",
    },
    category: "chat",
    type: "message",
    conversationId,
  });
}

/**
 * Get all pending chat messages from the offline queue.
 * @returns {Array}
 */
export function getPendingChatMessages() {
  return getPendingQueue().filter(
    (action) => action.category === "chat" && action.type === "message"
  );
}

/**
 * Remove a specific pending chat message from the queue.
 * @param {string} id
 */
export function clearPendingChatMessage(id) {
  removeOfflineAction(id);
}

/**
 * Get the number of pending chat messages for a specific conversation.
 * @param {number} conversationId
 * @returns {number}
 */
export function getPendingCountForConversation(conversationId) {
  return getPendingChatMessages().filter(
    (action) => action.conversationId === conversationId
  ).length;
}

/**
 * Check if there are any pending chat messages.
 * @returns {boolean}
 */
export function hasPendingChatMessages() {
  return getPendingChatMessages().length > 0;
}

/**
 * Send a chat message, queuing it for offline delivery if the device is offline.
 *
 * @param {number} conversationId
 * @param {string} content
 * @returns {Promise<{success: boolean, offline: boolean, message?: object}>}
 */
export async function sendChatMessage(conversationId, content) {
  if (!isOnline()) {
    // Queue for offline sending
    const action = enqueueChatMessage(conversationId, content);
    // Optimistically add to local cache
    const optimisticMessage = {
      id: `pending-${action.id}`,
      conversation: conversationId,
      content,
      message_type: "text",
      sender: JSON.parse(localStorage.getItem("senti_user") || "{}").id,
      sender_name: "You",
      created_at: new Date().toISOString(),
      is_read: false,
      pending: true,
    };
    await appendCachedMessage(conversationId, optimisticMessage);
    return { success: true, offline: true, message: optimisticMessage };
  }

  try {
    const response = await api.post(endpoints.communication.messages, {
      conversation: conversationId,
      content,
      message_type: "text",
    });
    return { success: true, offline: false, message: response.data };
  } catch (error) {
    // If the request fails due to network, queue it
    const action = enqueueChatMessage(conversationId, content);
    const optimisticMessage = {
      id: `pending-${action.id}`,
      conversation: conversationId,
      content,
      message_type: "text",
      sender: JSON.parse(localStorage.getItem("senti_user") || "{}").id,
      sender_name: "You",
      created_at: new Date().toISOString(),
      is_read: false,
      pending: true,
    };
    await appendCachedMessage(conversationId, optimisticMessage);
    return { success: true, offline: true, message: optimisticMessage };
  }
}
