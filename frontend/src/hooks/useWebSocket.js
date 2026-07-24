import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketClient, getWebSocketUrl } from "../lib/websocket";

/**
 * React hook that manages a WebSocket connection.
 *
 * @param {string} path  - WebSocket path (e.g. "notifications/" or "chat/42/")
 * @param {function} onMessage - Callback invoked with parsed JSON on each message
 * @param {object} options - Extra options forwarded to WebSocketClient
 * @returns {{ connected: boolean, send: function, client: WebSocketClient|null }}
 */
export function useWebSocket(path, onMessage, options = {}) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep the latest onMessage callback without reconnecting
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const wsUrl = getWebSocketUrl(path);
    const client = new WebSocketClient(wsUrl, {
      ...options,
      onOpen: () => {
        setConnected(true);
        options.onOpen?.();
      },
      onClose: () => {
        setConnected(false);
        options.onClose?.();
      },
      onMessage: (data) => {
        onMessageRef.current(data);
        options.onMessage?.(data);
      },
      onError: (err) => {
        console.warn("WebSocket error:", err);
        options.onError?.(err);
      },
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.close();
      clientRef.current = null;
    };
  }, [path]);

  const send = useCallback((data) => {
    if (clientRef.current) {
      clientRef.current.send(data);
    }
  }, []);

  return { connected, send, client: clientRef.current };
}
