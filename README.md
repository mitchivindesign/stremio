# Stremio Custom Row Factory

A local Stremio addon that turns two simple JSON files into **N custom home-screen rows**, each populated by your own stream links.

---

## Quick Start

```bash
npm install
node index.js
```

Then open Stremio → **Settings → Addons → Install from URL** and paste:

```
http://127.0.0.1:7000/manifest.json
```

---

## Your Two Config Files

### 1. `streams.json` – Your stream library

Add one object per stream. Required fields: `id`, `title`, `url`, `tags`.

```json
[
  {
    "id": "my-stream-001",
    "title": "My Stream Title",
    "description": "Optional description",
    "thumbnail": "https://example.com/thumb.jpg",
    "url": "https://example.com/video.m3u8",
    "tags": ["sports", "ufc"]
  }
]
```

| Field         | Required | Description                                          |
|---------------|----------|------------------------------------------------------|
| `id`          | ✅        | Unique identifier (no spaces)                        |
| `title`       | ✅        | Display name in Stremio                              |
| `url`         | ✅        | Direct stream URL (mp4, m3u8, etc.)                  |
| `tags`        | ✅        | Array of strings used to assign this stream to rows  |
| `description` | ❌        | Optional subtitle shown in Stremio                   |
| `thumbnail`   | ❌        | Optional poster/thumbnail image URL                  |

---

### 2. `ui-config.json` – Your row definitions

```json
{
  "addon": {
    "id": "com.myrows.custom",
    "version": "1.0.0",
    "name": "My Custom Rows",
    "description": "My personal curated rows."
  },
  "rows": [
    { "name": "UFC Replays",  "tags": ["ufc"] },
    { "name": "Local News",   "tags": ["news", "local-news"] },
    { "name": "Movie Night",  "tags": ["movie-night"] }
  ]
}
```

**Tag matching**: A stream appears in a row if it has **any** of the row's tags.

---

## Adding More Rows

1. Add a new object to `rows` in `ui-config.json`
2. Make sure your streams in `streams.json` have matching tags
3. Restart the server (`node index.js`)

---

## Configuration

| Variable | Default | Description        |
|----------|---------|--------------------|
| `PORT`   | `7000`  | HTTP server port   |

```bash
PORT=8080 node index.js
```

---

## Endpoints

| URL                                        | Description                        |
|--------------------------------------------|------------------------------------|
| `/manifest.json`                           | Stremio addon manifest             |
| `/catalog/channel/<row-id>.json`           | Items for a specific row           |
| `/stream/channel/<stream-id>.json`         | Stream URL for a specific item     |
