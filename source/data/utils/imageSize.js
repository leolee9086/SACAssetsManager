/**
 * 
 * 测试
 */
const fg = require('D:/思源主库/data/plugins/SACAssetsManager/node_modules/fast-glob');

async function getAllImageSizesFromDrive(drive) {
    const log =[]
    const pattern = `${drive}/**/*.{jpg,jpeg,png,bmp,gif,webp,tiff,ico,heic,psd,avif,svg,mp4,avi,flv,mkv}`;
    const ignorePatterns = [
        '**/found.000', 
        '**/System Volume Information', 
        '**/$RECYCLE.BIN', 
        '**/pagefile.sys', 
        '**/hiberfil.sys',
        '**/Recovery', 
        '**/Windows', 
        '**/Program Files', 
        '**/Program Files (x86)', 
        '**/ProgramData',
        '**/installer_files'
    ];

    let files = [];
    try {
        files = await fg(pattern, { onlyFiles: true, ignore: ignorePatterns });
        console.log(files)
    } catch (error) {
        if (error.code === 'EPERM' || error.code === 'EACCES') {
            console.warn(`Permission denied during file search:`, error);
        } else {
            console.error(`Error during file search:`, error);
        }
    }

    const results = [];
    const concurrencyLimit = 100;
    let activeWorkers = 0;
    let resolveMainPromise;
    const mainPromise = new Promise(resolve => resolveMainPromise = resolve);

    async function processQueue() {
        while (queue.length > 0) {
            const file = queue.shift();
            try {
                const dimensions = await fetchImageSize(file, log);
                results.push({ file, dimensions });
            } catch (error) {
                if (error.code === 'EPERM' || error.code === 'EACCES') {
                    log.push(`Permission denied for file ${file}: ${error.message}`);
                } else {
                    log.push(`Error processing file ${file}: ${error.message}`);
                }
            }
        }
        activeWorkers--;
        if (activeWorkers === 0) {
            resolveMainPromise();
        }
    }

    const queue = [...files];
    for (let i = 0; i < concurrencyLimit; i++) {
        activeWorkers++;
        processQueue();
    }
    await mainPromise;

    return results;
}
console.time('getAllImageSizesFromDriveTime');

// Example usage
getAllImageSizesFromDrive("R:/").then(results => {
    console.timeEnd('getAllImageSizesFromDriveTime');
    console.log(results);
    const totalFiles = results.length;
    const totalTime = performance.now() - startTime; // 计算总时间
    const averageTime = totalTime / totalFiles;

    console.log(`Total files: ${totalFiles}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average time per file: ${averageTime.toFixed(2)}ms`);
}).catch(error => {
    console.error('Error:', error);
});
const startTime = performance.now(); // 记录开始时间
async function fetchImageSize(pathOrUrl,log) {
    let buffer;

    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        // Handle URL
        const response = await fetch(pathOrUrl, {
            headers: {
                'Range': 'bytes=0-8191' // Request the first 8KB
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        buffer = await response.arrayBuffer();
    } else {
        // Handle local file
        const fileBuffer = await readFirstBytes(pathOrUrl, 8192);
        buffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    }

    const dimensions = getImageSizeFromBuffer(buffer, require('path').extname(pathOrUrl).toLowerCase(),log);
    return dimensions;
}


function readFirstBytes(filePath, byteCount=8191) {
    const fs= require('fs')

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { start: 0, end: byteCount - 1 });
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

function getImageSizeFromBuffer(buffer, ext, log) {
    const dataView = new DataView(buffer);
    const firstByte = dataView.getUint8(0);
    const secondByte = dataView.getUint8(1);

    const formatByExt = imageFormats.find(format =>(format.extensions&& format.extensions.includes(ext))||format.name.toLowerCase()===ext);
    let passed
    if (formatByExt) {
        try {
            passed=true
            return formatByExt.getSize(dataView, buffer);
        } catch (error) {
            passed=false
            log.push(`Error processing with extension-based format: ${ext} - ${error.message}`);
        }
    }
    
   /* for (const format of imageFormats) {

        try {
            if (format.isFormat(firstByte, secondByte, dataView, buffer)) {
                return format.getSize(dataView, buffer);
            }
        } catch (error) {
            log.push(`Error processing with byte-based format: ${format.name} - ${error.message}`);
        }
    }*/

    throw new Error('Unsupported image format');
}

const imageFormats = [
    {
        name: 'JPEG',
        extensions: ['.jpg', '.jpeg'],

        isFormat: (firstByte, secondByte) => firstByte === 0xFF && secondByte === 0xD8,
        getSize: (dataView, buffer) => {
            let offset = 2;
            while (offset < buffer.byteLength) {
                if (dataView.getUint8(offset) === 0xFF) {
                    const marker = dataView.getUint8(offset + 1);
                    if (marker >= 0xC0 && marker <= 0xC3) {
                        const height = dataView.getUint16(offset + 5);
                        const width = dataView.getUint16(offset + 7);
                        return { width, height };
                    } else {
                        offset += 2 + dataView.getUint16(offset + 2);
                    }
                } else {
                    offset++;
                }
            }
            throw new Error('Invalid JPEG format');
        }
    },
    {
        name: 'PNG',
        extensions: ['.png'],

        isFormat: (firstByte, secondByte) => firstByte === 0x89 && secondByte === 0x50,
        getSize: (dataView) => {
            const width = dataView.getUint32(16);
            const height = dataView.getUint32(20);
            return { width, height };
        }
    },
    {
        name: 'BMP',
        isFormat: (firstByte, secondByte) => firstByte === 0x42 && secondByte === 0x4D,
        getSize: (dataView) => {
            const width = dataView.getInt32(18, true);
            const height = dataView.getInt32(22, true);
            return { width, height };
        }
    },
    {
        name: 'GIF',
        isFormat: (firstByte, secondByte) => firstByte === 0x47 && secondByte === 0x49,
        getSize: (dataView) => {
            const width = dataView.getUint16(6, true);
            const height = dataView.getUint16(8, true);
            return { width, height };
        }
    },
    {
        name: 'WebP',
        isFormat: (firstByte, secondByte) => firstByte === 0x52 && secondByte === 0x49,
        getSize: (dataView) => {
            const riffHeader = dataView.getUint32(0, true);
            const webpHeader = dataView.getUint32(8, true);
            if (riffHeader !== 0x52494646 || webpHeader !== 0x57454250) {
                throw new Error('Invalid WebP format');
            }
            const width = dataView.getUint16(26, true) & 0x3FFF;
            const height = dataView.getUint16(28, true) & 0x3FFF;
            return { width, height };
        }
    },
    {
        name: 'TIFF',
        isFormat: (firstByte, secondByte) => (firstByte === 0x49 && secondByte === 0x49) || (firstByte === 0x4D && secondByte === 0x4D),
        getSize: (dataView) => {
            const littleEndian = dataView.getUint16(0) === 0x4949;
            const width = dataView.getUint32(18, littleEndian);
            const height = dataView.getUint32(22, littleEndian);
            return { width, height };
        }
    },
    {
        name: 'ICO',
        isFormat: (firstByte, secondByte) => firstByte === 0x00 && secondByte === 0x00,
        getSize: (dataView) => {
            const width = dataView.getUint8(6) || 256;
            const height = dataView.getUint8(7) || 256;
            return { width, height };
        }
    },
    {
        name: 'HEIC',
        isFormat: (firstByte, secondByte) => firstByte === 0x00 && secondByte === 0x00,
        getSize: (dataView) => {
            // HEIC format parsing logic
            // Reference: https://nokiatech.github.io/heif/technical.html
            const width = dataView.getUint32(24);
            const height = dataView.getUint32(28);
            return { width, height };
        }
    },
    {
        name: 'PSD',
        isFormat: (firstByte, secondByte) => firstByte === 0x38 && secondByte === 0x42,
        getSize: (dataView) => {
            const width = dataView.getUint32(18);
            const height = dataView.getUint32(14);
            return { width, height };
        }
    },

    {
        name: 'AVIF',
        isFormat: (firstByte, secondByte) => firstByte === 0x00 && secondByte === 0x00,
        getSize: (dataView) => {
            // AVIF format parsing logic
            // Reference: https://aomediacodec.github.io/av1-avif/
            const width = dataView.getUint32(24);
            const height = dataView.getUint32(28);
            return { width, height };
        }
    },
    {
        name: 'SVG',
        extensions: ['.svg'],
        isFormat: (firstByte, secondByte, dataView, buffer) => {
            const firstFewBytes = new TextDecoder('utf-8').decode(buffer.slice(0, 10)).trim();
            return firstFewBytes.startsWith('<?xml') || firstFewBytes.startsWith('<svg');
        },
        getSize: (dataView, buffer) => {
            return { width: 512, height: 512, isVector: true };
        }
    },
    {
        name: 'MP4',
        isFormat: (firstByte, secondByte) => firstByte === 0x00 && secondByte === 0x00,
        getSize: (dataView) => {
            // MP4 format parsing logic
            // Reference: https://www.file-recovery.com/mp4-signature-format.htm
            const width = dataView.getUint32(84);
            const height = dataView.getUint32(88);
            return { width, height };
        }
    },
    {
        name: 'AVI',
        isFormat: (firstByte, secondByte) => firstByte === 0x52 && secondByte === 0x49,
        getSize: (dataView) => {
            const riffHeader = dataView.getUint32(0, true);
            const aviHeader = dataView.getUint32(8, true);
            if (riffHeader !== 0x52494646 || aviHeader !== 0x41564920) {
                throw new Error('Invalid AVI format');
            }
            const width = dataView.getUint32(64, true);
            const height = dataView.getUint32(68, true);
            return { width, height };
        }
    },
    {
        name: 'FLV',
        isFormat: (firstByte, secondByte) => firstByte === 0x46 && secondByte === 0x4C,
        getSize: (dataView) => {
            // FLV format parsing logic
            // Reference: https://www.adobe.com/content/dam/acom/en/devnet/flv/video_file_format_spec_v10.pdf
            const width = dataView.getUint32(27);
            const height = dataView.getUint32(31);
            return { width, height };
        }
    },
    {
        name: 'MKV',
        isFormat: (firstByte, secondByte) => firstByte === 0x1A && secondByte === 0x45,
        getSize: (dataView) => {
            // MKV format parsing logic
            // Reference: https://www.matroska.org/technical/specs/index.html
            const width = dataView.getUint32(40);
            const height = dataView.getUint32(44);
            return { width, height };
        }
    }
];
// Add more formats here