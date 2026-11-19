# Sentinel Cyber — AI-Powered Network Intrusion Detection System (NIDS)

Sentinel Cyber is a Security Operations Center (SOC) dashboard and AI-based Network Intrusion Detection System interface. It is engineered to monitor network traffic telemetry, perform statistical anomaly classification, flag adversarial attack vectors (DoS, DDoS, Port Probing, Brute Force Authentication, Exploits), and provide cybersecurity insights.

---

## 🛡️ Key Features

- **SOC Dashboard Overview**:
  - Real-time KPI statistics (Total Connections, Malicious Ingress, Normal Baseline, Threat Detection Rate).
  - Dual-series network traffic telemetry chart (Normal vs Suspicious Packets over time with 1H, 6H, 24H, 7D time filters).
  - Threat vector distribution breakdown (Doughnut chart with severity color mapping).
  - Active incident alert feed with severity badges (Critical, High, Medium, Low) and one-click investigation triggers.
  - Subsystem health checks (ML Model status, API connectivity, Dataset ingestion pipeline).

- **Network Traffic Monitoring**:
  - Live connection table with source/destination IP addresses, transport protocols, port assignments, packet volume, classification, and anomaly confidence score.
  - Multi-attribute real-time filtering (by classification status, protocol, and search query).
  - Sortable column headers and client-side pagination.

- **Threat Detection & Classification**:
  - Dedicated cybersecurity threat surface page with configurable threat severity classification.
  - Attack types distribution visualization (Horizontal Bar Chart) and severity breakdown.
  - Incident event logs with status indicators (Active, Mitigated, Investigating).

- **Dataset Upload & Ingestion**:
  - Drag-and-drop CSV upload zone with file size & extension validation.
  - Dynamic dataset previewer showing parsed header schema, row count, column count, and top records.
  - Staged progress pipeline simulating or executing backend neural model inference.

- **AI Prediction Results**:
  - Inference anomaly classification breakdown with confidence meter percentages.
  - Dynamic table filtering and sorting.

- **Prediction History**:
  - Persistent session history tracking past dataset audits, record volume, threat count, and status.
  - Stored in browser storage with capability to clear or review previous sessions.

- **SOC Telemetry Analytics**:
  - Protocol breakdown (TCP, UDP, HTTPS, HTTP, ICMP, DNS).
  - 24-Hour packet rate trend lines.
  - Normal vs Malicious weekly volume comparison.
  - Longitudinal threat detection bar chart.

- **System Configuration & Backend Integration**:
  - Configurable FastAPI base URL.
  - Live connection ping and testing.
  - Automatic fallback to high-fidelity **DEMO MODE** when the backend is offline.

---

## 🚀 Technology Stack

- **Markup**: Semantic HTML5 (Single-Page Application architecture)
- **Styling**: Native CSS3 with custom properties, CSS Grid, Flexbox, responsive breakpoints
- **Scripting**: Vanilla ECMAScript (ES6+) with modular controller architecture
- **Visualizations**: [Chart.js](https://www.chartjs.org/) via CDN
- **Icons**: Lucide SVG vector glyphs

*No heavy frameworks or build tools required.*

---

## 📁 Project Architecture

```
sentinel-cyber/
│
├── index.html              # Main Single-Page Application interface
│
├── css/
│   ├── style.css           # Core styling, variables, layout, sidebar, badges, buttons
│   ├── dashboard.css       # Cards, data tables, metrics, chart wrappers, upload dropzone
│   └── responsive.css      # Responsive breakpoints (1200px, 992px, 768px, 576px)
│
├── js/
│   ├── demo-data.js        # Realistic synthetic cybersecurity telemetry & mock records
│   ├── api.js              # FastAPI communication adapter & demo mode fallback
│   ├── app.js              # Application bootstrapper, SPA router, notification service
│   ├── navigation.js       # Sidebar toggle, active page state, mobile drawer
│   ├── charts.js           # Chart.js initialization & dark-mode theme configuration
│   ├── dashboard.js        # Overview KPIs, time filters, and alert feed controller
│   ├── upload.js           # Drag & drop, CSV validation, parsing, progress indicator
│   └── predictions.js      # Prediction tables, sorting, pagination, and history persistence
│
└── README.md               # Documentation and technical specifications
```

---

## ⚡ Quick Start

1. Clone or open the project folder:
   ```bash
   cd sentinel-cyber
   ```
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge):
   - You can double-click `index.html`, or
   - Serve it via a lightweight local server (e.g. `npx serve`, `python -m http.server 3000`, or VS Code Live Server).
3. The dashboard will automatically launch in **DEMO MODE**, loaded with realistic synthetic network traffic data and threat telemetry.

---

## 🔌 FastAPI Backend Integration

The frontend is built to communicate with a Python FastAPI backend. The API service in `js/api.js` is pre-configured for the following endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (ML Model, API status, last analysis timestamp) |
| `POST` | `/api/upload` | Multipart form-data CSV dataset upload |
| `POST` | `/api/predict` | Trigger ML inference on an uploaded dataset ID |
| `GET` | `/api/history` | Retrieve historical analysis sessions |
| `GET` | `/api/analytics` | Retrieve aggregated SOC metrics and distribution data |

### Switching to Live Mode:
1. Start your FastAPI server on `http://localhost:8000`.
2. In the Sentinel Cyber dashboard, navigate to **Settings**.
3. Confirm or set the **API Base URL** and click **Test Connection**.
4. Once the `/api/health` endpoint responds with HTTP 200, the system automatically turns off the **DEMO MODE** banner and switches to **LIVE MODE**.

---

## 📄 License
MIT License. Created for Network Intrusion Detection System research and SOC demonstration.
