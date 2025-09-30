import React, { useState } from 'react';
import { login } from './api'; // 引入我們的 login API 函式

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await login(username, password);
      onLogin(response.data.token); // 呼叫父元件傳入的 onLogin 函式
    } catch (err) {
      setError('使用者名稱或密碼錯誤');
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <h2>管理員登入</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>使用者名稱:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>密碼:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">登入</button>
      </form>
    </div>
  );
}

export default LoginPage;