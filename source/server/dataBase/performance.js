// 生成随机向量的函数
function generateRandomVector(dimensions) {
    return Array.from({ length: dimensions }, () => Math.random());
  }
  
  // 生成一百万个512维向量
  const dimensions = 512;
  const itemCount = 100000;
  const items = Array.from({ length: itemCount }, (_, i) => [i + 1, generateRandomVector(dimensions)]);
  
  
  // 准备插入语句
  const insertStmt = db.prepare(
    "INSERT INTO vec_items(rowid, embedding) VALUES (?, ?)"
  );
  
  // 定义事务函数
  const insertVectors = db.transaction((items) => {
    for (const [id, vector] of items) {
      insertStmt.run(BigInt(id), new Float32Array(vector));
    }
  });
  
  console.log("开始插入数据...");
  const insertStartTime = Date.now();
  insertVectors(items);
  const insertEndTime = Date.now();
  console.log(`插入 ${itemCount} 个向量耗时: ${insertEndTime - insertStartTime} 毫秒`);
  
  // 执行三次查询
  for (let i = 0; i < 3; i++) {
    const queryVector = generateRandomVector(dimensions);
    
    console.log(`开始第 ${i + 1} 次查询...`);
    const queryStartTime = Date.now();
    
    const rows = db
      .prepare(
        `
        SELECT
          rowid,
          distance
        FROM vec_items
        WHERE embedding MATCH ?
        ORDER BY distance
        LIMIT 5
      `
      )
      .all(new Float32Array(queryVector));
    
    const queryEndTime = Date.now();
    console.log(`第 ${i + 1} 次查询耗时: ${queryEndTime - queryStartTime} 毫秒`);
    console.log("查询结果:", rows);
  }
