/**
 * 获取 WebGPU 设备
 * @param {Object} options - 配置选项
 * @param {boolean} [options.useCache=true] - 是否使用缓存的设备实例
 * @param {string} [options.powerPreference='high-performance'] - 电源偏好设置 ('high-performance' 或 'low-power')
 * @param {boolean} [options.throwError=true] - 当 WebGPU 不支持时是否抛出错误
 * @returns {Promise<GPUDevice|null>} WebGPU 设备实例或 null
 */
export const getDevice = async (options = {
    useCache: true,
    powerPreference: 'high-performance',
    throwError: true
}) => {
    if (navigator.gpu) {
        const { useCache, powerPreference } = options;
        
        if (useCache && webGpuDevice) {
            return webGpuDevice;
        }
        
        const adapter = await navigator.gpu.requestAdapter({ powerPreference });
        if (adapter) {
            const device = await adapter.requestDevice();
            return device;
        }
    }
    if (options.throwError) {
        throw new Error("WebGPU not supported");
    }
    return null;
}

/**
 * 缓存的 WebGPU 设备实例
 * @type {GPUDevice|null}
 */
export const webGpuDevice = getDevice();
