import React, { useState, useEffect, useCallback } from 'react';
import { getClassrooms, getTimeSlots, getBookingsByDate, createBooking, deleteBooking } from './api';
import BookingGrid from './BookingGrid';
import ClassroomCalendar from './ClassroomCalendar';

function DashboardPage({ user }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // 預設為今天
  const [classrooms, setClassrooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [calendarClassroom, setCalendarClassroom] = useState(null); // 控制月曆顯示的教室

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

  // 初次載入時，獲取教室和時段資訊
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const classroomsRes = await getClassrooms();
        setClassrooms(classroomsRes.data.classrooms);
        const timeslotsRes = await getTimeSlots();
        // 依 start_time 排序
        const sortedTimeslots = [...timeslotsRes.data.timeslots].sort((a, b) => {
          return a.start_time.localeCompare(b.start_time);
        });
        // 直接用 slot.name 作為 displayName
        const timeslotsWithDisplay = sortedTimeslots.map(slot => ({
          ...slot,
          displayName: slot.name
        }));
        setTimeslots(timeslotsWithDisplay);
      } catch (error) {
        console.error("獲取初始資料失敗:", error);
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
      fetchBookings(); // 成功後重新整理預約列表
    } catch (error) {
      console.error("預約失敗:", error);
      alert(error.response?.data?.error || '預約失敗，該時段可能已被預約。');
    }
  };

  const handleCancelBooking = async (bookingId, deleteAllRecurrences) => {
    // The confirmation logic is now handled in BookingGrid.js
    // This function now directly proceeds with the deletion.
    try {
      await deleteBooking(bookingId, deleteAllRecurrences);
      alert('取消成功！');
      fetchBookings(); // Refresh the booking list upon success
    } catch (error) {
      console.error("取消失敗:", error);
      alert(error.response?.data?.error || '取消預約失敗。');
    }
  };
  
  // 點擊教室名稱時切換到月曆檢視
  const handleClassroomNameClick = (classroom) => {
    // 提供給 ClassroomCalendar 用於顯示 displayName
    window.timeslotsForCalendar = timeslots;
    setCalendarClassroom(classroom);
  };

  // 返回主頁
  const handleBackFromCalendar = () => {
    setCalendarClassroom(null);
  };

  return (
    <div>
      {calendarClassroom ? (
        <ClassroomCalendar classroom={calendarClassroom} onBack={handleBackFromCalendar} />
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