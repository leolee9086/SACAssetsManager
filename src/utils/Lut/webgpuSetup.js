export async function initializeWebGPU() {
    if (!navigator.gpu) {
        throw new Error('WebGPU 不支持');
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('无法获取 GPU 适配器');
    }
    
    const device = await adapter.requestDevice();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgpu');
    
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied',
    });

    return { device, context, canvas };
}
