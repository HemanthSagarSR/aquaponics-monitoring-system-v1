type MessageHandler = (data: any) => void;

class TelemetryWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed = false;
  private isConnected = false;

  constructor() {
    this.initSocket();
  }

  private initSocket() {
    if (this.isExplicitlyClosed) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Uses vite proxy in dev, direct in prod
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emit('connection_status', { connected: true });
        console.log('[TelemetryWS] Connected to live backend stream.');
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            this.emit(payload.type, payload.data || payload);
          }
        } catch (e) {
          console.warn('[TelemetryWS] Malformed message received:', event.data);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.error('[TelemetryWS] Socket error:', err);
        this.socket?.close();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[TelemetryWS] Attempting to reconnect...');
      this.initSocket();
    }, 3000);
  }

  public on(event: string, handler: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  public off(event: string, handler: MessageHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (err) {
          console.error(`[TelemetryWS] Error in listener for ${event}:`, err);
        }
      });
    }
  }

  public getStatus(): boolean {
    return this.isConnected;
  }

  public close() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }
}

export const wsClient = new TelemetryWebSocketClient();
