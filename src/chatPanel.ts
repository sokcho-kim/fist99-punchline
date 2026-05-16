import * as vscode from 'vscode';
import { FirebaseService, ChatMessage } from './firebase';

export class ChatPanel {
  public static readonly viewType = 'subtitleWorkspace';
  private static instance: ChatPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly firebase: FirebaseService;
  private readonly roomCode: string;
  private readonly nickname: string;
  private readonly onNewMessage: () => void;
  private readonly onDisposeCallback: () => void;
  private lastMessageCount = 0;
  private disposables: vscode.Disposable[] = [];

  public static createOrShow(
    context: vscode.ExtensionContext,
    firebase: FirebaseService,
    roomCode: string,
    nickname: string,
    onNewMessage: () => void,
    onDispose: () => void
  ): ChatPanel {
    if (ChatPanel.instance) {
      ChatPanel.instance.panel.reveal(vscode.ViewColumn.One);
      return ChatPanel.instance;
    }

    const panel = vscode.window.createWebviewPanel(
      ChatPanel.viewType,
      'Subtitle Editor — Review',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    ChatPanel.instance = new ChatPanel(panel, firebase, roomCode, nickname, onNewMessage, onDispose);
    return ChatPanel.instance;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    firebase: FirebaseService,
    roomCode: string,
    nickname: string,
    onNewMessage: () => void,
    onDispose: () => void
  ) {
    this.panel = panel;
    this.firebase = firebase;
    this.roomCode = roomCode;
    this.nickname = nickname;
    this.onNewMessage = onNewMessage;
    this.onDisposeCallback = onDispose;

    this.panel.webview.html = this.getHtml();

    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.type === 'send') {
          await this.firebase.sendMessage(this.roomCode, this.nickname, msg.text);
        } else if (msg.type === 'copyCode') {
          await vscode.env.clipboard.writeText(this.roomCode);
          vscode.window.showInformationMessage(`Session code copied: ${this.roomCode}`);
        }
      },
      null,
      this.disposables
    );

    this.firebase.listenMessages(this.roomCode, (messages) => {
      // Detect new messages from others
      if (messages.length > this.lastMessageCount) {
        const newOnes = messages.slice(this.lastMessageCount);
        for (const m of newOnes) {
          if (m.sender !== this.nickname) {
            this.onNewMessage();
          }
        }
      }
      this.lastMessageCount = messages.length;
      this.panel.webview.postMessage({ type: 'messages', data: messages, me: this.nickname });
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public isVisible(): boolean {
    return this.panel.visible;
  }

  public reveal() {
    this.panel.reveal(vscode.ViewColumn.One);
  }

  public dispose() {
    ChatPanel.instance = undefined;
    this.firebase.stopListening();
    this.panel.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.onDisposeCallback();
  }

  private getHtml(): string {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Subtitle Editor</title>
<style>
  :root {
    --bg: #1e1e1e;
    --surface: #252526;
    --border: #3c3c3c;
    --text: #cccccc;
    --text-dim: #808080;
    --accent: #569cd6;
    --tc-color: #d7ba7d;
    --my-color: #9cdcfe;
    --other-color: #ce9178;
    --header-bg: #2d2d30;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    background: var(--header-bg);
    border-bottom: 1px solid var(--border);
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 12px;
    color: var(--text-dim);
    flex-shrink: 0;
  }
  .toolbar .file-name {
    color: var(--text);
    font-weight: bold;
  }
  .toolbar .copy-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 2px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    border-radius: 2px;
  }
  .toolbar .copy-btn:hover {
    background: var(--border);
    color: var(--text);
  }
  .toolbar .meta {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .col-header {
    display: grid;
    grid-template-columns: 32px 100px 80px 1fr;
    gap: 0;
    padding: 4px 12px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }
  .messages::-webkit-scrollbar { width: 8px; }
  .messages::-webkit-scrollbar-track { background: var(--bg); }
  .messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .msg-row {
    display: grid;
    grid-template-columns: 32px 100px 80px 1fr;
    padding: 3px 12px;
    border-bottom: 1px solid #2a2a2a;
    line-height: 1.6;
  }
  .msg-row:hover { background: var(--surface); }
  .msg-row .seq { color: var(--text-dim); text-align: right; padding-right: 8px; }
  .msg-row .tc { color: var(--tc-color); font-variant-numeric: tabular-nums; }
  .msg-row .speaker {
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .msg-row .speaker.me { color: var(--my-color); }
  .msg-row .speaker.other { color: var(--other-color); }
  .msg-row .line { color: var(--text); word-break: break-word; }

  .input-area {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 8px 12px;
    display: grid;
    grid-template-columns: 32px 100px 80px 1fr 60px;
    gap: 0;
    align-items: center;
    flex-shrink: 0;
  }
  .input-area .seq { color: var(--text-dim); text-align: right; padding-right: 8px; }
  .input-area .tc { color: var(--tc-color); }
  .input-area .speaker { color: var(--my-color); font-weight: bold; }
  .input-area input {
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 5px 8px;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    border-radius: 2px;
  }
  .input-area input:focus { border-color: var(--accent); }
  .input-area button {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 5px 8px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    margin-left: 6px;
    border-radius: 2px;
  }
  .input-area button:hover { background: var(--border); color: var(--text); }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-dim);
    font-size: 12px;
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="file-name">project_final_v3_review.srt</span>
    <span>SRT</span>
    <span>UTF-8</span>
    <div class="meta">
      <span id="status">${this.roomCode}</span>
      <button class="copy-btn" id="copyBtn" title="Copy session code">Copy</button>
    </div>
  </div>

  <div class="col-header">
    <span style="text-align:right;padding-right:8px">#</span>
    <span>Timecode</span>
    <span>Speaker</span>
    <span>Subtitle Text</span>
  </div>

  <div class="messages" id="messages">
    <div class="empty-state" id="empty">No subtitle entries yet</div>
  </div>

  <div class="input-area">
    <span class="seq" id="nextSeq">1</span>
    <span class="tc" id="nextTc">00:00:00:00</span>
    <span class="speaker">${this.nickname}</span>
    <input type="text" id="input" placeholder="Enter subtitle text..." autocomplete="off"/>
    <button id="sendBtn">Add</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messagesEl = document.getElementById('messages');
    const emptyEl = document.getElementById('empty');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const copyBtn = document.getElementById('copyBtn');
    const nextSeqEl = document.getElementById('nextSeq');
    const nextTcEl = document.getElementById('nextTc');

    let messageCount = 0;
    let baseTime = null;

    function formatTC(ts) {
      if (!baseTime) baseTime = ts;
      const diff = Math.max(0, ts - baseTime);
      const totalSec = Math.floor(diff / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      const f = String(Math.floor((diff % 1000) / (1000 / 30))).padStart(2, '0');
      return h + ':' + m + ':' + s + ':' + f;
    }

    function send() {
      const text = inputEl.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'send', text });
      inputEl.value = '';
      inputEl.focus();
    }

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send();
    });
    sendBtn.addEventListener('click', send);
    copyBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'copyCode' });
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'messages') {
        const { data, me } = msg;
        if (data.length === 0) return;

        emptyEl.style.display = 'none';
        messagesEl.innerHTML = '';

        data.forEach((m, i) => {
          const row = document.createElement('div');
          row.className = 'msg-row';

          const isMe = m.sender === me;
          row.innerHTML =
            '<span class="seq">' + (i + 1) + '</span>' +
            '<span class="tc">' + formatTC(m.timestamp) + '</span>' +
            '<span class="speaker ' + (isMe ? 'me' : 'other') + '">' + escapeHtml(m.sender) + '</span>' +
            '<span class="line">' + escapeHtml(m.text) + '</span>';

          messagesEl.appendChild(row);
        });

        messageCount = data.length;
        nextSeqEl.textContent = messageCount + 1;
        nextTcEl.textContent = formatTC(Date.now());
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    });

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    inputEl.focus();
  </script>
</body>
</html>`;
  }
}
