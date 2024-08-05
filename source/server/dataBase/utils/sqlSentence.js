export const runSqlWithDb=(sql,db)=>{
    return db.prepare(sql).run();
}
export const runSqlFromFile=(sqlFilePath,db)=>{
    const sql=fs.readFileSync(sqlFilePath,'utf-8');
    return db.prepare(sql).run();
}
/**
 * 用于判定用户输入的sql字符串是否是"只读的",避免误操作
 * @param {*} sqlString 
 */
export const isSafeSentence =(sqlString)=>{

}