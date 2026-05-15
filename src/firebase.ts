const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAwToX6r-BLPg9KWz7s6DicAZ01jvzzxBM',
  projectId: 'fist99-punchline',
};

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export class FirebaseService {
  private polling: ReturnType<typeof setInterval> | null = null;

  async createRoom(code: string, creator: string): Promise<void> {
    const url = `${BASE_URL}/rooms?documentId=${code}&key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          createdAt: { timestampValue: new Date().toISOString() },
          members: { arrayValue: { values: [{ stringValue: creator }] } },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`createRoom failed: ${err}`);
    }
  }

  async roomExists(code: string): Promise<boolean> {
    const url = `${BASE_URL}/rooms/${code}?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    return res.ok;
  }

  async joinRoom(code: string, nickname: string): Promise<void> {
    // Read current members, then update
    const url = `${BASE_URL}/rooms/${code}?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Room not found');

    const doc: any = await res.json();
    const members = doc.fields?.members?.arrayValue?.values || [];
    members.push({ stringValue: nickname });

    const patchUrl = `${BASE_URL}/rooms/${code}?updateMask.fieldPaths=members&key=${FIREBASE_CONFIG.apiKey}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          members: { arrayValue: { values: members } },
        },
      }),
    });
  }

  async sendMessage(roomCode: string, sender: string, text: string): Promise<void> {
    const url = `${BASE_URL}/rooms/${roomCode}/messages?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          sender: { stringValue: sender },
          text: { stringValue: text },
          timestamp: { integerValue: String(Date.now()) },
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`sendMessage failed: ${err}`);
    }
  }

  listenMessages(roomCode: string, callback: (messages: ChatMessage[]) => void): void {
    this.stopListening();

    const fetchMessages = async () => {
      try {
        const url = `${BASE_URL}/rooms/${roomCode}/messages?key=${FIREBASE_CONFIG.apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data: any = await res.json();
        const docs = data.documents || [];
        const messages: ChatMessage[] = docs.map((d: any) => ({
          id: d.name.split('/').pop(),
          sender: d.fields.sender.stringValue,
          text: d.fields.text.stringValue,
          timestamp: Number(d.fields.timestamp.integerValue),
        }));
        messages.sort((a, b) => a.timestamp - b.timestamp);
        callback(messages);
      } catch (_) {
        // silently retry next interval
      }
    };

    fetchMessages();
    this.polling = setInterval(fetchMessages, 1500);
  }

  stopListening(): void {
    if (this.polling) {
      clearInterval(this.polling);
      this.polling = null;
    }
  }
}
