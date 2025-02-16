import * as jieba from '../../../../static/jieba_rs_wasm.js'
await jieba.default(import.meta.resolve('../../../../static/jieba_rs_wasm_bg.wasm'))
export {jieba}
