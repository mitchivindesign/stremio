/**
 * index.js – Stremio Row Factory
 *
 * Startup sequence:
 *  1. Load env vars (local: from env.env via dotenv | Vercel: from dashboard)
 *  2. Load & validate config from GitHub Gist (or local fallback)
 *  3. Build the Stremio manifest (one catalog per row)
 *  4. Register catalog handlers
 *  5. Mount Express routes + admin panel
 */

'use strict';

// Load env.env locally (no-op on Vercel where env vars are set in the dashboard)
require('dotenv').config({ path: require('path').join(__dirname, 'env.env') });

const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');
const getRouter = require('stremio-addon-sdk/src/getRouter');
const { loadConfig } = require('./src/loader');
const { buildManifest } = require('./src/manifest');
const { registerHandlers } = require('./src/handlers');
const { mountAdmin } = require('./src/admin');

// ── 1. App State & Manifest ────────────────────────────────────────────────
let currentConfig;
let activeSdkRouter = null;

async function startup() {
    try {
        currentConfig = await loadConfig();
        rebuildSdkRouter();
        console.log(`✅  Startup complete: ${currentConfig.rows.length} rows loaded.`);
    } catch (err) {
        console.error('\n❌  Startup error:\n');
        console.error('   ' + err.message);
        // Don't exit if in serverless environment
        if (require.main === module) process.exit(1);
    }
}

function rebuildSdkRouter() {
    // 1. Build a fresh manifest and builder with the latest rows
    const manifest = buildManifest(currentConfig.addonMeta, currentConfig.rows);
    const builder = new addonBuilder(manifest);
    registerHandlers(builder, () => currentConfig);

    // 2. Generate a fresh Express router for the Stremio SDK
    const addonInterface = builder.getInterface();
    const newRouter = getRouter(addonInterface);

    // 3. Swap the active router gracefully
    activeSdkRouter = newRouter;
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

// Dynamic SDK Router middleware
// This intercepts requests and routes them through whatever the *currently active*
// Stremio SDK router is. If we reload the config, this automatically uses the new one.
app.use((req, res, next) => {
    if (activeSdkRouter) {
        activeSdkRouter(req, res, next);
    } else {
        next();
    }
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
        rebuildSdkRouter(); // Rebuild Stremio SDK router with new rows
        console.log(`✅  Reloaded: ${currentConfig.rows.length} rows and rebuilt SDK Router.`);
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


