import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (username, password) => {
  return api.post('/auth/login', { username, password });
};

export const getClassrooms = () => {
  return api.get('/classrooms');
};

export const getTimeSlots = () => {
  return api.get('/timeslots');
};

export const getBookingsByDate = (date) => {
  return api.get(`/bookings?date=${date}`);
};

export const createBooking = (bookingData) => {
  return api.post('/bookings', bookingData);
};

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

export const getClassroomBookingsByMonth = (classroomId, month) => {
  return api.get(`/classrooms/${classroomId}/bookings?month=${month}`);
};