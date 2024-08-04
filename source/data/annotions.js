export const annotions = {
    "type": "object",
    "properties": {
        "assetId": {
            "type": "string"
        },
        "annotations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": { "type": "string" },
                    "type": { "type": "string" },
                    "page": { "type": "number" },
                    "pos": {
                        "type": "object",
                        "properties": {
                            "section": { "type": "number" },
                            "start": { "type": "number" },
                            "end": { "type": "number" }
                        },
                        "required": ["section", "start", "end"]
                    },
                    "rect": {
                        "type": "array",
                        "items": { "type": "number" },
                        "minItems": 4,
                        "maxItems": 4
                    },
                    "timestamp": { "type": "string", "format": "date-time" },
                    "author": { "type": "string" },
                    "version": { "type": "number" },
                    "content": { "type": "string" },
                    "$selected": { "type": "boolean" },//临时存储的标注是否被选中，不存储
                    "$locked": { "type": "boolean" },//临时存储的标注是否被锁定，不存储
                    "$zIndex": { "type": "number" },//临时存储的标注层级，不存储
                    "$interactive": { "type": "boolean" },
                },
                "required": ["id", "type", "page", "pos", "rect", "timestamp", "author", "version", "content"]
            }
        }
    },
    "required": ["assetId", "annotations"]
}
