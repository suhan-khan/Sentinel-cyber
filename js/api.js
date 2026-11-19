/**
 * Sentinel Cyber — API Service Adapter
 * Modular service layer prepared for FastAPI backend integration with automatic Demo Mode fallback.
 */
window.ApiService = {
  API_BASE_URL: localStorage.getItem('sentinel_api_url') || 'http://localhost:8000',
  isLive: false,

  /**
   * Check connection to FastAPI backend
   * Endpoint: GET /api/health
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.isLive = true;
        return {
          status: 'online',
          model: data.model || { status: 'online', label: 'ML Model', detail: 'Inference Active' },
          api: { status: 'online', label: 'API Connection', detail: 'Connected' },
          dataset: data.dataset || { status: 'ready', label: 'Dataset Processor', detail: 'Operational' },
          lastAnalysis: data.last_analysis || new Date().toISOString()
        };
      } else {
        throw new Error('Health check returned non-200');
      }
    } catch (err) {
      this.isLive = false;
      return window.DemoData.systemHealth;
    }
  },

  /**
   * Upload dataset CSV
   * Endpoint: POST /api/upload
   */
  async uploadDataset(file) {
    if (this.isLive) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await this._request('POST', '/api/upload', formData, false);
      return res;
    } else {
      // Simulate realistic upload latency
      await new Promise(r => setTimeout(r, 600));
      return {
        datasetId: 'DS-' + Date.now().toString().slice(-6),
        filename: file.name,
        size: file.size,
        status: 'uploaded'
      };
    }
  },

  /**
   * Trigger ML prediction
   * Endpoint: POST /api/predict
   */
  async predict(datasetId) {
    if (this.isLive) {
      return await this._request('POST', '/api/predict', JSON.stringify({ dataset_id: datasetId }), true);
    } else {
      // Simulate inference time
      await new Promise(r => setTimeout(r, 900));
      return {
        predictions: window.DemoData.predictionResults,
        stats: {
          total: window.DemoData.predictionResults.length,
          normal: window.DemoData.predictionResults.filter(p => p.classification === 'Normal').length,
          malicious: window.DemoData.predictionResults.filter(p => p.classification !== 'Normal').length,
          avgConfidence: 0.94
        }
      };
    }
  },

  /**
   * Fetch analysis history
   * Endpoint: GET /api/history
   */
  async getHistory() {
    if (this.isLive) {
      return await this._request('GET', '/api/history');
    } else {
      await new Promise(r => setTimeout(r, 200));
      const stored = localStorage.getItem('sentinel_analysis_history');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      return window.DemoData.analysisHistory;
    }
  },

  /**
   * Fetch SOC analytics data
   * Endpoint: GET /api/analytics
   */
  async getAnalytics() {
    if (this.isLive) {
      return await this._request('GET', '/api/analytics');
    } else {
      await new Promise(r => setTimeout(r, 200));
      return window.DemoData.analyticsData;
    }
  },

  setLiveMode(bool) {
    this.isLive = bool;
  },

  isLiveMode() {
    return this.isLive;
  },

  setApiUrl(url) {
    this.API_BASE_URL = url;
    localStorage.setItem('sentinel_api_url', url);
  },

  /**
   * Internal request wrapper with timeout and error handling
   */
  async _request(method, endpoint, body = null, isJson = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const headers = {};
    if (isJson && body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[ApiService] Request to ${endpoint} failed:`, err.message);
      throw err;
    }
  }
};
