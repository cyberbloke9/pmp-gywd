/**
 * PMP-GYWD VS Code Extension
 *
 * Provides IDE integration for GYWD commands:
 * - Command palette commands
 * - Status bar showing current phase
 * - Output channel for logs
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let statusBarItem;
let outputChannel;

/**
 * Activate the extension
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('GYWD');
  outputChannel.appendLine('GYWD extension activated');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'gywd.status';
  context.subscriptions.push(statusBarItem);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('gywd.status', showStatus),
    vscode.commands.registerCommand('gywd.progress', showProgress),
    vscode.commands.registerCommand('gywd.executePlan', executePlan),
    vscode.commands.registerCommand('gywd.help', showHelp),
    vscode.commands.registerCommand('gywd.openRoadmap', openRoadmap),
    vscode.commands.registerCommand('gywd.openState', openState),
  ];

  commands.forEach(cmd => context.subscriptions.push(cmd));

  // Initial status bar update
  updateStatusBar();

  // Watch for changes to STATE.md
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const statePattern = new vscode.RelativePattern(
      workspaceFolders[0],
      '.planning/STATE.md'
    );
    const watcher = vscode.workspace.createFileSystemWatcher(statePattern);
    watcher.onDidChange(updateStatusBar);
    watcher.onDidCreate(updateStatusBar);
    context.subscriptions.push(watcher);
  }

  outputChannel.appendLine('GYWD commands registered');
}

/**
 * Deactivate the extension
 */
function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (outputChannel) {
    outputChannel.dispose();
  }
}

/**
 * Get the planning directory path
 * @returns {string|null}
 */
function getPlanningDir() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;

  const planningDir = path.join(workspaceFolders[0].uri.fsPath, '.planning');
  return fs.existsSync(planningDir) ? planningDir : null;
}

/**
 * Read STATE.md and parse current state
 * @returns {object|null}
 */
function readState() {
  const planningDir = getPlanningDir();
  if (!planningDir) return null;

  const statePath = path.join(planningDir, 'STATE.md');
  if (!fs.existsSync(statePath)) return null;

  try {
    const content = fs.readFileSync(statePath, 'utf8');

    // Parse phase info
    const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\d+)\s*of\s*(\d+)/);
    const planMatch = content.match(/\*\*Plan:\*\*\s*(\d+)\s*of\s*(\d+)/);
    const focusMatch = content.match(/\*\*Focus:\*\*\s*(.+)/);
    const milestoneMatch = content.match(/\*\*Current milestone:\*\*\s*(.+)/);

    return {
      phase: phaseMatch ? { current: phaseMatch[1], total: phaseMatch[2] } : null,
      plan: planMatch ? { current: planMatch[1], total: planMatch[2] } : null,
      focus: focusMatch ? focusMatch[1].trim() : null,
      milestone: milestoneMatch ? milestoneMatch[1].trim() : null,
    };
  } catch (error) {
    outputChannel.appendLine(`Error reading STATE.md: ${error.message}`);
    return null;
  }
}

/**
 * Update the status bar with current phase info
 */
function updateStatusBar() {
  const state = readState();

  if (state && state.phase) {
    statusBarItem.text = `$(rocket) GYWD: Phase ${state.phase.current}/${state.phase.total}`;
    statusBarItem.tooltip = `${state.focus || 'No focus'}\nClick for status`;
    statusBarItem.show();
  } else if (getPlanningDir()) {
    statusBarItem.text = '$(rocket) GYWD';
    statusBarItem.tooltip = 'GYWD project detected';
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

/**
 * Show status command
 */
async function showStatus() {
  const state = readState();

  if (!state) {
    vscode.window.showInformationMessage(
      'No GYWD project found. Run /gywd:init to start.'
    );
    return;
  }

  const items = [];

  if (state.milestone) {
    items.push(`Milestone: ${state.milestone}`);
  }
  if (state.phase) {
    items.push(`Phase: ${state.phase.current} of ${state.phase.total}`);
  }
  if (state.focus) {
    items.push(`Focus: ${state.focus}`);
  }
  if (state.plan) {
    items.push(`Plan: ${state.plan.current} of ${state.plan.total}`);
  }

  const message = items.length > 0
    ? items.join(' | ')
    : 'GYWD project initialized';

  vscode.window.showInformationMessage(message);
  outputChannel.appendLine(`Status: ${message}`);
}

/**
 * Show progress command
 */
async function showProgress() {
  const planningDir = getPlanningDir();
  if (!planningDir) {
    vscode.window.showWarningMessage('No GYWD project found.');
    return;
  }

  // Open ROADMAP.md
  const roadmapPath = path.join(planningDir, 'ROADMAP.md');
  if (fs.existsSync(roadmapPath)) {
    const doc = await vscode.workspace.openTextDocument(roadmapPath);
    await vscode.window.showTextDocument(doc);
  } else {
    vscode.window.showWarningMessage('ROADMAP.md not found.');
  }
}

/**
 * Execute current plan command
 */
async function executePlan() {
  vscode.window.showInformationMessage(
    'Use /gywd:execute-plan in Claude Code terminal to execute plans.'
  );
  outputChannel.appendLine('Execute plan: User directed to Claude Code terminal');
}

/**
 * Show help command
 */
async function showHelp() {
  const helpMessage = `
GYWD Commands:
- /gywd:status - Show project status
- /gywd:progress - Show progress
- /gywd:execute-plan - Execute current plan
- /gywd:help - Show available commands

Use these commands in the Claude Code terminal.
  `.trim();

  outputChannel.appendLine('Help requested');
  outputChannel.appendLine(helpMessage);
  outputChannel.show();

  vscode.window.showInformationMessage(
    'GYWD help shown in Output panel (GYWD channel)'
  );
}

/**
 * Open ROADMAP.md
 */
async function openRoadmap() {
  const planningDir = getPlanningDir();
  if (!planningDir) {
    vscode.window.showWarningMessage('No GYWD project found.');
    return;
  }

  const filePath = path.join(planningDir, 'ROADMAP.md');
  if (fs.existsSync(filePath)) {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } else {
    vscode.window.showWarningMessage('ROADMAP.md not found.');
  }
}

/**
 * Open STATE.md
 */
async function openState() {
  const planningDir = getPlanningDir();
  if (!planningDir) {
    vscode.window.showWarningMessage('No GYWD project found.');
    return;
  }

  const filePath = path.join(planningDir, 'STATE.md');
  if (fs.existsSync(filePath)) {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } else {
    vscode.window.showWarningMessage('STATE.md not found.');
  }
}

module.exports = {
  activate,
  deactivate,
};
