let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.buffer !== wasm.memory.buffer) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
};

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.buffer !== wasm.memory.buffer) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

let cachedFloat32Memory0 = null;

function getFloat32Memory0() {
    if (cachedFloat32Memory0 === null || cachedFloat32Memory0.buffer !== wasm.memory.buffer) {
        cachedFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getFloat32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedUint32Memory0 = null;

function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.buffer !== wasm.memory.buffer) {
        cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4);
    getUint32Memory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function getArrayU32FromWasm0(ptr, len) {
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1);
    getUint8Memory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
/**
*/
export function init_env() {
    wasm.init_env();
}

/**
*/
export class BruteForceIndexUsize {

    static __wrap(ptr) {
        const obj = Object.create(BruteForceIndexUsize.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_bruteforceindexusize_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {boolean}
    */
    build(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bruteforceindexusize_build(this.ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} idx
    * @returns {boolean}
    */
    add(vs, idx) {
        const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bruteforceindexusize_add(this.ptr, ptr0, len0, idx);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    clear() {
        const ret = wasm.bruteforceindexusize_clear(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    size() {
        const ret = wasm.bruteforceindexusize_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Float32Array} flat_vs
    * @param {number} length
    * @param {Uint32Array} idx
    * @returns {boolean}
    */
    bulk_add(flat_vs, length, idx) {
        const ptr0 = passArrayF32ToWasm0(flat_vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(idx, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.bruteforceindexusize_bulk_add(this.ptr, ptr0, len0, length, ptr1, len1);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} k
    * @returns {Uint32Array}
    */
    search(vs, k) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.bruteforceindexusize_search(retptr, this.ptr, ptr0, len0, k);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    name() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.bruteforceindexusize_name(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {Uint8Array}
    */
    dump_index() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.bruteforceindexusize_dump_index(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} serialized
    * @returns {BruteForceIndexUsize}
    */
    static load_index(serialized) {
        const ptr0 = passArray8ToWasm0(serialized, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.bruteforceindexusize_load_index(ptr0, len0);
        return BruteForceIndexUsize.__wrap(ret);
    }
    /**
    * @param {number} dimension
    * @returns {BruteForceIndexUsize}
    */
    static new(dimension) {
        const ret = wasm.bruteforceindexusize_new(dimension);
        return BruteForceIndexUsize.__wrap(ret);
    }
}
/**
*/
export class HNSWIndexUsize {

    static __wrap(ptr) {
        const obj = Object.create(HNSWIndexUsize.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hnswindexusize_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {boolean}
    */
    build(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hnswindexusize_build(this.ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} idx
    * @returns {boolean}
    */
    add(vs, idx) {
        const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hnswindexusize_add(this.ptr, ptr0, len0, idx);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    clear() {
        const ret = wasm.bruteforceindexusize_clear(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    size() {
        const ret = wasm.bruteforceindexusize_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Float32Array} flat_vs
    * @param {number} length
    * @param {Uint32Array} idx
    * @returns {boolean}
    */
    bulk_add(flat_vs, length, idx) {
        const ptr0 = passArrayF32ToWasm0(flat_vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(idx, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.hnswindexusize_bulk_add(this.ptr, ptr0, len0, length, ptr1, len1);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} k
    * @returns {Uint32Array}
    */
    search(vs, k) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.hnswindexusize_search(retptr, this.ptr, ptr0, len0, k);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    name() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.hnswindexusize_name(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {Uint8Array}
    */
    dump_index() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.hnswindexusize_dump_index(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} serialized
    * @returns {HNSWIndexUsize}
    */
    static load_index(serialized) {
        const ptr0 = passArray8ToWasm0(serialized, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hnswindexusize_load_index(ptr0, len0);
        return HNSWIndexUsize.__wrap(ret);
    }
    /**
    * @param {number} dimension
    * @param {number} max_item
    * @param {number} n_neigh
    * @param {number} n_neigh0
    * @param {number} ef_build
    * @param {number} ef_search
    * @param {boolean} has_deletion
    * @returns {HNSWIndexUsize}
    */
    static new(dimension, max_item, n_neigh, n_neigh0, ef_build, ef_search, has_deletion) {
        const ret = wasm.hnswindexusize_new(dimension, max_item, n_neigh, n_neigh0, ef_build, ef_search, has_deletion);
        return HNSWIndexUsize.__wrap(ret);
    }
}
/**
*/
export class IVFPQIndexUsize {

    static __wrap(ptr) {
        const obj = Object.create(IVFPQIndexUsize.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ivfpqindexusize_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {boolean}
    */
    build(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ivfpqindexusize_build(this.ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} idx
    * @returns {boolean}
    */
    add(vs, idx) {
        const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ivfpqindexusize_add(this.ptr, ptr0, len0, idx);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    clear() {
        const ret = wasm.bruteforceindexusize_clear(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    size() {
        const ret = wasm.bruteforceindexusize_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Float32Array} flat_vs
    * @param {number} length
    * @param {Uint32Array} idx
    * @returns {boolean}
    */
    bulk_add(flat_vs, length, idx) {
        const ptr0 = passArrayF32ToWasm0(flat_vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(idx, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.ivfpqindexusize_bulk_add(this.ptr, ptr0, len0, length, ptr1, len1);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} k
    * @returns {Uint32Array}
    */
    search(vs, k) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.ivfpqindexusize_search(retptr, this.ptr, ptr0, len0, k);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    name() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ivfpqindexusize_name(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {Uint8Array}
    */
    dump_index() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ivfpqindexusize_dump_index(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} serialized
    * @returns {IVFPQIndexUsize}
    */
    static load_index(serialized) {
        const ptr0 = passArray8ToWasm0(serialized, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ivfpqindexusize_load_index(ptr0, len0);
        return IVFPQIndexUsize.__wrap(ret);
    }
    /**
    * @param {number} dimension
    * @param {number} n_sub
    * @param {number} sub_bits
    * @param {number} n_kmeans_center
    * @param {number} search_n_center
    * @param {number} train_epoch
    * @returns {IVFPQIndexUsize}
    */
    static new(dimension, n_sub, sub_bits, n_kmeans_center, search_n_center, train_epoch) {
        const ret = wasm.ivfpqindexusize_new(dimension, n_sub, sub_bits, n_kmeans_center, search_n_center, train_epoch);
        return IVFPQIndexUsize.__wrap(ret);
    }
}
/**
*/
export class PQIndexUsize {

    static __wrap(ptr) {
        const obj = Object.create(PQIndexUsize.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pqindexusize_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {boolean}
    */
    build(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pqindexusize_build(this.ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} idx
    * @returns {boolean}
    */
    add(vs, idx) {
        const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pqindexusize_add(this.ptr, ptr0, len0, idx);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    clear() {
        const ret = wasm.bruteforceindexusize_clear(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    size() {
        const ret = wasm.bruteforceindexusize_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Float32Array} flat_vs
    * @param {number} length
    * @param {Uint32Array} idx
    * @returns {boolean}
    */
    bulk_add(flat_vs, length, idx) {
        const ptr0 = passArrayF32ToWasm0(flat_vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(idx, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.pqindexusize_bulk_add(this.ptr, ptr0, len0, length, ptr1, len1);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} k
    * @returns {Uint32Array}
    */
    search(vs, k) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.pqindexusize_search(retptr, this.ptr, ptr0, len0, k);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    name() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pqindexusize_name(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {Uint8Array}
    */
    dump_index() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.pqindexusize_dump_index(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} serialized
    * @returns {PQIndexUsize}
    */
    static load_index(serialized) {
        const ptr0 = passArray8ToWasm0(serialized, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pqindexusize_load_index(ptr0, len0);
        return PQIndexUsize.__wrap(ret);
    }
    /**
    * @param {number} dimension
    * @param {number} n_sub
    * @param {number} sub_bits
    * @param {number} train_epoch
    * @returns {PQIndexUsize}
    */
    static new(dimension, n_sub, sub_bits, train_epoch) {
        const ret = wasm.pqindexusize_new(dimension, n_sub, sub_bits, train_epoch);
        return PQIndexUsize.__wrap(ret);
    }
}
/**
*/
export class SSGIndexUsize {

    static __wrap(ptr) {
        const obj = Object.create(SSGIndexUsize.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ssgindexusize_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {boolean}
    */
    build(s) {
        const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ssgindexusize_build(this.ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} idx
    * @returns {boolean}
    */
    add(vs, idx) {
        const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ssgindexusize_add(this.ptr, ptr0, len0, idx);
        return ret !== 0;
    }
    /**
    * @returns {boolean}
    */
    clear() {
        const ret = wasm.bruteforceindexusize_clear(this.ptr);
        return ret !== 0;
    }
    /**
    * @returns {number}
    */
    size() {
        const ret = wasm.ssgindexusize_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {Float32Array} flat_vs
    * @param {number} length
    * @param {Uint32Array} idx
    * @returns {boolean}
    */
    bulk_add(flat_vs, length, idx) {
        const ptr0 = passArrayF32ToWasm0(flat_vs, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(idx, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.ssgindexusize_bulk_add(this.ptr, ptr0, len0, length, ptr1, len1);
        return ret !== 0;
    }
    /**
    * @param {Float32Array} vs
    * @param {number} k
    * @returns {Uint32Array}
    */
    search(vs, k) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArrayF32ToWasm0(vs, wasm.__wbindgen_malloc);
            const len0 = WASM_VECTOR_LEN;
            wasm.ssgindexusize_search(retptr, this.ptr, ptr0, len0, k);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v1 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @returns {string}
    */
    name() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ssgindexusize_name(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_free(r0, r1);
        }
    }
    /**
    * @returns {Uint8Array}
    */
    dump_index() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ssgindexusize_dump_index(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 1);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    * @param {Uint8Array} serialized
    * @returns {SSGIndexUsize}
    */
    static load_index(serialized) {
        const ptr0 = passArray8ToWasm0(serialized, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ssgindexusize_load_index(ptr0, len0);
        return SSGIndexUsize.__wrap(ret);
    }
    /**
    * @param {number} dimension
    * @param {number} neighbor_neighbor_size
    * @param {number} init_k
    * @param {number} index_size
    * @param {number} angle
    * @param {number} root_size
    * @returns {SSGIndexUsize}
    */
    static new(dimension, neighbor_neighbor_size, init_k, index_size, angle, root_size) {
        const ret = wasm.ssgindexusize_new(dimension, neighbor_neighbor_size, init_k, index_size, angle, root_size);
        return SSGIndexUsize.__wrap(ret);
    }
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function getImports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
        try {
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(arg0, arg1);
        }
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_crypto_70a96de3b6b73dac = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg_process_dd1577445152112e = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_58036bec3add9e6f = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_6a9d28205ed5b0d8 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_msCrypto_adbc770ec9eca9c7 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_b56c882b57805732 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_require_f05d779769764e82 = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_9495de66fdbe016b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_e7c1f827057f6584 = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_a09ec664e14b1b81 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_87cbb8506fecf3a9 = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_c85a9259e621f3db = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_newnoargs_2b8b6bd7753c76ba = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_95d1ea488d03e4e8 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_subarray_7526649b91a252a6 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getRandomValues_3774744e221a22ad = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_cf65c07de34b9a08 = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_537b7341ce90bb31 = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_17499e8aa4003ebd = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_9fb2f11355ecadf5 = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_e950366c42764a07 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    return imports;
}

function initMemory(imports, maybe_memory) {
    imports.wbg.memory = maybe_memory || new WebAssembly.Memory({initial:18,maximum:65536,shared:true});
}

function finalizeInit(instance, module) {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    cachedFloat32Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;

    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module, maybe_memory) {
    const imports = getImports();

    initMemory(imports, maybe_memory);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return finalizeInit(instance, module);
}

async function init(input, maybe_memory) {
    if (typeof input === 'undefined') {
        input = new URL('horajs_bg.wasm', import.meta.url);
    }
    const imports = getImports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    initMemory(imports, maybe_memory);

    const { instance, module } = await load(await input, imports);

    return finalizeInit(instance, module);
}

export { initSync }
export default init;
