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

// ── 1. Load config ─────────────────────────────────────────────────────────
let currentConfig;
try {
    currentConfig = loadConfig();
} catch (err) {
    console.error('\n❌  Configuration error:\n');
    console.error('   ' + err.message);
    process.exit(1);
}

const configProvider = () => currentConfig;

// ── 2. Build manifest & Register handlers ──────────────────────────────────
const manifest = buildManifest(currentConfig.addonMeta, currentConfig.rows);
const builder = new addonBuilder(manifest);
registerHandlers(builder, configProvider);

// ── 3. Build Express app ───────────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '7000', 10);

app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});


// Serve manifest dynamically so row changes (add/delete/rename) reflect instantly
app.get('/manifest.json', (_req, res) => {
    const m = buildManifest(currentConfig.addonMeta, currentConfig.rows);
    res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate');
    res.json(m);
});


// Admin panel (with reload capability)
mountAdmin(app, () => {
    console.log('♻️  Reloading configuration...');
    try {
        currentConfig = loadConfig();
        console.log(`✅  Reloaded: ${currentConfig.rows.length} rows.`);
        console.log(`📡  Install URL: http://127.0.0.1:${PORT}/manifest.json`);
    } catch (e) {
        console.error('❌  Reload failed:', e.message);
    }
});

// Stremio addon routes (catalogs, streams)
const addonInterface = builder.getInterface();
const sdkRouter = getRouter(addonInterface);
app.use(sdkRouter);

app.listen(PORT, () => {
    console.log(`\n🚀  Stremio Custom Row Factory is running!`);
    console.log(`   ➜  http://127.0.0.1:${PORT}/admin`);
    console.log(`   ➜  http://127.0.0.1:${PORT}/manifest.json\n`);
});


