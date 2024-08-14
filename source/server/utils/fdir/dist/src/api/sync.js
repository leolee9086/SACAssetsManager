"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = void 0;
const walker_1 = require("./walker");
function sync(root, options) {
    const walker = new walker_1.Walker(root, options);
    return walker.start();
}
function stream(root, options) {
    const walker = new walker_1.Walker(root, options, null, true);
    const { state } = walker
    state.paths = new Proxy(state.paths, {
        get: function (target, prop) {
            if (prop === 'push') {
                return function (value) {
                    if (value !== null) {
                        stream.push(value);
                    } else {
                        stream.end();
                    }
                }
            }
            return target[prop];
        },
        set: function (target, prop, value) {
            target[prop] = value;
            return true;
        }
    });


    //通过代理劫持paths,每当push时,将路径推送到一个流中,然后返回这个流
    // 创建一个可读流
    const { Readable } = require('stream');

    const stream = new Readable({
        objectMode: true,

        read() { }
    });
    //只劫持push方法


    setImmediate(() => {
        () => walker.start()
    })
    return stream
}
exports.sync = sync;
exports.stream = stream;