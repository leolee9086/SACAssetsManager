import { getBase64Thumbnail, getLargeIcon } from './internalLoaders/systermThumbnail.js';
export async function handlerImageFile(imagePath, req, res) {
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
                    res.type('jpeg').send(buffer);
                })
                .catch(err => {
                    res.status(500).send('Error processing image: ' + err.message);
                });
        });
    }
}

