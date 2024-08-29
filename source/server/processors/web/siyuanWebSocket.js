globalThis[Symbol.for('AssetsManagerStatus')]=globalThis[Symbol.for('AssetsManagerStatus')]|| {
    socket:null,
    port:null,
    connected:false,
    closed:true,
    messageQueue:[],
    listeners:{}
}
let status=globalThis[Symbol.for('AssetsManagerStatus')]
const messageQueue=status.messageQueue||[]
export  async function createSiyuanBroadcastChannel(channel,port){
    if(status.connected){
        return status.socket
    }
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/broadcast?channel=${channel}&&token=xqatmtk3jfpchiah`);
    //socket连接成功时返回socket
    return new Promise((resolve,reject)=>{
        socket.onopen=()=>{
            status.connected=true
            status.closed=false
            status.socket=socket
            status.port=port
            resolve(socket)
            //发送消息队列中的消息
            messageQueue.forEach(message=>{
                socket.send(message)
            })
            //添加事件监听
            addEvent('message',(e)=>{
                status.listeners['message'].forEach(callback=>{
                    callback(e)
                })
            })
        }
        socket.onerror=(e)=>{
            status.connected=false
            status.closed=true
            status.socket=null
            status.port=null
            reject(e)
        }
        //自动重连
        socket.onclose=(e)=>{
            status.connected=false
            status.closed=true
            status.socket=null
            status.port=null
            setTimeout(()=>{
                createSiyuanBroadcastChannel(channel,port)
            },1000)
        }
    })
}
function addEvent(event,callback){
    if(!status.listeners[event]){
        status.listeners[event]=[]
    }
    status.listeners[event].push(callback)
    if(status.socket){
        status.socket.addEventListener(event,callback)
    }
}
export function PussMessage(message){
    //如果socket连接成功，则直接发送消息
    if(status.connected){
        status.socket.send(message)
    }else{
        //如果socket连接失败，则将消息放入队列中
        messageQueue.push(message)
    }
}
export function ListenMessage(callback){
    
}