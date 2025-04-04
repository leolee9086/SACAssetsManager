import { imageExtensions } from '../../server/processors/thumbnail/utils/lists.js'

export function isImagePath(path) {
    return imageExtensions.includes(path.split('.').pop())
}