/**
 * admin.js
 * Mounts the admin panel and REST API onto an existing Express app.
 *
 * File CRUD routes:
 *   GET  /admin          → serve the admin SPA
 *   GET  /api/streams    → read streams.json
 *   PUT  /api/streams    → write streams.json
 *   GET  /api/config     → read ui-config.json
 *   PUT  /api/config     → write ui-config.json
 *
 * Stremio account proxy routes:
 *   POST /api/stremio/login    → authenticate with Stremio, store authKey
 *   GET  /api/stremio/library  → fetch library items from Stremio API
 *   POST /api/stremio/logout   → clear stored authKey
 *   GET  /api/stremio/status   → return current auth status (logged in / not)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const AUTH_FILE = path.join(ROOT, 'stremio-auth.json');
const storage = require('./storage');
const HTML_FILE = storage.HTML_FILE;

// Helper to clean up code
const AUTH = storage;

/** Make a POST request to the Stremio API and resolve with parsed JSON. */
function stremioPost(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = https.request({
            hostname: 'api.strem.io',
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': 'stremio-row-factory/1.0',
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid JSON from Stremio API')); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

/** 
 * Mount function 
 * @param {express.Application} app
 * @param {() => void} onReload callback to trigger a configuration reload in the main app
 */
function mountAdmin(app, onReload) {
    // ── Serve the SPA ────────────────────────────────────────────────────────
    app.get('/admin', (_req, res) => res.sendFile(HTML_FILE));



    // ── REST: ui-config ───────────────────────────────────────────────────────
    app.get('/api/config', async (_req, res) => {
        try {
            const config = await storage.loadConfig();
            res.json(config);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    app.put('/api/config', async (req, res) => {
        try {
            const cfg = req.body;
            if (!cfg || !cfg.addon || !Array.isArray(cfg.rows))
                return res.status(400).json({ error: 'Invalid config shape' });

            await storage.saveConfig(cfg);

            if (onReload) await onReload();
            res.json({ ok: true, rows: cfg.rows.length });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });


    // ── REST: Stremio auth status ─────────────────────────────────────────────
    app.get('/api/stremio/status', async (_req, res) => {
        const auth = await AUTH.loadAuth();
        res.json({ loggedIn: !!auth, email: auth?.email || null });
    });

    // ── REST: Stremio login ───────────────────────────────────────────────────
    app.post('/api/stremio/login', async (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        try {
            const result = await stremioPost('/api/login', { type: 'Auth', email, password });
            if (!result.result?.authKey)
                return res.status(401).json({ error: result.error?.message || 'Stremio login failed' });

            try {
                await AUTH.saveAuth({ authKey: result.result.authKey, email });
            } catch (gistErr) {
                return res.status(500).json({ error: `Cloud Save Failed: ${gistErr.message}` });
            }

            res.json({ ok: true, email });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── REST: Stremio logout ──────────────────────────────────────────────────
    app.post('/api/stremio/logout', async (_req, res) => {
        await AUTH.clearAuth();
        res.json({ ok: true });
    });

    // ── REST: Stremio library ─────────────────────────────────────────────────
    app.get('/api/stremio/library', async (req, res) => {
        const auth = await AUTH.loadAuth();
        if (!auth) return res.status(401).json({ error: 'Not logged in' });

        const skip = parseInt(req.query.skip || '0', 10);
        const limit = parseInt(req.query.limit || '100', 10);
        const type = req.query.type || null; // "movie", "series", or null for all

        try {
            const body = {
                authKey: auth.authKey,
                collection: 'library',
                sortField: 'mtime',
                sortDirection: -1,
                skip,
                limit,
            };
            if (type) body.type = type;

            const result = await stremioPost('/api/libraryList', body);
            console.log('Stremio Library API Response:', JSON.stringify(result).substring(0, 300) + '...');
            if (result.error) return res.status(400).json({ error: result.error.message });


            // Normalise to a friendly shape for the admin UI
            const items = (result.result?.items || [])
                .filter(i => !i.removed && i.id)
                .map(i => ({
                    id: i.id,                              // IMDB ID, e.g. "tt1234567"
                    type: i.type,                            // "movie" or "series"
                    title: i.name,
                    thumbnail: i.poster || '',
                    description: i.description || '',
                    year: i.year || null,
                    imdbRating: i.imdbRating || null,
                }));

            res.json({ items, total: result.result?.count || items.length });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // ── REST: Stremio addon collection ───────────────────────────────────────
    app.get('/api/stremio/addons', async (req, res) => {
        const auth = await AUTH.loadAuth();
        if (!auth) return res.status(401).json({ error: 'Not logged in' });
        try {
            const result = await stremioPost('/api/addonCollectionGet', { authKey: auth.authKey });
            if (result.error) return res.status(400).json({ error: result.error.message });

            const addons = (result.result?.addons || []).map(a => ({
                transportUrl: a.transportUrl,
                manifest: a.manifest
            }));
            res.json({ addons });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });


    // ── REST: External Catalog Proxy ─────────────────────────────────────────
    app.get('/api/stremio/proxy-catalog', async (req, res) => {
        const urlStr = req.query.url;
        if (!urlStr) return res.status(400).json({ error: 'url parameter required' });

        try {
            const protocol = urlStr.startsWith('https') ? https : http;
            const response = await new Promise((resolve, reject) => {
                protocol.get(urlStr, { headers: { 'User-Agent': 'stremio-row-factory/1.0' } }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try { resolve(JSON.parse(data)); }
                        catch (e) { reject(new Error('Invalid JSON from addon')); }
                    });
                }).on('error', (err) => {
                    reject(new Error(`Fetch error (${err.message}) for URL: ${urlStr}`));
                });
            });
            res.json(response);
        } catch (e) {
            console.error('Proxy Error:', e.message);
            res.status(500).json({ error: e.message });
        }
    });
}

module.exports = { mountAdmin };
