async function fetchImageSize(url) {
    const response = await fetch(url, {
        headers: {
            'Range': 'bytes=0-8191' // Request the first 8KB
        }
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const buffer = await response.arrayBuffer();
    const dimensions = getImageSizeFromBuffer(buffer);
    return dimensions;
}

function getImageSizeFromBuffer(buffer) {
    const dataView = new DataView(buffer);
    const firstByte = dataView.getUint8(0);
    const secondByte = dataView.getUint8(1);

    if (firstByte === 0xFF && secondByte === 0xD8) {
        // JPEG
        let offset = 2;
        while (offset < buffer.byteLength) {
            if (dataView.getUint8(offset) === 0xFF) {
                const marker = dataView.getUint8(offset + 1);
                if (marker === 0xC0 || marker === 0xC2) {
                    const height = dataView.getUint16(offset + 5);
                    const width = dataView.getUint16(offset + 7);
                    return { width, height };
                } else {
                    offset += 2 + dataView.getUint16(offset + 2);
                }
            } else {
                break;
            }
        }
    } else if (firstByte === 0x89 && secondByte === 0x50) {
        // PNG
        const width = dataView.getUint32(16);
        const height = dataView.getUint32(20);
        return { width, height };
    }

    throw new Error('Unsupported image format');
}
