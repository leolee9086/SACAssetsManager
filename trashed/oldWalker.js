export async function walkAsync(root, _filter, _stepCallback, useProxy = true, signal = { aborted: false }) {
    const files = [];
    const stepCallback = buildStepCallback(_stepCallback)
    console.log('stepCallback', stepCallback && stepCallback.preMatch)
    const filter = buildFilter(_filter, signal)
    async function readDir(dir, depth,) {
        if (signal.aborted) {
            stepCallback && stepCallback.end()
            return
        }
        let entries = []
        try {
            entries = readdirSyncWithCache(dir);
        } catch (error) {
            return
        }
        for await (let entry of entries) {
            if (signal.aborted) {
                stepCallback && stepCallback.end()
                return
            }
            const isDir = entry.isDirectory()
            if (isDir) {
                const statProxy = buildStatProxy(entry, dir, useProxy, 'dir')

                stepCallback && await stepCallback(statProxy)
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback && stepCallback.preMatch && await stepCallback.preMatch(statProxy)
                let filterResult = filter && (!filter(statProxy, depth));
                if (filterResult) {
                    continue
                } else {
                    if (signal.aborted) {
                        stepCallback && stepCallback.end()
                        return
                    }
                    await readDir(拼接文件名(dir, entry.name), depth + 1)
                }
            } else {
                const statProxy = buildStatProxy(entry, dir, useProxy, 'file')
                if (signal.aborted) {
                    stepCallback && stepCallback.end()
                    return
                }
                stepCallback && stepCallback.preMatch && await stepCallback.preMatch(statProxy)
                let filterResult = filter && (!filter(statProxy, depth));
                if (filterResult) {
                    continue
                } else {
                    files.push(statProxy)
                    stepCallback && await stepCallback(statProxy)
                }
            }
        }
    }
    await readDir(root, depth);
    console.log('walkEnd')
    stepCallback && stepCallback.end()
    return files;
}

