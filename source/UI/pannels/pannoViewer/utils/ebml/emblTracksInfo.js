let DEFAULT_TRACK_NUMBER = 1;

export const createEmblTracksInfo = (options)=>{
    let videoProperties = [
        {
            'id': 0xb0,  // PixelWidth
            'data': options.width
        },
        {
            'id': 0xba,  // PixelHeight
            'data': options.height
        }
    ];
    let tracks = {
        'id': 0x1654ae6b,  // Tracks
        'data': [{
            'id': 0xae,  // TrackEntry
            'data': [
                {
                    'id': 0xd7,  // TrackNumber
                    'data': DEFAULT_TRACK_NUMBER
                },
                {
                    'id': 0x73c5,  // TrackUID
                    'data': DEFAULT_TRACK_NUMBER
                },
                {
                    'id': 0x83,  // TrackType
                    'data': 1
                },
                {
                    'id': 0xe0,  // Video
                    'data': videoProperties
                },
                {
                    'id': 0x9c,  // FlagLacing
                    'data': 0
                },
                {
                    'id': 0x22b59c,  // Language
                    'data': 'und'
                },
                {
                    'id': 0xb9,  // FlagEnabled
                    'data': 1
                },
                {
                    'id': 0x88,  // FlagDefault
                    'data': 1
                },
                {
                    'id': 0x55aa,  // FlagForced
                    'data': 0
                },

                {
                    'id': 0x86,  // CodecID
                    'data': 'V_' + options.codec
                },
            ]
        }]
    };
    return tracks
}