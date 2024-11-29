import { loadImageFromUrl as loadImage } from "../../image/loader/fromURL.js"
const imageCache = new Map()

export function preloadImage(src) {
    if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src))
    }
    return loadImage(src).then(img => {
        imageCache.set(src, img)
        return img
    })
}

export function isImageCached(src) {
    return imageCache.has(src)
}

export function clearImageCache(src) {
    if (src) {
        imageCache.delete(src)
    } else {
        imageCache.clear()
    }
}