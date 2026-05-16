# Subtitle Workspace

Real-time collaborative subtitle review tool for VSCode.

Team members can create or join sessions to exchange timestamped subtitle notes — all within the editor.

![Main UI](docs/main-ui.png)

---

## Features

- **Session-based collaboration** — Create a session and share the 6-digit code with your partner
- **Timecoded entries** — Every message gets an auto-generated timecode, just like an SRT file
- **Unread indicator** — Status bar shows `SRT (3)` when new entries arrive while the panel is hidden
- **One-click code sharing** — Session code is auto-copied to clipboard on creation, with a Copy button always available in the toolbar
- **Lightweight** — No external dependencies, pure REST communication (~15KB bundled)

---

## Quick Start

### Install

```bash
git clone https://github.com/sokcho-kim/fist99-punchline.git
cd fist99-punchline
npm install
npm run build
npx vsce package --allow-missing-repository
code --install-extension fist99-punchline-0.1.0.vsix --force
```

Restart VSCode after installation.

### Create a Session (Host)

1. `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) → **Subtitle Workspace: Open Editor**
2. Enter your name
3. Select **Create New Session**
4. Session code is copied to clipboard automatically — share it with your partner

![Create Session](docs/create-session.png)

### Join a Session (Guest)

1. `Ctrl+Shift+P` (Mac: `Cmd+Shift+P`) → **Subtitle Workspace: Open Editor**
2. Enter your name
3. Select **Join Existing Session**
4. Paste the 6-digit code

![Join Session](docs/join-session.png)

### Start Reviewing

Type in the input field and press `Enter`. Entries appear in real-time for all session members.

```
 #   Timecode      Speaker    Subtitle Text
 1   00:00:00:00   editor1    Intro scene — check audio sync
 2   00:00:03:14   editor2    Looks off by ~2 frames
 3   00:00:05:02   editor1    Will fix in next pass
 4   00:00:08:21   editor2    Also cut is too slow at 01:32
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+U` (`Cmd+Shift+U`) | Open Subtitle Workspace |
| `Enter` | Send entry |

---

## Status Bar

The status bar shows a subtitle file indicator on the right side:

| State | Display | Meaning |
|---|---|---|
| Idle | `SRT` | No unread entries |
| Unread | `SRT (3)` | 3 new entries while panel was hidden |

Click the status bar item to open the panel and reset the counter.

---

## Firestore Rules

This extension uses Firebase Firestore. Set the following security rules in your Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## Build from Source

```bash
npm install
npm run build
```

### Package

```bash
npx vsce package --allow-missing-repository
```

### Dev Mode

```bash
npm run dev
# Then press F5 in VSCode to launch Extension Development Host
```
