/**
 * cross-build.js
 * A simple wrapper to ensure 'npm run build' works on Windows
 * but stays silent on Vercel to prevent deployment errors.
 */

const { spawn } = require('child_process');
const path = require('path');

if (process.env.VERCEL === '1') {
    console.log('☁️  Vercel environment detected. Skipping local build script...');
    process.exit(0);
}

console.log('💻  Local environment detected. Running build script...');

const buildScript = path.join(__dirname, 'build.js');
const child = spawn('node', [buildScript], { stdio: 'inherit' });

child.on('close', (code) => {
    process.exit(code);
});
