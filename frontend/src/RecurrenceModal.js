import React, { useState, useEffect } from 'react';
import './RecurrenceModal.css';

function RecurrenceModal({ show, onClose, onSubmit, bookingData }) {
    const [grade, setGrade] = useState('');
    const [purpose, setPurpose] = useState('');
    const [recurrenceType, setRecurrenceType] = useState('single');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        // Reset form when modal is newly shown
        if (show) {
            setGrade('');
            setPurpose('');
            setRecurrenceType('single');
            setEndDate('');
        }
    }, [show]);

    if (!show) {
        return null;
    }

    const handleSubmit = () => {
        if (!grade || !purpose) {
            alert('請填寫年級和事由！');
            return;
        }

        const finalBookingData = {
            ...bookingData,
            grade,
            purpose,
        };

        if (recurrenceType === 'single') {
            onSubmit(finalBookingData);
        } else {
            if (!endDate) {
                alert('請選擇重複預約的結束日期！');
                return;
            }
            onSubmit({
                ...finalBookingData,
                recurrenceRule: recurrenceType,
                recurrenceEndDate: endDate,
            });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>建立預約</h2>
                <p><strong>空間:</strong> {bookingData.classroomName}</p>
                <p><strong>時段:</strong> {bookingData.timeslotName}</p>
                <p><strong>日期:</strong> {bookingData.bookingDate}</p>
                
                <div className="form-group">
                    <label htmlFor="grade">使用年級:</label>
                    <input 
                        type="text" 
                        id="grade" 
                        value={grade} 
                        onChange={(e) => setGrade(e.target.value)} 
                        placeholder="例如：9、10"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="purpose">事由:</label>
                    <input 
                        type="text" 
                        id="purpose" 
                        value={purpose} 
                        onChange={(e) => setPurpose(e.target.value)} 
                        placeholder="例如：社團活動、課程"
                    />
                </div>
                
                <hr />

                <div className="recurrence-options">
                    <h3>預約類型</h3>
                    <label>
                        <input 
                            type="radio" 
                            name="recurrence" 
                            value="single" 
                            checked={recurrenceType === 'single'} 
                            onChange={() => setRecurrenceType('single')}
                        />
                        單次預約
                    </label>
                    <label>
                        <input 
                            type="radio" 
                            name="recurrence" 
                            value="daily" 
                            checked={recurrenceType === 'daily'} 
                            onChange={() => setRecurrenceType('daily')}
                        />
                        每日重複
                    </label>
                    <label>
                        <input 
                            type="radio" 
                            name="recurrence" 
                            value="weekly" 
                            checked={recurrenceType === 'weekly'} 
                            onChange={() => setRecurrenceType('weekly')}
                        />
                        每週重複
                    </label>
                </div>

                {recurrenceType !== 'single' && (
                    <div className="date-picker-container">
                        <label htmlFor="end-date">重複至:</label>
                        <input 
                            type="date" 
                            id="end-date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={bookingData.bookingDate}
                        />
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="button-secondary">取消</button>
                    <button onClick={handleSubmit} className="button-primary">確認預約</button>
                </div>
            </div>
        </div>
    );
}

export default RecurrenceModal;
