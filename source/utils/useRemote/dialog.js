const remote = require('@electron/remote')
const {dialog}= remote
if(!require){
    throw('此模块依赖remote')
}

/**
 * 选择文件夹
 * @param {Object} options - 对话框选项
 * @param {string} [options.title='选择文件夹'] - 对话框标题
 * @param {string} [options.buttonLabel='选择'] - 确认按钮文字
 * @param {string} [options.defaultPath] - 默认路径
 * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
 */
export const 选择文件夹 = async (options = {}) => {
    const result = await dialog.showOpenDialog({
        title: options.title || '选择文件夹',
        buttonLabel: options.buttonLabel || '选择',
        defaultPath: options.defaultPath,
        properties: ['openDirectory']
    });
    return result;
};

/**
 * 选择文件
 * @param {Object} options - 对话框选项
 * @param {string} [options.title='选择文件'] - 对话框标题
 * @param {string} [options.buttonLabel='选择'] - 确认按钮文字
 * @param {string} [options.defaultPath] - 默认路径
 * @param {Object[]} [options.filters] - 文件类型过滤器
 * @param {boolean} [options.multiSelections=false] - 是否允许多选
 * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
 */
export const 选择文件 = async (options = {}) => {
    const properties = ['openFile'];
    if (options.multiSelections) {
        properties.push('multiSelections');
    }

    const result = await dialog.showOpenDialog({
        title: options.title || '选择文件',
        buttonLabel: options.buttonLabel || '选择',
        defaultPath: options.defaultPath,
        filters: options.filters || [],
        properties
    });
    return result;
};

/**
 * 保存文件
 * @param {Object} options - 对话框选项
 * @param {string} [options.title='保存文件'] - 对话框标题
 * @param {string} [options.buttonLabel='保存'] - 确认按钮文字
 * @param {string} [options.defaultPath] - 默认路径
 * @param {Object[]} [options.filters] - 文件类型过滤器
 * @returns {Promise<{canceled: boolean, filePath: string}>}
 */
export const 保存文件 = async (options = {}) => {
    const result = await dialog.showSaveDialog({
        title: options.title || '保存文件',
        buttonLabel: options.buttonLabel || '保存',
        defaultPath: options.defaultPath,
        filters: options.filters || []
    });
    return result;
};

/**
 * 选择图片文件
 * @param {Object} options - 对话框选项
 * @param {boolean} [options.multiSelections=false] - 是否允许多选
 * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
 */
export const 选择图片文件 = async (options = {}) => {
    return 选择文件({
        title: '选择图片',
        buttonLabel: '选择',
        filters: [
            { name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ],
        multiSelections: options.multiSelections
    });
};

/**
 * 选择音频文件
 * @param {Object} options - 对话框选项
 * @param {boolean} [options.multiSelections=false] - 是否允许多选
 * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
 */
export const 选择音频文件 = async (options = {}) => {
    return 选择文件({
        title: '选择音频',
        buttonLabel: '选择',
        filters: [
            { name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }
        ],
        multiSelections: options.multiSelections
    });
};

/**
 * 选择视频文件
 * @param {Object} options - 对话框选项
 * @param {boolean} [options.multiSelections=false] - 是否允许多选
 * @returns {Promise<{canceled: boolean, filePaths: string[]}>}
 */
export const 选择视频文件 = async (options = {}) => {
    return 选择文件({
        title: '选择视频',
        buttonLabel: '选择',
        filters: [
            { name: '视频文件', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'] }
        ],
        multiSelections: options.multiSelections
    });
};



