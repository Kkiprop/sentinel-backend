import { getAccessToken } from "./auth";

/**
 * Convert an HTTP(S) base URL to a WS(S) URL.
 * e.g. http://127.0.0.1:8000  ->  ws://127.0.0.1:8000
 *      https://example.com      ->  wss://example.com
 */
export function getWebSocketUrl(path) {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const wsUrl = baseUrl
    .replace(/^http:/, "ws:")
    .replace(/^https:/, "wss:");
  return `${wsUrl}/ws/${path}`;
}

/**
 * Lightweight WebSocket client with auto-reconnect.
 *
 * Usage:
 *   const client = new WebSocketClient(getWebSocketUrl("notifications/"), {
 *     onMessage: (data) => console.log(data),
 *   });
 *   client.connect();
 *   client.send({ type: "ack" });
 *   // ...
 *   client.close();
 */
export class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectInterval = options.reconnectInterval ?? 3000;
    this.reconnectBackoff = options.reconnectBackoff ?? 1.5;
    this.onMessageCallback = options.onMessage ?? (() => {});
    this.onOpenCallback = options.onOpen ?? (() => {});
    this.onCloseCallback = options.onClose ?? (() => {});
    this.onErrorCallback = options.onError ?? (() => {});
    this._manualClose = false;
  }

  connect() {
    const token = getAccessToken();
    const separator = this.url.includes("?") ? "&" : "?";
    const wsUrl = token
      ? `${this.url}${separator}token=${token}`
      : this.url;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._manualClose = false;
      this.onOpenCallback();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallback(data);
      } catch (e) {
        console.error("WebSocket: failed to parse message", e);
      }
    };

    this.ws.onclose = () => {
      this.onCloseCallback();
      if (!this._manualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        const delay =
          this.reconnectInterval *
          Math.pow(this.reconnectBackoff, this.reconnectAttempts - 1);
        setTimeout(() => this.connect(), Math.min(delay, 30000));
      }
    };

    this.ws.onerror = (error) => {
      this.onErrorCallback(error);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket: send attempted while not open");
    }
  }

  close() {
    this._manualClose = true;
    if (this.ws) {
      this.ws.close();
    }
  }

  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}
