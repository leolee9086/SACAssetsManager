const requestQueue = {};
const requestInterval = 500; // 500ms interval

async function processQueue(domain) {
    if (requestQueue[domain].length === 0) return;

    const request = requestQueue[domain].shift();
    await request();

    if (requestQueue[domain].length > 0) {
        setTimeout(() => processQueue(domain), requestInterval);
    }
}

async (req, res) => {
    const cacheKey = generateCacheKey(req.query.path);
    const cachedData = cache[cacheKey];
    const domain = new URL(req.query.path).hostname;

    if (await serveFromCache(cacheKey, res)) return;

    if (cachedData) {
        res.type('jpeg').send(cachedData);
        return;
    }

    if (!requestQueue[domain]) {
        requestQueue[domain] = [];
    }

    requestQueue[domain].push(async () => {
        const { BrowserWindow } = require('@electron/remote');
        const win = new BrowserWindow({
            width: 1280,
            height: 800,
            show: false,
            webPreferences: {
                offscreen: true
            }
        });

        win.webContents.on('did-finish-load', async () => {
            const image = await win.webContents.capturePage();
            const screenBuffer = await image.toJPEG(100);

            // Generate 512px thumbnail
            const thumbnailBuffer = await sharp(screenBuffer)
                .resize(512, 512, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toBuffer();

            // Store both thumbnails in cache
            cache[`${cacheKey}_screen`] = Buffer.from(screenBuffer);
            cache[`${cacheKey}`] = Buffer.from(thumbnailBuffer);

            // Save both thumbnails to cache
            saveToCache(`${cacheKey}_screen`, Buffer.from(screenBuffer));
            saveToCache(`${cacheKey}`, Buffer.from(thumbnailBuffer));

            // Send the 512px thumbnail as response
            res.type('jpeg').send(Buffer.from(thumbnailBuffer));

            setTimeout(() => win.close(), 500);
        });

        setTimeout(() => win.close(), 1000);
        await win.loadURL(req.query.path);
        //win.show();
    });


    if (requestQueue[domain].length === 1) {
        processQueue(domain);
    }
}