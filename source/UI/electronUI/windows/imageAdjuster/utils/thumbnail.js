import { requirePluginDeps } from "../../../../../utils/module/requireDeps.js";
const sharp = requirePluginDeps('sharp')

export const 生成缩略图 = async (sharpObject) => {
    const thumbnail = await sharpObject
        .clone()
        .resize(100, 100, { fit: 'contain' })
        .png()
        .toBuffer();
    return URL.createObjectURL(
        new Blob([thumbnail], { type: 'image/png' })
    );
};
