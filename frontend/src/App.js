import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import ManagementPage from './ManagementPage';
import './App.css';

const getUser = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000; // seconds
        if (decodedToken.exp < currentTime) {
            localStorage.removeItem('token');
            return null;
        }
        return decodedToken;
    } catch (e) {
        localStorage.removeItem('token');
        return null;
    }
};

const AdminRoute = ({ user, children }) => {
    if (user?.role === 'admin') return children;
    return <Navigate to="/" />;
};

function App() {
    const [user, setUser] = useState(getUser());

    const handleLogin = (newToken) => {
        localStorage.setItem('token', newToken);
        setUser(getUser());
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <Router>
            <div className="App">
                <header>
                    <h1>海聲教室/空間登記與查詢系統</h1>
                    <nav>
                        {user && <Link to="/">預約看板</Link>}
                        {user?.role === 'admin' && <Link to="/management">管理後台</Link>}
                    </nav>
                    {user && <button onClick={handleLogout} className="logout-button">登出</button>}
                </header>
                <main>
                    <Routes>
                        <Route path="/login" element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} />
                        <Route path="/" element={user ? <DashboardPage user={user} /> : <Navigate to="/login" />} />
                        <Route
                            path="/management"
                            element={
                                <AdminRoute user={user}>
                                    <ManagementPage />
                                </AdminRoute>
                            }
                        />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;