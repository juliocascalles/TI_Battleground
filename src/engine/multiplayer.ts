import { APP_VERSION } from '../types';

export interface MultiplayerMessage {
  type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'UPDATE_STATE' | 'ROOM_CREATED' | 'ROOM_JOINED' | 'STATE_UPDATED' | 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'ROOM_FULL' | 'SEND_LOG' | 'LOG_ADDED';
  roomId?: string;
  payload?: any;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private roomId: string = '';
  private playerRole: 'p1' | 'p2' | null = null;
  private onStateReceived?: (state: any, log?: string) => void;
  private onLogReceived?: (log: string) => void;
  private onStatusChange?: (status: { connected: boolean; roomId: string; role: 'p1' | 'p2' | null; p2Connected: boolean }) => void;
  private isIntentionalDisconnect: boolean = false;
  private reconnectTimeout: any = null;
  private getInitialState?: () => any;
  private isP2Connected: boolean = false;

  constructor() {}

  connect(
    roomId: string,
    callbacks: {
      onStateReceived: (state: any, log?: string) => void;
      onLogReceived: (log: string) => void;
      onStatusChange: (status: { connected: boolean; roomId: string; role: 'p1' | 'p2' | null; p2Connected: boolean }) => void;
    },
    getInitialState?: () => any
  ) {
    this.roomId = roomId.toUpperCase().trim();
    this.onStateReceived = callbacks.onStateReceived;
    this.onLogReceived = callbacks.onLogReceived;
    this.onStatusChange = callbacks.onStatusChange;
    this.getInitialState = getInitialState;
    this.isIntentionalDisconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const initialState = this.getInitialState ? this.getInitialState() : null;
        this.send({
          type: 'JOIN_ROOM',
          roomId: this.roomId,
          payload: { initialState }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: MultiplayerMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
      };

      this.ws.onclose = () => {
        if (this.onStatusChange) {
          this.onStatusChange({
            connected: false,
            roomId: this.roomId,
            role: this.playerRole,
            p2Connected: false,
          });
        }

        // Auto-reconnect if not intentional
        if (!this.isIntentionalDisconnect) {
          this.reconnectTimeout = setTimeout(() => {
            if (!this.isIntentionalDisconnect) {
              this.connect(this.roomId, callbacks, this.getInitialState);
            }
          }, 2000);
        }
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket client:', err);
    }
  }

  private handleMessage(msg: MultiplayerMessage) {
    switch (msg.type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
        this.roomId = msg.payload.roomId;
        this.playerRole = msg.payload.playerRole;
        this.isP2Connected = msg.payload.p2Connected;

        if (msg.payload.gameState && this.onStateReceived) {
          this.onStateReceived(msg.payload.gameState);
        }

        if (this.onStatusChange) {
          this.onStatusChange({
            connected: true,
            roomId: this.roomId,
            role: this.playerRole,
            p2Connected: this.isP2Connected,
          });
        }
        break;

      case 'PLAYER_JOINED':
        this.isP2Connected = msg.payload.p2Connected;
        if (msg.payload.gameState && this.onStateReceived) {
          this.onStateReceived(msg.payload.gameState);
        }
        if (this.onStatusChange) {
          this.onStatusChange({
            connected: true,
            roomId: this.roomId,
            role: this.playerRole,
            p2Connected: this.isP2Connected,
          });
        }
        if (this.onLogReceived) {
          const roleText = msg.payload.playerRole === 'p1' ? 'Jogador 1' : 'Jogador 2';
          this.onLogReceived(`🟢 ${roleText} conectou à sala!`);
        }
        break;

      case 'PLAYER_LEFT':
        if (msg.payload.playerRole === 'p2') {
          this.isP2Connected = false;
        }
        if (this.onStatusChange) {
          this.onStatusChange({
            connected: true,
            roomId: this.roomId,
            role: this.playerRole,
            p2Connected: this.isP2Connected,
          });
        }
        if (this.onLogReceived) {
          this.onLogReceived(`🔴 ${msg.payload.playerRole === 'p1' ? 'Jogador 1' : 'Jogador 2'} desconectou.`);
        }
        break;

      case 'STATE_UPDATED':
        // Only apply state update if sent by the other player
        if (msg.payload.senderRole && msg.payload.senderRole === this.playerRole) {
          return;
        }
        if (msg.payload.gameState && this.onStateReceived) {
          this.onStateReceived(msg.payload.gameState, msg.payload.log);
        }
        break;

      case 'LOG_ADDED':
        if (msg.payload.log && this.onLogReceived) {
          this.onLogReceived(msg.payload.log);
        }
        break;

      case 'ROOM_FULL':
        alert(msg.payload.message || 'Sala cheia!');
        break;

      default:
        break;
    }
  }

  sendStateUpdate(gameState: any, log?: string) {
    this.send({
      type: 'UPDATE_STATE',
      roomId: this.roomId,
      payload: { gameState, log },
    });
  }

  sendLog(log: string) {
    this.send({
      type: 'SEND_LOG',
      roomId: this.roomId,
      payload: { log },
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.isIntentionalDisconnect = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getRole() {
    return this.playerRole;
  }

  getRoomId() {
    return this.roomId;
  }
}
