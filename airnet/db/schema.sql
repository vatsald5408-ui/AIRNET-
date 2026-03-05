-- ============================================================
-- AirNet — SQLite Schema
-- Run once to initialise a fresh database clone.
-- The application uses Sequelize (alter: true) so tables are
-- also created/updated automatically on server start.
-- ============================================================

-- ── Zone-level atmospheric history (core trend table) ───────
-- Written every WAQI sync cycle (~30 min).
-- At 20 zones × 48 writes/day × 60 days = ~57,600 rows / ~14 MB
CREATE TABLE IF NOT EXISTS zone_readings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    zone           TEXT    NOT NULL,               -- "Rohini", "Gurugram" etc.
    ts             INTEGER NOT NULL,               -- Unix epoch (seconds)

    -- Air quality
    aqi            REAL    NOT NULL,
    pm25           REAL,
    pm10           REAL,
    no2            REAL,
    so2            REAL,

    -- Meteorology
    wind_speed     REAL,                           -- km/h
    wind_dir       REAL,                           -- degrees

    -- Derived / computed scores
    stress         REAL,                           -- ASI stress 0-100
    spike_pct      REAL,                           -- Spike probability 0-100
    vuln           REAL,                           -- Vulnerability index 0-100
    primary_source TEXT                            -- Traffic | Industry | Construction | External
);

-- Fast queries: latest N readings for a zone, range scans
CREATE INDEX IF NOT EXISTS idx_zone_ts  ON zone_readings (zone, ts);
CREATE INDEX IF NOT EXISTS idx_ts       ON zone_readings (ts);

-- ── City-level atmospheric readings (legacy / overall Delhi) ─
CREATE TABLE IF NOT EXISTS "AtmosphericReadings" (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    pm25           REAL    NOT NULL,
    pm10           REAL    NOT NULL,
    no2            REAL    NOT NULL,
    aqi_base       INTEGER NOT NULL,
    city_id        TEXT    NOT NULL,
    sensor_id      TEXT    NOT NULL,
    timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP,
    ai_analysis    TEXT,                           -- JSON blob
    "createdAt"    DATETIME,
    "updatedAt"    DATETIME
);
CREATE INDEX IF NOT EXISTS idx_city_ts ON "AtmosphericReadings" (city_id, timestamp);

-- ── Policy recommendations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "Policies" (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id        TEXT,
    recommended_action TEXT,
    aqi_threshold  INTEGER,
    priority       TEXT,
    status         TEXT DEFAULT 'pending',
    notes          TEXT,
    "createdAt"    DATETIME,
    "updatedAt"    DATETIME
);

-- ── Impact simulations (System 4) ───────────────────────────
CREATE TABLE IF NOT EXISTS "ImpactSimulations" (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_id      INTEGER REFERENCES "Policies"(id),
    aqi_drop       REAL,
    health_benefit REAL,
    disruption     REAL,
    efficiency     REAL,
    parameters     TEXT,                           -- JSON blob (slider values)
    "createdAt"    DATETIME,
    "updatedAt"    DATETIME
);
