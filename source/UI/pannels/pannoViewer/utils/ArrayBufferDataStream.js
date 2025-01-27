export class ArrayBufferDataStream {
    constructor(initialCapacity = 1024) {
        this.data = new Uint8Array(initialCapacity);
        this.pos = 0;
        this.offsets = new Map(); // 用于记录EBML元素的位置
    }

    // 新增：自动扩容机制
    ensureCapacity(requiredLength) {
        if (this.data.length >= requiredLength) return;
        
        // 每次扩容至少翻倍，避免频繁扩容
        const newCapacity = Math.max(requiredLength, this.data.length * 2);
        const newData = new Uint8Array(newCapacity);
        newData.set(this.data.subarray(0, this.pos));
        this.data = newData;
    }

    // 新增：获取当前有效数据长度
    size() {
        return this.pos;
    }

    // 新增：重写EBML元素大小
    rewriteEBMLSize(id, newSize) {
        const elementInfo = this.offsets.get(id);
        if (!elementInfo) {
            throw new Error(`Element ${id.toString(16)} not found`);
        }

        const [startPos, sizeLength] = elementInfo;
        const sizePos = startPos + this.measureEBMLVarInt(id);
        
        // 保存当前指针位置
        const originalPos = this.pos;
        this.pos = sizePos;
        
        // 重新写入新的size值
        this.writeEBMLVarInt(newSize);
        
        // 恢复原始位置
        this.pos = originalPos;
    }

    seek(toOffset) {
        this.pos = toOffset;
    }

    writeBytes(arr) {
        this.ensureCapacity(this.pos + arr.length);
        for (let i = 0; i < arr.length; i++) {
            this.data[this.pos++] = arr[i];
        }
    }

    writeByte(b) {
        this.ensureCapacity(this.pos + 1);
        this.data[this.pos++] = b;
    }

    // Synonym:
    writeU8 = ArrayBufferDataStream.prototype.writeByte;

    writeU16BE(u) {
        this.data[this.pos++] = u >> 8;
        this.data[this.pos++] = u;
    }

    writeDoubleBE(d) {
        let bytes = new Uint8Array(new Float64Array([d]).buffer);

        for (let i = bytes.length - 1; i >= 0; i--) {
            this.writeByte(bytes[i]);
        }
    }

    writeFloatBE(d) {
        let bytes = new Uint8Array(new Float32Array([d]).buffer);

        for (let i = bytes.length - 1; i >= 0; i--) {
            this.writeByte(bytes[i]);
        }
    }

    // Write an ASCII string to the stream
    writeString(s) {
        for (let i = 0; i < s.length; i++) {
            this.data[this.pos++] = s.charCodeAt(i);
        }
    }

    writeEBMLVarIntWidth(i, width) {
        switch (width) {
            case 1:
                this.writeU8((1 << 7) | i);
                break;
            case 2:
                this.writeU8((1 << 6) | (i >> 8));
                this.writeU8(i);
                break;
            case 3:
                this.writeU8((1 << 5) | (i >> 16));
                this.writeU8(i >> 8);
                this.writeU8(i);
                break;
            case 4:
                this.writeU8((1 << 4) | (i >> 24));
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
                break;
            case 5:
                /*
                 * JavaScript converts its doubles to 32-bit integers for bitwise
                 * operations, so we need to do a division by 2^32 instead of a
                 * right-shift of 32 to retain those top 3 bits
                 */
                this.writeU8((1 << 3) | ((i / 4294967296) & 0x7));
                this.writeU8(i >> 24);
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
                break;
            case 6:
                this.writeU8((1 << 2) | ((i / 1099511627776) & 0x3));
                this.writeU8(i >> 32);
                this.writeU8(i >> 24);
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
                break;
            case 7:
                this.writeU8((1 << 1) | ((i / 281474976710656) & 0x1));
                this.writeU8(i >> 40);
                this.writeU8(i >> 32);
                this.writeU8(i >> 24);
                this.writeU8(i >> 16);
                this.writeU8(i >> 8);
                this.writeU8(i);
                break;
            case 8:
                this.writeU8(0x01);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                this.writeU8(0xFF);
                break;
            default:
                throw new Error('Bad EBML VINT size ' + width);
        }
    }

    measureEBMLVarInt(val) {
        if (typeof val !== 'number' || isNaN(val)) {
            throw new Error(`EBML VINT值必须是数字，收到: ${typeof val} (${val})`);
        }
        if (val < 0) {
            throw new Error(`EBML VINT值不能为负数: ${val}`);
        }
        console.log(val)
        if (val < (1 << 7) - 1) {
            return 1;
        } else if (val < (1 << 14) - 1) {
            return 2;
        } else if (val < (1 << 21) - 1) {
            return 3;
        } else if (val < (1 << 28) - 1) {
            return 4;
        } else if (val < 34359738367) {  // 2 ^ 35 - 1
            return 5;
        } else if (val < 1099511627775) {  // 2^40 -1
            return 6;
        } else if (val < 281474976710655) {  // 2^48 -1
            return 7;
        } else {
            return 8; // 用于表示未知长度
        }
    }

    writeEBMLVarInt(i) {
        this.writeEBMLVarIntWidth(i, this.measureEBMLVarInt(i));
    }

    writeUnsignedIntBE(u, width) {
        if (width === undefined) {
            width = this.measureUnsignedInt(u);
        }

        // Each case falls through:
        switch (width) {
            case 5:
                this.writeU8(
                    Math.floor(u / 4294967296));  // Need to use division to access >32
            // bits of floating point var
            case 4:
                this.writeU8(u >> 24);
            case 3:
                this.writeU8(u >> 16);
            case 2:
                this.writeU8(u >> 8);
            case 1:
                this.writeU8(u);
                break;
            default:
                throw new Error('Bad UINT size ' + width);
        }
    }

    // Return the number of bytes needed to hold the non-zero bits of the given
    // unsigned integer.
    measureUnsignedInt(val) {
        // Force to 32-bit unsigned integer
        if (val < (1 << 8)) {
            return 1;
        } else if (val < (1 << 16)) {
            return 2;
        } else if (val < (1 << 24)) {
            return 3;
        } else if (val < 4294967296) {
            return 4;
        } else {
            return 5;
        }
    }

    // Return a view on the portion of the buffer from the beginning to the current
    // seek position as a Uint8Array.
    getAsDataArray() {
        console.log(this.pos, this.data.byteLength, this.data)
        if (this.pos < this.data.byteLength) {
            return this.data.subarray(0, this.pos);
        } else if (this.pos == this.data.byteLength) {
            return this.data;
        } else {
            throw new Error('ArrayBufferDataStream\'s pos lies beyond end of buffer');
        }
    }
}
