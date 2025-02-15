import { createCluster } from "./utils/createCluster.js";
import { ArrayBufferDataStream } from "./utils/ArrayBufferDataStream.js";
import { BlobBuffer } from "./utils/blobBuffer.js";
import { createEbmlHeader } from "./utils/ebml/ebmlHeader.js";
import { createEmblTracksInfo } from "./utils/ebml/emblTracksInfo.js";
import { EBMLFloat64 } from "./utils/ebml/ebmlFloat64.js";
import { createDefaultSegmentInfo } from "./utils/ebml/ebmlSegmenInfo.js";
import { writeEBML } from "./utils/ebml/writeEBML.js";

export default function WebMWriter(options) {
    // 配置常量
    let MAX_CLUSTER_DURATION_MSEC = 1000;
    let DEFAULT_TRACK_NUMBER = 1;

    // 状态标志
    let writtenHeader = false;
    let firstTimestampEver = true;


    // 时间管理
    let earliestTimestamp = 0;
    let clusterStartTime = 0;
    let clusterDuration = 0;
    let lastTimeCode = 0;

    // 集群缓冲区
    let clusterFrameBuffer = [];

    // EBML结构定义
    let ebmlSegment;  // 根段元素
    let seekHead;     // 待后续填充的seek头

    // 持续时间元素（使用EBMLFloat64）
    let segmentDuration = {
        id: 0x4489,  // Duration元素ID
        data: new EBMLFloat64(0)  // 初始化为0
    };

    // 关键点定位信息
    let seekPoints = {
        Cues: {
            id: 0x1C53BB6B,
            positionEBML: null
        },
        SegmentInfo: {
            id: 0x1549A966,
            positionEBML: null
        },
        Tracks: {
            id: 0x1654AE6B,
            positionEBML: null
        },
    };

    // 提示点存储
    let cues = [];

    // 二进制缓冲区初始化
    let blobBuffer = new BlobBuffer(
        options.fileWriter || options.fd  // 优先使用fileWriter
    );

    function fileOffsetToSegmentRelative(fileOffset) {
        return fileOffset - ebmlSegment.dataOffset;
    }


    /**
     * Create a SeekHead element with descriptors for the points in the global
     * seekPoints array.
     *
     * 5 bytes of position values are reserved for each node, which lie at the
     * offset point.positionEBML.dataOffset, to be overwritten later.
     */
    function createSeekHead() {
        let seekPositionEBMLTemplate = {
            'id': 0x53AC,  // SeekPosition
            'size': 5,
            'data': 0
        },

            result = {
                'id': 0x114D9B74,  // SeekHead
                'data': []
            };

        for (let name in seekPoints) {
            let seekPoint = seekPoints[name];

            seekPoint.positionEBML = Object.create(seekPositionEBMLTemplate);

            result.data.push({
                'id': 0x4DBB,  // Seek
                'data': [
                    {
                        'id': 0x53AB,  // SeekID
                        'data': new Uint8Array([
                            (seekPoint.id >> 24) & 0xFF,
                            (seekPoint.id >> 16) & 0xFF,
                            (seekPoint.id >> 8) & 0xFF,
                            seekPoint.id & 0xFF
                        ])
                    },
                    seekPoint.positionEBML
                ]
            });
        }
        return result;
    }

    /**
     * Write the WebM file header to the stream.
     */
    function writeHeader() {
        seekHead = createSeekHead();
        let ebmlHeader = createEbmlHeader();
        let segmentInfo = createDefaultSegmentInfo()
        segmentInfo.data.push(segmentDuration);
        let tracks = createEmblTracksInfo(options)
        ebmlSegment = {
            'id': 0x18538067,  // Segment
            'size': -1,        // Unbounded size
            'data': [
                seekHead,
                segmentInfo,
                tracks,
            ]
        };
        let bufferStream = new ArrayBufferDataStream(256);
        writeEBML(bufferStream, blobBuffer.pos, ebmlHeader);
        writeEBML(bufferStream, blobBuffer.pos, ebmlSegment);
        blobBuffer.write(bufferStream.getAsDataArray());
        // Now we know where these top-level elements lie in the file:
        seekPoints.SegmentInfo.positionEBML.data =
            fileOffsetToSegmentRelative(segmentInfo.offset);
        seekPoints.Tracks.positionEBML.data =
            fileOffsetToSegmentRelative(tracks.offset);
        writtenHeader = true;
    }

    /**
     * Create a SimpleBlock element to hold the given frame.
     *
     * @param {Frame} frame
     *
     * @return A SimpleBlock EBML element.
     */
    function createSimpleBlockForframe(frame) {
        // 计算VarInt实际需要的字节数
        let varIntSize = 1; // 假设最大为1字节（根据trackNumber限制）
        let trackNumber = frame.trackNumber;
        if (trackNumber >= 0x40) varIntSize++;
        
        // 精确计算缓冲区大小
        let bufferSize = varIntSize + 2 + 1; // VarInt + U16BE + flags
        let bufferStream = new ArrayBufferDataStream(bufferSize);

        if (!(frame.trackNumber > 0 && frame.trackNumber < 127)) {
            throw new Error('TrackNumber must be > 0 and < 127');
        }

        bufferStream.writeEBMLVarInt(
            frame.trackNumber);  // Always 1 byte since we limit the range of
        // trackNumber
        bufferStream.writeU16BE(frame.timecode);

        // Flags byte
        const isKeyFrame = frame.type === "key" || frame.type === "I-frame";
        bufferStream.writeByte(
            (isKeyFrame ? 1 : 0) << 7  // frame
        );

        // 合并头部和帧数据
        let headerArray = bufferStream.getAsDataArray();
        let combinedData = new Uint8Array(headerArray.length + frame.frame.length);
        combinedData.set(headerArray);
        combinedData.set(frame.frame, headerArray.length);

        return {
            'id': 0xA3,  // SimpleBlock
            'data': combinedData  // 直接拼接后的完整二进制数据
        };
    }


    function addCuePoint(trackIndex, clusterTime, clusterFileOffset) {
        cues.push({
            'id': 0xBB,  // Cue
            'data': [
                {
                    'id': 0xB3,  // CueTime
                    'data': clusterTime
                },
                {
                    'id': 0xB7,  // CueTrackPositions
                    'data': [
                        {
                            'id': 0xF7,  // CueTrack
                            'data': trackIndex
                        },
                        {
                            'id': 0xF1,  // CueClusterPosition
                            'data': fileOffsetToSegmentRelative(clusterFileOffset)
                        }
                    ]
                }
            ]
        });
    }

    /**
     * Write a Cues element to the blobStream using the global `cues` array of
     * CuePoints (use addCuePoint()). The seek entry for the Cues in the
     * SeekHead is updated.
     */
    let firstCueWritten = false;
    function writeCues() {
        if (firstCueWritten) return;
        firstCueWritten = true;

        let ebml = { 'id': 0x1C53BB6B, 'data': cues },

            cuesBuffer = new ArrayBufferDataStream(
                16 +
                cues.length *
                32);  // Pretty crude estimate of the buffer size we'll need

        writeEBML(cuesBuffer, blobBuffer.pos, ebml);
        blobBuffer.write(cuesBuffer.getAsDataArray());

        // Now we know where the Cues element has ended up, we can update the
        // SeekHead
        seekPoints.Cues.positionEBML.data =
            fileOffsetToSegmentRelative(ebml.offset);
    }

    /**
     * Flush the frames in the current clusterFrameBuffer out to the stream as a
     * Cluster.
     */
    function flushClusterFrameBuffer() {
        console.log(clusterFrameBuffer)
        if (clusterFrameBuffer.length === 0) {
            return;
        }

        // 使用动态写入代替预计算总大小
        let buffer = new ArrayBufferDataStream(1024 * 1024),  // 初始1MB缓冲区（自动扩展）
            cluster = createCluster({
                timecode: Math.round(clusterStartTime),
            });

        // 直接写入cluster头
        writeEBML(buffer, blobBuffer.pos, {
            id: cluster.id,
            size: -1,  // 保持开放大小
            data: []
        });

        // 逐个写入视频帧
        for (let i = 0; i < clusterFrameBuffer.length; i++) {
            let block = createSimpleBlockForframe(clusterFrameBuffer[i]);
            writeEBML(buffer, blobBuffer.pos, block);
        }

        // 结束cluster（更新大小）
        buffer.rewriteEBMLSize(cluster.id, buffer.size() - 4);  // 4是EBML头大小

        blobBuffer.write(buffer.getAsDataArray());

        addCuePoint(
            DEFAULT_TRACK_NUMBER, Math.round(clusterStartTime), cluster.offset);

        clusterFrameBuffer = [];
        clusterDuration = 0;
    }


    /**
     *
     * @param {Frame} frame
     */
    function addFrameToCluster(frame) {
        console.log(frame)
        frame.trackNumber = DEFAULT_TRACK_NUMBER;
        var time = frame.intime / 1000;
        if (firstTimestampEver) {
            earliestTimestamp = time;
            time = 0;
            firstTimestampEver = false;
            clusterStartTime = time; // 初始化集群开始时间
        } else {
            time = time - earliestTimestamp;
        }
        lastTimeCode = time;

        // Frame timecodes are relative to the start of their cluster:
        frame.timecode = Math.round(time - clusterStartTime);
        clusterFrameBuffer.push(frame);
        
        // 更新clusterDuration为当前帧时间与集群开始时间的差值
        clusterDuration = time - clusterStartTime;
        console.log(clusterDuration, time, clusterStartTime)
        if (clusterDuration >= MAX_CLUSTER_DURATION_MSEC) {
            flushClusterFrameBuffer();
        }
    }

    /**
     * Rewrites the SeekHead element that was initially written to the stream
     * with the offsets of top level elements.
     *
     * Call once writing is complete (so the offset of all top level elements
     * is known).
     */
    function rewriteSeekHead() {
        let seekHeadBuffer = new ArrayBufferDataStream(seekHead.size),
            oldPos = blobBuffer.pos;

        // Write the rewritten SeekHead element's data payload to the stream
        // (don't need to update the id or size)
        console.log(seekHeadBuffer, seekHead)
        writeEBML(seekHeadBuffer, seekHead.dataOffset, seekHead.data);

        // And write that through to the file
        blobBuffer.seek(seekHead.dataOffset);
        blobBuffer.write(seekHeadBuffer.getAsDataArray());
        blobBuffer.seek(oldPos);
    }

    /**
     * Rewrite the Duration field of the Segment with the newly-discovered
     * video duration.
     */
    function rewriteDuration() {
        let  oldPos = blobBuffer.pos;

        // 确保使用正确的duration值（秒转毫秒）
        let durationMs = lastTimeCode;
        segmentDuration.data.setValue(durationMs / 1000);  // EBML duration单位是秒
        
        // 创建新的缓冲区写入更新后的值（增加缓冲区大小以容纳EBML头信息）
        let durationBuffer = new ArrayBufferDataStream(16);  // 从8调整为16字节
        writeEBML(durationBuffer, segmentDuration.dataOffset, segmentDuration);
        
        // 写入到blobBuffer
        blobBuffer.seek(segmentDuration.dataOffset);
        blobBuffer.write(durationBuffer.getAsDataArray());
        blobBuffer.seek(oldPos);
    }

    /**
     * Add a frame to the video.
     *
     * @param {HTMLCanvasElement|String} frame - A Canvas element that
     *     contains the frame, or a WebP string you obtained by calling
     * toDataUrl() on an image yourself.
     *
     */
    this.addFrame = function (frameObj) {
        let videoWidth = 0
        let videoHeight = 0
        if (!writtenHeader) {
            videoWidth = options.width;
            videoHeight = options.height;
            writeHeader();
        }

        // 处理VideoFrame对象
        if (frameObj.frame.constructor.name === 'VideoFrame') {
            const videoFrame = frameObj.frame;
            const type = frameObj.type || 'delta'; // 默认为delta帧
            
            // 将VideoFrame转换为Uint8Array（示例方法，实际需要根据编码处理）
            const canvas = new OffscreenCanvas(videoFrame.displayWidth, videoFrame.displayHeight);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoFrame, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const frameData = new Uint8Array(imageData.data.buffer);

            addFrameToCluster({
                frame: frameData,
                intime: videoFrame.timestamp, // 使用VideoFrame自带时间戳
                type: type, // 使用传入的帧类型
            });
            return;
        }

        // 保留原有的EncodedVideoChunk处理
        if (frameObj.constructor.name == 'EncodedVideoChunk') {
            let frameData = new Uint8Array(frameObj.byteLength);
            frameObj.copyTo(frameData);
            addFrameToCluster({
                frame: frameData,
                intime: frameObj.timestamp / 1000,
                type: frameObj.type,
            });
            return;
        }
    };

    this.complete = function () {
        if (!writtenHeader) {
            writeHeader();
        }
        firstTimestampEver = true;
        console.log(blobBuffer)

        flushClusterFrameBuffer();
        console.log(blobBuffer)

        writeCues();
        console.log(blobBuffer)

        rewriteSeekHead();
        console.log(blobBuffer)

        rewriteDuration();
        console.log(blobBuffer)
        return blobBuffer.complete('video/webm');
    };

    this.getWrittenSize = function () {
        return blobBuffer.length;
    };

    // 添加参数验证函数
    function validateOptions() {
        if (!options) {
            throw new Error('Options parameter is required');
        }
        if (typeof options.width !== 'number' || options.width <= 0) {
            throw new Error('Valid width is required');
        }
        if (typeof options.height !== 'number' || options.height <= 0) {
            throw new Error('Valid height is required');
        }
        if (!options.codec) {
            throw new Error('Video codec must be specified');
        }
        const validCodecs = ['VP8', 'VP9', 'AV1', 'H264'];
        if (!validCodecs.includes(options.codec.toUpperCase())) {
            throw new Error('Unsupported codec: ' + options.codec);
        }
        if (options.width > 8192 || options.height > 4320) {
            throw new Error('Resolution exceeds 8K limit');
        }
    }

    validateOptions(); // 调用验证函数
}

// 添加完善的EBML尺寸计算函数
function calculateEBMLSize(element) {
    // 处理直接传入Uint8Array的情况（无data封装）
    if (element instanceof Uint8Array) {
        return element.length;
    }

    // 处理标准EBML元素结构
    function getVintSize(value) {
        if (value < 0x80) return 1;       // 0xxxxxxx
        if (value < 0x4000) return 2;     // 01xxxxxx xxxxxxxx
        if (value < 0x200000) return 3;   // 001xxxxx ...
        if (value < 0x10000000) return 4;
        return 5; // EBML规范最大支持8字节，但实际场景4字节足够
    }

    let size = 0;
    
    // 计算ID字段的VINT大小（仅标准元素需要）
    size += getVintSize(element.id);
    
    // 处理数据部分（现在data是单个Uint8Array）
    if (element.data instanceof Uint8Array) {
        size += getVintSize(element.data.length);
        size += element.data.length;
    } else if (element.data instanceof EBMLFloat64) {
        // 处理浮点型数据
        size += getVintSize(8); // EBMLFloat64固定8字节
        size += 8;
    } else if (typeof element.data === 'number') {
        // 处理整型数据
        const numSize = element.data < 0x100 ? 1 : 
                       element.data < 0x10000 ? 2 :
                       element.data < 0x100000000 ? 4 : 8;
        size += getVintSize(numSize);
        size += numSize;
    } else {
        console.log(element)

        throw new Error(`Unsupported EBML data type: ${typeof element.data}`);
    }

    return size;
}