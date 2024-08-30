export function stat2assetsItemStringLine(stat){
    const { name, path, type, size, mtime, mtimems, error } = stat;
    const data = JSON.stringify({ name, path, id: `localEntrie_${path}`, type: 'local', size, mtime, mtimems, error }) + '\n';
    return (`data:${data}\n`)
}