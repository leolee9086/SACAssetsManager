import {GPU} from '../../../../static/gpu.js';

/**
 * GPU.js实现的直方图计算
 * @param {Uint8Array|Uint8ClampedArray} buffer - 图像buffer数据
 * @returns {Object} 直方图数据
 */
export const getHistogramGPUjs =async (buffer) => {
    const gpu = new GPU();
    const CHUNK_SIZE = 16384; // 每个块处理的像素数
    const PIXELS_PER_CHUNK = CHUNK_SIZE * 4; // 每个块的实际字节数
    const chunks = Math.ceil(buffer.length / PIXELS_PER_CHUNK);
    
    // 创建处理单个数据块的kernel
    const processChunk =async(chunkData, chunkSize, totalSize)=>gpu.createKernel(function(chunkData, chunkSize, totalSize) {
        const localIdx = this.thread.x;
        const channelIdx = this.thread.y;
        
        if (localIdx >= chunkSize) return 0;
        
        // 确保不会访问超出范围的数据
        if (localIdx * 4 >= totalSize) return 0;
        
        const i = localIdx * 4;
        let value = 0;
        
        if (channelIdx < 3) {
            value = chunkData[i + channelIdx];
        } else {
            const r = chunkData[i];
            const g = chunkData[i + 1];
            const b = chunkData[i + 2];
            value = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        return value;
    })
    .setOutput([CHUNK_SIZE, 4])
    .setGraphical(false)(chunkData, chunkSize, totalSize)
    
    // 初始化直方图数组
    const histogram = {
        r: new Uint32Array(256).fill(0),
        g: new Uint32Array(256).fill(0),
        b: new Uint32Array(256).fill(0),
        brightness: new Uint32Array(256).fill(0)
    };
    
    // 分块处理数据
    for (let i = 0; i < chunks; i++) {
        const start = i * PIXELS_PER_CHUNK;
        const end = Math.min(start + PIXELS_PER_CHUNK, buffer.length);
        // 创建固定大小的数组并填充实际数据
        const chunkData = new Uint8Array(PIXELS_PER_CHUNK);
        chunkData.set(buffer.slice(start, end));
        const chunkPixels = Math.floor((end - start) / 4);
        
        const result =await processChunk(chunkData, chunkPixels, end - start);
        
        // 在CPU端累加结果
        for (let x = 0; x < chunkPixels; x++) {
            const r = result[0][x];
            const g = result[1][x];
            const b = result[2][x];
            const brightness = result[3][x];
            
            if (r >= 0 && r < 256) histogram.r[r]++;
            if (g >= 0 && g < 256) histogram.g[g]++;
            if (b >= 0 && b < 256) histogram.b[b]++;
            if (brightness >= 0 && brightness < 256) histogram.brightness[brightness]++;
        }
    }
    
    return {
        r: Array.from(histogram.r),
        g: Array.from(histogram.g),
        b: Array.from(histogram.b),
        brightness: Array.from(histogram.brightness)
    };
};