
/**
 * Sentinel Cyber — Dataset Upload & Ingestion Engine
 * Handles drag-and-drop, CSV validation, dataset preview,
 * live ML analysis and dashboard integration.
 */

window.Upload = {
  selectedFile: null,
  parsedData: null,

  init() {
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const removeBtn = document.getElementById('upload-remove-btn');
    const analyzeBtn = document.getElementById('btn-analyze');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.add('dragover'), false
      );
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.remove('dragover'), false
      );
    });

    dropZone.addEventListener('drop', e => {
      const files = e.dataTransfer.files;

      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });

    if (browseBtn) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', e => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => this.reset());
    }

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.startAnalysis());
    }
  },

  handleFile(file) {
    this.clearError();

    const filename = file.name.toLowerCase();

    if (!filename.endsWith('.csv')) {
      this.showError(
        'Invalid file format. Please upload a CSV network traffic dataset.'
      );
      return;
    }

    const maxSize = 50 * 1024 * 1024;

    if (file.size > maxSize) {
      this.showError(
        'File exceeds the maximum allowable size of 50MB.'
      );
      return;
    }

    this.selectedFile = file;

    const fileInfo = document.getElementById('upload-file-info');
    const fileNameEl = document.getElementById('upload-filename');
    const fileSizeEl = document.getElementById('upload-filesize');

    if (fileInfo) fileInfo.style.display = 'flex';
    if (fileNameEl) fileNameEl.innerText = file.name;
    if (fileSizeEl) {
      fileSizeEl.innerText = this.formatFileSize(file.size);
    }

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const parsed = this.parseCSV(e.target.result);

        if (parsed.rows.length === 0) {
          throw new Error('CSV file contains no valid records.');
        }

        this.parsedData = parsed;
        this.showPreview(parsed.headers, parsed.rows);

        const analyzeBtn = document.getElementById('btn-analyze');

        if (analyzeBtn) {
          analyzeBtn.removeAttribute('disabled');
        }

      } catch (err) {
        this.showError('Failed to parse CSV data: ' + err.message);
      }
    };

    reader.onerror = () => {
      this.showError('Error reading uploaded CSV file.');
    };

    reader.readAsText(file);
  },

  parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error(
        'Dataset must contain a header row and at least one data record.'
      );
    }

    const parseLine = line => {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      values.push(current.trim());
      return values;
    };

    const headers = parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseLine(lines[i]);

      if (row.length === headers.length) {
        rows.push(row);
      }
    }

    return { headers, rows };
  },

  showPreview(headers, rows) {
    const previewContainer = document.getElementById('upload-preview');
    const rowCountEl = document.getElementById('upload-row-count');
    const colCountEl = document.getElementById('upload-col-count');
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    if (!previewContainer || !thead || !tbody) return;

    previewContainer.style.display = 'block';

    if (rowCountEl) {
      rowCountEl.innerText = rows.length.toLocaleString();
    }

    if (colCountEl) {
      colCountEl.innerText = headers.length.toString();
    }

    thead.innerHTML =
      '<tr>' +
      headers.map(h => `<th>${this.escapeHTML(h)}</th>`).join('') +
      '</tr>';

    tbody.innerHTML = rows.slice(0, 8).map(row => {
      return '<tr>' + row.map(val =>
        `<td><span style="font-family:monospace;font-size:0.8rem;">${this.escapeHTML(val)}</span></td>`
      ).join('') + '</tr>';
    }).join('');
  },

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  },

  showError(message) {
    const errorEl = document.getElementById('upload-error');

    if (errorEl) {
      errorEl.innerText = message;
      errorEl.style.display = 'block';
    }

    if (window.SentinelApp) {
      window.SentinelApp.showNotification(message, 'error');
    }
  },

  clearError() {
    const errorEl = document.getElementById('upload-error');

    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.innerText = '';
    }
  },

  async startAnalysis() {
    const analyzeBtn = document.getElementById('btn-analyze');
    const progressContainer = document.getElementById('upload-progress');
    const statusEl = document.getElementById('upload-status');

    if (!this.selectedFile) {
      this.showError('Please select a CSV dataset first.');
      return;
    }

    if (analyzeBtn) analyzeBtn.setAttribute('disabled', 'true');
    if (progressContainer) progressContainer.style.display = 'block';

    try {
      if (!window.ApiService) {
        throw new Error('API service is unavailable.');
      }

      // STEP 1: Upload dataset
      this.updateProgress(15, 'Uploading dataset...');

      if (statusEl) {
        statusEl.innerText = 'Uploading dataset to backend...';
      }

      const uploadResponse =
        await window.ApiService.uploadDataset(this.selectedFile);

      const datasetId =
        uploadResponse.datasetId || uploadResponse.dataset_id;

      if (!datasetId) {
        throw new Error('Backend did not return a dataset ID.');
      }

      // STEP 2: Run model inference
      this.updateProgress(45, 'Running Random Forest inference...');

      if (statusEl) {
        statusEl.innerText = 'Running machine learning predictions...';
      }

      const predictionResponse =
        await window.ApiService.predict(datasetId);

      if (
        !predictionResponse ||
        !Array.isArray(predictionResponse.predictions) ||
        !predictionResponse.stats
      ) {
        throw new Error(
          'Backend returned an unexpected prediction response.'
        );
      }

      // STEP 3: Load predictions page data
      this.updateProgress(75, 'Processing prediction results...');

      if (window.Predictions) {
        window.Predictions.loadCustomData(
          predictionResponse.predictions
        );

        window.Predictions.addToHistory({
          id: 'ANA-' +
            new Date().toISOString().slice(0, 10).replace(/-/g, '') +
            '-' + Math.floor(100 + Math.random() * 900),

          filename: this.selectedFile.name,
          date: new Date().toISOString(),
          records: predictionResponse.stats.total,
          malicious: predictionResponse.stats.malicious,
          status: 'Completed'
        });
      }

      // STEP 4: Update dashboard with real model results
      if (window.Dashboard) {
        window.Dashboard.loadLiveAnalysis(
          predictionResponse.predictions,
          predictionResponse.stats
        );
      }

      // STEP 5: Update system health timestamp
      if (window.Dashboard && window.ApiService.isLiveMode()) {
        const health = await window.ApiService.checkHealth();

        window.Dashboard.renderSystemHealth(health);
      }

      // STEP 6: Complete
      this.updateProgress(100, 'Analysis completed successfully!');

      if (statusEl) {
        statusEl.innerText = 'Inference completed successfully.';
      }

      if (window.SentinelApp) {
        window.SentinelApp.showNotification(
          'Dataset analysis completed successfully!',
          'success'
        );

        window.SentinelApp.navigateTo('predictions');
      }

      // Allow the user to view the completed result before resetting.
      setTimeout(() => this.reset(), 800);

    } catch (error) {
      console.error('[Sentinel Cyber] Analysis failed:', error);

      const message = error.message ||
        'Analysis failed. Check backend connection and model status.';

      this.showError(message);

      if (statusEl) {
        statusEl.innerText = 'Analysis could not be completed.';
      }

      if (progressContainer) {
        progressContainer.style.display = 'none';
      }

      if (analyzeBtn) {
        analyzeBtn.removeAttribute('disabled');
      }
    }
  },

  updateProgress(percent, text) {
    const fill = document.getElementById('upload-progress-fill');
    const label = document.getElementById('upload-progress-text');

    if (fill) {
      fill.style.width = percent + '%';
    }

    if (label) {
      label.innerText = `${percent}% - ${text}`;
    }
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat(
      (bytes / Math.pow(k, i)).toFixed(1)
    ) + ' ' + sizes[i];
  },

  reset() {
    this.selectedFile = null;
    this.parsedData = null;

    const fileInput = document.getElementById('file-input');

    if (fileInput) fileInput.value = '';

    const fileInfo = document.getElementById('upload-file-info');

    if (fileInfo) fileInfo.style.display = 'none';

    const preview = document.getElementById('upload-preview');

    if (preview) preview.style.display = 'none';

    const progress = document.getElementById('upload-progress');

    if (progress) progress.style.display = 'none';

    const analyzeBtn = document.getElementById('btn-analyze');

    if (analyzeBtn) {
      analyzeBtn.setAttribute('disabled', 'true');
    }

    this.clearError();
  }
};
