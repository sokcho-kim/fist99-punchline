# Subtitle Workspace

VSCode extension for collaborative subtitle editing sessions.

## Install

```bash
code --install-extension fist99-punchline-0.1.0.vsix --force
```

설치 후 VSCode 재시작.

## 사용법

### 방 만들기 (Host)

1. `Ctrl+Shift+P` → **"Subtitle Workspace: Open Editor"**
2. 이름 입력 (예: `editor1`)
3. **Create New Session** 선택
4. 6자리 세션 코드가 알림으로 나옴 → 상대방에게 공유

### 방 참여 (Guest)

1. `Ctrl+Shift+P` → **"Subtitle Workspace: Open Editor"**
2. 이름 입력 (예: `editor2`)
3. **Join Existing Session** 선택
4. 받은 6자리 코드 입력

### 채팅

입력창에 텍스트 입력 후 `Enter` 또는 `Add` 버튼 클릭.

```
#   Timecode      Speaker    Subtitle Text
1   00:00:00:00   editor1    여기 컷 좀 빠르게
2   00:00:03:14   editor2    ㅇㅋ 몇 프레임?
3   00:00:05:02   editor1    한 5프레임 정도
```

### 단축키

- `Ctrl+Shift+U` — Subtitle Workspace 열기

## Build from Source

```bash
npm install
npm run build
npx vsce package --allow-missing-repository
```
