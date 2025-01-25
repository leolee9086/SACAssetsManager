const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('No GPU adapter found');
const device = await adapter.requestDevice();
export {device as webGpuDevice}