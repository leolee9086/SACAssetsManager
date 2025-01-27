export class WebMMuxer {
    constructor(options = {}) {
        this.target = options.target || 'buffer';
        this.video = options.video || null;
        this.audio = options.audio || null;
        this.buffer = [];
        this.clusters = [];
        this.timecodeScale = 1000000; // 1ms
        this.duration = 0;
        this.init();
    }

    init() {
        // 写入EBML头
        this.writeEBMLHeader();
        // 写入Segment信息
        this.writeSegmentInfo();
        // 写入Tracks信息
        this.writeTracks();
        // 添加初始Cluster
        this.startNewCluster();
    }

    addVideoChunk(chunk){
        this.addChunk(chunk, 'video')
    }
    addAudioChunk(chunk){
        this.addChunk(chunk, 'audio')
    }
    addChunk(chunk, type) {
        if (!this.currentCluster || this.duration - this.currentCluster.startTime > 5000) {
            this.startNewCluster();
        }

        const block = this.createBlock(chunk, type);
        this.currentCluster.blocks.push(block);
        this.duration = Math.max(this.duration, chunk.timestamp + chunk.duration);
    }

    startNewCluster() {
        if (this.currentCluster) {
            this.writeCluster(this.currentCluster);
            this.clusters.push(this.currentCluster);
        }
        this.currentCluster = {
            startTime: this.duration,
            blocks: []
        };
    }

    createBlock(chunk, type) {
        const flags = chunk.isKeyframe ? 0x80 : 0x00;
        console.log(chunk, type)
        // 将EncodedVideoChunk转换为Uint8Array
        const buffer = new ArrayBuffer(chunk.data.byteLength);
        const view = new Uint8Array(buffer);
        chunk.data.copyTo(buffer);
        const blockSize = buffer.byteLength + 4;
        const block = new Uint8Array(blockSize);

        // 写入Block Header
        block[0] = 0xA3; // SimpleBlock ID
        block[1] = blockSize - 2;
        block[2] = 0x80 | (type === 'video' ? 0x01 : 0x02); // Track Number
        block[3] = flags;

        // 写入数据
        block.set(view, 4);

        return block;
    }

    writeEBMLHeader() {
        const header = new Uint8Array([
            0x1A, 0x45, 0xDF, 0xA3, // EBML ID
            0x42, 0x86, 0x81, 0x01, // EBML Version
            0x42, 0xF7, 0x81, 0x01, // EBML Read Version
            0x42, 0xF2, 0x81, 0x04, // EBML MaxIDLength
            0x42, 0xF3, 0x81, 0x08  // EBML MaxSizeLength
        ]);
        this.buffer.push(header);
    }

    writeSegmentInfo() {
        const info = new Uint8Array([
            0x18, 0x53, 0x80, 0x67, // Segment ID
            0x15, 0x49, 0xA9, 0x66, // Info ID
            0x2A, 0xD7, 0xB1, 0x83, // TimecodeScale
            0x88,                   // TimecodeScale Size
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, // TimecodeScale Value (1ms)
            0x44, 0x89, 0x84, 0x00, // Duration
            0x88,                   // Duration Size
            ...this.encodeFloat(this.duration),
            0x44, 0x89, 0x84, 0x00, // MuxingApp
            0x88,                   // MuxingApp Size
            0x57, 0x65, 0x62, 0x4D, 0x4D, 0x75, 0x78, 0x65, 0x72 // "WebMMuxer"
        ]);
        this.buffer.push(info);
    }

    // 新增方法：编码浮点数
    encodeFloat(value) {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, value, true); // 小端序
        return new Uint8Array(buffer);
    }

    writeTracks() {
        const codecId = this.video.codec || 'VP8';
        const codecIdBytes = new TextEncoder().encode(codecId);
        const trackEntrySize = 0x1A + codecIdBytes.length;
        
        const tracks = new Uint8Array([
            0x16, 0x54, 0xAE, 0x6B, // Tracks ID
            0x01,                   // Tracks Size (使用VINT编码)
            trackEntrySize & 0xFF,  // Tracks Size值
            0xAE,                   // Track Entry ID
            0x01,                   // Track Entry Size (使用VINT编码)
            (trackEntrySize - 1) & 0xFF, // Track Entry Size值
            0xD7, 0x81, 0x01,       // Track Number
            0x73, 0xC5, 0x81, 0x01, // Track UID
            0x83, 0x81, 0x01,       // Track Type (1 = video)
            0x86,                   // Codec ID
            codecIdBytes.length & 0xFF, // Codec ID Size
            ...codecIdBytes,        // Codec ID值
            0xE0, 0x81, this.video.width >> 8, this.video.width & 0xFF, // Video Width
            0xE1, 0x81, this.video.height >> 8, this.video.height & 0xFF, // Video Height
            0x23, 0xE3, 0x83,       // DefaultDuration
            0x81, 0x00, 0x00, 0x00, // DefaultDuration Size
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // DefaultDuration Value
        ]);
        this.buffer.push(tracks);
    }

    writeCluster(cluster) {
        const clusterSize = 0x0C + cluster.blocks.reduce((acc, block) => acc + block.length, 0);
        const timecode = Math.round(cluster.startTime / (this.timecodeScale / 1000));
        
        const clusterHeader = new Uint8Array([
            0x1F, 0x43, 0xB6, 0x75, // Cluster ID
            0x80 | (clusterSize >>> 21), // Cluster Size (使用VINT编码)
            (clusterSize >>> 14) & 0x7F,
            (clusterSize >>> 7) & 0x7F,
            clusterSize & 0x7F,
            0xE7,                   // Timecode
            0x81,                   // Timecode Size
            (timecode >> 8) & 0xFF, // Timecode Value高字节
            timecode & 0xFF         // Timecode Value低字节
        ]);
        this.buffer.push(clusterHeader);
        this.buffer.push(...cluster.blocks);
    }

    finalize() {
        if (this.currentCluster && this.currentCluster.blocks.length > 0) {
            this.writeCluster(this.currentCluster);
            this.clusters.push(this.currentCluster);
        }
        
        const totalLength = this.buffer.reduce((acc, chunk) => acc + chunk.byteLength, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of this.buffer) {
            result.set(chunk, offset);
            offset += chunk.byteLength;
        }

        return result.buffer;
    }
} 