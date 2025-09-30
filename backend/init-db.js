const db = require('./database.js');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const saltRounds = 10;
const migrationsPath = path.join(__dirname, 'migrations');

function runMigrations(callback) {
    console.log('正在檢查並執行資料庫遷移...');
    fs.readdir(migrationsPath, (err, files) => {
        if (err) {
            console.error("無法讀取遷移目錄:", err);
            return callback(err);
        }

        const sqlFiles = files.filter(file => file.endsWith('.sql')).sort();
        if (sqlFiles.length === 0) {
            console.log('沒有找到遷移檔案，繼續初始化...');
            return callback();
        }

        db.serialize(() => {
            sqlFiles.forEach(file => {
                const filePath = path.join(migrationsPath, file);
                const sql = fs.readFileSync(filePath, 'utf8');
                db.exec(sql, (err) => {
                    if (err) {
                        console.error(`執行遷移失敗 (${file}):`, err.message);
                    } else {
                        console.log(`遷移檔案 ${file} 已成功執行。`);
                    }
                });
            });

            // 在 serialize 隊列的末尾添加回調
            db.run('', () => { 
                console.log('所有遷移已執行完畢。');
                callback();
            });
        });
    });
}

function insertInitialData(callback) {
    console.log('正在插入預設資料...');
    db.serialize(() => {
        const classrooms = ["演藝廳", "綜合教室", "文昌二樓教室", "文昌三樓音樂教室", "中廊", "木舞台"];
        const insertClassroom = `INSERT OR IGNORE INTO Classrooms (id, name) VALUES (?, ?)`;
        classrooms.forEach((name, index) => {
            db.run(insertClassroom, [index + 1, name]);
        });
        console.log("預設教室資料已準備。");

        const timeslots = [
            { id: 1, name: '主課', start: '08:30', end: '10:10' },
            { id: 2, name: '早一', start: '10:40', end: '11:25' },
            { id: 3, name: '早二', start: '11:35', end: '12:25' },
            { id: 4, name: '午一', start: '13:30', end: '14:20' },
            { id: 5, name: '午二', start: '14:25', end: '15:15' },
            { id: 6, name: '午三', start: '15:40', end: '16:30' }
        ];
        const insertTimeslot = `INSERT OR IGNORE INTO TimeSlots (id, name, start_time, end_time) VALUES (?, ?, ?, ?)`;
        timeslots.forEach(slot => {
            db.run(insertTimeslot, [slot.id, slot.name, slot.start, slot.end]);
        });
        console.log("預設時段資料已準備。");

        const adminUsername = 'admin';
        const adminPassword = 'password123';
        bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
            if (err) return callback(err);
            const insertAdmin = `INSERT OR IGNORE INTO AdminUsers (username, password_hash, role) VALUES (?, ?, 'admin')`;
            db.run(insertAdmin, [adminUsername, hash], function(err) {
                if (err) {
                    console.error("插入管理員帳號失敗:", err.message);
                } else {
                    console.log("管理員帳號已準備。");
                }
                callback();
            });
        });
    });
}

// 主執行流程
runMigrations((err) => {
    if (err) {
        console.error("資料庫遷移過程中發生錯誤，初始化終止。");
        db.close();
        return;
    }
    
    insertInitialData((err) => {
        if (err) {
            console.error("插入預設資料時發生錯誤:", err.message);
        } else {
            console.log('資料庫初始化流程完成。');
        }
        
        db.close((err) => {
            if (err) {
                return console.error('關閉資料庫時出錯:', err.message);
            }
            console.log('資料庫連線已成功關閉。');
        });
    });
});