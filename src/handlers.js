/**
 * handlers.js
 * Defines the catalog handler and (channel-only) stream handler.
 *
 * Content type behaviour:
 *  - "channel" items: this addon provides the stream URL directly
 *  - "movie" / "series" items: this addon provides the catalog row; the user's
 *    installed streaming addons (e.g. Torrentio) supply the actual streams via
 *    the item's IMDB ID. We deliberately do NOT register a stream handler for
 *    these types so Stremio falls through naturally.
 */

'use strict';

/**
 * Build a Stremio MetaPreview for a movie/series/tv-type item (library or external addon item).
 * The id must match what external addons expect (IMDB ID or addon-specific ID).
 */
function libraryMeta(item) {
    const type = item.type || 'movie';
    return {
        id: item.id,
        type: type,
        name: item.title,
        description: item.description || '',
        poster: item.thumbnail || '',
        posterShape: 'square',
        background: item.thumbnail || '',

        imdbRating: item.imdbRating || undefined,
    };
}

/**
 * Register both handlers on the given addonBuilder instance.
 * @param {addonBuilder} builder 
 * @param {() => { rows: any[] }} configProvider function that returns the latest configuration
 */
function registerHandlers(builder, configProvider) {
    // ── Catalog handler ────────────────────────────────────────────────────────
    builder.defineCatalogHandler(function (args) {
        const { type, id } = args;
        const { rows } = configProvider();

        const row = rows.find(r => r.id === id && (r.contentType || 'movie') === type);
        if (!row || !Array.isArray(row.items)) return Promise.resolve({ metas: [] });

        const metas = row.items
            .filter(s => s && (s.type || 'movie') === type)
            .map(s => libraryMeta(s));

        console.log(`[catalog] "${row.name}" (${type}/${row.id}) → ${metas.length} item(s)`);
        return Promise.resolve({ metas });
    });
}

module.exports = { registerHandlers };
