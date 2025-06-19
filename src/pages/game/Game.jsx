import React, { useEffect, useRef, useState } from 'react';
import playerImg from '../../assets/player.png';
import hurdle1Img from '../../assets/hurdle1.png';
import hurdle2Img from '../../assets/hurdle2.png';
import coinImg from '../../assets/coin.png';
import quizBoxImg from '../../assets/quizpop.png';
import backgroundImg from '../../assets/game-background1.png';
import flagImg from '../../assets/flag.png';
import playerEndImg from '../../assets/finish_player.png';
import { saveCoinToDB } from '../../api/analyze/saveCoinToDB';
import { useChapter } from "../../context/ChapterContext";
import { fetchQuizByChapterId } from '../../api/study/fetchQuiz';
import { useNavigate } from "react-router-dom";
import bgmSrc from '../../assets/Tiki_Bar_Mixer.mp3';
import { sendQuizResults } from '../../api/analyze/sendQuizResults';

export default function Game() {
  const { chapterData } = useChapter();
  const chapterId = chapterData?.chapterId;
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const updateRef = useRef(null);

  const frameRef = useRef(0);
  const gameSpeedRef = useRef(9);
  const backgroundXRef = useRef(0);
  const entitiesRef = useRef([]);
  const playerRef = useRef({});
  const pausedSnapshotRef = useRef(null);

  const playerImageRef = useRef(null);
  const coinImageRef = useRef(null);
  const quizBoxImageRef = useRef(null);
  const hurdleImagesRef = useRef([]);

  const [quizList, setQuizList] = useState([]);
  const currentQuizIndexRef = useRef(0);

  const [quizLoaded, setQuizLoaded] = useState(false); // 퀴즈 로딩 상태 추가
  const quizCountRef = useRef(0);
  const quizResultsRef = useRef([]);  // 전체 퀴즈 결과 저장

  const [gameOver, setGameOver] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const quizScoreRef = useRef(0);
  const groundHeightRatioRef = useRef(0.15);

  const [penaltyVisible, setPenaltyVisible] = useState(false);
  const [correctVisible, setCorrectVisible] = useState(false);
  const [gainVisible, setGainVisible] = useState(false);
  const [wrongVisible, setWrongVisible] = useState(false);
  const [endVisible, setEndVisible] = useState(false);

  //모바일 화면에서
  const [touchX,setTouchX]=useState(0);

  const flagImageRef = useRef(null);

  const [flagScheduled, setFlagScheduled] = useState(false);
  const [flagShown, setFlagShown] = useState(false);
  const [ending, setEnding] = useState(false);
  const endingRef = useRef(false);

  const flagPushedRef = useRef(false);

  const [isGameStarted, setIsGameStarted] = useState(false);
  const bgmRef = useRef(null);

  // 퀴즈 푸는 시간
  const quizStartTimeRef = useRef(null);


  // 퀴즈 만났을 때 화면 정지 위함
  function snapshotState() {
    const quizFilteredEntities = entitiesRef.current.filter(e => e.type !== 'quiz');
    pausedSnapshotRef.current = {
      frame: frameRef.current,
      gameSpeed: gameSpeedRef.current,
      backgroundX: backgroundXRef.current,
      entities: JSON.parse(JSON.stringify(quizFilteredEntities)),
      player: JSON.parse(JSON.stringify(playerRef.current)),
    };
  }

  // 퀴즈 후 화면 복구 위함
  function restoreSnapshot() {
    const snap = pausedSnapshotRef.current;
    if (!snap) return;

    frameRef.current = snap.frame;
    gameSpeedRef.current = snap.gameSpeed;
    backgroundXRef.current = snap.backgroundX;
    playerRef.current = { ...snap.player };

    const restoredEntities = snap.entities.map(e => {
      const newEntity = { ...e };
      if (e.type === 'coin') newEntity.img = coinImageRef.current;
      else if (e.type === 'quiz') newEntity.img = quizBoxImageRef.current;
      else if (e.type === 'hurdle') {
        if (e.width > e.height) newEntity.img = hurdleImagesRef.current[0];
        else newEntity.img = hurdleImagesRef.current[1];
      }
      return newEntity;
    });

    entitiesRef.current.splice(0, entitiesRef.current.length, ...restoredEntities);
    pausedSnapshotRef.current = null;
  }

  // 퀴즈 정답 처리
  function handleQuizAnswer(answer) {
    if (!quiz) return;

    // 정답 누른 시간
    const responseTime = Date.now() - quizStartTimeRef.current;

    // 퀴즈 결과 기록
    quizResultsRef.current.push({
      question: quiz.question,
      options: quiz.options,
      correctAnswer: quiz.answer,
      userAnswer: answer,
      isCorrect: answer === quiz.answer,
      responseTime,
    });
  
    if (quizCountRef.current === 5 && !flagScheduled) {
        setFlagScheduled(true);
        setTimeout(() => {
          setFlagShown(true);
          const canvas = canvasRef.current; 

          const yBase = canvas.height - groundHeightRatioRef.current * canvas.height;
          const flagHeight = canvas.height * 0.2;
          const flagWidth = flagHeight * 0.5;
          entitiesRef.current.push({
            type: 'flag',
            x: canvas.width,
            y: yBase - flagHeight,
            width: flagWidth,
            height: flagHeight,
            img: flagImageRef.current
          });
          flagPushedRef.current = true;
        }, 5000);
      }

    if (answer === quiz.answer) {
      setQuiz(null);
      restoreSnapshot();
      scoreRef.current += 50;
      quizScoreRef.current += 1;
      setIsPaused(false);
      bgmRef.current?.play();
      setCorrectVisible(true);
      setTimeout(() => setCorrectVisible(false), 1000);
      requestAnimationFrame(updateRef.current);
    } else {
      setQuiz(null);
      restoreSnapshot();
      scoreRef.current = 0;
      setIsPaused(false);
      bgmRef.current?.play();
      setWrongVisible(true);
      setTimeout(() => setWrongVisible(false), 1000);
      requestAnimationFrame(updateRef.current);
    }
  }

  // 퀴즈 틀렸을 때 화면 효과
  function showPenaltyEffect() {
    setPenaltyVisible(true);
    setTimeout(() => setPenaltyVisible(false), 800);
  }

  // 코인 먹었을 때 화면 효과
  function showGainEffect() {
    setGainVisible(true);
    setTimeout(() => setGainVisible(false), 800);
  }

  // 게임 끝날 때 화면 효과
  function showEndEffect() {
    setEndVisible(true);
    setTimeout(() => setEndVisible(false), 800);
  }

  // 챕터 별 퀴즈 불러오기
  useEffect(() => {
    if (!chapterId) return;

    async function loadQuiz() {
      try {
        const data = await fetchQuizByChapterId(chapterId);
        console.log("✅ 퀴즈 응답:", data);
        setQuizList(data);
        setQuizLoaded(true); // 퀴즈 로딩 완료 상태 설정
      } catch (err) {
        console.error("❌ 퀴즈 불러오기 실패:", err);
        setQuizLoaded(true); // 실패해도 게임은 진행되도록
      }
    }

    loadQuiz();
  }, [chapterId]);

  useEffect(() => {
    // 퀴즈가 로드되지 않았으면 게임 시작하지 않음
    if (!quizLoaded || !isGameStarted) return;
    
    if (gameOver) {
        saveCoinToDB(scoreRef.current);
        sendQuizResults(quizResultsRef.current);
      }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    scoreRef.current = score;

    const bgImg = new Image(); bgImg.src = backgroundImg;
    const playerImage = new Image(); playerImage.src = playerImg;
    playerImageRef.current = playerImage;

    const hurdleImages = [new Image(), new Image()]; 
    hurdleImages[0].src = hurdle1Img;
    hurdleImages[1].src = hurdle2Img;
    hurdleImagesRef.current = hurdleImages;
    const coinImage = new Image(); coinImage.src = coinImg; coinImageRef.current = coinImage;
    const quizBoxImage = new Image(); quizBoxImage.src = quizBoxImg; quizBoxImageRef.current = quizBoxImage;

    const flagImage = new Image(); flagImage.src = flagImg;
    const playerEndImage = new Image(); playerEndImage.src = playerEndImg;
    flagImageRef.current = flagImage;

    const groundHeightRatio = 0.15;
    playerRef.current = {
      x: 100, y: 0, width: 0, height: 0,
      vy: 0, gravity: 1.8, jumpForce: -35, isJumping: false,
    };

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const player = playerRef.current;
      player.width = canvas.width * 0.1;
      player.height = canvas.height * 0.28;
      player.y = canvas.height - groundHeightRatio * canvas.height - player.height;
    }

    function detectCollision(player, obs) {
      const px = player.x + player.width * 0.25;
      const pw = player.width * 0.5;
      const py = player.y + player.height * 0.25;
      const ph = player.height * 0.6;
      const ox = obs.x + obs.width * 0.25;
      const ow = obs.width * 0.5;
      const oy = obs.y + obs.height * 0.2;
      const oh = obs.height * 0.7;
      return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }

    function showQuiz() {
      console.log("퀴즈 표시 시도, quizList 길이:", quizList.length); // 디버그 로그 추가
      
      if (quizList.length === 0) {
        console.warn("⚠️ 퀴즈 없음 - 게임 계속 진행");
        restoreSnapshot();
        setIsPaused(false);
        requestAnimationFrame(updateRef.current);
        return;
      }

      const nextQuiz = quizList[currentQuizIndexRef.current];
      currentQuizIndexRef.current += 1;

      console.log("표시할 퀴즈:", nextQuiz);

      quizStartTimeRef.current = Date.now();

      setQuiz({
        question: nextQuiz.quiz,
        options: nextQuiz.options,
        answer: nextQuiz.answer,
      });
      bgmRef.current?.pause();
    }

    let lastQuizFrame = -1000;
    const quizSpawnInterval = 900;

    function spawnEntities() {
      if (flagShown) return;
      if (flagPushedRef.current) return;

      const canvas = canvasRef.current;
      const x = canvas.width;
      const yBase = canvas.height - groundHeightRatioRef.current * canvas.height;
      const candidates = [];

      // 퀴즈가 로드된 경우에만 퀴즈 박스 생성
      if (frameRef.current - lastQuizFrame > quizSpawnInterval && 
          Math.random() < 0.2 && 
          quizCountRef.current < 5 && 
          quizList.length > 0) { // 퀴즈 리스트가 있을 때만
        candidates.push('quiz');
        quizCountRef.current++;
        lastQuizFrame = frameRef.current;          
      }

      if (Math.random() < 0.4) candidates.push('coin');
      if (Math.random() < 0.8) candidates.push('hurdle');

      candidates.forEach(type => {
        let width, height, y, img;
        const player = playerRef.current;

        if (type === 'hurdle') {
          const idx = Math.floor(Math.random() * hurdleImagesRef.current.length);
          img = hurdleImagesRef.current[idx];
          width = idx === 0 ? canvas.width * 0.1 : canvas.width * 0.08;
          height = idx === 0 ? canvas.height * 0.15 : canvas.height * 0.08;
          y = yBase - height;
        } else if (type === 'coin') {
          img = coinImageRef.current;
          width = canvas.width * 0.04;
          height = width;
          y = yBase - height - player.height * 1.3;
        } else if (type === 'quiz') {
          img = quizBoxImageRef.current;
          width = canvas.width * 0.15;
          height = canvas.height * 0.25;
          y = canvas.height * 0.7 - height / 2;
        }

        const isTooClose = entitiesRef.current.some(e => Math.abs(e.x - x) < width * 2);
        if (type === 'quiz' || !isTooClose) {
          entitiesRef.current.push({ type, x, y, width, height, img });
        }
      });
    }

    function update() {
      if (gameOver) return;

      const player = playerRef.current;
      const entities = entitiesRef.current;
      let backgroundX = backgroundXRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = canvas.height / bgImg.height;
      const drawW = bgImg.width * scale;
      const drawH = canvas.height;
      backgroundX -= gameSpeedRef.current;
      if (backgroundX <= -drawW) backgroundX = 0;
      for (let x = backgroundX; x < canvas.width; x += drawW) {
        ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, x, 0, drawW, drawH);
      }
      backgroundXRef.current = backgroundX;

      if (!isPaused || !endingRef.current) {
        player.y += player.vy;
        player.vy += player.gravity;
      }
      if (player.y > canvas.height - groundHeightRatio * canvas.height - player.height) {
        player.y = canvas.height - groundHeightRatio * canvas.height - player.height;
        player.isJumping = false;
      }
      ctx.drawImage(playerImageRef.current, player.x, player.y, player.width, player.height);

      if (frameRef.current % 60 === 0 && !isPaused && !endingRef.current) {
        spawnEntities();
      }

      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (!isPaused || !endingRef.current) ent.x -= gameSpeedRef.current;

        if (ent.img && ent.img.complete && ent.img.naturalWidth !== 0) {
          ctx.drawImage(ent.img, ent.x, ent.y, ent.width, ent.height);
        }

        if (ent.type === 'flag' && ent.x + ent.width < player.x && !endingRef.current) {
          endingRef.current = true;
          playerImageRef.current = playerEndImage;
          entities.splice(i, 1);
          bgmRef.current?.pause();
          bgmRef.current.currentTime = 0;
          const finishSound = new Audio(require('../../assets/cute-level-up-3-189853.mp3'));
          finishSound.volume = 0.7;
          finishSound.play().catch(err => console.warn("끝 효과음 재생 실패:", err));
          showEndEffect();
          break; // 루프 탈출
        }

        if (ent.type === 'quiz' && !quiz && ent.x + ent.width < player.x) {
            console.log("퀴즈 박스와 충돌 감지!"); // 디버그 로그 추가
            cancelAnimationFrame(animationIdRef.current);
            snapshotState();
            entities.splice(i, 1);
            setIsPaused(true);
            showQuiz();
            return;
          } 

        if (!isPaused && !endingRef.current && detectCollision(player, ent)) {
          if (ent.type === 'hurdle') {
            scoreRef.current = Math.max(0, scoreRef.current - 5)
            showPenaltyEffect();
            entities.splice(i, 1);
            i--;
          } else if (ent.type === 'coin') {
            scoreRef.current += 5;
            showGainEffect();
            const coinSound = new Audio(require('../../assets/coin-recieved-230517.mp3'));
            coinSound.volume = 0.7;
            coinSound.play().catch(err => console.warn("코인 효과음 재생 실패:", err));
            entities.splice(i, 1);
            i--;
          }
        //    else if (ent.type === 'flag') {
        //     if (ent.x + ent.width < player.x && !endingRef.current) {
        //     endingRef.current = true;
        //     playerImageRef.current = playerEndImage;
        //     entities.splice(i, 1);
        //     bgmRef.current?.pause();
        //     bgmRef.current.currentTime = 0; // 🎵 완전 정지
        //     const finishSound = new Audio(require('../../assets/cute-level-up-3-189853.mp3'));
        //     finishSound.volume = 0.7;
        //     finishSound.play().catch(err => console.warn("끝 효과음 재생 실패:", err));
        //     showEndEffect();
        //   }
        // }
        }
      }

      ctx.font = `${canvas.width * 0.02}px Arial`;
      ctx.fillStyle = 'black';
      ctx.fillText('Score: ' + scoreRef.current, canvas.width - 200, 50);

      if (!isPaused) {
        frameRef.current++;
        gameSpeedRef.current += 0;
      }
      animationIdRef.current = requestAnimationFrame(updateRef.current);

      if (endingRef.current) {
        player.x += 8;
        if (player.x > canvas.width) {
          setGameOver(true);
          cancelAnimationFrame(animationIdRef.current);
        }
      }
    }

    updateRef.current = update;
    requestAnimationFrame(updateRef.current);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleInput=(e)=>{
        if(e.type==='keydown'&&e.code!=='Space') return;
        triggerJump();
    };

    //키보드, 클릭, 터치 이벤트 ㄷ등록
    document.addEventListener('keydown',handleInput);
    document.addEventListener('click',handleInput);
    document.addEventListener('touchstart',handleInput);

    //clean-up
    return()=>{
      window.removeEventListener('resize',resizeCanvas);
      document.removeEventListener('keydown',handleInput);
      document.removeEventListener('click',handleInput);
      document.removeEventListener('touchstart',handleInput);
    };

    // //점프
    // document.addEventListener('keydown', e => {
    //   const player = playerRef.current;
    //   if (e.code === 'Space' && !player.isJumping && !gameOver && !isPaused) {
    //     player.vy = player.jumpForce;
    //     player.isJumping = true;
    //   }
    // });

    // return () => window.removeEventListener('resize', resizeCanvas);
    
  }, [gameOver, quizLoaded, quizList, isGameStarted]); // quizLoaded와 quizList를 의존성에 추가

  //모바일 환경 점프
  const triggerJump=()=>{
    console.log("점프 클릭");
    const player=playerRef.current;
    if(!player.isJumping&&!gameOver&&!isPaused){
      player.vy=player.jumpForce;
      player.isJumping=true;
    }
  };

  // useEffect(()=>{
  //   const handleGlobalClick=()=>{
  //     triggerJump();
  //   };

  //   document.body.addEventListener('click',handleGlobalClick);
  //   document.body.addEventListener('touchstart',handleGlobalClick);

  //   return()=>{
  //     document.body.removeEventListener('click',handleGlobalClick);
  //     document.body.removeEventListener('touchstart',handleGlobalClick);
  //   };
  // },[gameOver,isPaused]);

  useEffect(() => {

  if (!bgmRef.current) return; // ✅ ref가 null이면 아무 것도 하지 않음
  const bgm = bgmRef.current;

  const tryPlayBGM = () => {
    if (bgm) {
      bgm.volume = 0.5; // 적당한 볼륨
      bgm.play().catch(err => console.warn("🎵 BGM 자동재생 실패:", err));
    }
  };

  // 사용자 상호작용 후 재생 보장 (브라우저 정책 회피)
  window.addEventListener('click', tryPlayBGM, { once: true });

  return () => {
    window.removeEventListener('click', tryPlayBGM);
    bgm?.pause();
    bgm.currentTime = 0;
  };
}, []);

  // 로딩 화면 표시
  if (!quizLoaded) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontSize: '2rem'
      }}>
        퀴즈 로딩 중...
      </div>
    );
  }

  return (
    <>
      {/*모바일 점프 추가*/}
      
      <canvas ref={canvasRef} onClick={triggerJump} onTouchStart={triggerJump} style={{ display: 'block', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',pointerEvents:'auto' }} /> 
      <audio ref={bgmRef} src={bgmSrc} loop />

      {quiz && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(5px)',
          zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' 
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', border: '2px solid #000', width: '400px', textAlign: 'center', borderRadius: '10px' }}>
            <h3>{quiz.question}</h3>
            {quiz.options.map((opt, idx) => (
              <button key={idx} onClick={() => handleQuizAnswer(opt)} style={{ margin: '0.5rem', padding: '0.5rem 1rem' }}>{opt}</button>
            ))}
          </div>
        </div>
      )}

      {correctVisible && (
        <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 200, 0, 0.8)', padding: '1rem 2rem', borderRadius: '10px', color: 'white', fontSize: '1.5rem', zIndex: 20 }}>
          정답입니다! +50점
        </div>
      )}

      {wrongVisible && (
        <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255, 0, 0, 0.8)', padding: '1rem 2rem', borderRadius: '10px', color: 'white', fontSize: '1.5rem', zIndex: 20 }}>
          오답입니다! 점수 0으로
        </div>
      )}

      {gainVisible && (
        <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255, 200, 0, 0.8)', padding: '1rem 2rem', borderRadius: '10px', color: 'white', fontSize: '1.5rem', zIndex: 20 }}>
          +5점!
        </div>
      )}

      {penaltyVisible && (
        <div style={{ position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(255, 0, 0, 0.8)', padding: '1rem 2rem', borderRadius: '10px', color: 'white', fontSize: '1.5rem', zIndex: 20 }}>
          -5점!
        </div>
      )}

      {endVisible && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0, 255, 102, 0.8)', padding: '1rem 2rem', borderRadius: '10px', color: 'white', fontSize: '3rem', zIndex: 20 }}>
          완주 완료!
        </div>
      )}

      {gameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflowY: 'auto',
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%'
          }}>
            <h2>🎉 게임 종료!</h2>
            <p>최종 코인: {scoreRef.current}</p>

            {/* 퀴즈 결과 요약 */}
            <h3 style={{ marginTop: '1rem' }}>📊 퀴즈 결과</h3>
            <p>
              맞춘 개수: {
                quizResultsRef.current.filter(r => r.isCorrect).length
              } / {quizResultsRef.current.length}
            </p>

            {/* 퀴즈 상세 결과 */}
            <div style={{ textAlign: 'left', marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {quizResultsRef.current.map((result, index) => (
                <div key={index} style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  backgroundColor: result.isCorrect ? '#e6ffe6' : '#ffe6e6'
                }}>
                  <strong>Q{index + 1}. {result.question}</strong>
                  <br />
                  <span>📝 선택한 답: <strong>{result.userAnswer}</strong></span>
                  <br />
                  <span>✅ 정답: <strong>{result.correctAnswer}</strong></span>
                  <br />
                  <span>{result.isCorrect ? "🎯 정답입니다!" : "❌ 오답입니다."}</span>
                </div>
              ))}
            </div>

            <button onClick={() => { navigate("/study/level6/summary"); }}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1.5rem'
              }}
            >
              다음으로
            </button>
          </div>
        </div>
      )}

      {!isGameStarted && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', color: 'white',
          zIndex: 100, flexDirection: 'column', textAlign: 'center', padding: '2rem'
        }}>
          <h1 style={{ marginBottom: '1.5rem', fontSize: '2.5rem'}}>게임을 시작하려면 클릭하세요!</h1>

          {/* 게임 설명 / 튜토리얼 */}
          <div style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <img src={coinImg} alt="코인" style={{ width: '40px', height: '40px' }} />
              <span>코인을 먹으면 +5점</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <img src={hurdle1Img} alt="장애물" style={{ width: '40px', height: '40px' }} />
              <span>장애물을 피하지 못하면 -5점</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src={quizBoxImg} alt="퀴즈박스" style={{ width: '40px', height: '40px' }} />
              <span>퀴즈 박스를 만나면 퀴즈가 출제돼요!</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem', marginTop: '3rem' }}>
              <span style={{ fontSize: '1.5rem' }}></span>
              <span>스페이스 바로 점프!</span>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: 0,
            width: '100%',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.7)',
            pointerEvents: 'none'
          }}>
            BGM “ Tiki_Bar_Mixer.mp3 ” by Kevin MacLeod (incompetech.com) — CC BY 3.0
          </div>

          {/* 시작 버튼 */}
          <button onClick={() => {
            bgmRef.current?.play();
            setIsGameStarted(true);
          }} style={{ fontSize: '1.5rem', padding: '1rem 2.5rem', cursor: 'pointer' }}>
            ▶ 시작하기 ✨
          </button>
        </div>
      )}

    </>
  );
}