export const createEbmlHeader = () => {
    return {
        'id': 0x1a45dfa3,  // EBML
        'data': [
            {
                'id': 0x4286,  // EBMLVersion
                'data': 1
            },
            {
                'id': 0x42f7,  // EBMLReadVersion
                'data': 1
            },
            {
                'id': 0x42f2,  // EBMLMaxIDLength
                'data': 4
            },
            {
                'id': 0x42f3,  // EBMLMaxSizeLength
                'data': 8
            },
            {
                'id': 0x4282,  // DocType
                'data': 'webm'
            },
            {
                'id': 0x4287,  // DocTypeVersion
                'data': 2
            },
            {
                'id': 0x4285,  // DocTypeReadVersion
                'data': 2
            }
        ]

    }
}