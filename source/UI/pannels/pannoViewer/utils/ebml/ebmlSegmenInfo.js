import { EBMLFloat64 } from "./ebmlFloat64.js";

let segmentDuration = {
    id: 0x4489,  // Duration元素ID
    data: new EBMLFloat64(0)  // 初始化为0
};


export const createDefaultSegmentInfo = () => {
    return {
        'id': 0x1549a966,  // Info
        'data': [
            {
                'id': 0x2ad7b1,  // TimecodeScale
                'data': 1e6  // Times will be in microseconds (1e6 nanoseconds
                // per step = 1ms)
            },
            {
                'id': 0x4d80,  // MuxingApp
                'data': 'webm-writer-js',
            },
            {
                'id': 0x5741,  // WritingApp
                'data': 'webm-writer-js'
            },
            segmentDuration  // To be filled in later
        ]
    };

}