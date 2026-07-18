const express = require('express');
const cors = require('cors');
const client = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5005;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// --- 中介軟體 (Middleware) ---

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: '權限不足，此操作需要管理員身份' });
    }
};

// --- 登入 API ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "請提供使用者名稱和密碼" });

    try {
        const { rows } = await client.execute({
            sql: "SELECT * FROM AdminUsers WHERE username = ?",
            args: [username]
        });
        const user = rows[0];
        if (!user) return res.status(401).json({ error: "使用者名稱或密碼錯誤" });

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (err) return res.status(500).json({ error: '伺服器錯誤' });
            if (!result) return res.status(401).json({ error: "使用者名稱或密碼錯誤" });

            const tokenPayload = { id: Number(user.id), username: user.username, role: user.role };
            const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });
            res.json({ message: "登入成功", token });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 使用者管理 API (僅限管理員) ---
app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { rows } = await client.execute("SELECT id, username, role FROM AdminUsers ORDER BY id");
        res.json({ users: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: "請提供使用者名稱、密碼和角色" });
    if (role !== 'admin' && role !== 'teacher') return res.status(400).json({ error: "無效的角色，只能是 'admin' 或 'teacher'" });

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await client.execute({
            sql: `INSERT INTO AdminUsers (username, password_hash, role) VALUES (?, ?, ?)`,
            args: [username, hash, role]
        });
        res.status(201).json({ message: "使用者建立成功", userId: Number(result.lastInsertRowid) });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "使用者名稱已存在" });
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    if (req.user.id == req.params.id) {
        return res.status(403).json({ error: "不能刪除自己的帳號" });
    }
    try {
        const result = await client.execute({
            sql: 'DELETE FROM AdminUsers WHERE id = ?',
            args: [req.params.id]
        });
        if (result.rowsAffected === 0) return res.status(404).json({ error: "找不到該使用者" });
        res.json({ message: "使用者已刪除" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 教室管理 API ---

app.get('/api/classrooms', async (req, res) => {
    try {
        const { rows } = await client.execute("SELECT * FROM Classrooms ORDER BY id");
        res.json({ classrooms: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/classrooms', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "請提供教室名稱" });

    try {
        const result = await client.execute({
            sql: `INSERT INTO Classrooms (name) VALUES (?)`,
            args: [name]
        });
        res.status(201).json({ message: "教室建立成功", classroomId: Number(result.lastInsertRowid) });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該教室名稱已存在" });
        res.status(500).json({ error: err.message });
    }
});

const DEFAULT_CLASSROOM_COUNT = 6;
const DEFAULT_TIMESLOT_COUNT = 6;

app.delete('/api/classrooms/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id >= 1 && id <= DEFAULT_CLASSROOM_COUNT) {
        return res.status(403).json({ error: "不能刪除預設的教室" });
    }

    try {
        const result = await client.execute({
            sql: 'DELETE FROM Classrooms WHERE id = ?',
            args: [id]
        });
        if (result.rowsAffected === 0) return res.status(404).json({ error: "找不到該教室" });
        res.json({ message: "教室已刪除" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 時段管理 API ---

app.get('/api/timeslots', async (req, res) => {
    try {
        const { rows } = await client.execute("SELECT * FROM TimeSlots ORDER BY start_time");
        res.json({ timeslots: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/timeslots', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name, start_time, end_time } = req.body;
    if (!name || !start_time || !end_time) return res.status(400).json({ error: "請提供時段名稱、開始時間和結束時間" });

    try {
        const result = await client.execute({
            sql: `INSERT INTO TimeSlots (name, start_time, end_time) VALUES (?, ?, ?)`,
            args: [name, start_time, end_time]
        });
        res.status(201).json({ message: "時段建立成功", timeslotId: Number(result.lastInsertRowid) });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該時段名稱已存在" });
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/timeslots/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (id >= 1 && id <= DEFAULT_TIMESLOT_COUNT) {
        return res.status(403).json({ error: "不能刪除預設的時段" });
    }

    try {
        const result = await client.execute({
            sql: 'DELETE FROM TimeSlots WHERE id = ?',
            args: [id]
        });
        if (result.rowsAffected === 0) return res.status(404).json({ error: "找不到該時段" });
        res.json({ message: "時段已刪除" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 預約 API ---

app.get('/api/bookings', authenticateToken, async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "請提供日期" });

    try {
        const { rows } = await client.execute({
            sql: `SELECT
                    b.id, b.booking_date, b.grade, b.purpose, b.recurrence_id, b.recurrence_rule,
                    c.id as classroom_id, c.name as classroom_name,
                    t.id as timeslot_id, t.name as timeslot_name
                  FROM Bookings b
                  JOIN Classrooms c ON b.classroom_id = c.id
                  JOIN TimeSlots t ON b.timeslot_id = t.id
                  WHERE b.booking_date = ?`,
            args: [date]
        });
        res.json({ bookings: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function addDays(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split('T')[0];
}

const MAX_RECURRENCE_BOOKINGS = 365;

app.post('/api/bookings', authenticateToken, authorizeAdmin, async (req, res) => {
    const { classroomId, timeslotId, bookingDate, grade, purpose, recurrenceRule, recurrenceEndDate } = req.body;

    if (recurrenceRule && recurrenceEndDate) {
        const recurrenceId = crypto.randomUUID();
        let bookingsToCreate = [];
        let currentDateStr = bookingDate;

        while (currentDateStr <= recurrenceEndDate) {
            bookingsToCreate.push(currentDateStr);
            if (bookingsToCreate.length > MAX_RECURRENCE_BOOKINGS) {
                return res.status(400).json({ error: `重複預約筆數不能超過 ${MAX_RECURRENCE_BOOKINGS} 筆` });
            }
            if (recurrenceRule === 'daily') {
                currentDateStr = addDays(currentDateStr, 1);
            } else if (recurrenceRule === 'weekly') {
                currentDateStr = addDays(currentDateStr, 7);
            } else {
                break;
            }
        }

        try {
            const statements = bookingsToCreate.map(date => ({
                sql: `INSERT OR IGNORE INTO Bookings (classroom_id, timeslot_id, booking_date, grade, purpose, recurrence_rule, recurrence_end_date, recurrence_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [classroomId, timeslotId, date, grade, purpose, recurrenceRule, recurrenceEndDate, recurrenceId]
            }));

            const results = await client.batch(statements, 'write');
            const createdCount = results.filter(r => r.rowsAffected > 0).length;

            if (createdCount > 0) {
                res.status(201).json({ message: `成功建立 ${createdCount} 筆重複預約。` });
            } else {
                res.status(409).json({ error: "所有指定時段都已被預約。" });
            }
        } catch (err) {
            res.status(500).json({ error: `建立重複預約時發生錯誤: ${err.message}` });
        }

    } else {
        try {
            const result = await client.execute({
                sql: `INSERT INTO Bookings (classroom_id, timeslot_id, booking_date, grade, purpose) VALUES (?, ?, ?, ?, ?)`,
                args: [classroomId, timeslotId, bookingDate, grade, purpose]
            });
            res.status(201).json({ message: "預約成功", bookingId: Number(result.lastInsertRowid) });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed')) return res.status(409).json({ error: "該時段已被預約" });
            res.status(500).json({ error: err.message });
        }
    }
});

app.delete('/api/bookings/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { deleteAllRecurrences } = req.query;

    try {
        if (deleteAllRecurrences === 'true') {
            const { rows } = await client.execute({
                sql: 'SELECT recurrence_id FROM Bookings WHERE id = ?',
                args: [req.params.id]
            });
            const row = rows[0];
            if (!row || !row.recurrence_id) return res.status(404).json({ error: "找不到該預約或此預約非重複預約" });

            const result = await client.execute({
                sql: 'DELETE FROM Bookings WHERE recurrence_id = ?',
                args: [row.recurrence_id]
            });
            if (result.rowsAffected === 0) return res.status(404).json({ error: "找不到可刪除的重複預約記錄" });
            res.json({ message: `整個系列的預約 (${result.rowsAffected}筆) 已被取消` });
        } else {
            const result = await client.execute({
                sql: 'DELETE FROM Bookings WHERE id = ?',
                args: [req.params.id]
            });
            if (result.rowsAffected === 0) return res.status(404).json({ error: "找不到該預約記錄" });
            res.json({ message: "預約已取消" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/classrooms/:id/bookings', authenticateToken, async (req, res) => {
    const classroomId = req.params.id;
    const month = req.query.month;
    if (!month) return res.status(400).json({ error: "請提供月份" });

    try {
        const { rows } = await client.execute({
            sql: `SELECT * FROM Bookings WHERE classroom_id = ? AND booking_date LIKE ? ORDER BY booking_date, timeslot_id`,
            args: [classroomId, `${month}%`]
        });
        res.json({ bookings: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 啟動伺服器 ---
app.listen(PORT, () => {
    console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});
