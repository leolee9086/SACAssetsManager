
async function updateMasterTimestamp(masterFile, isMaster) {
    if (isMaster) {
        const now = new Date();
        await fs.utimes(masterFile, now, now);
    }
}

function connectToDatabase(dbPath, isMaster) {
    if (isMaster) {
        return new Database(dbPath);
    } else {
        return new Database(dbPath, { readonly: true });
    }
}

async function performDatabaseOperations(db, isMaster) {
    if (isMaster) {
        console.log("我是主客户端，可以进行写操作");
        // 执行写操作
        db.prepare("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value TEXT)").run();
        db.prepare("INSERT INTO test (value) VALUES (?)").run("测试数据");
    } else {
        console.log("我是只读客户端，只能进行读操作");
        // 执行读操作
        const rows = db.prepare("SELECT * FROM test").all();
        console.log(rows);
    }
}

async function runIteration(dbPath, lockFile, masterFile, masterTimeout) {
    const isMaster = await tryBecomeMaster(lockFile, masterFile, masterTimeout);
    const db = connectToDatabase(dbPath, isMaster);

    try {
        await performDatabaseOperations(db, isMaster);

        if (isMaster) {
            await updateMasterTimestamp(masterFile, isMaster);
        }
    } finally {
        db.close();
    }
}

async function run(dbPath, lockFile, masterFile, masterTimeout, iterationDelay) {
    while (true) {
        await runIteration(dbPath, lockFile, masterFile, masterTimeout);
        await new Promise(resolve => setTimeout(resolve, iterationDelay));
    }
}

// 配置参数
const config = {
    dbPath: path.join(__dirname, "database.sqlite"),
    lockFile: path.join(__dirname, "lock_file"),
    masterFile: path.join(__dirname, "master_file"),
    masterTimeout: 60000, // 60秒
    iterationDelay: 10000 // 10秒
};
