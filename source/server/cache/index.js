const crypto = require('crypto');
const path =require('path')
const fs = require('fs')
// Function to generate a unique cache key based on file path
export function generateCacheKey(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

// Function to check cache and serve if available
export async function serveFromCache(cacheKey, res) {
    const cachePath = path.join(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'thumbnails', `${cacheKey}.jpeg`);
    if (fs.existsSync(cachePath)) {
        res.type('jpeg').sendFile(cachePath);
        return true;
    }
    return false;
}

// Function to save to cache
export function saveToCache(cacheKey, data) {
    const cacheDir = path.join(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'thumbnails');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = path.join(cacheDir, `${cacheKey}.jpeg`);
    fs.writeFileSync(cachePath, data);
}