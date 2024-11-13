export function createTextures(device, image) {
    const inputTexture = device.createTexture({
        size: [image.width, image.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const lutTexture = device.createTexture({
        size: [32, 32, 32],
        dimension: '3d',
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    const outputTexture = device.createTexture({
        size: [image.width, image.height, 1],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC,
    });

    return { inputTexture, lutTexture, outputTexture };
}

export function destroyResources(textures) {
    textures.inputTexture?.destroy();
    textures.lutTexture?.destroy();
    textures.outputTexture?.destroy();
}
