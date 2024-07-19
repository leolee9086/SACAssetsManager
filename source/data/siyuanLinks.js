async function fetchLinks(tab) {
    let query = "select * from spans  limit 102400"
    if (tab.data && tab.data.block_id) {
        query = `select * from spans where root_id like '%${tab.data.block_id}%' limit 102400`
    } else if (tab.data.box) {
        query = `select * from spans where box = '${tab.data.box}' limit 102400`
    }

    const json = await fetch('/api/query/sql', {
        method: "POST",
        body: JSON.stringify({
            stmt: query// 获取前300个
        })
    }).then(data => data.json())

    let data = await json.data.map(
        (item, i) => {
            return {
                ...item,
                format: item.type,
                path: `data:text/markdown;charset=utf-8,${item.markdown}`,
                cleanPath: item.id
            }
        }
    ).filter(
        item => !(item.markdown.indexOf('](assets') >= 0) && item.format === 'textmark a'
    )
    return data
}
