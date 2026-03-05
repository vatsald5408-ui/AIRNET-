# AirNet — Urban Atmospheric Intelligence & Risk Command

AirNet is a comprehensive, city-scale, AI-powered atmospheric intelligence infrastructure. It is designed to transform air pollution management from a reactive process into a predictive, vulnerability-aware, and cascade-modeled decision-making system. 

The application utilizes real-time sensor data, 24-hour meteorological forecasts, and generative AI (Gemini) to perform dynamic multi-objective policy optimization and intervention simulations.

## Key Features

AirNet is divided into five core "Systems" (labs) accessible from the main dashboard:

1. **Live Atmospheric View:** Real-time situational awareness across all city zones pulling from live WAQI sensor feeds, mapped onto MapLibre GL with customizable layers (AQI Heat, Stress, Vulnerability, attribution).
2. **Forecast Lab:** Short-term hyperlocal AQI forecasting (using Open-Meteo), spike probability engine, and "Consequence-of-Inaction" mathematical modeling to determine health impacts of ignoring pollution spikes.
3. **Source & Vulnerability Intelligence:** Dynamic source attribution (e.g. Traffic vs Industry) and live mapping of affected infrastructure (Schools, Hospitals) via the Overpass / OpenStreetMap API.
4. **Cascade & Intervention Lab:** Strategic simulation lab allowing users to model traffic reduction, industrial caps, and emission controls to compare Baseline vs Intervened AQI drops and health risk benefits.
5. **Policy Recommendation Engine:** Automated decision intelligence powered by Google's Gemini 2.0 Flash AI. It ingests the live city state and generates multi-objective optimized mitigation policies, evaluating impact vs disruption constraints. A local heuristic-based scoring engine acts as a resilient fallback when API quotas are exceeded.

## Tech Stack

### Frontend
- **Core:** Vanilla JavaScript, HTML5, Vanilla CSS (Variables, Flexbox/Grid)
- **Mapping:** [MapLibre GL JS](https://maplibre.org/), [CARTO Dark Matter Vector Tiles](https://carto.com/)
- **Charts:** [Chart.js](https://www.chartjs.org/)
- **Theme:** Dark mode by default, highly optimized for command-center aesthetic with "Electric Steel" / Green accents.

### Backend
- **Core:** Node.js, [Express.js](https://expressjs.com/)
- **Database:** SQLite3 with [Sequelize ORM](https://sequelize.org/) mapping Historical Zone Readings and Cached Policies.
- **Microservices:**
  - `api_server.js`: Runs on `localhost:4000`, handling SQLite database queries, logic simulations, and external API requests (Gemini).
  - `server.js`: Runs on `localhost:3005`, purely serving static frontend dashboard assets.

### External APIs Integrated
- **[WAQI (World Air Quality Index)](https://aqicn.org/api/):** Primary real-time sensor telemetry.
- **[Google Gemini AI](https://aistudio.google.com/):** Large Language Model used for translating numeric stress/spike probabilities into actionable urban policy.
- **[Open-Meteo](https://open-meteo.com/):** Free weather & air quality API for 24-48h forecast trajectory models.
- **[Overpass API / OpenStreetMap](https://wiki.openstreetmap.org/wiki/Overpass_API):** Fetches critical infrastructure bounds localized to high-risk zones.

## Installation & Setup

1. **Clone the repository**

2. **Install Dependencies**
   ```bash
   npm install
   ```

   Copy `.env.example` to `.env` and fill in your real keys:
   ```bash
   cp .env.example .env
   ```

4. **Initialize the Database**
   The application relies on a local SQLite database (`database.sqlite`). 

5. **Run the Application**
   Start both the Backend API server and the Frontend static server concurrently:
   ```bash
   npm run dev
   ```

6. **Access the Dashboard**
   Open your browser and navigate to `http://localhost:3005` to view the landing page, or `http://localhost:3005/dashboard` to jump straight to the intelligence system.

## Project Structure
```
/airnet
├── /api               # Express backend routers (policy.js, analytics.js, simulate.js, etc.)
├── /config            # Centralized configuration (apis.js — all external API base URLs)
├── /models            # Sequelize SQLite database schemas
├── /scripts           # Automation scripts (historical data generation)
├── /utils             # Shared utilities (waqiService.js — WAQI sync & Gemini integration)
├── api_server.js      # Express API server entrypoint (port 4000)
├── server.js          # Static frontend file server (port 3005)
├── app.js             # Frontend JavaScript — all 5 intelligence systems
├── index.html         # Main dashboard
├── home.html          # Landing page
├── styles.css         # All dashboard styles
├── .env.example       # Environment variable template (copy to .env)
├── package.json       # Project dependencies and npm scripts
└── database.sqlite    # Auto-generated SQLite database (gitignored)
```
