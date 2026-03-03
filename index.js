/**
 * index.js – Stremio Custom Row Factory
 *
 * Startup sequence:
 *  1. Load & validate streams.json + ui-config.json
 *  2. Build the Stremio manifest (one catalog per row)
 *  3. Register catalog + stream handlers
 *  4. Mount Stremio routes + admin panel on an Express server
 */

'use strict';

const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');
const getRouter = require('stremio-addon-sdk/src/getRouter');
const { loadConfig } = require('./src/loader');
const { buildManifest } = require('./src/manifest');
const { registerHandlers } = require('./src/handlers');
const { mountAdmin } = require('./src/admin');

// ── 1. App State & Manifest ────────────────────────────────────────────────
let currentConfig;

async function startup() {
    try {
        currentConfig = await loadConfig();
        const manifest = buildManifest(currentConfig.addonMeta, currentConfig.rows);
        const builder = new addonBuilder(manifest);
        registerHandlers(builder, () => currentConfig);

        const addonInterface = builder.getInterface();
        const sdkRouter = getRouter(addonInterface);
        app.use(sdkRouter);

        console.log(`✅  Startup complete: ${currentConfig.rows.length} rows loaded.`);
    } catch (err) {
        console.error('\n❌  Startup error:\n');
        console.error('   ' + err.message);
        // Don't exit if in serverless environment
        if (require.main === module) process.exit(1);
    }
}

// ── 2. Build Express app ───────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '7000', 10);

app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Redirect root to admin for easier navigation
app.get('/', (_req, res) => {
    res.redirect('/admin');
});

// Serve manifest dynamically
app.get('/manifest.json', (_req, res) => {
    if (!currentConfig) return res.status(503).json({ error: 'Starting up...' });
    const m = buildManifest(currentConfig.addonMeta, currentConfig.rows);
    res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate');
    res.json(m);
});

// Admin panel (with reload capability)
mountAdmin(app, async () => {
    console.log('♻️  Reloading configuration...');
    try {
        currentConfig = await loadConfig();
        console.log(`✅  Reloaded: ${currentConfig.rows.length} rows.`);
    } catch (e) {
        console.error('❌  Reload failed:', e.message);
    }
});

// ── 3. Initialize & Export ──────────────────────────────────────────────────
startup();

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🚀  Stremio Custom Row Factory is running!`);
        console.log(`   ➜  http://127.0.0.1:${PORT}/admin`);
        console.log(`   ➜  http://127.0.0.1:${PORT}/manifest.json\n`);
    });
}

module.exports = app;


