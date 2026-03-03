/**
 * storage.js
 * Handles reading and writing configuration.
 * Supports Local File (development) and GitHub Gist (production/cloud).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const LOCAL_CONFIG = path.join(ROOT, 'ui-config.json');

// ENV VARS for Cloud Persistence
const GIST_ID = process.env.GIST_ID;
const GH_TOKEN = process.env.GH_TOKEN; // Personal Access Token (classic) with 'gist' scope

/**
 * Common shape for our config
 */
function normalizeConfig(data) {
    if (!data.addon) data.addon = { id: 'custom-rows', name: 'My Rows', version: '1.0.0' };
    if (!Array.isArray(data.rows)) data.rows = [];
    return data;
}

/**
 * Load config from Gist or Local file
 */
async function loadConfig() {
    if (GIST_ID && GH_TOKEN) {
        console.log(`☁️ Loading config from Gist: ${GIST_ID}`);
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: `/gists/${GIST_ID}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'stremio-row-factory',
                    'Authorization': `token ${GH_TOKEN}`
                }
            };
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => {
                    try {
                        const gist = JSON.parse(body);
                        const content = gist.files['ui-config.json'].content;
                        resolve(normalizeConfig(JSON.parse(content)));
                    } catch (e) {
                        reject(new Error(`Failed to parse Gist content: ${e.message}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    // Fallback to local
    if (!fs.existsSync(LOCAL_CONFIG)) {
        return normalizeConfig({});
    }
    return normalizeConfig(JSON.parse(fs.readFileSync(LOCAL_CONFIG, 'utf8')));
}

/**
 * Save config to Gist or Local file
 */
async function saveConfig(config) {
    const data = normalizeConfig(config);
    const json = JSON.stringify(data, null, 2);

    if (GIST_ID && GH_TOKEN) {
        console.log(`☁️ Saving config to Gist: ${GIST_ID}`);
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
                files: {
                    'ui-config.json': { content: json }
                }
            });
            const options = {
                hostname: 'api.github.com',
                path: `/gists/${GIST_ID}`,
                method: 'PATCH',
                headers: {
                    'User-Agent': 'stremio-row-factory',
                    'Authorization': `token ${GH_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };
            const req = https.request(options, (res) => {
                if (res.statusCode === 200) resolve({ ok: true });
                else reject(new Error(`Gist save failed: ${res.statusCode}`));
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });
    }

    // Fallback to local
    fs.writeFileSync(LOCAL_CONFIG, json, 'utf8');
    return { ok: true };
}

module.exports = { loadConfig, saveConfig };
