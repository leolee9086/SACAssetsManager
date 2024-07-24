const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const app = express();
const path = require('path')
const { PDFDocument } = require('pdf-lib');
const pdf2pic = require('pdf2pic')
const compression = require('compression');
const cors = require('cors'); // 引入 cors 中间件
import { generateCacheKey, serveFromCache, saveToCache } from './cache/index.js'
import { handlerImageFile } from './handlers/thumbnail.js';
import "./licenseChecker.js"
import { globStream } from './handlers/stream-glob.js';
const cache = {}
/**
 * 启用跨域支持
 */
app.use(cors());
/**
 * 启用响应压缩
 */
app.use(compression({
    level: 6, // 设置压缩级别，范围是 0-9，默认值是 6
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            // 如果请求头包含 'x-no-compression'，则不进行压缩
            return false;
        }
        // 其他情况下进行压缩
        return compression.filter(req, res);
    }
}));
/**
 * 流式遍历文件夹
 */
app.get('/glob-stream', globStream)



app.get('/thumbnail', async (req, res) => {
    let imagePath = ''
    if (req.query.localPath) {
        imagePath = req.query.localPath
    } else {
        imagePath = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    }
    imagePath = imagePath.replace(/\//g,'\\')
    const cacheKey = generateCacheKey(imagePath);
    const cachedData = cache[cacheKey];
    if (cachedData) {
        res.type('jpeg').send(cachedData);
        return;
    }
    if (imagePath.endsWith('.sy')) {
        res.sendFile("C:/Users/al765/AppData/Local/Programs/SiYuan/resources/stage/icon.png")
        return
    }
    handlerImageFile(imagePath, req, res);
});
app.get(
    '/raw', async (req, res) => {
        const path = req.query.path
        if (path.startsWith('assets')) {
            res.sendFile(require('path').join(siyuanConfig.system.workspaceDir, 'data', req.query.path))
        }
    }
)
const requestQueue = {};
const requestInterval = 500; // 500ms interval
app.get('/webPageThumbnail', async (req, res) => {
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
});

async function processQueue(domain) {
    if (requestQueue[domain].length === 0) return;

    const request = requestQueue[domain].shift();
    await request();

    if (requestQueue[domain].length > 0) {
        setTimeout(() => processQueue(domain), requestInterval);
    }
}
async function handlePdfFile(imagePath, req, res) {
    const cacheKey = generateCacheKey(imagePath);
    if (await serveFromCache(cacheKey, res)) return;
    try {
        const pdfBuffer = fs.readFileSync(imagePath.replace(/\\/g, '/'));
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const [firstPage] = await pdfDoc.getPages();
        const { width, height } = await firstPage.getSize()
        const options = {
            density: 330,
            width,
            height,
            savePath: 'D:/temp/sac'
        }
        const data = await pdf2pic.fromBuffer(pdfBuffer, options).bulk([1, 2, 3, 4, 5, 6, 7, 8], { responseType: 'buffer' })
        sharp(data[0].buffer)
            .resize(512, 512, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()
            .then(buffer => {
                cache[cacheKey] = images[0]
                res.type('jpeg').send(buffer);
            })
            .catch(err => {
                throw (err)
            });
    } catch (err) {
        console.error(err, err.stack)
        throw (err)
    }
}
// Updated handleImageFile function with cache check and save
/*async function handleImageFile(imagePath, req, res) {
    const cacheKey = generateCacheKey(imagePath);
    //if (await serveFromCache(cacheKey, res)) return;
    if (!imagePath.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        // Handle non-image files
        const encodedPath = Buffer.from(imagePath).toString('base64');
        let fn = (callback, force) => {
            return (error, result) => {
                try {
                    if (error) {
                        force && res.status(500).send('Error extracting icon: ' + error.message);
                        callback && callback()
                        return;
                    }
                    try {
                        const iconBuffer = Buffer.from(result, 'base64');
                        saveToCache(cacheKey, iconBuffer);
                        cache[cacheKey] = iconBuffer

                        res.type('png').send(iconBuffer);
                    } catch (error) {

                        force && res.status(500).send('Error extracting icon: ' + error.message);
                        callback && callback()
                        return
                    }
                } catch (e) {

                    console.warn(e)
                    return
                }
            }
        }
        getBase64Thumbnail(encodedPath, fn(() => getLargeIcon(encodedPath, fn('', true))));
    } else {
        // Existing image handling code
        fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.status(404).send(`File not found ${req.query.path}`);
                return;
            }
            sharp(data)
                .resize(512, 512, {
                    fit: 'inside',
                    withoutEnlargement: true // 防止放大图像
                })
                .toBuffer()
                .then(buffer => {
                    cache[cacheKey] = buffer

                    saveToCache(cacheKey, buffer);
                    res.type('jpeg').send(buffer);
                })
                .catch(err => {
                    res.status(500).send('Error processing image: ' + err.message);
                });
        });
    }
}*/

app.listen(80, () => {
    console.log(`Server running at http://localhost:${80}`);
});