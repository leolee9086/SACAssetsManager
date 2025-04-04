// 修改着色器代码的声明方式
const createShaderCode = (k, j) => `
@group(0) @binding(0) var<storage, read_write> data: array<u32>;

@compute @workgroup_size(256)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(workgroup_id) group_id: vec3<u32>
) {
    let idx = global_id.x;
    let k = ${Math.floor(k)}u;  // 确保使用整数
    let j = ${Math.floor(j)}u;  // 确保使用整数
    
    let ixj = idx ^ j;
    
    if (ixj > idx) {
        let a = data[idx];
        let b = data[ixj];
        
        // 根据区块方向决定升序还是降序
        let ascending = (idx & k) == 0u;
        if ((ascending && a > b) || (!ascending && a < b)) {
            data[idx] = b;
            data[ixj] = a;
        }
    }
}
`;

export async function bitonicSort(data) {
    // 计算需要的大小（向上取到最近的 2 的幂次方）
    const originalLength = data.length;
    const powerOf2 = Math.ceil(Math.log2(originalLength));
    const paddedLength = Math.pow(2, powerOf2);
    
    // 创建填充后的数组
    const paddedData = new Uint32Array(paddedLength);
    paddedData.set(data);
    // 将剩余位置填充为最大值，确保它们会被排到末尾
    paddedData.fill(0xFFFFFFFF, originalLength);

    // 初始化 WebGPU
    if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('No appropriate GPUAdapter found');
    }

    const device = await adapter.requestDevice();
    
    // 创建数据缓冲区
    const dataBuffer = device.createBuffer({
        size: paddedData.byteLength,  // 使用填充后的大小
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
    new Uint32Array(dataBuffer.getMappedRange()).set(paddedData);
    dataBuffer.unmap();

    // 创建绑定组布局
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
        }]
    });

    // 对每个步长和阶段执行排序
    const n = data.length;
    for (let k = 2; k <= n; k *= 2) {
        for (let j = k/2; j > 0; j /= 2) {
            // 创建计算管线
            const pipeline = device.createComputePipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [bindGroupLayout]
                }),
                compute: {
                    module: device.createShaderModule({
                        code: createShaderCode(k, j)  // 使用函数生成着色器代码
                    }),
                    entryPoint: "main"
                }
            });

            // 创建绑定组
            const bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: dataBuffer }
                }]
            });

            // 执行计算
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.dispatchWorkgroups(Math.ceil(n / 256));
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        }
    }

    // 读取结果
    const resultBuffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(dataBuffer, 0, resultBuffer, 0, data.byteLength);
    device.queue.submit([commandEncoder.finish()]);

    await resultBuffer.mapAsync(GPUMapMode.READ);
    const resultArray = new Uint32Array(resultBuffer.getMappedRange());
    return new Uint32Array(resultArray.slice(0, originalLength));
}