import React, { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import StudyStatsBox from '../../components/analyze/StudyStatsBox';
import StudyTimeStats from '../../components/analyze/StudyTimeStats';
import RadarGraph from '../../components/analyze/RadarChart';
import QnAViewer from '../../components/analyze/QnAViewer';

import { fetchStudyStats, fetchRadarScore } from '../../api/analyze/analytics';

export default function Dashboard() {
  const [studyStats, setStudyStats] = useState({ totalCompleted: 0, weeklyCompleted: 0 });
  const [thisWeek, setThisWeek] = useState({});
  const [lastWeek, setLastWeek] = useState({});

  useEffect(() => {
    fetchStudyStats()
    .then(setStudyStats)
    .catch(err => {
      console.error("❌ 통계 불러오기 실패:", err);
      setStudyStats(null); // 또는 빈 값으로 처리
    });
    fetchRadarScore().then(score => {
      setThisWeek(score.thisWeek);
      setLastWeek(score.lastWeek);
    });
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.navbar}>
        학습 분석
      </div>

      <div className={styles.contentBox}>
        {/* ⬆️ 위쪽 수평 두 개 */}
        <div className={styles.topBoxes}>
          <div className={`${styles.squareBox} ${styles.topBox}`}>
            <StudyStatsBox type="total" />
          </div>
          <div className={`${styles.squareBox} ${styles.topBox}`}>
            <StudyStatsBox type="weekly" />
          </div>
        </div>

        {/* ⬅️ 가운데 박스: 방사형 그래프 + 설명 */}
        <div className={styles.radarChartBox}>
          {thisWeek && lastWeek && Object.keys(thisWeek).length > 0 ? (
            <RadarGraph thisWeek={thisWeek} lastWeek={lastWeek} />
          ) : (
            <p style={{ textAlign: 'center', padding: '60px 0' }}>
              분석 데이터를 불러오는 중입니다...
            </p>
          )}
        </div>

        {/* ⬇️ 아래 수평 두 개 */}
        <div className={styles.bottomBoxes}>
          <div className={styles.squareBox}>
            <StudyTimeStats />
          </div>
          <div className={`${styles.squareBox} ${styles.qnaBox}`}>
            <QnAViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
