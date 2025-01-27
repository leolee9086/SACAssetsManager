import { EBMLFloat64 } from "./ebmlFloat64.js";
function validateElement(element){
    if (typeof element.id !== 'number' || isNaN(element.id)) {
        throw new Error(`无效的EBML元素ID: ${element.id}`);
      }
      if (element.data === undefined || element.data === null) {
        throw new Error(`EBML元素数据未定义 (ID: 0x${element.id.toString(16)})`);
      }
  
}
export function writeEBML(stream, baseOffset, el) {
    function writeElement(el, parentOffset) {
        validateElement(el); // 验证元素有效性
        const startOffset = stream.pos;
        // 写入元素ID时添加保护
        const elementId = Number(el.id);
        console.log(elementId)
        if (isNaN(elementId)) {
            throw new Error(`非法的EBML元素ID: ${el.id}`);
        }
        stream.writeEBMLVarInt(elementId);
        // 计算数据大小时添加默认值
        let dataSize = 0;
        if (Array.isArray(el.data)) {
            el.data.forEach(child => {
                dataSize += writeElement(child, parentOffset);
            });
        } else if (el.data instanceof EBMLFloat64) {
            dataSize = 8; // 64位浮点数固定8字节
        } else if (typeof el.data === 'number') {
            dataSize = stream.measureUnsignedInt(el.data);
        } else if (el.data instanceof Uint8Array) {
            dataSize = el.data.byteLength;
        } else if (typeof el.data === 'string') {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(el.data);
            dataSize = encoded.length;
        } else if (el.data === undefined || el.data === null) {
            throw new Error('EBML element data is undefined or null');
        }

        // 写入大小字段时添加保护
        const sizeValue = el.size === -1 ? 0x01FFFFFFFFFFFFFF : dataSize;
        const sizeWidth = el.size === -1 ? 8 : stream.measureEBMLVarInt(dataSize);

        if (sizeWidth < 1 || sizeWidth > 8) {
            throw new Error(`无效的EBML尺寸宽度: ${sizeWidth}`);
        }
        stream.writeEBMLVarIntWidth(sizeValue, sizeWidth);

        // 写入数据内容
        if (Array.isArray(el.data)) {
            // 子元素已递归处理
        } else if (el.data instanceof EBMLFloat64) {
            stream.writeBytes(new Uint8Array(el.data.data));
        } else if (typeof el.data === 'number') {
            stream.writeUnsignedIntBE(el.data);
        } else if (el.data instanceof Uint8Array) {
            stream.writeBytes(el.data);
        } else if (typeof el.data === 'string') {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(el.data);
            stream.writeBytes(encoded);
        }
        // 记录元素偏移量信息
        el.offset = baseOffset + startOffset;
        el.dataOffset = baseOffset + stream.pos - dataSize;
        el.size = stream.pos - startOffset - stream.measureEBMLVarInt(el.id) - stream.measureEBMLVarInt(dataSize);
        return stream.pos - startOffset;
    }

    // 处理元素数组的情况
    if (Array.isArray(el)) {
        el.forEach(element => {
            writeElement(element, baseOffset);
        });
    } else {
        writeElement(el, baseOffset);
    }
}
