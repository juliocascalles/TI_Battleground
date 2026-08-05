import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FirebaseMultiplayerCallbacks {
  onStateReceived: (state: any, log?: string) => void;
  onLogReceived?: (log: string) => void;
  onStatusChange: (status: {
    connected: boolean;
    roomId: string;
    role: 'p1' | 'p2' | null;
    p2Connected: boolean;
    p1Connected: boolean;
  }) => void;
}

export class FirebaseMultiplayerClient {
  private roomId: string = '';
  private role: 'p1' | 'p2' | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private isLocalUpdate: boolean = false;

  private callbacks: FirebaseMultiplayerCallbacks | null = null;

  public async connect(
    roomIdInput: string,
    callbacks: FirebaseMultiplayerCallbacks,
    getInitialState?: () => any
  ) {
    this.disconnect();

    const cleanRoomId = (roomIdInput || 'SALA1').toUpperCase().trim();
    this.roomId = cleanRoomId;
    this.callbacks = callbacks;

    const roomRef = doc(db, 'rooms', cleanRoomId);

    try {
      // Fetch initial doc to set role
      const docSnap = await getDoc(roomRef);

      if (!docSnap.exists()) {
        // Room doesn't exist yet -> Create room as P1
        this.role = 'p1';
        const initialState = getInitialState ? getInitialState() : null;
        await setDoc(roomRef, {
          roomId: cleanRoomId,
          p1Connected: true,
          p2Connected: false,
          gameState: initialState,
          lastUpdatedBy: 'p1',
          createdAt: new Date().toISOString(),
          logs: [`Sala ${cleanRoomId} criada pelo Jogador 1 (Azul).`],
        });
      } else {
        const data = docSnap.data();
        if (!data.p1Connected) {
          this.role = 'p1';
          await updateDoc(roomRef, {
            p1Connected: true,
            lastUpdated: new Date().toISOString(),
          });
        } else if (!data.p2Connected) {
          this.role = 'p2';
          await updateDoc(roomRef, {
            p2Connected: true,
            lastUpdated: new Date().toISOString(),
          });
        } else {
          // Both connected, assign p2 or reconnect as current role if stored
          const storedRole = sessionStorage.getItem(`firebase_role_${cleanRoomId}`) as 'p1' | 'p2' | null;
          this.role = storedRole || 'p2';
        }
      }

      if (this.role) {
        sessionStorage.setItem(`firebase_role_${cleanRoomId}`, this.role);
      }

      // Listen to real-time changes
      this.unsubscribeSnapshot = onSnapshot(
        roomRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const roomData = snapshot.data();

          if (this.callbacks) {
            this.callbacks.onStatusChange({
              connected: true,
              roomId: this.roomId,
              role: this.role,
              p1Connected: !!roomData.p1Connected,
              p2Connected: !!roomData.p2Connected,
            });

            // If updated by the other player, receive state
            if (
              roomData.lastUpdatedBy &&
              roomData.lastUpdatedBy !== this.role &&
              roomData.gameState
            ) {
              this.callbacks.onStateReceived(roomData.gameState, roomData.lastLog);
            }

            if (roomData.lastLog && this.callbacks.onLogReceived && roomData.lastUpdatedBy !== this.role) {
              this.callbacks.onLogReceived(roomData.lastLog);
            }
          }
        },
        (error) => {
          console.error('Firestore snapshot listener error:', error);
          if (this.callbacks) {
            this.callbacks.onStatusChange({
              connected: false,
              roomId: this.roomId,
              role: this.role,
              p1Connected: false,
              p2Connected: false,
            });
          }
        }
      );
    } catch (err) {
      console.error('Failed to connect to Firebase Firestore room:', err);
      if (this.callbacks) {
        this.callbacks.onStatusChange({
          connected: false,
          roomId: this.roomId,
          role: null,
          p1Connected: false,
          p2Connected: false,
        });
      }
    }
  }

  public async syncState(gameState: any, log?: string) {
    if (!this.roomId || !this.role) return;

    const roomRef = doc(db, 'rooms', this.roomId);

    try {
      const updatePayload: any = {
        gameState,
        lastUpdatedBy: this.role,
        lastUpdated: new Date().toISOString(),
      };
      if (log) {
        updatePayload.lastLog = log;
      }

      await updateDoc(roomRef, updatePayload);
    } catch (err) {
      console.error('Error syncing state to Firestore:', err);
    }
  }

  public disconnect() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }

    if (this.roomId && this.role) {
      const roomRef = doc(db, 'rooms', this.roomId);
      const isP1 = this.role === 'p1';
      updateDoc(roomRef, isP1 ? { p1Connected: false } : { p2Connected: false }).catch(() => {});
    }

    this.role = null;
    this.roomId = '';
  }
}
