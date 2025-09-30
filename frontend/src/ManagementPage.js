import React, { useState, useEffect } from 'react';
import * as api from './api';

// --- Main Management Component ---
const ManagementPage = () => {
    return (
        <div className="container mt-4">
            <h2>管理後台</h2>
            <hr />
            <UserManagement />
            <hr className="my-5" />
            <ClassroomManagement />
            <hr className="my-5" />
            <TimeslotManagement />
        </div>
    );
};

// --- User Management ---
const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('teacher');

    const fetchUsers = async () => {
        try {
            const res = await api.getUsers();
            setUsers(res.data.users);
        } catch (error) {
            alert('無法獲取使用者列表: ' + (error.response?.data?.error || error.message));
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.createUser({ username, password, role });
            alert('使用者建立成功!');
            setUsername('');
            setPassword('');
            setRole('teacher');
            fetchUsers();
        } catch (error) {
            alert('建立失敗: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('確定要刪除這位使用者嗎?')) {
            try {
                await api.deleteUser(userId);
                alert('使用者已刪除');
                fetchUsers();
            } catch (error) {
                alert('刪除失敗: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <section>
            <h4>人員管理</h4>
            <form onSubmit={handleCreateUser} className="mb-3 p-3 border rounded">
                <div className="row g-3 align-items-end">
                    <div className="col-md-3"><label>使用者名稱</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-3"><label>密碼</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-3"><label>角色</label><select value={role} onChange={e => setRole(e.target.value)} className="form-select"><option value="teacher">教師</option><option value="admin">管理員</option></select></div>
                    <div className="col-md-3"><button type="submit" className="btn btn-primary w-100">新增使用者</button></div>
                </div>
            </form>
            <table className="table table-striped">
                <thead><tr><th>ID</th><th>使用者名稱</th><th>角色</th><th>操作</th></tr></thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}><td>{u.id}</td><td>{u.username}</td><td>{u.role}</td><td><button onClick={() => handleDeleteUser(u.id)} className="btn btn-danger btn-sm">刪除</button></td></tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

// --- Classroom Management ---
const ClassroomManagement = () => {
    const [classrooms, setClassrooms] = useState([]);
    const [name, setName] = useState('');

    const fetchClassrooms = async () => {
        const res = await api.getClassrooms();
        setClassrooms(res.data.classrooms);
    };

    useEffect(() => {
        fetchClassrooms();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.createClassroom({ name });
            alert('教室建立成功!');
            setName('');
            fetchClassrooms();
        } catch (error) {
            alert('建立失敗: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('確定要刪除這個教室嗎?')) {
            try {
                await api.deleteClassroom(id);
                alert('教室已刪除');
                fetchClassrooms();
            } catch (error) {
                alert('刪除失敗: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <section>
            <h4>教室空間管理</h4>
            <form onSubmit={handleCreate} className="mb-3 p-3 border rounded">
                 <div className="row g-3 align-items-end">
                    <div className="col-md-9"><label>新教室名稱</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-3"><button type="submit" className="btn btn-primary w-100">新增教室</button></div>
                </div>
            </form>
            <table className="table table-striped">
                <thead><tr><th>ID</th><th>名稱</th><th>操作</th></tr></thead>
                <tbody>
                    {classrooms.map(c => (
                        <tr key={c.id}><td>{c.id}</td><td>{c.name}</td><td>{c.id > 6 ? <button onClick={() => handleDelete(c.id)} className="btn btn-danger btn-sm">刪除</button> : '預設'}</td></tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

// --- Timeslot Management ---
const TimeslotManagement = () => {
    const [timeslots, setTimeslots] = useState([]);
    const [name, setName] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');

    const fetchTimeslots = async () => {
        const res = await api.getTimeSlots();
        setTimeslots(res.data.timeslots);
    };

    useEffect(() => {
        fetchTimeslots();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.createTimeslot({ name, start_time: startTime, end_time: endTime });
            alert('時段建立成功!');
            setName('');
            fetchTimeslots();
        } catch (error) {
            alert('建立失敗: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('確定要刪除這個時段嗎?')) {
            try {
                await api.deleteTimeslot(id);
                alert('時段已刪除');
                fetchTimeslots();
            } catch (error) {
                alert('刪除失敗: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <section>
            <h4>時段管理</h4>
            <form onSubmit={handleCreate} className="mb-3 p-3 border rounded">
                <div className="row g-3 align-items-end">
                    <div className="col-md-4"><label>新時段名稱</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-2"><label>開始時間</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-2"><label>結束時間</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="form-control" required /></div>
                    <div className="col-md-4"><button type="submit" className="btn btn-primary w-100">新增時段</button></div>
                </div>
            </form>
            <table className="table table-striped">
                <thead><tr><th>ID</th><th>名稱</th><th>開始時間</th><th>結束時間</th><th>操作</th></tr></thead>
                <tbody>
                    {timeslots.map(t => (
                        <tr key={t.id}><td>{t.id}</td><td>{t.name}</td><td>{t.start_time}</td><td>{t.end_time}</td><td>{t.id > 6 ? <button onClick={() => handleDelete(t.id)} className="btn btn-danger btn-sm">刪除</button> : '預設'}</td></tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

export default ManagementPage;
