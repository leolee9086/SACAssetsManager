/**
 * @fileoverview Yjs单一实例入口
 * 
 * 该模块提供了对Yjs的单一实例访问，
 * 以避免多实例导致的constructor检查问题
 * 
 * @module yjsInstance
 */

// 导入Yjs并将其作为单一实例导出
import * as Y from '../../../../static/yjs.js'
export default Y 