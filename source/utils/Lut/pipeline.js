import { lutShader } from './lutShader.js';

export function createComputePipeline(device) {
    return device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: device.createShaderModule({
                code: lutShader
            }),
            entryPoint: 'main'
        }
    });
}

export function createBindGroup(device, pipeline, textures, uniformBuffer) {
    return device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: textures.inputTexture.createView(),
            },
            {
                binding: 1,
                resource: textures.lutTexture.createView(),
            },
            {
                binding: 2,
                resource: textures.outputTexture.createView(),
            },
            {
                binding: 3,
                resource: device.createSampler({
                    magFilter: 'linear',
                    minFilter: 'linear',
                    mipmapFilter: 'linear',
                }),
            },
            {
                binding: 4,
                resource: { buffer: uniformBuffer },
            },
        ],
    });
}