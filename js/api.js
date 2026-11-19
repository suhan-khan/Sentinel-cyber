
/**
 * Sentinel Cyber — API Service Adapter
 * Connects the frontend to the deployed FastAPI backend
 * with automatic Demo Mode fallback.
 */

window.ApiService = {
  API_BASE_URL: (() => {
    const savedUrl = localStorage.getItem('sentinel_api_url');

    // Replace an old localhost setting with the deployed backend URL.
    if (
      !savedUrl ||
      savedUrl.includes('localhost') ||
      savedUrl.includes('127.0.0.1')
    ) {
      return 'https://sentinel-cyber.onrender.com';
    }

    return savedUrl.replace(/\/+$/, '');
  })(),

  isLive: false,

  /**
   * Check connection to FastAPI backend
   * Endpoint: GET /api/health
   */
  async checkHealth() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(
        `${this.API_BASE_URL}/api/health`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Health check returned non-200');
      }

      const data = await response.json();

      this.isLive = true;

      return {
        status: 'online',
        model: data.model || {
          status: 'online',
          label: 'ML Model',
          detail: 'Inference Active'
        },
        api: {
          status: 'online',
          label: 'API Connection',
          detail: 'Connected'
        },
        dataset: data.dataset || {
          status: 'ready',
          label: 'Dataset Processor',
          detail: 'Operational'
        },
        lastAnalysis: data.last_analysis || null
      };

    } catch (err) {
      clearTimeout(timeoutId);

      this.isLive = false;

      console.warn(
        '[ApiService] Backend health check failed:',
        err.message
      );

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

      return await this._request(
        'POST',
        '/api/upload',
        formData,
        false
      );
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      datasetId: 'DS-' + Date.now().toString().slice(-6),
      filename: file.name,
      size: file.size,
      status: 'uploaded'
    };
  },

  /**
   * Trigger ML prediction
   * Endpoint: POST /api/predict
   */
  async predict(datasetId) {
    if (this.isLive) {
      return await this._request(
        'POST',
        '/api/predict',
        JSON.stringify({
          dataset_id: datasetId
        }),
        true
      );
    }

    await new Promise(resolve => setTimeout(resolve, 900));

    return {
      predictions: window.DemoData.predictionResults,
      stats: {
        total: window.DemoData.predictionResults.length,
        normal: window.DemoData.predictionResults.filter(
          p => p.classification === 'Normal'
        ).length,
        malicious: window.DemoData.predictionResults.filter(
          p => p.classification !== 'Normal'
        ).length,
        avgConfidence: 0.94
      }
    };
  },

  /**
   * Fetch analysis history
   * Endpoint: GET /api/history
   */
  async getHistory() {
    if (this.isLive) {
      return await this._request('GET', '/api/history');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const stored = localStorage.getItem(
      'sentinel_analysis_history'
    );

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (err) {
        console.warn('Could not parse stored history:', err);
      }
    }

    return window.DemoData.analysisHistory;
  },

  /**
   * Fetch SOC analytics data
   * Endpoint: GET /api/analytics
   */
  async getAnalytics() {
    if (this.isLive) {
      return await this._request('GET', '/api/analytics');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    return window.DemoData.analyticsData;
  },

  /**
   * Manually enable or disable live mode
   */
  setLiveMode(bool) {
    this.isLive = bool;
  },

  /**
   * Check whether live mode is active
   */
  isLiveMode() {
    return this.isLive;
  },

  /**
   * Change backend URL
   */
  setApiUrl(url) {
    const cleanUrl = url.trim().replace(/\/+$/, '');

    this.API_BASE_URL = cleanUrl;

    localStorage.setItem(
      'sentinel_api_url',
      cleanUrl
    );
  },

  /**
   * Internal request wrapper
   * Handles JSON, FormData, timeouts and errors.
   */
  async _request(method, endpoint, body = null, isJson = true) {
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      120000
    );

    const headers = {};

    if (isJson && body) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(
        `${this.API_BASE_URL}${endpoint}`,
        {
          method,
          headers,
          body,
          signal: controller.signal
        }
      );

      if (!response.ok) {
        const errText = await response.text();

        throw new Error(
          `API Error ${response.status}: ${errText}`
        );
      }

      return await response.json();

    } catch (err) {
      console.error(
        `[ApiService] Request to ${endpoint} failed:`,
        err.message
      );

      throw err;

    } finally {
      clearTimeout(timeoutId);
    }
  }
};
