const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5005;
const JWT_SECRET = 'your_super_secret_key_12345'; // 在生產環境中應使用更安全的密鑰

app.use(cors());
app.use(express.json());

// --- 靜態檔案服務 ---
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// --- 中介軟體 (Middleware) ---

// 驗證 JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401); // 未提供 Token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token 無效或過期
        req.user = user; // 將解碼後的使用者資訊附加到請求上
        next();
    });
};

// 驗證是否為管理員
const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: '權限不足，此操作需要管理員身份' });
    }
};

// --- 登入 API ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "請提供使用者名稱和密碼" });

    const sql = "SELECT * FROM AdminUsers WHERE username = ?";
    db.get(sql, [username], (err, user) => {
        if (err || !user) return res.status(401).json({ error: "使用者名稱或密碼錯誤" });

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (!result) return res.status(401).json({ error: "使用者名稱或密碼錯誤" });

            // *** 關鍵修改：在 Token 中加入 role ***
            const tokenPayload = { id: user.id, username: user.username, role: user.role };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
            res.json({ message: "登入成功", token });
        });
    });
});

// --- 使用者管理 API (僅限管理員) ---
app.get('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM AdminUsers ORDER BY id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ users: rows });
    });
});

app.post('/api/users', authenticateToken, authorizeAdmin, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: "請提供使用者名稱、密碼和角色" });
    if (role !== 'admin' && role !== 'teacher') return res.status(400).json({ error: "無效的角色，只能是 'admin' 或 'teacher'" });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: "密碼加密失敗" });

        const sql = `INSERT INTO AdminUsers (username, password_hash, role) VALUES (?, ?, ?)`;
        db.run(sql, [username, hash, role], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "使用者名稱已存在" });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "使用者建立成功", userId: this.lastID });
        });
    });
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, (req, res) => {
    if (req.user.id == req.params.id) {
        return res.status(403).json({ error: "不能刪除自己的帳號" });
    }
    db.run('DELETE FROM AdminUsers WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "找不到該使用者" });
        res.json({ message: "使用者已刪除" });
    });
});


// --- 教室管理 API ---

// 獲取所有教室 (公開)
app.get('/api/classrooms', (req, res) => {
    db.all("SELECT * FROM Classrooms ORDER BY id", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ classrooms: rows });
    });
});

// 新增教室 (僅限管理員)
app.post('/api/classrooms', authenticateToken, authorizeAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "請提供教室名稱" });

    const sql = `INSERT INTO Classrooms (name) VALUES (?)`;
    db.run(sql, [name], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該教室名稱已存在" });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "教室建立成功", classroomId: this.lastID });
    });
});

// 刪除教室 (僅限管理員)
app.delete('/api/classrooms/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id >= 1 && id <= 6) {
        return res.status(403).json({ error: "不能刪除預設的教室" });
    }

    db.run('DELETE FROM Classrooms WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "找不到該教室" });
        res.json({ message: "教室已刪除" });
    });
});

// --- 時段管理 API ---

// 獲取所有時段 (公開)
app.get('/api/timeslots', (req, res) => {
    db.all("SELECT * FROM TimeSlots ORDER BY start_time", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ timeslots: rows });
    });
});

// 新增時段 (僅限管理員)
app.post('/api/timeslots', authenticateToken, authorizeAdmin, (req, res) => {
    const { name, start_time, end_time } = req.body;
    if (!name || !start_time || !end_time) return res.status(400).json({ error: "請提供時段名稱、開始時間和結束時間" });

    const sql = `INSERT INTO TimeSlots (name, start_time, end_time) VALUES (?, ?, ?)`;
    db.run(sql, [name, start_time, end_time], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該時段名稱已存在" });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "時段建立成功", timeslotId: this.lastID });
    });
});

// 刪除時段 (僅限管理員)
app.delete('/api/timeslots/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id >= 1 && id <= 6) {
        return res.status(403).json({ error: "不能刪除預設的時段" });
    }

    db.run('DELETE FROM TimeSlots WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "找不到該時段" });
        res.json({ message: "時段已刪除" });
    });
});

// --- 預約 API ---

// 獲取預約 (所有登入者皆可)
app.get('/api/bookings', authenticateToken, (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "請提供日期" });
    const sql = `
        SELECT 
            b.id, 
            b.booking_date, 
            b.grade, 
            b.purpose, 
            b.recurrence_id, 
            b.recurrence_rule,
            c.id as classroom_id, 
            c.name as classroom_name, 
            t.id as timeslot_id, 
            t.name as timeslot_name 
        FROM Bookings b 
        JOIN Classrooms c ON b.classroom_id = c.id 
        JOIN TimeSlots t ON b.timeslot_id = t.id 
        WHERE b.booking_date = ?`;
    db.all(sql, [date], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ bookings: rows });
    });
});

// 新增預約 (僅限管理員)
app.post('/api/bookings', authenticateToken, authorizeAdmin, (req, res) => {
    const { 
        classroomId, 
        timeslotId, 
        bookingDate, 
        grade, 
        purpose,
        recurrenceRule, // 'daily', 'weekly'
        recurrenceEndDate 
    } = req.body;

    if (recurrenceRule && recurrenceEndDate) {
        // --- 處理重複預約 ---
        const startDate = new Date(bookingDate);
        const endDate = new Date(recurrenceEndDate);
        const recurrenceId = crypto.randomUUID();
        
        let bookingsToCreate = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            bookingsToCreate.push({
                classroomId,
                timeslotId,
                bookingDate: currentDate.toISOString().split('T')[0],
                grade,
                purpose,
                recurrenceRule,
                recurrenceEndDate,
                recurrenceId
            });

            if (recurrenceRule === 'daily') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (recurrenceRule === 'weekly') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                break; // 不支援的規則
            }
        }

        // 使用 Promise.all 處理所有預約的非同步操作
        Promise.all(bookingsToCreate.map(booking => {
            return new Promise((resolve, reject) => {
                const sql = `INSERT INTO Bookings (classroom_id, timeslot_id, booking_date, grade, purpose, recurrence_rule, recurrence_end_date, recurrence_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                db.run(sql, [booking.classroomId, booking.timeslotId, booking.bookingDate, booking.grade, booking.purpose, booking.recurrenceRule, booking.recurrenceEndDate, booking.recurrenceId], function(err) {
                    if (err) {
                        // 如果是唯一性約束失敗，我們忽略它，因為這代表該時段已被預約
                        if (err.message.includes('UNIQUE constraint failed')) {
                            console.warn(`時段 ${booking.bookingDate} 已被預約，跳過。`);
                            resolve({ status: 'skipped', date: booking.bookingDate });
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve({ status: 'created', bookingId: this.lastID });
                    }
                });
            });
        }))
        .then(results => {
            const createdCount = results.filter(r => r.status === 'created').length;
            if (createdCount > 0) {
                res.status(201).json({ message: `成功建立 ${createdCount} 筆重複預約。` });
            } else {
                res.status(409).json({ error: "所有指定時段都已被預約。" });
            }
        })
        .catch(err => {
            res.status(500).json({ error: `建立重複預約時發生錯誤: ${err.message}` });
        });

    } else {
        // --- 處理單次預約 ---
        const sql = `INSERT INTO Bookings (classroom_id, timeslot_id, booking_date, grade, purpose) VALUES (?, ?, ?, ?, ?)`;
        db.run(sql, [classroomId, timeslotId, bookingDate, grade, purpose], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該時段已被預約" });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "預約成功", bookingId: this.lastID });
        });
    }
});

// 刪除預約 (僅限管理員)
app.delete('/api/bookings/:id', authenticateToken, authorizeAdmin, (req, res) => {
    const { deleteAllRecurrences } = req.query; // 'true' or 'false'

    if (deleteAllRecurrences === 'true') {
        // --- 刪除整個系列的重複預約 ---
        const getRecurrenceIdSql = 'SELECT recurrence_id FROM Bookings WHERE id = ?';
        db.get(getRecurrenceIdSql, [req.params.id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!row || !row.recurrence_id) return res.status(404).json({ error: "找不到該預約或此預約非重複預約" });

            const deleteSql = 'DELETE FROM Bookings WHERE recurrence_id = ?';
            db.run(deleteSql, [row.recurrence_id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: "找不到可刪除的重複預約記錄" });
                res.json({ message: `整個系列的預約 (${this.changes}筆) 已被取消` });
            });
        });
    } else {
        // --- 只刪除單筆預約 ---
        db.run('DELETE FROM Bookings WHERE id = ?', [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: "找不到該預約記錄" });
            res.json({ message: "預約已取消" });
        });
    }
});

// 取得某教室某月份的所有預約
app.get('/api/classrooms/:id/bookings', authenticateToken, (req, res) => {
    const classroomId = req.params.id;
    const month = req.query.month; // 格式: '2025-08'
    if (!month) return res.status(400).json({ error: "請提供月份" });

    const sql = `
        SELECT * FROM Bookings
        WHERE classroom_id = ?
        AND booking_date LIKE ?
        ORDER BY booking_date, timeslot_id
    `;
    db.all(sql, [classroomId, `${month}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ bookings: rows });
    });
});

// --- 兜底路由 (處理前端路由) ---
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// --- 啟動伺服器 ---
app.listen(PORT, () => {
    console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});
