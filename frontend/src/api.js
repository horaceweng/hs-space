import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// *** 關鍵：設定請求攔截器 (Request Interceptor) ***
// 這會在每一次請求發送前，自動檢查 localStorage 中是否有 token
// 如果有，就把它加到請求的 Header 中
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 登入請求
export const login = (username, password) => {
  return api.post('/auth/login', { username, password });
};

// 獲取所有教室
export const getClassrooms = () => {
  return api.get('/classrooms');
};

// 獲取所有時段
export const getTimeSlots = () => {
  return api.get('/timeslots');
};

// 根據日期獲取預約
export const getBookingsByDate = (date) => {
  return api.get(`/bookings?date=${date}`);
};

// 建立新預約
export const createBooking = (bookingData) => {
  return api.post('/bookings', bookingData);
};

// 刪除預約
export const deleteBooking = (bookingId, deleteAllRecurrences) => {
  return api.delete(`/bookings/${bookingId}?deleteAllRecurrences=${deleteAllRecurrences}`);
};

// --- User Management ---
export const getUsers = () => api.get('/users');
export const createUser = (userData) => api.post('/users', userData);
export const deleteUser = (userId) => api.delete(`/users/${userId}`);

// --- Classroom Management ---
export const createClassroom = (classroomData) => api.post('/classrooms', classroomData);
export const deleteClassroom = (classroomId) => api.delete(`/classrooms/${classroomId}`);

// --- Timeslot Management ---
export const createTimeslot = (timeslotData) => api.post('/timeslots', timeslotData);
export const deleteTimeslot = (timeslotId) => api.delete(`/timeslots/${timeslotId}`);

// 取得某教室某月份的所有預約
export const getClassroomBookingsByMonth = (classroomId, month) => {
  return api.get(`/classrooms/${classroomId}/bookings?month=${month}`);
};