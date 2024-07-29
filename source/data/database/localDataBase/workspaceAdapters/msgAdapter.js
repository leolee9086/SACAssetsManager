import { fileChunkAdapter } from "./fileChunkAdapter.js";
import { Encoder, Decoder } from "../../../../../static/msgpack@2.8.0.mjs";
const encoder = new Encoder();
const decoder = new Decoder();
export default class msgSyAdapter extends fileChunkAdapter {
    constructor(文件保存地址) {
        super(
            文件保存地址, 
            async (content) => { 
                let data= await encoder.encode(content) 
                console.log(data)
                return data
            }, 
            async (content) => { let data= await decoder.decode(new Uint8Array(content))
                console.log("解析",data)

                return data 
             }, 
            'msgpack'
            )
    }
}