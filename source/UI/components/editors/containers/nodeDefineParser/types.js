// 类型定义和常量
export const TYPE_MAP = {
    'string': String,
    'number': Number,
    'boolean': Boolean,
    'object': Object,
    'array': Array,
    'function': Function,
    'date': Date,
    'regexp': RegExp,
    'promise': Promise,
    'any': null,
    'null': null,
    'undefined': undefined,
    'symbol': Symbol,
    'bigint': BigInt,
    'map': Map,
    'set': Set,
    'weakmap': WeakMap,
    'weakset': WeakSet
  } ;
export const AnchorTypes = {
    INPUT: 'input',
    OUTPUT: 'output'
};
export const Sides = {
    LEFT: 'left',
    RIGHT: 'right'
};
export const LogTypes = {
    LOG: 'log',
    WARN: 'warn',
    ERROR: 'error'
};
export class ValidationError extends Error {
    constructor(message, details) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

export class NodeError extends Error {
    constructor(message, nodeId, details = {}) {
      super(message);
      this.nodeId = nodeId;
      this.details = details;
      this.name = 'NodeError';
    }
  }
  