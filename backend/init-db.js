const { createClient } = require('@libsql/client');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const saltRounds = 10;
const migrationsPath = path.join(__dirname, 'migrations');

async function runMigrations() {
    console.log('正在檢查並執行資料庫遷移...');
    const files = fs.readdirSync(migrationsPath);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
        const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const statement of statements) {
            await client.execute(statement);
        }
        console.log(`遷移檔案 ${file} 已成功執行。`);
    }
    console.log('所有遷移已執行完畢。');
}

async function insertInitialData() {
    console.log('正在插入預設資料...');

    const classrooms = ["演藝廳", "綜合教室", "文昌二樓教室", "文昌三樓音樂教室", "中廊", "木舞台"];
    for (let i = 0; i < classrooms.length; i++) {
        await client.execute({
            sql: `INSERT OR IGNORE INTO Classrooms (id, name) VALUES (?, ?)`,
            args: [i + 1, classrooms[i]]
        });
    }
    console.log("預設教室資料已準備。");

    const timeslots = [
        { id: 1, name: '主課', start: '08:30', end: '10:10' },
        { id: 2, name: '早一', start: '10:40', end: '11:25' },
        { id: 3, name: '早二', start: '11:35', end: '12:25' },
        { id: 4, name: '午一', start: '13:30', end: '14:20' },
        { id: 5, name: '午二', start: '14:25', end: '15:15' },
        { id: 6, name: '午三', start: '15:40', end: '16:30' }
    ];
    for (const slot of timeslots) {
        await client.execute({
            sql: `INSERT OR IGNORE INTO TimeSlots (id, name, start_time, end_time) VALUES (?, ?, ?, ?)`,
            args: [slot.id, slot.name, slot.start, slot.end]
        });
    }
    console.log("預設時段資料已準備。");

    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!adminPassword) {
        console.warn('警告：未設定 ADMIN_INITIAL_PASSWORD，跳過管理員帳號建立。');
        return;
    }

    const hash = await bcrypt.hash(adminPassword, saltRounds);
    await client.execute({
        sql: `INSERT OR IGNORE INTO AdminUsers (username, password_hash, role) VALUES (?, ?, 'admin')`,
        args: ['admin', hash]
    });
    console.log("管理員帳號已準備。");
}

(async () => {
    try {
        await runMigrations();
        await insertInitialData();
        console.log('資料庫初始化流程完成。');
    } catch (err) {
        console.error("初始化失敗:", err.message);
        process.exit(1);
    }
})();
