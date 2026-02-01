'use strict';

/**
 * Progress Indicator
 *
 * CLI progress spinners and progress bars.
 * Part of Phase 24: Interactive Prompts.
 */

/**
 * Spinner frames for animation
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Progress bar characters
 */
const BAR_CHARS = {
  complete: '█',
  incomplete: '░',
  left: '[',
  right: ']',
};

/**
 * ProgressIndicator class
 */
class ProgressIndicator {
  constructor(options = {}) {
    this.stream = options.stream || process.stderr;
    this.spinnerFrames = options.frames || SPINNER_FRAMES;
    this.interval = options.interval || 80;
    this.frameIndex = 0;
    this.timer = null;
    this.message = '';
  }

  /**
   * Start a spinner with message
   * @param {string} message - Message to display
   */
  startSpinner(message) {
    this.message = message;
    this.frameIndex = 0;

    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this._renderSpinner();
      this.frameIndex = (this.frameIndex + 1) % this.spinnerFrames.length;
    }, this.interval);

    this._renderSpinner();
  }

  /**
   * Update spinner message
   * @param {string} message - New message
   */
  updateSpinner(message) {
    this.message = message;
  }

  /**
   * Stop the spinner
   * @param {string} [finalMessage] - Final message to display
   * @param {string} [symbol] - Symbol to show (default: ✓)
   */
  stopSpinner(finalMessage, symbol = '✓') {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this._clearLine();
    if (finalMessage) {
      this.stream.write(`${symbol} ${finalMessage}\n`);
    }
  }

  /**
   * Stop with success
   * @param {string} message - Success message
   */
  succeed(message) {
    this.stopSpinner(message, '✓');
  }

  /**
   * Stop with failure
   * @param {string} message - Failure message
   */
  fail(message) {
    this.stopSpinner(message, '✗');
  }

  /**
   * Stop with warning
   * @param {string} message - Warning message
   */
  warn(message) {
    this.stopSpinner(message, '⚠');
  }

  /**
   * Stop with info
   * @param {string} message - Info message
   */
  info(message) {
    this.stopSpinner(message, 'ℹ');
  }

  /**
   * Render a progress bar
   * @param {number} current - Current value
   * @param {number} total - Total value
   * @param {string} [label] - Optional label
   * @param {number} [width] - Bar width (default: 30)
   */
  renderBar(current, total, label = '', width = 30) {
    const percent = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar = BAR_CHARS.left +
      BAR_CHARS.complete.repeat(filled) +
      BAR_CHARS.incomplete.repeat(empty) +
      BAR_CHARS.right;

    const line = label
      ? `${label} ${bar} ${percent}%`
      : `${bar} ${percent}%`;

    this._clearLine();
    this.stream.write(line);
  }

  /**
   * Complete the progress bar
   * @param {string} [message] - Completion message
   */
  completeBar(message) {
    this._clearLine();
    if (message) {
      this.stream.write(`✓ ${message}\n`);
    } else {
      this.stream.write('\n');
    }
  }

  /**
   * Render spinner frame
   * @private
   */
  _renderSpinner() {
    const frame = this.spinnerFrames[this.frameIndex];
    this._clearLine();
    this.stream.write(`${frame} ${this.message}`);
  }

  /**
   * Clear the current line
   * @private
   */
  _clearLine() {
    if (this.stream.isTTY) {
      this.stream.write('\r\x1b[K');
    }
  }
}

/**
 * Simple task runner with progress
 */
class TaskRunner {
  constructor(options = {}) {
    this.indicator = new ProgressIndicator(options);
    this.tasks = [];
  }

  /**
   * Add a task
   * @param {string} name - Task name
   * @param {Function} fn - Task function
   */
  add(name, fn) {
    this.tasks.push({ name, fn });
  }

  /**
   * Run all tasks with progress
   * @returns {Promise<object[]>} Results
   */
  async run() {
    const results = [];

    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      this.indicator.startSpinner(`[${i + 1}/${this.tasks.length}] ${task.name}`);

      try {
        const result = await task.fn();
        this.indicator.succeed(`${task.name}`);
        results.push({ name: task.name, success: true, result });
      } catch (error) {
        this.indicator.fail(`${task.name}: ${error.message}`);
        results.push({ name: task.name, success: false, error });
      }
    }

    return results;
  }
}

module.exports = {
  ProgressIndicator,
  TaskRunner,
  SPINNER_FRAMES,
  BAR_CHARS,
};
