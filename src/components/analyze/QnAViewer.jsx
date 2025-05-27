import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './QnAViewer.css';

export default function QnAViewer() {
  const [markedDates, setMarkedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [qnaList, setQnaList] = useState([]);

  // 캘린더 표시할 날짜 목록
  useEffect(() => {
    fetch('/api/questions/dates', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const dates = data.map((dateStr) => dateStr.slice(0, 10));
        setMarkedDates(dates);
      })
      .catch((err) => console.error('❌ 질문 날짜 불러오기 실패:', err));
  }, []);

  // 선택 날짜 질문/답변 불러오기
  useEffect(() => {
    const dateStr = selectedDate.toISOString().slice(0, 10);
    fetch(`/api/questions/history?date=${dateStr}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.flatMap((item) =>
          item.questions.map((q, i) => ({
            question: q,
            answer: item.answers[i] || '',
          }))
        );
        setQnaList(formatted);
      })
      .catch((err) => console.error('❌ 질문 내역 불러오기 실패:', err));
  }, [selectedDate]);

  return (
    <div className="qna-container">
      <div className="calendar-panel">
        <Calendar
          onClickDay={setSelectedDate}
          tileClassName={({ date }) =>
            markedDates.includes(date.toISOString().slice(0, 10))
              ? 'highlight'
              : null
          }
        />
      </div>

      <div className="chat-panel">
        <h2>{selectedDate.toISOString().slice(0, 10)} 질문 내역</h2>
        <div className="chat-box">
          {qnaList.length === 0 ? (
            <p>질문 기록이 없습니다.</p>
          ) : (
            qnaList.map((qna, index) => (
              <div key={index}>
                <div className="chat-question">🙋 {qna.question}</div>
                <div className="chat-answer">🤖 {qna.answer}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
