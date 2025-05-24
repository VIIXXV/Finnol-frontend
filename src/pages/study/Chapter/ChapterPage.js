import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate,useSearchParams} from 'react-router-dom';
import axios from 'axios';
import '../Chapter/ChapterPage.css';
import {fetchChapters} from "../../../api/study/level3API";

function ChapterPage() {
  const navigate = useNavigate();
  const [searchParams]=useSearchParams(); //URL에서 bookID 가져오기
  const bookId=searchParams.get("bookId");

  const [chapters,setChapters]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

    const handleFetchChapters=async()=>{
      try{
        const data=await fetchChapters("682829208c776a1ffa92fd4d");
          setChapters(data);
        }
        catch(err){
          setError(err.message);
      }finally{
        setLoading(false);
      }
    };


  //페이지 진입 시 자동 실행
  useEffect(()=>{
    handleFetchChapters();
  },[]);


  const handleChapterClick = (chapterId) => {
    navigate(`/study/1?chapterId=${chapterId}`);
  };

  if (loading) return <div className="loading">단원을 불러오는중..</div>;
  if (error) return <div className="error-message">{error}</div>;

  //유저가 해당 책의 진도를 완료 -> review-card completed로.. 기본은 review-card
  
  return (
    <div className="chapter-page">
      <div className="page-header">
        {/* <h2>단원을 선택하세요</h2> */}
      </div>

      <div className="book-modules">
        {chapters.map((chapter,index) => {
          const {id,title,isCompleted,isCurrent}=chapter;

          return(
            <div
              key={index}
              className={`book-card
                  ${isCompleted?'completed':''}
                  ${isCurrent?'current':''} `}
              onClick={()=>{
                if(isCompleted) handleChapterClick(id); //완료된 단원만 클릭 가능 
              }}
              style={{cursor:isCompleted?'pointer':'default'}}
            >
               <div className="module-icon">{isCompleted ? '📖' : '📘'}</div>

               <h3>{title}</h3>
        
          
            <div className="review-buttons">
              {(isCompleted||isCurrent)&&(
                  <button
                    className="review-btn"
                    onClick={(e)=>{
                      e.stopPropagation(); //부모 div 클릭 방지
                      handleChapterClick(id);
                    }}
                  >
                    {isCompleted?'복습하기':'학습하기'}
                  </button>
              )}
              {isCurrent&&(
                <span ClassName="current-label"></span>
              )}
              
            </div>
          </div>
      
          );
        })}
        </div>
      </div>
  );
}

export default ChapterPage;