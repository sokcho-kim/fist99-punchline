import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';
import { FirebaseService } from './firebase';

let chatPanel: ChatPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const firebase = new FirebaseService();

  const openCmd = vscode.commands.registerCommand('subtitleWorkspace.open', async () => {
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
        chatPanel = ChatPanel.createOrShow(context, firebase, roomCode, nickname);
        vscode.window.showInformationMessage(`Session Code: ${roomCode} — Share this with your partner`);
      } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create session: ${e.message}`);
      }
    } else if (action === 'Join Existing Session') {
      const code = await vscode.window.showInputBox({
        prompt: 'Session Code',
        placeHolder: 'Enter the 6-digit session code',
      });
      if (!code) return;
      try {
        const exists = await firebase.roomExists(code.toUpperCase());
        if (!exists) {
          vscode.window.showErrorMessage('Invalid session code.');
          return;
        }
        await firebase.joinRoom(code.toUpperCase(), nickname);
        chatPanel = ChatPanel.createOrShow(context, firebase, code.toUpperCase(), nickname);
      } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to join session: ${e.message}`);
      }
    }
  });

  context.subscriptions.push(openCmd);
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
