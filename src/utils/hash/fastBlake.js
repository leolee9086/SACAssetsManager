import { requirePluginDeps } from '../module/requireDeps.js';

const { open } = require('fs/promises');
const fs = require('fs').promises;
const { XXHash3 } = requirePluginDeps('xxhash-addon');
const PAGE_SIZE = 4096;
export class UltraFastFingerprint {
    constructor(options = {}) {
        this.options = {
            blockSize: PAGE_SIZE,
            samplingStrategy: {
                smallFileThreshold: 32 * 1024,
                mediumFileThreshold: 512 * 1024,
                largeFileThreshold: 10 * 1024 * 1024,
            },
            bufferPool: {
                size: 16,
            },
            ...options
        };

        // 修正 xxhash API 调用
        this.hashFunction = (buffer) => XXHash3.hash(buffer).toString('hex');

        this.initBufferPool();
    }

    initBufferPool() {
        this.bufferPool = new AlignedBufferPool(
            this.options.blockSize,
            this.options.bufferPool.size
        );
    }

    async calculateFingerprint(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const size = stats.size;

            if (size <= this.options.samplingStrategy.smallFileThreshold) {
                return this.calculateSmallFileFingerprint(filePath, size);
            } else if (size <= this.options.samplingStrategy.mediumFileThreshold) {
                return this.calculateMediumFileFingerprint(filePath, size);
            } else {
                return this.calculateLargeFileFingerprint(filePath, size);
            }
        } catch (error) {
            throw new Error(`Failed to calculate fingerprint for ${filePath}: ${error.message}`);
        }
    }

    async calculateSmallFileFingerprint(filePath, size) {
        const buffer = await fs.readFile(filePath);
        return this.hashFunction(buffer);
    }

    async calculateMediumFileFingerprint(filePath, size) {
        const samples = await this.readFileSamples(filePath, [
            0,
            Math.floor(size / 2),
            Math.max(0, size - this.options.blockSize)
        ]);
        return this.hashSamples(samples, size);
    }

    async calculateLargeFileFingerprint(filePath, size) {
        const positions = this.calculateSamplePositions(size);
        const samples = await this.readFileSamples(filePath, positions);
        return this.hashSamples(samples, size);
    }

    async readFileSamples(filePath, positions) {
        let fd;
        let buffer;
        try {
            fd = await this.openFileOptimized(filePath);
            buffer = this.bufferPool.acquire();
            const samples = [];

            for (let i = 0; i < positions.length; i++) {
                const position = positions[i];
                await this.readAligned(fd, buffer, position);
                const sampleSize = Math.min(this.options.blockSize, 
                    (i === positions.length - 1) ? this.options.blockSize : 
                    positions[i + 1] - position);
                samples.push(Buffer.from(buffer.slice(0, sampleSize)));
            }

            return samples;
        } finally {
            if (buffer) this.bufferPool.release(buffer);
            if (fd) await fd.close();
        }
    }

    async openFileOptimized(filePath) {
        return await open(filePath, 'r');
    }

    async readAligned(fd, buffer, position) {
        const alignedPosition = Math.floor(position / PAGE_SIZE) * PAGE_SIZE;
        await fd.read(buffer, 0, this.options.blockSize, alignedPosition);
    }

    calculateSamplePositions(fileSize) {
        const positions = [];
        const blockSize = this.options.blockSize;
        
        positions.push(0);
        
        if (fileSize > this.options.samplingStrategy.largeFileThreshold) {
            const sampleCount = 3;
            const step = Math.floor(fileSize / (sampleCount + 1));
            
            for (let i = 1; i <= sampleCount; i++) {
                positions.push(i * step);
            }
        } else {
            const sampleCount = 2;
            const step = Math.floor(fileSize / (sampleCount + 1));
            
            for (let i = 1; i <= sampleCount; i++) {
                positions.push(i * step);
            }
        }
        
        if (fileSize > blockSize) {
            positions.push(Math.max(0, fileSize - blockSize));
        }
        
        return [...new Set(positions)];
    }

    hashSamples(samples, fileSize) {
        const totalLength = samples.reduce((acc, sample) => acc + sample.length, 0) + 8;
        const combinedBuffer = Buffer.allocUnsafe(totalLength);
        
        let offset = 0;
        for (const sample of samples) {
            sample.copy(combinedBuffer, offset);
            offset += sample.length;
        }
        
        const sizeBuffer = Buffer.alloc(8);
        sizeBuffer.writeBigUInt64LE(BigInt(fileSize));
        sizeBuffer.copy(combinedBuffer, offset);
        
        return this.hashFunction(combinedBuffer);
    }

    // 批量处理接口（非并行版本）
    async processBatch(filePaths, concurrency = 4) {
        const results = [];
        const queue = [...filePaths];
        const processing = new Set();

        while (queue.length > 0 || processing.size > 0) {
            while (processing.size < concurrency && queue.length > 0) {
                const path = queue.shift();
                const promise = this.calculateFingerprint(path)
                    .then(hash => ({ path, hash }))
                    .catch(error => ({ path, error }))
                    .finally(() => processing.delete(promise));
                
                processing.add(promise);
                results.push(promise);
            }
            
            if (processing.size > 0) {
                await Promise.race(processing);
            }
        }

        return Promise.all(results);
    }

    destroy() {
        this.bufferPool.destroy();
    }
}

class AlignedBufferPool {
    constructor(blockSize, poolSize) {
        this.blockSize = blockSize;
        this.poolSize = poolSize;
        this.buffers = [];
        this.freeBuffers = [];
        
        this.initialize();
    }

    initialize() {
        for (let i = 0; i < this.poolSize; i++) {
            const buffer = this.allocateAlignedBuffer(this.blockSize);
            this.buffers.push(buffer);
            this.freeBuffers.push(buffer);
        }
    }

    allocateAlignedBuffer(size) {
        return Buffer.allocUnsafe(size);
    }

    acquire() {
        return this.freeBuffers.pop() || this.allocateAlignedBuffer(this.blockSize);
    }

    release(buffer) {
        if (this.freeBuffers.length < this.poolSize) {
            this.freeBuffers.push(buffer);
        }
    }

    destroy() {
        this.buffers = [];
        this.freeBuffers = [];
    }
}

const path = require('path');
const { performance } = require('perf_hooks');

async function walkAndHash(dir, hashFunction, name) {
    // 信号量实现
    class Semaphore {
        constructor(max) {
            this.max = max;
            this.available = max;
            this.waiting = [];
        }

        async acquire() {
            if (this.available > 0) {
                this.available--;
                return Promise.resolve();
            }
            
            return new Promise(resolve => {
                this.waiting.push(resolve);
            });
        }

        release() {
            this.available++;
            if (this.waiting.length > 0 && this.available > 0) {
                this.available--;
                const next = this.waiting.shift();
                next();
            }
        }
    }

    const startTime = performance.now();
    let fileCount = 0;
    let totalSize = 0;
    let errors = 0;
    const hashMap = new Map();
    
    // 使用信号量控制文件描述符数量
    const maxOpenFiles = 100; // 根据系统限制调整
    const semaphore = new Semaphore(maxOpenFiles);
    
    // 并行控制参数
    const maxConcurrency = 8; // 降低并发数
    const batchSize = 100;    // 减小批处理大小
    let processing = 0;

    async function processFile(file) {
        // 使用信号量控制文件打开数量
        return semaphore.acquire().then(async () => {
            try {
                const stats = await fs.stat(file);
                const hash = await hashFunction(file);
                
                fileCount++;
                totalSize += stats.size;

                if (!hashMap.has(hash)) {
                    hashMap.set(hash, []);
                }
                hashMap.get(hash).push({
                    path: file,
                    size: stats.size
                });

                if (fileCount % 100 === 0) {
                    const currentTime = performance.now();
                    const elapsedTime = (currentTime - startTime) / 1000;
                    const averageTime = (currentTime - startTime) / fileCount;
                    const totalSizeGB = totalSize / (1024 * 1024 * 1024);
                    
                    console.log(`\n[${name}] 进度报告:`);
                    console.log(`处理文件数: ${fileCount}`);
                    console.log(`总大小: ${totalSizeGB.toFixed(2)} GB`);
                    console.log(`已用时间: ${elapsedTime.toFixed(2)} 秒`);
                    console.log(`平均每文件: ${averageTime.toFixed(2)} ms`);
                    console.log(`处理速度: ${(totalSizeGB / elapsedTime).toFixed(2)} GB/s`);
                    console.log(`当前并行数: ${processing}`);
                    console.log(`错误数: ${errors}`);
                    console.log(`当前打开文件数: ${maxOpenFiles - semaphore.available}`);
                    console.log('-'.repeat(50));
                }
            } catch (err) {
                errors++;
                if (errors % 100 === 0) {
                    console.error(`错误累计 ${errors} 个，最后一个错误: ${file} - ${err.message}`);
                }
            } finally {
                semaphore.release();
            }
        });
    }

    async function processBatch(files) {
        processing++;
        try {
            // 使用 Promise.all 但限制并发
            const chunks = [];
            for (let i = 0; i < files.length; i += maxConcurrency) {
                const chunk = files.slice(i, i + maxConcurrency);
                chunks.push(chunk);
            }

            for (const chunk of chunks) {
                await Promise.all(chunk.map(file => processFile(file)));
            }
        } finally {
            processing--;
        }
    }

    async function walk(currentDir) {
        try {
            const entries = await fs.readdir(currentDir, { withFileTypes: true });
            const files = [];
            const dirs = [];

            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    dirs.push(fullPath);
                } else {
                    files.push(fullPath);
                }
            }

            // 分批处理文件
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                await processBatch(batch);
            }

            // 串行处理目录，避免同时打开太多目录
            for (const dir of dirs) {
                await walk(dir);
            }

        } catch (err) {
            console.error(`无法访问目录 ${currentDir}: ${err.message}`);
        }
    }

    await walk(dir);

    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    const totalSizeGB = totalSize / (1024 * 1024 * 1024);

    const duplicates = Array.from(hashMap.entries())
        .filter(([hash, files]) => files.length > 1)
        .sort((a, b) => b[1][0].size - a[1][0].size);

    return {
        name,
        fileCount,
        totalSize: totalSizeGB,
        totalTime,
        averageTimePerFile: totalTime * 1000 / fileCount,
        speedGBps: totalSizeGB / totalTime,
        errors,
        duplicates
    };
}

async function compareHashMethods() {
    console.log('开始性能测试...\n');

    const ultraFast = new UltraFastFingerprint();
    
    console.log('测试 UltraFastFingerprint...');
    const ultraResult = await walkAndHash(
        'D:\\', 
        (file) => ultraFast.calculateFingerprint(file),
        'UltraFastFingerprint'
    );

    // 打印性能结果
    console.log('\n=== 最终性能对比 ===');
    [ultraResult].forEach(result => {
        console.log(`\n${result.name}:`);
        console.log(`总文件数: ${result.fileCount}`);
        console.log(`总大小: ${result.totalSize.toFixed(2)} GB`);
        console.log(`总耗时: ${result.totalTime.toFixed(2)} 秒`);
        console.log(`平均每文件: ${result.averageTimePerFile.toFixed(2)} ms`);
        console.log(`处理速度: ${result.speedGBps.toFixed(2)} GB/s`);
        console.log(`错误数: ${result.errors}`);
    });

    // 打印重复文件信息
    console.log('\n=== 重复文件列表 ===');
    ultraResult.duplicates.forEach(([hash, files]) => {
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        const sizeInMB = totalSize / (1024 * 1024);
        
        console.log(`\n重复文件组 (总大小: ${sizeInMB.toFixed(2)} MB):`);
        files.forEach(file => {
            const fileSizeInMB = file.size / (1024 * 1024);
            console.log(`  ${file.path} (${fileSizeInMB.toFixed(2)} MB)`);
        });
        console.log('-'.repeat(50));
    });
}
/*
// 运行测试
(async () => {
    try {
        await compareHashMethods();
    } catch (error) {
        console.error('测试过程中发生错误:', error);
    }
})();*/