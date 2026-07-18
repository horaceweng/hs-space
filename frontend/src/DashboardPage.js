import React, { useState, useEffect, useCallback } from 'react';
import { getClassrooms, getTimeSlots, getBookingsByDate, createBooking, deleteBooking } from './api';
import BookingGrid from './BookingGrid';
import ClassroomCalendar from './ClassroomCalendar';

function DashboardPage({ user }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classrooms, setClassrooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [calendarClassroom, setCalendarClassroom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 使用 useCallback 包裹 fetchBookings，避免在 BookingGrid 中引起不必要的重新渲染
  const fetchBookings = useCallback(async () => {
    try {
      const response = await getBookingsByDate(date);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error("獲取預約失敗:", error);
      alert("獲取預約失敗，請檢查網路或重新登入。");
    }
  }, [date]); // 依賴 date，當 date 改變時，這個函式會更新

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classroomsRes, timeslotsRes] = await Promise.all([getClassrooms(), getTimeSlots()]);
        setClassrooms(classroomsRes.data.classrooms);
        const sortedTimeslots = [...timeslotsRes.data.timeslots].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        );
        setTimeslots(sortedTimeslots.map(slot => ({ ...slot, displayName: slot.name })));
      } catch (error) {
        console.error("獲取初始資料失敗:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 當日期改變時，重新獲取預約
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]); // 依賴 fetchBookings 函式

  const handleCreateBooking = async (bookingData) => {
    try {
      await createBooking(bookingData);
      alert('預約成功！');
      fetchBookings();
    } catch (error) {
      console.error("預約失敗:", error);
      alert(error.response?.data?.error || '預約失敗，該時段可能已被預約。');
    }
  };

  const handleCancelBooking = async (bookingId, deleteAllRecurrences) => {
    try {
      await deleteBooking(bookingId, deleteAllRecurrences);
      alert('取消成功！');
      fetchBookings();
    } catch (error) {
      console.error("取消失敗:", error);
      alert(error.response?.data?.error || '取消預約失敗。');
    }
  };
  
  const handleClassroomNameClick = (classroom) => {
    setCalendarClassroom(classroom);
  };

  const handleBackFromCalendar = () => {
    setCalendarClassroom(null);
  };

  if (isLoading) return <p style={{ padding: '2rem', textAlign: 'center' }}>載入中...</p>;

  return (
    <div>
      {calendarClassroom ? (
        <ClassroomCalendar classroom={calendarClassroom} timeslots={timeslots} onBack={handleBackFromCalendar} />
      ) : (
        <>
          <div className="controls">
            <label htmlFor="date-picker">選擇日期:</label>
            <input
              type="date"
              id="date-picker"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <BookingGrid
            classrooms={classrooms}
            timeslots={timeslots}
            bookings={bookings}
            selectedDate={date}
            onCreateBooking={handleCreateBooking}
            onCancelBooking={handleCancelBooking}
            user={user}
            onClassroomNameClick={handleClassroomNameClick}
          />
        </>
      )}
    </div>
  );
}

export default DashboardPage;