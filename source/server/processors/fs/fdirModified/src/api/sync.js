import * as  walker_1 from "./walker.js"
function sync(root, options) {
    const walker = new walker_1.Walker(root, options);
    return walker.start();
}
function stream(root, options) {
    const walker = new walker_1.Walker(root, options);
    const { state } = walker
    //通过代理劫持paths,每当push时,将路径推送到一个流中,然后返回这个流
    const stream = new WritableStream()
    state.paths = new Proxy(state.paths, {
        get: function (target, prop) {
            return target[prop]
        },
        set: function (target, prop, value) {
            target[prop] = value
            console.log(value)
            stream.push(value)
            return true
           // stream.push(value)
        }
        
    })
    return { stream, start: walker.start.bind(walker) }
}
export {sync,stream}