export const buildFilterStream = (filter) => {
    let _filter
    if (filter instanceof Function) {
        _filter = {
            raw: filter,
            test: (...args) => {
                return filter(...args)
            }
        }
    }else{
        _filter=filter
    }
    const transformStream = new (require('stream')).Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            if (_filter) {
                if (_filter.test(chunk)) {
                    this.push(chunk)
                    callback()
                    return
                }
            }
            this.push(chunk)
            callback()
            return
        }
    });
    return transformStream
}