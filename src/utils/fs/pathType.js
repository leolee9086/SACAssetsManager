import { imageExtensions } from '../../../source/server/processors/thumbnail/utils/lists.js'

export function isImagePath(path) {
    return imageExtensions.includes(path.split('.').pop())
}