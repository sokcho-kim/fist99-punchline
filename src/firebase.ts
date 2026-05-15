import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAwToX6r-BLPg9KWz7s6DicAZ01jvzzxBM',
  authDomain: 'fist99-punchline.firebaseapp.com',
  projectId: 'fist99-punchline',
  storageBucket: 'fist99-punchline.firebasestorage.app',
  messagingSenderId: '390655782275',
  appId: '1:390655782275:web:4b4cd2ca46f857772e9ab6',
};

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export class FirebaseService {
  private app: FirebaseApp;
  private db: Firestore;
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = initializeFirestore(this.app, {
      experimentalForceLongPolling: true,
    });
  }

  async createRoom(code: string, creator: string): Promise<void> {
    await setDoc(doc(this.db, 'rooms', code), {
      createdAt: serverTimestamp(),
      members: [creator],
    });
  }

  async roomExists(code: string): Promise<boolean> {
    const snap = await getDoc(doc(this.db, 'rooms', code));
    return snap.exists();
  }

  async joinRoom(code: string, nickname: string): Promise<void> {
    await updateDoc(doc(this.db, 'rooms', code), {
      members: arrayUnion(nickname),
    });
  }

  async sendMessage(roomCode: string, sender: string, text: string): Promise<void> {
    await addDoc(collection(this.db, 'rooms', roomCode, 'messages'), {
      sender,
      text,
      timestamp: Date.now(),
    });
  }

  listenMessages(roomCode: string, callback: (messages: ChatMessage[]) => void): void {
    this.stopListening();
    const q = query(
      collection(this.db, 'rooms', roomCode, 'messages'),
      orderBy('timestamp', 'asc')
    );
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>),
      }));
      callback(messages);
    });
  }

  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
