'use strict';

/**
 * Dashboard Renderer
 *
 * Renders project status, roadmap, and metrics as visual components.
 * Part of Phase 39: Visual Dashboard.
 */

/**
 * Dashboard themes
 */
const DASHBOARD_THEME = {
  DEFAULT: 'default',
  DARK: 'dark',
  LIGHT: 'light',
  MINIMAL: 'minimal',
};

/**
 * Chart types
 */
const CHART_TYPE = {
  BAR: 'bar',
  LINE: 'line',
  PIE: 'pie',
  PROGRESS: 'progress',
  SPARKLINE: 'sparkline',
};

/**
 * Dashboard Renderer class
 */
class DashboardRenderer {
  constructor(options = {}) {
    this.theme = options.theme || DASHBOARD_THEME.DEFAULT;
    this.width = options.width || 80;
    this.colors = this._getThemeColors(this.theme);
  }

  /**
   * Render full dashboard
   * @param {object} data - Dashboard data
   * @returns {string}
   */
  render(data) {
    const sections = [];

    // Header
    sections.push(this._renderHeader(data.project || 'GYWD Dashboard'));

    // Status cards
    if (data.status) {
      sections.push(this._renderStatusCards(data.status));
    }

    // Progress
    if (data.progress) {
      sections.push(this._renderProgress(data.progress));
    }

    // Metrics
    if (data.metrics) {
      sections.push(this._renderMetrics(data.metrics));
    }

    // Recent activity
    if (data.activity) {
      sections.push(this._renderActivity(data.activity));
    }

    // Footer
    sections.push(this._renderFooter());

    return sections.join('\n\n');
  }

  /**
   * Render header
   * @param {string} title
   * @returns {string}
   */
  _renderHeader(title) {
    const line = '═'.repeat(this.width);
    const paddedTitle = this._centerText(title, this.width);

    return [
      `╔${line}╗`,
      `║${paddedTitle}║`,
      `╚${line}╝`,
    ].join('\n');
  }

  /**
   * Render status cards
   * @param {object} status
   * @returns {string}
   */
  _renderStatusCards(status) {
    const cards = [];

    const cardData = [
      { label: 'Phase', value: status.phase || 'N/A', icon: '📍' },
      { label: 'Status', value: status.status || 'N/A', icon: '🔄' },
      { label: 'Health', value: status.health || 'Good', icon: '💚' },
      { label: 'Version', value: status.version || 'N/A', icon: '📦' },
    ];

    const cardWidth = Math.floor((this.width - 6) / 4);

    let row = '│';
    for (const card of cardData) {
      const content = `${card.icon} ${card.label}: ${card.value}`;
      row += ` ${this._padText(content, cardWidth)} │`;
    }

    return [
      '┌' + '─'.repeat(this.width - 2) + '┐',
      '│ Status Overview' + ' '.repeat(this.width - 19) + '│',
      '├' + '─'.repeat(this.width - 2) + '┤',
      row,
      '└' + '─'.repeat(this.width - 2) + '┘',
    ].join('\n');
  }

  /**
   * Render progress bar
   * @param {object} progress
   * @returns {string}
   */
  _renderProgress(progress) {
    const lines = [];
    const barWidth = this.width - 20;

    lines.push('┌' + '─'.repeat(this.width - 2) + '┐');
    lines.push('│ Progress' + ' '.repeat(this.width - 11) + '│');
    lines.push('├' + '─'.repeat(this.width - 2) + '┤');

    // Overall progress
    const overallPercent = progress.overall || 0;
    const overallBar = this._renderBar(overallPercent, barWidth);
    lines.push(`│ Overall: ${overallBar} ${overallPercent}%${' '.repeat(this.width - 22 - barWidth)}│`);

    // Phase progress
    if (progress.phases) {
      for (const phase of progress.phases.slice(0, 5)) {
        const phaseBar = this._renderBar(phase.progress || 0, barWidth - 10);
        const phaseName = this._padText(phase.name || 'Phase', 15);
        lines.push(`│ ${phaseName} ${phaseBar} ${phase.progress || 0}%${' '.repeat(Math.max(0, this.width - 32 - barWidth + 10))}│`);
      }
    }

    lines.push('└' + '─'.repeat(this.width - 2) + '┘');

    return lines.join('\n');
  }

  /**
   * Render a progress bar
   * @param {number} percent
   * @param {number} width
   * @returns {string}
   */
  _renderBar(percent, width) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;

    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Render metrics
   * @param {object} metrics
   * @returns {string}
   */
  _renderMetrics(metrics) {
    const lines = [];

    lines.push('┌' + '─'.repeat(this.width - 2) + '┐');
    lines.push('│ Metrics' + ' '.repeat(this.width - 10) + '│');
    lines.push('├' + '─'.repeat(this.width - 2) + '┤');

    // Render metrics as table
    const metricPairs = Object.entries(metrics).slice(0, 6);
    const colWidth = Math.floor((this.width - 4) / 2);

    for (let i = 0; i < metricPairs.length; i += 2) {
      const [key1, val1] = metricPairs[i];
      const [key2, val2] = metricPairs[i + 1] || ['', ''];

      const cell1 = this._padText(`${key1}: ${val1}`, colWidth);
      const cell2 = this._padText(`${key2}: ${val2}`, colWidth);

      lines.push(`│ ${cell1} │ ${cell2} │`);
    }

    // Sparkline if available
    if (metrics.history && Array.isArray(metrics.history)) {
      lines.push('├' + '─'.repeat(this.width - 2) + '┤');
      lines.push(`│ Trend: ${this._renderSparkline(metrics.history)}${' '.repeat(this.width - 10 - metrics.history.length * 2)}│`);
    }

    lines.push('└' + '─'.repeat(this.width - 2) + '┘');

    return lines.join('\n');
  }

  /**
   * Render sparkline
   * @param {Array} values
   * @returns {string}
   */
  _renderSparkline(values) {
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return values.map(v => {
      const index = Math.round(((v - min) / range) * (chars.length - 1));
      return chars[index];
    }).join('');
  }

  /**
   * Render activity feed
   * @param {Array} activity
   * @returns {string}
   */
  _renderActivity(activity) {
    const lines = [];

    lines.push('┌' + '─'.repeat(this.width - 2) + '┐');
    lines.push('│ Recent Activity' + ' '.repeat(this.width - 18) + '│');
    lines.push('├' + '─'.repeat(this.width - 2) + '┤');

    for (const item of activity.slice(0, 5)) {
      const time = this._formatTime(item.timestamp);
      const message = this._truncateText(item.message || '', this.width - 20);
      lines.push(`│ ${time} ${message}${' '.repeat(Math.max(0, this.width - 4 - time.length - message.length))}│`);
    }

    lines.push('└' + '─'.repeat(this.width - 2) + '┘');

    return lines.join('\n');
  }

  /**
   * Render footer
   * @returns {string}
   */
  _renderFooter() {
    const timestamp = new Date().toISOString();
    return `─ Generated: ${timestamp} ─`;
  }

  /**
   * Render chart
   * @param {object} chartData
   * @param {string} type
   * @returns {string}
   */
  renderChart(chartData, type = CHART_TYPE.BAR) {
    switch (type) {
      case CHART_TYPE.BAR:
        return this._renderBarChart(chartData);
      case CHART_TYPE.PIE:
        return this._renderPieChart(chartData);
      case CHART_TYPE.PROGRESS:
        return this._renderProgressChart(chartData);
      default:
        return this._renderBarChart(chartData);
    }
  }

  /**
   * Render bar chart
   * @param {object} chartData
   * @returns {string}
   */
  _renderBarChart(chartData) {
    const lines = [];
    const maxValue = Math.max(...chartData.values);
    const barWidth = this.width - 20;

    lines.push(`┌─ ${chartData.title || 'Chart'} ─┐`);

    for (let i = 0; i < chartData.labels.length; i++) {
      const label = this._padText(chartData.labels[i], 10);
      const value = chartData.values[i];
      const barLength = Math.round((value / maxValue) * barWidth);
      const bar = '█'.repeat(barLength);

      lines.push(`${label} │${bar} ${value}`);
    }

    return lines.join('\n');
  }

  /**
   * Render pie chart (ASCII approximation)
   * @param {object} chartData
   * @returns {string}
   */
  _renderPieChart(chartData) {
    const total = chartData.values.reduce((a, b) => a + b, 0);
    const lines = [];

    lines.push(`┌─ ${chartData.title || 'Distribution'} ─┐`);

    for (let i = 0; i < chartData.labels.length; i++) {
      const label = chartData.labels[i];
      const value = chartData.values[i];
      const percent = Math.round((value / total) * 100);
      const bar = '■'.repeat(Math.round(percent / 5));

      lines.push(`${this._padText(label, 12)} ${bar} ${percent}%`);
    }

    return lines.join('\n');
  }

  /**
   * Render progress chart
   * @param {object} chartData
   * @returns {string}
   */
  _renderProgressChart(chartData) {
    const lines = [];

    lines.push(`┌─ ${chartData.title || 'Progress'} ─┐`);

    for (let i = 0; i < chartData.labels.length; i++) {
      const label = this._padText(chartData.labels[i], 12);
      const percent = chartData.values[i];
      const bar = this._renderBar(percent, 30);

      lines.push(`${label} ${bar} ${percent}%`);
    }

    return lines.join('\n');
  }

  /**
   * Get theme colors
   * @param {string} theme
   * @returns {object}
   */
  _getThemeColors(theme) {
    const themes = {
      [DASHBOARD_THEME.DEFAULT]: {
        primary: 'blue',
        success: 'green',
        warning: 'yellow',
        danger: 'red',
      },
      [DASHBOARD_THEME.DARK]: {
        primary: 'cyan',
        success: 'green',
        warning: 'yellow',
        danger: 'red',
      },
      [DASHBOARD_THEME.LIGHT]: {
        primary: 'blue',
        success: 'green',
        warning: 'orange',
        danger: 'red',
      },
      [DASHBOARD_THEME.MINIMAL]: {
        primary: 'white',
        success: 'white',
        warning: 'white',
        danger: 'white',
      },
    };

    return themes[theme] || themes[DASHBOARD_THEME.DEFAULT];
  }

  /**
   * Center text
   * @param {string} text
   * @param {number} width
   * @returns {string}
   */
  _centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;

    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Pad text
   * @param {string} text
   * @param {number} width
   * @returns {string}
   */
  _padText(text, width) {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    return text + ' '.repeat(width - text.length);
  }

  /**
   * Truncate text
   * @param {string} text
   * @param {number} maxLength
   * @returns {string}
   */
  _truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format timestamp
   * @param {number} timestamp
   * @returns {string}
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Set theme
   * @param {string} theme
   */
  setTheme(theme) {
    this.theme = theme;
    this.colors = this._getThemeColors(theme);
  }

  /**
   * Set width
   * @param {number} width
   */
  setWidth(width) {
    this.width = width;
  }
}

module.exports = {
  DashboardRenderer,
  DASHBOARD_THEME,
  CHART_TYPE,
};
