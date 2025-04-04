
export async function uploadData(device, textures, image, lutData) {
    device.queue.writeTexture(
        { texture: textures.inputTexture },
        image.data,
        { bytesPerRow: image.width * 4 },
        { width: image.width, height: image.height }
    );

    device.queue.writeTexture(
        { texture: textures.lutTexture },
        lutData,
        { bytesPerRow: 32 * 4, rowsPerImage: 32 },
        { width: 32, height: 32, depthOrArrayLayers: 32 }
    );
}
export async function readResult(device, texture, width, height) {
    const resultBuffer = device.createBuffer({
        size: width * height * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
        { texture },
        { buffer: resultBuffer, bytesPerRow: width * 4 },
        { width, height, depthOrArrayLayers: 1 }
    );

    device.queue.submit([commandEncoder.finish()]);
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const resultData = new Uint8Array(resultBuffer.getMappedRange());
    const result = new Uint8Array(resultData);
    resultBuffer.unmap();
    resultBuffer.destroy();
    return result;
}
