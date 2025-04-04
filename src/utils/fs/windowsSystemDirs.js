export const ignoreDir = [
    '$recycle',
    '$trash',
    '.git',
    '.sac',
    '$RECYCLE.BIN',
    '#recycle',
    '.pnpm-store',
    'System Volume Information',
    'Windows/WinSxS',
    'Windows\\WinSxS',
    'temp',
    '\\repo\\objects',
    '/repo/objects'
]
export const 判定路径排除 = (name, path) => {
    for (let dir of ignoreDir) {
        if (path.toLowerCase().indexOf(dir.toLowerCase()) !== -1) {
            return true
        }
    }
    return false
}