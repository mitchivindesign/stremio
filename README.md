# Stremio Row Factory (Cloud Edition)

A cloud-native Stremio addon that lets you create and manage **Custom Home-Screen Rows** directly through a web-based Admin Panel. All data is persisted to your private GitHub Gist, making it permanent and accessible from anywhere.

---

## 🚀 Key Features

- **Web Admin Panel**: Manage your categories and items without touching code.
- **Stremio Integration**: Log in with your Stremio account to browse your library and add items to rows instantly.
- **Cloud Persistence**: Uses **GitHub Gists** to store your configuration, ensuring it's never lost during server restarts.
- **Vercel Optimized**: Built specifically for serverless deployment with optimized routing and bundling.

---

## 🛠 Setup & Deployment

### 1. Credentials
Ensure you have the following Environment Variables set (either in `env.env` for local or in your Vercel Dashboard):
- `GIST_ID`: The ID of your private GitHub Gist.
- `GH_TOKEN`: A GitHub Personal Access Token (classic) with the `gist` scope.

### 2. Local Run
```bash
npm install
node index.js
```
Visit `http://127.00.1:7000/admin` to start building your rows.

### 3. Vercel Deployment
Deploying to Vercel allows your addon to run 24/7 for free.
- **Root Directory**: Ensure it is set to `./`.
- **Build Command**: Set to `npm run vercel-build` (which is a fast skip-op).

---

## 📖 How to Use

### Managing Rows
1. Navigate to the **🎬 Rows** tab in the Admin Panel.
2. Create a row (e.g., "UFC Favorites" or "Daily News").
3. Choose the **Content Type** (Movies, Series, or TV).

### Adding Items
1. Navigate to the **🎞 Stremio Library** tab.
2. Click **Connect Account** and log in with your Stremio email/password.
3. Browse your library or external addons and click **+ Add** to assign items to your rows.

### Saving
Click the **💾 Save** button at the top right to push your changes to the cloud. Stremio will pick up the changes automatically (may require a restart or a few minutes to clear cache).

---

## 🔗 Endpoints

| URL | Description |
|-----|-------------|
| `/admin` | Web-based Management Panel |
| `/manifest.json` | Stremio Addon Manifest (Install URL) |

---

## ⚙️ Technical Details
- **Backend**: Node.js & Express
- **Frontend**: Vanilla JS SPA with responsive CSS
- **Persistence**: GitHub Gist JSON API
- **Deployment**: Vercel Serverless Functions
