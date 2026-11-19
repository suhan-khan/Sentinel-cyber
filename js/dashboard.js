
/**
 * Sentinel Cyber — Dashboard Overview Controller
 * Handles dashboard KPIs, charts, alerts, system health and time filters.
 * Supports both Live API Mode and Demo Mode.
 */

window.Dashboard = {
  currentRange: '24h',
  livePredictions: [],
  liveStats: null,

  init() {
    // Initialize dashboard with demo data until real analysis is available.
    this.updateStats(
      this.liveStats || window.DemoData.overviewStats
    );

    this.renderCharts();

    this.renderAlerts(
      this.livePredictions.length
        ? this.getAlertsFromPredictions()
        : window.DemoData.recentAlerts
    );

    this.renderSystemHealth(window.DemoData.systemHealth);

    this.setupTimeFilters();
  },

  /**
   * Update dashboard using actual prediction results.
   */
  loadLiveAnalysis(predictions, stats) {
    if (!Array.isArray(predictions)) return;

    this.livePredictions = predictions;
    this.liveStats = stats || null;

    const total = predictions.length;

    const normal = predictions.filter(
      item => this.isNormal(item)
    ).length;

    const malicious = total - normal;

    const detectionRate = total > 0
      ? (malicious / total) * 100
      : 0;

    this.updateStats({
      totalConnections: stats?.total ?? total,
      maliciousDetected: stats?.malicious ?? malicious,
      normalConnections: stats?.normal ?? normal,
      detectionRate
    });

    this.renderAlerts(this.getAlertsFromPredictions());
  },

  /**
   * Determine whether a prediction is classified as normal.
   */
  isNormal(item) {
    const classification = String(
      item.classification || ''
    ).toLowerCase();

    return classification === 'normal' ||
           classification === 'benign';
  },

  /**
   * Convert prediction records into dashboard alerts.
   */
  getAlertsFromPredictions() {
    return this.livePredictions
      .filter(item => !this.isNormal(item))
      .slice(0, 10)
      .map((item, index) => ({
        id: item.id ?? index + 1,
        timestamp: item.timestamp || new Date().toISOString(),
        srcIp: item.srcIp || 'N/A',
        dstIp: item.dstIp || 'N/A',
        classification: item.classification || 'ATTACK',
        severity: item.severity || 'Medium'
      }));
  },

  /**
   * Update the four overview KPI cards.
   */
  updateStats(stats) {
    if (!stats) return;

    this.animateValue(
      'stat-total-value',
      0,
      Number(stats.totalConnections) || 0,
      700
    );

    this.animateValue(
      'stat-malicious-value',
      0,
      Number(stats.maliciousDetected) || 0,
      700
    );

    this.animateValue(
      'stat-normal-value',
      0,
      Number(stats.normalConnections) || 0,
      700
    );

    this.animateValue(
      'stat-rate-value',
      0,
      Number(stats.detectionRate) || 0,
      700,
      '%'
    );
  },

  /**
   * Animate numerical KPI values.
   */
  animateValue(elementId, start, end, duration, suffix = '') {
    const obj = document.getElementById(elementId);

    if (!obj) return;

    let startTimestamp = null;

    const isFloat = Number(end) % 1 !== 0;

    const step = (timestamp) => {
      if (!startTimestamp) {
        startTimestamp = timestamp;
      }

      const progress = Math.min(
        (timestamp - startTimestamp) / duration,
        1
      );

      const current = progress * (end - start) + start;

      if (isFloat) {
        obj.innerText = current.toFixed(1) + suffix;
      } else {
        obj.innerText =
          Math.floor(current).toLocaleString() + suffix;
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerText =
          (isFloat
            ? Number(end).toFixed(1)
            : Math.floor(end).toLocaleString()
          ) + suffix;
      }
    };

    window.requestAnimationFrame(step);
  },

  /**
   * Render dashboard charts.
   */
  renderCharts() {
    if (!window.Charts) return;

    const trafficData = this.getFilteredTrafficData(
      this.currentRange
    );

    window.Charts.createTrafficOverviewChart(
      'traffic-overview-chart',
      trafficData
    );

    // Attack distribution is currently demo analytics.
    // Do not represent it as live model analytics.
    if (window.DemoData?.analyticsData?.attackDistribution) {
      window.Charts.createThreatDistributionChart(
        'threat-distribution-chart',
        window.DemoData.analyticsData.attackDistribution
      );
    }
  },

  /**
   * Set up dashboard time-filter buttons.
   */
  setupTimeFilters() {
    const buttons = document.querySelectorAll(
      '.time-filter-btn'
    );

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(button =>
          button.classList.remove('active')
        );

        btn.classList.add('active');

        const range =
          btn.getAttribute('data-range') || '24h';

        this.handleTimeFilter(range);
      });
    });
  },

  /**
   * Handle time-filter selection.
   */
  handleTimeFilter(range) {
    this.currentRange = range;

    if (!window.Charts) return;

    const trafficData = this.getFilteredTrafficData(range);

    window.Charts.createTrafficOverviewChart(
      'traffic-overview-chart',
      trafficData
    );
  },

  /**
   * Get traffic chart data.
   *
   * These values are demo data until the backend provides
   * time-series analytics.
   */
  getFilteredTrafficData(range) {
    const analytics = window.DemoData?.analyticsData;

    const base = analytics?.trafficTrend || {
      labels: [],
      normal: [],
      suspicious: []
    };

    if (range === '1h') {
      return {
        labels: [
          '14:00',
          '14:10',
          '14:20',
          '14:30',
          '14:40',
          '14:50'
        ],
        normal: [420, 480, 510, 460, 490, 530],
        suspicious: [28, 35, 22, 19, 31, 24]
      };
    }

    if (range === '6h') {
      return {
        labels: [
          '09:00',
          '10:00',
          '11:00',
          '12:00',
          '13:00',
          '14:00'
        ],
        normal: [2100, 2600, 2750, 2900, 3100, 2850],
        suspicious: [130, 160, 145, 185, 210, 165]
      };
    }

    if (range === '7d') {
      return {
        labels: [
          'Nov 12',
          'Nov 13',
          'Nov 14',
          'Nov 15',
          'Nov 16',
          'Nov 17',
          'Nov 18'
        ],
        normal: [
          21400,
          22100,
          20800,
          24500,
          23900,
          24100,
          23554
        ],
        suspicious: [
          1120,
          1080,
          950,
          1310,
          1260,
          1340,
          1293
        ]
      };
    }

    return base;
  },

  /**
   * Render recent security alerts.
   */
  renderAlerts(alerts) {
    const tbody = document.getElementById(
      'alerts-table-body'
    );

    if (!tbody) return;

    if (!alerts || alerts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6"
              class="text-center text-muted"
              style="padding:24px;">
            No recent security alerts recorded.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML = alerts.map(alert => {
      const severity = String(
        alert.severity || 'Medium'
      );

      const sevClass =
        `badge-${severity.toLowerCase()}`;

      const timestamp = alert.timestamp
        ? new Date(alert.timestamp)
        : null;

      const timeStr =
        timestamp && !Number.isNaN(timestamp.getTime())
          ? timestamp.toLocaleTimeString()
          : 'N/A';

      const classification =
        alert.classification || 'Unknown';

      const classificationClass =
        this.isNormal(alert)
          ? 'badge-normal'
          : 'badge-high';

      const srcIp = alert.srcIp || 'N/A';
      const dstIp = alert.dstIp || 'N/A';

      return `
        <tr>
          <td>
            <span style="font-family: monospace; color: var(--text-muted);">
              ${this.escapeHTML(timeStr)}
            </span>
          </td>

          <td>
            <span style="font-family: monospace; color: var(--accent-cyan);">
              ${this.escapeHTML(srcIp)}
            </span>
          </td>

          <td>
            <span style="font-family: monospace;">
              ${this.escapeHTML(dstIp)}
            </span>
          </td>

          <td>
            <span class="badge ${classificationClass}">
              ${this.escapeHTML(classification)}
            </span>
          </td>

          <td>
            <span class="badge ${sevClass}">
              ${this.escapeHTML(severity)}
            </span>
          </td>

          <td>
            <button
              class="btn btn-secondary btn-sm"
              onclick="window.SentinelApp.showNotification(
                'Incident record ${Number(alert.id) || 0} flagged for review.',
                'info'
              )">
              Investigate
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Escape dynamic values before inserting them into HTML.
   */
  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  },

  /**
   * Render backend system health information.
   */
  renderSystemHealth(health) {
    if (!health) return;

    const setHealthItem = (prefix, data) => {
      const el = document.getElementById(prefix);

      if (!el || !data) return;

      const isOnline =
        data.status === 'online' ||
        data.status === 'ready';

      el.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span style="color:var(--text-secondary); font-size:0.85rem;">
            ${this.escapeHTML(data.label || 'Service')}
          </span>

          <span class="status-dot ${isOnline ? '' : 'offline'}"></span>
        </div>

        <div style="font-weight:600; font-size:0.95rem; margin-top:4px; color:${isOnline ? 'var(--text-primary)' : 'var(--color-danger)'};">
          ${this.escapeHTML(data.detail || 'Unknown')}
        </div>
      `;
    };

    setHealthItem(
      'health-model-status',
      health.model
    );

    setHealthItem(
      'health-api-status',
      health.api
    );

    setHealthItem(
      'health-dataset-status',
      health.dataset
    );

    const lastAnalysisEl = document.getElementById(
      'health-last-analysis'
    );

    if (lastAnalysisEl) {
      const lastAnalysis = health.lastAnalysis
        ? new Date(health.lastAnalysis).toLocaleString()
        : 'N/A';

      lastAnalysisEl.innerHTML = `
        <div style="color:var(--text-secondary); font-size:0.85rem;">
          Last Analysis
        </div>

        <div style="font-weight:600; font-size:0.95rem; margin-top:4px;">
          ${this.escapeHTML(lastAnalysis)}
        </div>
      `;
    }
  }
};
