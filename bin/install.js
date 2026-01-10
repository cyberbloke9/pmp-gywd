#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

// Get version from package.json
const pkg = require('../package.json');

const banner = `
${cyan}  ██████╗ ██╗   ██╗██╗    ██╗██████╗
 ██╔════╝ ╚██╗ ██╔╝██║    ██║██╔══██╗
 ██║  ███╗ ╚████╔╝ ██║ █╗ ██║██║  ██║
 ██║   ██║  ╚██╔╝  ██║███╗██║██║  ██║
 ╚██████╔╝   ██║   ╚███╔███╔╝██████╔╝
  ╚═════╝    ╚═╝    ╚══╝╚══╝ ╚═════╝${reset}

  PMP - Get Your Work Done ${dim}v${pkg.version}${reset}
  A meta-prompting, context engineering and spec-driven
  development system for Claude Code by cyberbloke9.
`;

// Parse args
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');

// Parse --config-dir argument
function parseConfigDirArg() {
  const configDirIndex = args.findIndex(arg => arg === '--config-dir' || arg === '-c');
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  const configDirArg = args.find(arg => arg.startsWith('--config-dir=') || arg.startsWith('-c='));
  if (configDirArg) {
    return configDirArg.split('=')[1];
  }
  return null;
}
const explicitConfigDir = parseConfigDirArg();
const hasHelp = args.includes('--help') || args.includes('-h');

console.log(banner);

// Show help if requested
if (hasHelp) {
  console.log(`  ${yellow}Usage:${reset} npx pmp-gywd [options]

  ${yellow}Options:${reset}
    ${cyan}-g, --global${reset}              Install globally (to Claude config directory)
    ${cyan}-l, --local${reset}               Install locally (to ./.claude in current directory)
    ${cyan}-c, --config-dir <path>${reset}   Specify custom Claude config directory
    ${cyan}-h, --help${reset}                Show this help message

  ${yellow}Examples:${reset}
    ${dim}# Install to default ~/.claude directory${reset}
    npx pmp-gywd --global

    ${dim}# Install to custom config directory${reset}
    npx pmp-gywd --global --config-dir ~/.claude-bc

    ${dim}# Install to current project only${reset}
    npx pmp-gywd --local

  ${yellow}Notes:${reset}
    The --config-dir option is useful when you have multiple Claude Code
    configurations. It takes priority over CLAUDE_CONFIG_DIR env variable.
`);
  process.exit(0);
}

/**
 * Print error message and exit
 */
function exitWithError(message, details = null) {
  console.error(`\n  ${red}Error:${reset} ${message}`);
  if (details) {
    console.error(`  ${dim}${details}${reset}`);
  }
  console.error(`\n  ${dim}If this persists, please report at:${reset}`);
  console.error(`  ${cyan}https://github.com/cyberbloke9/pmp-gwyd/issues${reset}\n`);
  process.exit(1);
}

/**
 * Expand ~ to home directory
 */
function expandTilde(filePath) {
  if (!filePath) return filePath;
  if (filePath === '~') return os.homedir();
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Validate path is safe (no path traversal)
 */
function validatePath(targetPath) {
  const resolved = path.resolve(targetPath);
  // Check for null bytes (security)
  if (targetPath.includes('\0')) {
    return { valid: false, reason: 'Path contains invalid characters' };
  }
  return { valid: true, resolved };
}

/**
 * Safely create directory
 */
function safeCreateDir(dirPath) {
  const validation = validatePath(dirPath);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot create directory at ${dirPath}`);
    } else if (err.code === 'ENOSPC') {
      throw new Error('Disk is full. Please free up space and try again.');
    } else if (err.code === 'EROFS') {
      throw new Error('Cannot write to read-only filesystem.');
    } else {
      throw new Error(`Failed to create directory: ${err.message}`);
    }
  }
}

/**
 * Safely read file
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    } else if (err.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot read ${filePath}`);
    } else {
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }
}

/**
 * Safely write file
 */
function safeWriteFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content);
  } catch (err) {
    if (err.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot write to ${filePath}`);
    } else if (err.code === 'ENOSPC') {
      throw new Error('Disk is full. Please free up space and try again.');
    } else if (err.code === 'EROFS') {
      throw new Error('Cannot write to read-only filesystem.');
    } else {
      throw new Error(`Failed to write file: ${err.message}`);
    }
  }
}

/**
 * Safely copy file
 */
function safeCopyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Source file not found: ${src}`);
    } else if (err.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot copy to ${dest}`);
    } else if (err.code === 'ENOSPC') {
      throw new Error('Disk is full. Please free up space and try again.');
    } else {
      throw new Error(`Failed to copy file: ${err.message}`);
    }
  }
}

/**
 * Safely read directory
 */
function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Directory not found: ${dirPath}`);
    } else if (err.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot read directory ${dirPath}`);
    } else {
      throw new Error(`Failed to read directory: ${err.message}`);
    }
  }
}

/**
 * Recursively copy directory with path replacement in .md files
 */
function copyWithPathReplacement(srcDir, destDir, pathPrefix) {
  safeCreateDir(destDir);
  const entries = safeReadDir(srcDir);

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyWithPathReplacement(srcPath, destPath, pathPrefix);
    } else if (entry.name.endsWith('.md')) {
      let content = safeReadFile(srcPath);
      content = content.replace(/~\/\.claude\//g, pathPrefix);
      safeWriteFile(destPath, content);
    } else {
      safeCopyFile(srcPath, destPath);
    }
  }
}

/**
 * Install to the specified directory
 */
function install(isGlobal) {
  const src = path.join(__dirname, '..');

  // Validate source directory exists
  if (!fs.existsSync(src)) {
    exitWithError('Installation source not found.', 'Package may be corrupted. Try reinstalling.');
  }

  const configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.CLAUDE_CONFIG_DIR);
  const defaultGlobalDir = configDir || path.join(os.homedir(), '.claude');
  const claudeDir = isGlobal ? defaultGlobalDir : path.join(process.cwd(), '.claude');

  // Validate destination path
  const validation = validatePath(claudeDir);
  if (!validation.valid) {
    exitWithError(`Invalid installation path: ${claudeDir}`, validation.reason);
  }

  const locationLabel = isGlobal
    ? claudeDir.replace(os.homedir(), '~')
    : claudeDir.replace(process.cwd(), '.');

  const pathPrefix = isGlobal
    ? (configDir ? `${claudeDir}/` : '~/.claude/')
    : './.claude/';

  console.log(`  Installing to ${cyan}${locationLabel}${reset}\n`);

  try {
    // Create commands directory
    const commandsDir = path.join(claudeDir, 'commands');
    safeCreateDir(commandsDir);

    // Copy commands/gywd
    const gywdSrc = path.join(src, 'commands', 'gywd');
    const gywdDest = path.join(commandsDir, 'gywd');

    if (!fs.existsSync(gywdSrc)) {
      exitWithError('Commands source not found.', `Expected at: ${gywdSrc}`);
    }

    copyWithPathReplacement(gywdSrc, gywdDest, pathPrefix);
    console.log(`  ${green}✓${reset} Installed commands/gywd`);

    // Copy get-your-work-done
    const skillSrc = path.join(src, 'get-your-work-done');
    const skillDest = path.join(claudeDir, 'get-your-work-done');

    if (!fs.existsSync(skillSrc)) {
      exitWithError('Skills source not found.', `Expected at: ${skillSrc}`);
    }

    copyWithPathReplacement(skillSrc, skillDest, pathPrefix);
    console.log(`  ${green}✓${reset} Installed get-your-work-done`);

    console.log(`
  ${green}Done!${reset} Run ${cyan}/gywd:help${reset} to get started.
`);
  } catch (err) {
    exitWithError('Installation failed.', err.message);
  }
}

/**
 * Prompt for install location
 */
function promptLocation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const configDir = expandTilde(explicitConfigDir) || expandTilde(process.env.CLAUDE_CONFIG_DIR);
  const globalPath = configDir || path.join(os.homedir(), '.claude');
  const globalLabel = globalPath.replace(os.homedir(), '~');

  console.log(`  ${yellow}Where would you like to install?${reset}

  ${cyan}1${reset}) Global ${dim}(${globalLabel})${reset} - available in all projects
  ${cyan}2${reset}) Local  ${dim}(./.claude)${reset} - this project only
`);

  rl.question(`  Choice ${dim}[1]${reset}: `, (answer) => {
    rl.close();
    const choice = answer.trim() || '1';
    const isGlobal = choice !== '2';
    install(isGlobal);
  });
}

// Main
if (hasGlobal && hasLocal) {
  console.error(`  ${yellow}Cannot specify both --global and --local${reset}`);
  process.exit(1);
} else if (explicitConfigDir && hasLocal) {
  console.error(`  ${yellow}Cannot use --config-dir with --local${reset}`);
  process.exit(1);
} else if (hasGlobal) {
  install(true);
} else if (hasLocal) {
  install(false);
} else {
  promptLocation();
}
