/**'
 *一个eventBus
 */
const EventEmitter = require('events');
const webSocket = require('ws');
class wsEventListener {
    constructor(wsTargets, eventBus) {
        this.wsTargets = wsTargets
        this.eventBus = eventBus
        this.addMessageListener()
    }
    addMessageListener() {
        this.wsTargets.on('message', (message) => {
            //解析message,根据message.type,message.data,message.option
            this.eventBus.emit(message.type, message.data, message.option)
        })
    }
}
export class BackendEvents extends EventEmitter {
    constructor(ports, wsTargets) {
        ports.forEach(port => {
            this.ws = new webSocket.WebSocketServer({ port: port });
        });
        wsTargets.forEach(wsTarget => {
            this.ws.add(wsTarget);
        });
        this.wsEventListener = new wsEventListener(this.wsTargets, this)
        super();
    }
    on(event, listener) {
        super.on(event, listener);
    }
    broadcast(event, ...args) {
        this.wsTargets.forEach(wsTarget => {
            wsTarget.send(JSON.stringify({ type: event, data: args }));
        });
    }
    emitBroadcast(event, ...args) {
        let fn = this.prepareEmit(event, ...args)
        fn().broadcast()
    }
    /**
     * 
     * @param {*} event 
     * @param {*} args 
     * @returns 
     */
    prepareEmit(event, ...args) {
        let fn = () => {
            super.emit(event, ...args);
            return {
                broadcast: () => {
                    this.broadcast(event, ...args);
                }
            }
        }

        return fn
    }
    off(event, listener) {
        super.off(event, listener);
    }
    once(event, listener) {
        super.once(event, listener);
    }
    removeListener(event, listener) {
        super.removeListener(event, listener);
    }
    removeAllListeners(event) {
        super.removeAllListeners(event);
    }
    listeners(event) {
        return super.listeners(event);
    }
}