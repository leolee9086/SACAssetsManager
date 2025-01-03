import { GPUContext } from './pipeline/GPUContext.js';
import { DistancePass } from './pipeline/DistancePass.js';

export class AdvancedTileSeamBaker {
    constructor() {
        this.gpuContext = new GPUContext();
        this.distancePass = null;
        this.lastMap = null;
        this.displayCanvas = null;
    }

    async init(displayCanvas) {
        if (!displayCanvas) {
            throw new Error('Display canvas is required');
        }

        this.displayCanvas = displayCanvas;
        
        console.log('初始化 GPU 上下文...');
        await this.gpuContext.init();
        
        console.log('初始化 Distance Pass...');
        this.distancePass = new DistancePass(this.gpuContext);
        await this.distancePass.init();
        
        console.log('创建默认距离纹理...');
        const defaultTexture = await this.createDefaultDistanceTexture(
            displayCanvas.width,
            displayCanvas.height
        );

        return defaultTexture;
    }

    async bake(params) {
        const commandEncoder = this.gpuContext.device.createCommandEncoder({
            label: 'Distance Field Baker'
        });
        
        const width = this.displayCanvas.width;
        const height = this.displayCanvas.height;

        const distanceTextureInput = this.uploadedDistanceTexture || 
            this.gpuContext.createTexture(width, height);
        const distanceTextureOutput = this.gpuContext.createTexture(width, height, {
            format: 'rgba8unorm',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | 
                   GPUTextureUsage.COPY_SRC | 
                   GPUTextureUsage.TEXTURE_BINDING
        });

        this.distancePass.execute(commandEncoder, distanceTextureInput, distanceTextureOutput, params);

        // 创建用于读取的缓冲区
        const readbackBuffer = this.gpuContext.device.createBuffer({
            size: width * height * 4,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });

        // 复制纹理到缓冲区
        commandEncoder.copyTextureToBuffer(
            { texture: distanceTextureOutput },
            { buffer: readbackBuffer, bytesPerRow: width * 4, rowsPerImage: height },
            [width, height]
        );

        // 提交命令
        this.gpuContext.device.queue.submit([commandEncoder.finish()]);
        await this.gpuContext.device.queue.onSubmittedWorkDone();

        // 映射缓冲区并读取数据
        await readbackBuffer.mapAsync(GPUMapMode.READ);
        const data = new Uint8Array(readbackBuffer.getMappedRange());

        // 将数据绘制到画布
        const ctx = this.displayCanvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(data);
        ctx.putImageData(imageData, 0, 0);

        // 清理
        readbackBuffer.unmap();

        this.lastMap = distanceTextureOutput;
        return { distance: distanceTextureOutput };
    }

    async createDefaultDistanceTexture(width, height) {
        // 创建临时画布绘制默认图案
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // 绘制简单的砖缝图案
        ctx.fillStyle = '#ffffff';
        const tileSize = 64;
        const seamWidth = 4;
        
        // 绘制水平线
        for (let y = tileSize; y < height; y += tileSize) {
            ctx.fillRect(0, y - seamWidth/2, width, seamWidth);
        }
        
        // 绘制垂直线
        for (let x = tileSize; x < width; x += tileSize) {
            ctx.fillRect(x - seamWidth/2, 0, seamWidth, height);
        }

        // 创建纹理
        const texture = this.gpuContext.createTexture(width, height, {
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | 
                   GPUTextureUsage.COPY_DST | 
                   GPUTextureUsage.RENDER_ATTACHMENT
        });

        // 将画布内容复制到纹理
        this.gpuContext.device.queue.copyExternalImageToTexture(
            { source: canvas },
            { texture: texture },
            [width, height]
        );

        // 保存为初始输入纹理
        this.uploadedDistanceTexture = texture;

        return texture;
    }

    async updateUploadedDistanceTexture(canvas) {
        if (!canvas) return;

        this.uploadedDistanceTexture = this.gpuContext.createTexture(
            canvas.width,
            canvas.height,
            {
                format: 'rgba8unorm',
                usage: GPUTextureUsage.TEXTURE_BINDING | 
                       GPUTextureUsage.COPY_DST | 
                       GPUTextureUsage.RENDER_ATTACHMENT
            }
        );

        this.gpuContext.device.queue.copyExternalImageToTexture(
            { source: canvas },
            { texture: this.uploadedDistanceTexture },
            [canvas.width, canvas.height]
        );
    }

    getLastMaps() {
        return this.lastMap;
    }
} 