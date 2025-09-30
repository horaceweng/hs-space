import React, { useState } from 'react';
import RecurrenceModal from './RecurrenceModal';

function BookingGrid({ classrooms, timeslots, bookings, selectedDate, onCreateBooking, onCancelBooking, user, onClassroomNameClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBookingData, setCurrentBookingData] = useState(null);

  const handleBookClick = (classroom, timeslot) => {
    setCurrentBookingData({
      classroomId: classroom.id,
      timeslotId: timeslot.id,
      bookingDate: selectedDate,
      // For display in modal
      classroomName: classroom.name,
  timeslotName: `${timeslot.displayName || timeslot.name} (${timeslot.start_time} - ${timeslot.end_time})`
    });
    setIsModalOpen(true);
  };

  const handleModalSubmit = (bookingDetails) => {
    onCreateBooking(bookingDetails);
    setIsModalOpen(false);
    setCurrentBookingData(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setCurrentBookingData(null);
  };

  const handleCancelClick = (booking) => {
    if (booking.recurrence_id) {
      const confirmDeleteSeries = window.confirm(
        '這是一個重複預約。您想要刪除整個系列的預約，還是只刪除這一個？\n點擊「確定」刪除整個系列，點擊「取消」只刪除此單筆預約。'
      );
      // The user's choice (true for series, false for single) is passed to onCancelBooking
      onCancelBooking(booking.id, confirmDeleteSeries);
    } else {
      // For non-recurring bookings, always ask for confirmation
      if (window.confirm('確定要取消這個預約嗎？')) {
        onCancelBooking(booking.id, false);
      }
    }
  };

  return (
    <>
      <RecurrenceModal 
        show={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        bookingData={currentBookingData}
      />
      <div className="booking-grid-container">
        <table>
          <thead>
            <tr>
              <th>時段</th>
              {classrooms.map(room => (
                <th key={room.id}>
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline', color: '#007bff' }}
                    onClick={() => onClassroomNameClick && onClassroomNameClick(room)}
                    title="檢視月曆"
                  >
                    {room.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeslots.map(slot => (
              <tr key={slot.id}>
                <td>
                  <strong>{slot.displayName || slot.name}</strong><br/>
                  ({slot.start_time} - {slot.end_time})
                </td>
                {classrooms.map(room => {
                  const booking = bookings.find(
                    b => b.timeslot_id === slot.id && b.classroom_id === room.id
                  );
                  return (
                    <td key={room.id}>
                      {booking ? (
                        <div className="booking-cell booked">
                          <p><strong>年級:</strong> {booking.grade}</p>
                          <p><strong>事由:</strong> {booking.purpose}</p>
                          {booking.recurrence_rule && <span className="recurrence-badge">重複</span>}
                          {user?.role === 'admin' && 
                            <button onClick={() => handleCancelClick(booking)} className="cancel-button">
                              取消
                            </button>
                          }
                        </div>
                      ) : (
                        <div className="booking-cell available">
                          {user?.role === 'admin' && 
                            <button onClick={() => handleBookClick(room, slot)}>
                              登記
                            </button>
                          }
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default BookingGrid;
