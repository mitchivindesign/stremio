/**
 * manifest.js
 * Dynamically builds the Stremio addon manifest from the loaded config.
 *
 * Row content types:
 *  - "channel" rows: custom stream URLs provided by this addon
 *  - "movie" / "series" rows: Stremio library items — our addon supplies the
 *    catalog row; streams are served by the user's other addons (e.g. Torrentio)
 *
 * Each row entry in ui-config.json becomes one catalog → one home-screen row.
 */

// The set of content types among items across all rows
const CONTENT_TYPES = ['movie', 'series', 'tv'];

function buildManifest(addonMeta, rows) {
    // Each row becomes one catalog entry.
    const catalogs = rows.map(row => {
        const type = row.contentType || 'movie';

        // Default to square as requested


        return {
            id: row.id,
            type,
            name: row.name,
            posterShape: 'square',
            extra: [{ name: 'skip', isRequired: false }],
        };
    });



    // We always declare 'catalog' and 'stream' and all content types
    // so the SDK doesn't crash if they are missing at boot.
    // The dynamic /manifest.json will still filter what Stremio *sees*.
    return {
        id: addonMeta.id,
        version: addonMeta.version || '1.0.0',
        name: addonMeta.name,
        description: addonMeta.description || '',
        logo: addonMeta.logo || undefined,

        resources: ['catalog'],
        types: CONTENT_TYPES,
        catalogs,

        behaviorHints: { adult: false, p2p: false },
    };
}


module.exports = { buildManifest };

