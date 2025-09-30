import React, { useState, useEffect } from 'react';
import { getClassroomBookingsByMonth } from './api';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const ClassroomCalendar = ({ classroom, onBack }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      try {
        const res = await getClassroomBookingsByMonth(classroom.id, monthStr);
        setBookings(res.data.bookings);
      } catch (err) {
        setBookings([]);
      }
      setLoading(false);
    };
    fetchBookings();
  }, [classroom.id, year, month]);

  const daysInMonth = getDaysInMonth(year, month);
  const bookingMap = {};
  bookings.forEach(b => {
    bookingMap[b.booking_date] = bookingMap[b.booking_date] || [];
    bookingMap[b.booking_date].push(b);
  });

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="calendar-container">
      <h2>{classroom.name} 借用月曆</h2>
      <div className="calendar-controls">
        <button onClick={handlePrevMonth}>上一月</button>
        <span>{year} 年 {month + 1} 月</span>
        <button onClick={handleNextMonth}>下一月</button>
        <button onClick={onBack} style={{ marginLeft: '2em' }}>返回</button>
      </div>
      {loading ? (
        <p>載入中...</p>
      ) : (
        <table className="calendar-table">
          <thead>
            <tr>
              {[...Array(7)].map((_, i) => (
                <th key={i}>{"日一二三四五六".charAt(i)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const firstDay = new Date(year, month, 1).getDay();
              const rows = [];
              let cells = [];
              for (let i = 0; i < firstDay; i++) {
                cells.push(<td key={`empty-${i}`}></td>);
              }
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = formatDate(year, month, day);
                const dayBookings = bookingMap[dateStr] || [];
                cells.push(
                  <td key={dateStr} style={{ background: dayBookings.length ? '#ffe0e0' : '#e0ffe0' }}>
                    <div><strong>{day}</strong></div>
                    {dayBookings.length > 0 ? (
                      <ul style={{ paddingLeft: '1em', fontSize: '0.9em' }}>
                        {dayBookings.map(b => {
                          // 取得 displayName
                          let displayName = '';
                          if (b.timeslot_id) {
                            const timeslot = (window.timeslotsForCalendar || []).find(ts => ts.id === b.timeslot_id);
                            displayName = timeslot ? timeslot.displayName || timeslot.name : `時段${b.timeslot_id}`;
                          }
                          return (
                            <li key={b.id}>
                              {displayName} {b.grade} {b.purpose}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span style={{ color: '#888', fontSize: '0.8em' }}>可預約</span>
                    )}
                  </td>
                );
                if (cells.length === 7) {
                  rows.push(<tr key={day}>{cells}</tr>);
                  cells = [];
                }
              }
              if (cells.length > 0) {
                while (cells.length < 7) cells.push(<td key={`empty-end-${cells.length}`}></td>);
                rows.push(<tr key="last-row">{cells}</tr>);
              }
              return rows;
            })()}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClassroomCalendar;
