/**
 * loader.js
 * Reads and validates streams.json and ui-config.json.
 * Produces a slug ID for each row and exports the combined config.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/**
 * Convert a human-readable name to a URL/ID-safe slug.
 * e.g. "UFC Replays" -> "ufc-replays"
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Load and validate the two config files.
 * Throws a descriptive error if anything is missing or malformed.
 */
function loadConfig() {
  // ── ui-config.json ────────────────────────────────────────────────────────
  const uiConfigPath = path.join(ROOT, 'ui-config.json');
  if (!fs.existsSync(uiConfigPath)) {
    throw new Error(`Missing file: ${uiConfigPath}\nCreate a ui-config.json file with your addon metadata and row definitions.`);
  }

  let uiConfig;
  try {
    uiConfig = JSON.parse(fs.readFileSync(uiConfigPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse ui-config.json: ${e.message}`);
  }

  if (!uiConfig.addon || !uiConfig.addon.id || !uiConfig.addon.name) {
    throw new Error('ui-config.json must have an "addon" object with at least "id" and "name" fields.');
  }

  if (!Array.isArray(uiConfig.rows)) {
    throw new Error('ui-config.json must have a "rows" array.');
  }

  uiConfig.rows.forEach((row, i) => {
    if (!row.id) row.id = slugify(row.name);
    if (!row.name) throw new Error(`ui-config.json rows[${i}] is missing required field "name"`);
    if (!Array.isArray(row.items)) {
      throw new Error(`ui-config.json rows[${i}] ("${row.name}") must have an "items" array`);
    }
  });

  const rows = uiConfig.rows;


  // Detect duplicate slugs (two rows with the same effective ID)
  const seenIds = new Set();
  rows.forEach(row => {
    if (seenIds.has(row.id)) {
      throw new Error(
        `Two rows produce the same slug ID "${row.id}". Please give them distinct names.`
      );
    }
    seenIds.add(row.id);
  });

  return {
    rows,
    addonMeta: uiConfig.addon,
  };
}

module.exports = { loadConfig, slugify };
