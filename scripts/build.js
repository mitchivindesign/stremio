const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const rootDir = path.join(__dirname, '..');

// Files and directories to include in the build
const include = [
    'src',
    'api',
    'index.js',
    'package.json',
    'ui-config.json',
    'vercel.json',
    'README.md'
];

function cleanDist() {
    if (fs.existsSync(distDir)) {
        console.log('🧹 Cleaning dist folder...');
        fs.rmSync(distDir, { recursive: true, force: true });
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        ensureDir(dest);
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function build() {
    console.log('🚀 Starting build...');
    cleanDist();
    ensureDir(distDir);

    include.forEach(item => {
        const srcPath = path.join(rootDir, item);
        const destPath = path.join(distDir, item);

        if (fs.existsSync(srcPath)) {
            console.log(`📦 Copying ${item}...`);
            copyRecursiveSync(srcPath, destPath);
        } else {
            console.warn(`⚠️ Warning: ${item} not found, skipping.`);
        }
    });

    console.log('\n✅ Build complete! Production files are in the "dist" folder.');
    console.log('Note: You will still need to run "npm install" in the dist folder if you deploy it manually.');
}

build();
