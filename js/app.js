
/**
 * Sentinel Cyber — Core Application Controller
 * Handles SPA routing, dashboard initialization, API health,
 * network traffic, threats, analytics and settings.
 */

window.SentinelApp = {
  currentPage: 'overview',

  pageTitles: {
    overview: 'SOC Overview',
    network: 'Network Traffic Monitoring',
    threats: 'Threat Detection & Classification',
    upload: 'Dataset Ingestion & Inspection',
    predictions: 'AI Inference & Anomaly Predictions',
    history: 'Session Analysis History',
    analytics: 'Cybersecurity Telemetry Analytics',
    settings: 'SOC System Configuration'
  },

  networkData: [],
  networkFiltered: [],
  networkPage: 1,
  networkPerPage: 15,
  networkSort: { field: null, direction: 'asc' },

  threatsData: [],
  threatsFiltered: [],

  // Store actual backend health information.
  backendHealth: null,

  async init() {
    if (window.Navigation) {
      window.Navigation.init();
    }

    // Load initial demo records.
    this.networkData = [
      ...(window.DemoData ? window.DemoData.trafficRecords : [])
    ];

    this.networkFiltered = [...this.networkData];

    this.threatsData = [
      ...(window.DemoData ? window.DemoData.threatRecords : [])
    ];

    this.threatsFiltered = [...this.threatsData];

    // Check actual backend health.
    if (window.ApiService) {
      this.backendHealth = await window.ApiService.checkHealth();

      const isLive = window.ApiService.isLiveMode();

      this.updateSystemStatus(isLive);

      // Render actual backend health.
      if (window.Dashboard) {
        window.Dashboard.renderSystemHealth(this.backendHealth);
      }
    }

    // Initialize subsystem controllers.
    if (window.Dashboard) {
      window.Dashboard.init();

      // Restore actual backend health after dashboard initialization.
      if (this.backendHealth) {
        window.Dashboard.renderSystemHealth(this.backendHealth);
      }
    }

    if (window.Upload) {
      window.Upload.init();
    }

    if (window.Predictions) {
      window.Predictions.init();
    }

    this.setupGlobalControls();
    this.initSettings();
    this.setupNetworkPageControls();
    this.setupThreatsPageControls();
  },

  updateSystemStatus(isLive) {
    const banner = document.getElementById('demo-mode-banner');
    const statusText = document.getElementById('system-status-text');
    const statusDot = document.getElementById('system-status-dot');

    if (banner) {
      banner.style.display = isLive ? 'none' : 'flex';
    }

    if (statusText && statusDot) {
      if (isLive) {
        statusText.innerText = 'SOC Live Mode (FastAPI Active)';
        statusDot.className = 'status-dot';
      } else {
        statusText.innerText = 'SOC Demo Mode';
        statusDot.className = 'status-dot offline';
      }
    }
  },

  navigateTo(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const target = document.getElementById(`page-${pageId}`);

    if (target) {
      target.classList.add('active');
    }

    if (window.Navigation) {
      window.Navigation.setActive(pageId);
    }

    const titleEl = document.getElementById('page-title');

    if (titleEl && this.pageTitles[pageId]) {
      titleEl.innerText = this.pageTitles[pageId];
    }

    this.currentPage = pageId;

    if (pageId === 'overview' && window.Dashboard) {
      window.Dashboard.renderCharts();
    } else if (pageId === 'network') {
      this.renderNetworkPage();
    } else if (pageId === 'threats') {
      this.renderThreatsPage();
    } else if (pageId === 'analytics') {
      this.renderAnalyticsPage();
    } else if (pageId === 'history' && window.Predictions) {
      window.Predictions.renderHistory();
    } else if (pageId === 'predictions' && window.Predictions) {
      window.Predictions.renderPredictions();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setupGlobalControls() {
    const searchInput = document.getElementById('search-input');

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        const val = e.target.value.trim().toLowerCase();

        if (this.currentPage === 'network') {
          const netSearch = document.getElementById('traffic-search');

          if (netSearch) {
            netSearch.value = val;
            this.filterNetworkData();
          }
        } else if (this.currentPage === 'threats') {
          const threatSearch = document.getElementById('threats-search');

          if (threatSearch) {
            threatSearch.value = val;
            this.filterThreatsData();
          }
        } else if (this.currentPage === 'predictions') {
          const predSearch = document.getElementById('predictions-search');

          if (predSearch && window.Predictions) {
            predSearch.value = val;
            window.Predictions.applyFilters();
          }
        }
      });
    }

    const notifBtn = document.getElementById('notification-btn');

    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        this.showNotification(
          '3 unacknowledged high-severity threat detections in DMZ segment.',
          'warning'
        );
      });
    }
  },

  // ================= NETWORK TRAFFIC =================

  setupNetworkPageControls() {
    const statusSelect = document.getElementById('traffic-filter-status');
    const protocolSelect = document.getElementById('traffic-filter-protocol');
    const searchInput = document.getElementById('traffic-search');

    if (statusSelect) {
      statusSelect.addEventListener('change', () => this.filterNetworkData());
    }

    if (protocolSelect) {
      protocolSelect.addEventListener('change', () => this.filterNetworkData());
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterNetworkData());
    }

    const prevBtn = document.getElementById('traffic-prev-btn');
    const nextBtn = document.getElementById('traffic-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.networkPage > 1) {
          this.networkPage--;
          this.renderNetworkTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const total = Math.ceil(
          this.networkFiltered.length / this.networkPerPage
        ) || 1;

        if (this.networkPage < total) {
          this.networkPage++;
          this.renderNetworkTable();
        }
      });
    }

    document.querySelectorAll('#traffic-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');

        if (field) {
          this.sortNetworkData(field);
        }
      });
    });
  },

  filterNetworkData() {
    const statusVal = (
      document.getElementById('traffic-filter-status')?.value || 'all'
    ).toLowerCase();

    const protoVal = (
      document.getElementById('traffic-filter-protocol')?.value || 'all'
    ).toLowerCase();

    const searchVal = (
      document.getElementById('traffic-search')?.value || ''
    ).trim().toLowerCase();

    this.networkFiltered = this.networkData.filter(item => {
      const classification = String(item.classification || '').toLowerCase();

      let matchStatus = true;

      if (statusVal === 'normal') {
        matchStatus = classification === 'normal';
      } else if (statusVal === 'malicious') {
        matchStatus = classification !== 'normal';
      }

      const matchProto = protoVal === 'all' ||
        String(item.protocol || '').toLowerCase() === protoVal;

      const matchSearch = !searchVal || [
        item.srcIp,
        item.dstIp,
        item.classification,
        item.protocol
      ].some(value =>
        String(value || '').toLowerCase().includes(searchVal)
      );

      return matchStatus && matchProto && matchSearch;
    });

    this.networkPage = 1;
    this.renderNetworkPage();
  },

  sortNetworkData(field) {
    if (this.networkSort.field === field) {
      this.networkSort.direction =
        this.networkSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.networkSort.field = field;
      this.networkSort.direction = 'asc';
    }

    const { field: f, direction } = this.networkSort;
    const factor = direction === 'asc' ? 1 : -1;

    this.networkFiltered.sort((a, b) => {
      let valA = a[f];
      let valB = b[f];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;

      return 0;
    });

    this.renderNetworkTable();
  },

  renderNetworkPage() {
    const total = this.networkData.length;

    const normal = this.networkData.filter(
      i => String(i.classification || '').toLowerCase() === 'normal'
    ).length;

    const suspicious = total - normal;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val.toLocaleString();
    };

    setEl('network-total-value', total);
    setEl('network-normal-value', normal);
    setEl('network-suspicious-value', suspicious);

    this.renderNetworkTable();
  },

  renderNetworkTable() {
    const tbody = document.getElementById('traffic-table-body');

    if (!tbody) return;

    const totalPages = Math.ceil(
      this.networkFiltered.length / this.networkPerPage
    ) || 1;

    const start = (this.networkPage - 1) * this.networkPerPage;

    const pageItems = this.networkFiltered.slice(
      start,
      start + this.networkPerPage
    );

    if (pageItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center text-muted" style="padding:24px;">
            No network connections match query.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = pageItems.map(item => {
        const isNormal =
          String(item.classification || '').toLowerCase() === 'normal';

        const timeStr = item.timestamp
          ? String(item.timestamp).replace('T', ' ').slice(11, 19)
          : 'N/A';

        const confidence = Number(item.confidence);
        const confPct = Number.isFinite(confidence)
          ? Math.round(confidence * 100)
          : 0;

        return `
          <tr>
            <td style="color:var(--text-muted);font-family:monospace;">
              ${timeStr}
            </td>
            <td>${item.srcIp || 'N/A'}</td>
            <td>${item.dstIp || 'N/A'}</td>
            <td><span class="badge badge-info">${item.protocol || 'Unknown'}</span></td>
            <td>${item.srcPort ?? 'N/A'}</td>
            <td>${item.dstPort ?? 'N/A'}</td>
            <td>${Number(item.packets || 0).toLocaleString()}</td>
            <td>
              <span class="badge ${isNormal ? 'badge-normal' : 'badge-critical'}">
                ${item.classification || 'Unknown'}
              </span>
            </td>
            <td>${confPct}%</td>
          </tr>
        `;
      }).join('');
    }

    const pageInfo = document.getElementById('traffic-page-info');

    if (pageInfo) {
      pageInfo.innerText =
        `Page ${this.networkPage} of ${totalPages} (${this.networkFiltered.length} connections)`;
    }

    const prevBtn = document.getElementById('traffic-prev-btn');
    const nextBtn = document.getElementById('traffic-next-btn');

    if (prevBtn) prevBtn.disabled = this.networkPage <= 1;
    if (nextBtn) nextBtn.disabled = this.networkPage >= totalPages;
  },

  // ================= THREAT DETECTION =================

  setupThreatsPageControls() {
    const sevSelect = document.getElementById('threats-filter-severity');
    const searchInput = document.getElementById('threats-search');

    if (sevSelect) {
      sevSelect.addEventListener('change', () => this.filterThreatsData());
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterThreatsData());
    }
  },

  filterThreatsData() {
    const sevVal = (
      document.getElementById('threats-filter-severity')?.value || 'all'
    ).toLowerCase();

    const query = (
      document.getElementById('threats-search')?.value || ''
    ).trim().toLowerCase();

    this.threatsFiltered = this.threatsData.filter(t => {
      const matchSev = sevVal === 'all' ||
        String(t.severity || '').toLowerCase() === sevVal;

      const matchQuery = !query || [
        t.threatType,
        t.srcIp,
        t.dstIp,
        t.details
      ].some(value =>
        String(value || '').toLowerCase().includes(query)
      );

      return matchSev && matchQuery;
    });

    this.renderThreatsTable();
  },

  renderThreatsPage() {
    const total = this.threatsData.length;

    const critical = this.threatsData.filter(
      t => String(t.severity).toLowerCase() === 'critical'
    ).length;

    const high = this.threatsData.filter(
      t => String(t.severity).toLowerCase() === 'high'
    ).length;

    const medium = this.threatsData.filter(
      t => String(t.severity).toLowerCase() === 'medium'
    ).length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val.toString();
    };

    setEl('threats-total-value', total);
    setEl('threats-critical-value', critical);
    setEl('threats-high-value', high);
    setEl('threats-medium-value', medium);

    if (window.Charts) {
      window.Charts.createAttackTypesChart('attack-types-chart', {
        labels: [
          'DoS Attacks',
          'DDoS Floods',
          'Host Probes',
          'Brute Force Auth',
          'Code Exploits'
        ],
        values: [18, 14, 10, 6, 2]
      });

      window.Charts.createThreatSeverityChart('threat-severity-chart', {
        values: [critical, high, medium, 4]
      });
    }

    this.renderThreatsTable();
  },

  renderThreatsTable() {
    const tbody = document.getElementById('threats-table-body');

    if (!tbody) return;

    if (this.threatsFiltered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted" style="padding:24px;">
            No active threats found matching criteria.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.threatsFiltered.map(t => {
      const severity = String(t.severity || 'medium');

      const timeStr = t.timestamp
        ? String(t.timestamp).replace('T', ' ').slice(5, 19)
        : 'N/A';

      const confidence = Number(t.confidence);
      const confPct = Number.isFinite(confidence)
        ? Math.round(confidence * 100)
        : 0;

      return `
        <tr>
          <td>${timeStr}</td>
          <td>${t.threatType || 'Unknown'}</td>
          <td>${t.srcIp || 'N/A'}</td>
          <td>${t.dstIp || 'N/A'}</td>
          <td><span class="badge badge-${severity.toLowerCase()}">${severity}</span></td>
          <td>${confPct}%</td>
          <td><span class="badge ${t.status === 'Active' ? 'badge-critical' : 'badge-normal'}">${t.status || 'Unknown'}</span></td>
        </tr>
      `;
    }).join('');
  },

  // ================= ANALYTICS =================

  renderAnalyticsPage() {
    if (!window.Charts || !window.DemoData) return;

    const ad = window.DemoData.analyticsData;

    window.Charts.createProtocolDistributionChart(
      'protocol-distribution-chart',
      ad.protocolDistribution
    );

    window.Charts.createTrafficTrendChart(
      'traffic-trend-chart',
      ad.trafficTrend
    );

    window.Charts.createNormalVsMaliciousChart(
      'normal-vs-malicious-chart',
      {}
    );

    window.Charts.createDetectionStatsChart(
      'detection-stats-chart',
      ad.detectionStats
    );
  },

  // ================= SETTINGS =================

  initSettings() {
    const apiInput = document.getElementById('settings-api-url');
    const testBtn = document.getElementById('settings-test-connection');
    const saveBtn = document.getElementById('settings-save');
    const clearHistoryBtn = document.getElementById('settings-clear-history');

    if (apiInput && window.ApiService) {
      apiInput.value = window.ApiService.API_BASE_URL;
    }

    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const url = apiInput
          ? apiInput.value.trim()
          : 'http://localhost:8000';

        window.ApiService.setApiUrl(url);

        this.showNotification(
          `Checking FastAPI endpoint at ${url}...`,
          'info'
        );

        const health = await window.ApiService.checkHealth();

        this.backendHealth = health;

        const isLive = window.ApiService.isLiveMode();

        this.updateSystemStatus(isLive);

        if (window.Dashboard) {
          window.Dashboard.renderSystemHealth(health);
        }

        if (isLive) {
          this.showNotification(
            'Successfully connected to live FastAPI backend!',
            'success'
          );
        } else {
          this.showNotification(
            'Backend unreachable. Maintaining Demo Mode.',
            'warning'
          );
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (apiInput) {
          window.ApiService.setApiUrl(apiInput.value.trim());
        }

        this.showNotification(
          'SOC settings saved successfully.',
          'success'
        );
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if (
          confirm('Are you sure you want to clear all analysis history records?')
        ) {
          if (window.Predictions) {
            window.Predictions.clearHistory();
          }
        }
      });
    }
  },

  // ================= PREMIUM NOTIFICATIONS =================

  showNotification(message, type = 'info') {
    const validTypes = ['success', 'error', 'warning', 'info'];
    const safeType = validTypes.includes(type) ? type : 'info';

    const configs = {
      success: {
        title: 'Operation Successful',
        icon: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>'
      },

      error: {
        title: 'Operation Failed',
        icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6m0-6l6 6"/></svg>'
      },

      warning: {
        title: 'Security Alert',
        icon: '<svg viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01"/><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.4 0z"/></svg>'
      },

      info: {
        title: 'System Notification',
        icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>'
      }
    };

    // Create notification container if it doesn't exist.
    let container = document.getElementById('notification-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.className = 'notification-toast-container';
      document.body.appendChild(container);
    }

    const config = configs[safeType];

    // Main toast element.
    const toast = document.createElement('div');
    toast.className = `notification-toast ${safeType}`;

    toast.setAttribute(
      'role',
      safeType === 'error' ? 'alert' : 'status'
    );

    // Icon.
    const icon = document.createElement('div');
    icon.className = 'notification-toast-icon';
    icon.innerHTML = config.icon;

    // Content wrapper.
    const content = document.createElement('div');
    content.className = 'notification-toast-content';

    // Notification title.
    const title = document.createElement('strong');
    title.className = 'notification-toast-title';
    title.textContent = config.title;

    // Notification message.
    const messageEl = document.createElement('div');
    messageEl.className = 'notification-toast-message';
    messageEl.textContent = String(message);

    content.appendChild(title);
    content.appendChild(messageEl);

    // Close button.
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'notification-toast-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');

    // Bottom progress indicator.
    const progress = document.createElement('div');
    progress.className = 'notification-toast-progress';

    // Assemble toast.
    toast.append(icon, content, closeBtn, progress);
    container.appendChild(toast);

    let dismissed = false;

    const timer = setTimeout(dismiss, 4500);

    // Dismiss notification.
    function dismiss() {
      if (dismissed) return;

      dismissed = true;
      clearTimeout(timer);

      toast.classList.add('removing');

      setTimeout(() => {
        toast.remove();

        // Remove empty notification container.
        if (container.children.length === 0) {
          container.remove();
        }
      }, 260);
    }

    closeBtn.addEventListener('click', dismiss);
  }
};

// Bootstrap on DOM load.
document.addEventListener('DOMContentLoaded', () => {
  window.SentinelApp.init();
});
