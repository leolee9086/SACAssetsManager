const createAnnotationsTable = `
CREATE TABLE IF NOT EXISTS annotations (
    annotation_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    annotation_type TEXT NOT NULL,
    block_id TEXT,
    page INTEGER NOT NULL,
    section INTEGER NOT NULL,
    start INTEGER NOT NULL,
    end INTEGER NOT NULL,
    rectangle BLOB NOT NULL, 
    timestamp TEXT NOT NULL,
    author TEXT NOT NULL,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    interactive BOOLEAN NOT NULL,
    PRIMARY KEY (asset_id, annotation_id)
);
`;
export const createAnnotationsTableWithDb = (db) => {
    db.prepare(createAnnotationsTable).run();
}
/***
 * 校验并创建标注对象
 * asset_id 资产id,必须存在于assets表中
 * annotations 标注对象
 */
export const createAnnotations =(db,asset_id,annotations)=>{
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset_id);
    if (!asset) {
        throw new Error('Asset not found');
    }else{
        // 校验annotations
        const annotation_id = annotations.annotation_id;
        const annotation_type = annotations.annotation_type;
        const block_id = annotations.block_id;
        const page = annotations.page;
        const section = annotations.section;
        const start = annotations.start;
        const end = annotations.end;
        const rectangle = annotations.rectangle;
        const timestamp = annotations.timestamp;
        const author = annotations.author;
        const version = annotations.version;
        const content = annotations.content;
        const interactive = annotations.interactive;
    }
}