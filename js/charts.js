
/**
 * Sentinel Cyber — Chart.js Visualization Engine
 * Supports live prediction data and demo fallback data.
 */
window.Charts = {
  instances: {},

  getChartColors() {
    return {
      cyan: '#8B5CF6',
      blue: '#A78BFA',
      purple: '#7C3AED',
      pink: '#EC4899',
      green: '#10B981',
      yellow: '#EAB308',
      orange: '#F59E0B',
      red: '#EF4444',
      cardBg: '#FFFFFF',
      textPrimary: '#241B35',
      textMuted: '#716780',
      gridColor: 'rgba(124, 58, 237, 0.10)'
    };
  },

  getDefaultOptions(overrides = {}) {
    const c = this.getChartColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: c.textMuted,
            font: { family: "'Inter', sans-serif", size: 12 },
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          titleColor: c.textPrimary,
          bodyColor: '#514663',
          borderColor: '#E8E3F2',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: c.gridColor },
          ticks: { color: c.textMuted }
        },
        y: {
          grid: { color: c.gridColor },
          ticks: { color: c.textMuted }
        }
      },
      ...overrides
    };
  },

  destroyChart(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  },

  destroyAll() {
    Object.keys(this.instances).forEach(id =>
      this.destroyChart(id)
    );
  },

  createTrafficOverviewChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();
    const ctx = el.getContext('2d');

    const gradNormal = ctx.createLinearGradient(0, 0, 0, 300);
    gradNormal.addColorStop(0, 'rgba(139, 92, 246, 0.30)');
    gradNormal.addColorStop(1, 'rgba(139, 92, 246, 0)');

    const gradThreat = ctx.createLinearGradient(0, 0, 0, 300);
    gradThreat.addColorStop(0, 'rgba(239, 68, 68, 0.30)');
    gradThreat.addColorStop(1, 'rgba(239, 68, 68, 0)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: 'Normal Traffic',
            data: data.normal || [],
            borderColor: c.cyan,
            backgroundColor: gradNormal,
            borderWidth: 2,
            tension: 0.4,
            fill: true
          },
          {
            label: 'Suspicious Traffic',
            data: data.suspicious || [],
            borderColor: c.red,
            backgroundColor: gradThreat,
            borderWidth: 2,
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: this.getDefaultOptions()
    });
  },

  createThreatDistributionChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.labels || [],
        datasets: [{
          data: data.values || [],
          backgroundColor: data.colors || [
            c.green, c.red, c.orange, c.yellow
          ],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: c.textMuted,
              font: { size: 11 },
              usePointStyle: true
            }
          }
        },
        cutout: '72%'
      }
    });
  },

  createAttackTypesChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Detected Incidents',
          data: data.values || [],
          backgroundColor: [c.red, c.orange, c.blue, c.purple, c.pink],
          borderRadius: 4
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        indexAxis: 'y',
        plugins: { legend: { display: false } }
      }
    });
  },

  createThreatSeverityChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Count',
          data: data.values || [0, 0, 0, 0],
          backgroundColor: [c.red, c.orange, c.yellow, c.green],
          borderRadius: 6
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        plugins: { legend: { display: false } }
      }
    });
  },

  createProtocolDistributionChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.labels || [],
        datasets: [{
          data: data.values || [],
          backgroundColor: data.colors || [
            c.cyan, c.blue, c.purple, c.pink
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: c.textMuted, usePointStyle: true }
          }
        },
        cutout: '65%'
      }
    });
  },

  createTrafficTrendChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'line',
      data: {
        labels: data.labels || [],
        datasets: [
          {
            label: 'Normal Records',
            data: data.normal || [],
            borderColor: c.green,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          },
          {
            label: 'Malicious Records',
            data: data.suspicious || [],
            borderColor: c.red,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: this.getDefaultOptions()
    });
  },

  // Uses supplied values instead of hardcoded demo numbers.
  createNormalVsMaliciousChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.labels || ['Current Analysis'],
        datasets: [
          {
            label: 'Normal Traffic',
            data: data.normal || [],
            backgroundColor: c.cyan,
            borderRadius: 4
          },
          {
            label: 'Malicious Traffic',
            data: data.malicious || [],
            backgroundColor: c.red,
            borderRadius: 4
          }
        ]
      },
      options: this.getDefaultOptions()
    });
  },

  createDetectionStatsChart(canvasId, data) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return;

    this.destroyChart(canvasId);

    const c = this.getChartColors();

    this.instances[canvasId] = new Chart(el.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Detected Threats',
          data: data.values || [],
          backgroundColor: c.blue,
          borderRadius: 6
        }]
      },
      options: {
        ...this.getDefaultOptions(),
        plugins: { legend: { display: false } }
      }
    });
  },

  // Rebuilds a chart using the latest prediction results.
  updateFromPredictions(predictions) {
    if (!Array.isArray(predictions) || predictions.length === 0) return;

    const normal = predictions.filter(item =>
      ['normal', 'benign'].includes(
        String(item.classification || '').toLowerCase()
      )
    ).length;

    const malicious = predictions.length - normal;

    const severityLabels = ['Critical', 'High', 'Medium', 'Low'];

    const severityCounts = severityLabels.map(severity =>
      predictions.filter(item =>
        String(item.severity || '').toLowerCase() === severity.toLowerCase()
      ).length
    );

    const normalMaliciousCanvas = document.getElementById('normalVsMaliciousChart');
    if (normalMaliciousCanvas) {
      this.createNormalVsMaliciousChart(
        'normalVsMaliciousChart',
        {
          labels: ['Current Analysis'],
          normal: [normal],
          malicious: [malicious]
        }
      );
    }

    const severityCanvas = document.getElementById('threatSeverityChart');
    if (severityCanvas) {
      this.createThreatSeverityChart(
        'threatSeverityChart',
        { values: severityCounts }
      );
    }
  }
};
