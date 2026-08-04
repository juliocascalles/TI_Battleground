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
  private isP2Connected: boolean = false;

  constructor() {}

  connect(
    roomId: string,
    callbacks: {
      onStateReceived: (state: any, log?: string) => void;
      onLogReceived: (log: string) => void;
      onStatusChange: (status: { connected: boolean; roomId: string; role: 'p1' | 'p2' | null; p2Connected: boolean }) => void;
    }
  ) {
    this.roomId = roomId.toUpperCase();
    this.onStateReceived = callbacks.onStateReceived;
    this.onLogReceived = callbacks.onLogReceived;
    this.onStatusChange = callbacks.onStatusChange;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.send({
          type: 'JOIN_ROOM',
          roomId: this.roomId,
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
        this.isP2Connected = true;
        if (msg.payload.gameState && this.onStateReceived) {
          this.onStateReceived(msg.payload.gameState);
        }
        if (this.onStatusChange) {
          this.onStatusChange({
            connected: true,
            roomId: this.roomId,
            role: this.playerRole,
            p2Connected: true,
          });
        }
        if (this.onLogReceived) {
          this.onLogReceived('🟢 Jogador 2 conectou à sala!');
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
