const express = require('express');
const fs = require('fs-extra');
const sharp = require('sharp');
const app = express();
const path = require('path')
const { PDFDocument } = require('pdf-lib');
const pdf2pic = require('pdf2pic')
import { generateCacheKey, serveFromCache, saveToCache } from './cache/index.js'
import { getBase64Thumbnail } from './internalLoaders/systermThumbnail.js';
// Define the C# code to get the Base64 thumbnail
const cache = {}

app.get('/thumbnail', async (req, res) => {
    const imagePath = path.join(siyuanConfig.system.workspaceDir, 'data', req.query.path);
    const cacheKey = generateCacheKey(imagePath);

    const cachedData = cache[cacheKey];
    if (cachedData) {
        res.type('jpeg').send(cachedData);
        return;
    }

    if (imagePath.endsWith('.pdf')) {
        try {
            handlePdfFile(imagePath, req, res);

        } catch (e) {
            console.warn(e)
            handleImageFile(imagePath, req, res);
        }
    }
    handleImageFile(imagePath, req, res);
});
app.get(
    '/raw',async(req,res)=>{
        const path=req.query.path
        if(path.startsWith('assets')){
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
            const buffer = await image.toJPEG(100);
            cache[cacheKey] = Buffer.from(buffer);
            saveToCache(cacheKey, Buffer.from(buffer));
            res.type('jpeg').send(Buffer.from(buffer));
            setTimeout(() => win.close(), 500);
        });

        setTimeout(() => win.close(), 1000);
        await win.loadURL(req.query.path);
        win.show();
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
        console.log(pdfBuffer)
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        console.log(pdfDoc)

        const [firstPage] = await pdfDoc.getPages();
        const { width, height } = await firstPage.getSize()
        const options = {
            density: 330,
            width,
            height,
            savePath: 'D:/temp/sac'
        }
        const data = await pdf2pic.fromBuffer(pdfBuffer, options).bulk([1, 2, 3, 4, 5, 6, 7, 8], { responseType: 'buffer' })
        console.log(data)
        sharp(data[0].buffer)
            .resize(512, 512, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()
            .then(buffer => {
                console.log(images)
                cache[cacheKey] = images[0]

                res.type('jpeg').send(buffer);
            })
            .catch(err => {

                throw (err)

                //   res.status(500).send('Error processing image: ' + err.message);
            });
    } catch (err) {
        console.error(err, err.stack)
        throw (err)
        //res.status(500).send('Error processing PDF: ' + err.message);
    }

    /* try {
         const pdfBuffer = fs.readFileSync(imagePath);
          const pdfDoc = await PDFDocument.load(pdfBuffer);
         // const [firstPage] = await pdfDoc.copyPages(pdfDoc, [0]);
         // const firstPagePdf = await PDFDocument.create();
          //pdfDocfirstPagePdf.addPage(firstPage,{width: 512,height: 512});
          const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: true });
  
         let images = await pdf2image.convertPDF(pdfBytes, {
             format: 'jpeg',
             width: 512,
             height: 512
         })
             console.log(images)
             cache[cacheKey]=images[0]
         res.type('jpeg').send(images[0]);
 
     } catch (err) {
         console.warn(err)
         throw (err)
     }*/
}

// Updated handleImageFile function with cache check and save
async function handleImageFile(imagePath, req, res) {
    const cacheKey = generateCacheKey(imagePath);
   // if (await serveFromCache(cacheKey, res)) return;

    if (!imagePath.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        // Handle non-image files
        const encodedPath = Buffer.from(imagePath).toString('base64');

        getBase64Thumbnail(encodedPath, (error, result) => {
            if (error) {
                res.status(500).send('Error extracting icon: ' + error.message);
                return;
            }
            try {
                console.log(result)
                const iconBuffer = Buffer.from(result, 'base64');
                saveToCache(cacheKey, iconBuffer);
                cache[cacheKey] = iconBuffer

                res.type('jpeg').send(iconBuffer);
            } catch (error) {
                res.status(500).send('Error extracting icon: ' + error.message);

            }
        });
    } else {
        // Existing image handling code
        fs.readFile(imagePath, (err, data) => {
            console.log(data)
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
}

app.listen(80, () => {
    console.log(`Server running at http://localhost:${80}`);
});