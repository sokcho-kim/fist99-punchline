import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';
import { FirebaseService } from './firebase';

let chatPanel: ChatPanel | undefined;
let statusBarItem: vscode.StatusBarItem;
let unreadCount = 0;

export function activate(context: vscode.ExtensionContext) {
  const firebase = new FirebaseService();

  // Status bar — looks like a subtitle counter
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'subtitleWorkspace.open';
  statusBarItem.text = '$(file-text) SRT';
  statusBarItem.tooltip = 'Subtitle Workspace';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  const openCmd = vscode.commands.registerCommand('subtitleWorkspace.open', async () => {
    // If panel exists, just reveal it and reset unread
    if (chatPanel) {
      chatPanel.reveal();
      unreadCount = 0;
      statusBarItem.text = '$(file-text) SRT';
      return;
    }

    const nickname = await vscode.window.showInputBox({
      prompt: 'Editor Name',
      placeHolder: 'Enter your name for subtitle session',
    });
    if (!nickname) return;

    const action = await vscode.window.showQuickPick(
      ['Create New Session', 'Join Existing Session'],
      { placeHolder: 'Subtitle Workspace' }
    );

    if (action === 'Create New Session') {
      const roomCode = generateCode();
      try {
        await firebase.createRoom(roomCode, nickname);
        chatPanel = ChatPanel.createOrShow(context, firebase, roomCode, nickname, onNewMessage, onDispose);
        // Copy code to clipboard + show notification with copy button
        await vscode.env.clipboard.writeText(roomCode);
        const choice = await vscode.window.showInformationMessage(
          `Session: ${roomCode} (copied to clipboard)`,
          'Copy Again'
        );
        if (choice === 'Copy Again') {
          await vscode.env.clipboard.writeText(roomCode);
        }
      } catch (e: any) {
        vscode.window.showErrorMessage(`Create failed: ${e.message}`);
      }
    } else if (action === 'Join Existing Session') {
      const code = await vscode.window.showInputBox({
        prompt: 'Session Code',
        placeHolder: 'Enter the 6-digit session code',
      });
      if (!code) return;

      const roomCode = code.trim().toUpperCase();
      try {
        const exists = await firebase.roomExists(roomCode);
        if (!exists) {
          vscode.window.showErrorMessage(`Session ${roomCode} not found.`);
          return;
        }
        await firebase.joinRoom(roomCode, nickname);
        chatPanel = ChatPanel.createOrShow(context, firebase, roomCode, nickname, onNewMessage, onDispose);
        vscode.window.showInformationMessage(`Joined session ${roomCode}`);
      } catch (e: any) {
        vscode.window.showErrorMessage(`Join failed: ${e.message}`);
      }
    }
  });

  context.subscriptions.push(openCmd);

  function onNewMessage() {
    if (chatPanel && !chatPanel.isVisible()) {
      unreadCount++;
      statusBarItem.text = `$(file-text) SRT (${unreadCount})`;
    }
  }

  function onDispose() {
    chatPanel = undefined;
    unreadCount = 0;
    statusBarItem.text = '$(file-text) SRT';
  }
}

export function deactivate() {
  chatPanel?.dispose();
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
