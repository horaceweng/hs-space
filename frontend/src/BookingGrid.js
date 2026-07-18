import React, { useState } from 'react';
import RecurrenceModal from './RecurrenceModal';

function CancelConfirmModal({ booking, onConfirm, onClose }) {
  if (!booking) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>取消預約</h2>
        {booking.recurrence_id ? (
          <>
            <p>此預約為重複預約系列的一部分，請選擇取消範圍：</p>
            <div className="modal-actions">
              <button onClick={onClose} className="button-secondary">返回</button>
              <button onClick={() => onConfirm(false)} className="button-primary" style={{ backgroundColor: '#f39c12' }}>
                只取消此筆
              </button>
              <button onClick={() => onConfirm(true)} className="button-primary" style={{ backgroundColor: '#e74c3c' }}>
                取消整個系列
              </button>
            </div>
          </>
        ) : (
          <>
            <p>確定要取消這個預約嗎？</p>
            <div className="modal-actions">
              <button onClick={onClose} className="button-secondary">返回</button>
              <button onClick={() => onConfirm(false)} className="button-primary" style={{ backgroundColor: '#e74c3c' }}>
                確認取消
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BookingGrid({ classrooms, timeslots, bookings, selectedDate, onCreateBooking, onCancelBooking, user, onClassroomNameClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBookingData, setCurrentBookingData] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const handleBookClick = (classroom, timeslot) => {
    setCurrentBookingData({
      classroomId: classroom.id,
      timeslotId: timeslot.id,
      bookingDate: selectedDate,
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
    setCancelTarget(booking);
  };

  const handleCancelConfirm = (deleteAll) => {
    onCancelBooking(cancelTarget.id, deleteAll);
    setCancelTarget(null);
  };

  return (
    <>
      <RecurrenceModal
        show={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        bookingData={currentBookingData}
      />
      <CancelConfirmModal
        booking={cancelTarget}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
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
