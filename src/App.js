import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase 클라이언트 초기화
const supabaseUrl = 'https://nwggbjyuuhtnrxdhzofo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Z2dianl1dWh0bnJ4ZGh6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODgyMTYsImV4cCI6MjA2NzI2NDIxNn0.a0eIxwPj8GEZNChQxIIm5622bPIqRg7pTXeqTrX5riI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 컬럼명 매핑
const COLUMN_MAPPING = {
  '소속팀': 'Team',
  'vs 상대팀': 'vs',
  '선수명': 'name',
  '등번호': 'no.',
  '1Q 득점': '1QP',
  '2Q 득점': '2QP',
  '3Q 득점': '3QP',
  '4Q 득점': '4QP',
  '연장 득점': 'EX',
  '총득점': 'PTS',
  '플레잉 타임': 'MIN',
  '2점슛 성공': '2PM',
  '2점슛 시도': '2PA',
  '2점 성공률(%)': '2P%',
  '3점슛 성공': '3PM',
  '3점슛 시도': '3PA',
  '3점 성공률(%)': '3P%',
  '필드골 성공률(%)': 'FG%',
  '자유투 성공': 'FTM',
  '자유투 시도': 'FTA',
  '자유투 성공률(%)': 'FT%',
  '공격 리바운드': 'OREB',
  '수비 리바운드': 'DREB',
  '총 리바운드': 'REB',
  '어시스트': 'AST',
  '스틸': 'STL',
  '굿디펜스': 'GD',
  '블록슛': 'BLK',
  '턴오버': 'TO',
  '총 파울': 'Foul'
};

// 표시할 컬럼 순서 (원본 컬럼명 사용)
const DISPLAY_COLUMNS = [
  '소속팀', 'vs 상대팀', '선수명', '등번호', '1Q 득점', '2Q 득점', '3Q 득점', '4Q 득점', '연장 득점', '총득점',
  '플레잉 타임', '2점슛 성공', '2점슛 시도', '2점 성공률(%)', '3점슛 성공', '3점슛 시도',
  '3점 성공률(%)', '필드골 성공률(%)', '자유투 성공', '자유투 시도', '자유투 성공률(%)',
  '공격 리바운드', '수비 리바운드', '총 리바운드', '어시스트', '스틸', '굿디펜스', '블록슛',
  '턴오버', '총 파울'
];

// 레코드 처리 헬퍼 함수
const processRecords = (records) => {
  return records.map(p => {
    const q1 = parseInt(p['1Q 득점']) || 0;
    const q2 = parseInt(p['2Q 득점']) || 0;
    const q3 = parseInt(p['3Q 득점']) || 0;
    const q4 = parseInt(p['4Q 득점']) || 0;
    const ot = parseInt(p['연장 득점']) || 0;

    let teamName = (p['소속팀'] || '').replace('등학교', '');
    if (teamName.includes('중학교')) {
      teamName = teamName.replace('중학교', '중');
    }

    let opponentName = (p['상대팀'] || '').replace('등학교', '');
    if (opponentName.includes('중학교')) {
      opponentName = opponentName.replace('중학교', '중');
    }
    const vsOpponent = p['상대팀'] ? `vs ${opponentName}` : '';

    return {
      ...p,
      '소속팀': teamName,
      '총득점': q1 + q2 + q3 + q4 + ot,
      'vs 상대팀': vsOpponent
    };
  });
};

// 랭킹 계산 헬퍼 함수
const calculateRankings = (allRecords) => {
  const highSchoolRecords = allRecords.filter(record => 
    record['소속팀'] && 
    record['소속팀'].includes('고등학교') && 
    !record['소속팀'].includes('여자고등학교')
  );

  const playerStats = {};

  highSchoolRecords.forEach(record => {
    const playerKey = `${record['선수명']}-${record['등번호']}`;
    if (!playerStats[playerKey]) {
      playerStats[playerKey] = {
        '선수명': record['선수명'],
        '등번호': record['등번호'],
        '소속팀': (record['소속팀'] || '').replace('고등학교', '고'),
        totalPoints: 0,
        gameCount: 0,
        totalFGPercentage: 0,
      };
    }
    
    const q1 = parseInt(record['1Q 득점']) || 0;
    const q2 = parseInt(record['2Q 득점']) || 0;
    const q3 = parseInt(record['3Q 득점']) || 0;
    const q4 = parseInt(record['4Q 득점']) || 0;
    const ot = parseInt(record['연장 득점']) || 0;
    const totalPointsInGame = q1 + q2 + q3 + q4 + ot;

    playerStats[playerKey].totalPoints += totalPointsInGame;
    playerStats[playerKey].gameCount += 1;
    playerStats[playerKey].totalFGPercentage += (parseFloat(record['필드골 성공률(%)']) || 0);
  });

  const rankedPlayers = Object.values(playerStats)
    .filter(player => player.gameCount > 0)
    .map(player => ({
      ...player,
      averagePoints: player.totalPoints / player.gameCount,
      averageFGPercentage: player.totalFGPercentage / player.gameCount,
    }));

  // Sort: Primary by averagePoints (desc), Secondary by averageFGPercentage (desc)
  rankedPlayers.sort((a, b) => {
    if (b.averagePoints !== a.averagePoints) {
      return b.averagePoints - a.averagePoints;
    }
    return b.averageFGPercentage - a.averageFGPercentage; // Tie-breaker
  });

  // Assign ranks with ties
  let currentRank = 1;
  let prevPoints = null;
  let prevFGPercentage = null;
  for (let i = 0; i < rankedPlayers.length; i++) {
    if (rankedPlayers[i].averagePoints !== prevPoints || rankedPlayers[i].averageFGPercentage !== prevFGPercentage) {
      currentRank = i + 1;
    }
    rankedPlayers[i].rank = currentRank;
    prevPoints = rankedPlayers[i].averagePoints;
    prevFGPercentage = rankedPlayers[i].averageFGPercentage;
  }

  return rankedPlayers.slice(0, 10); // Top 10
};

// 어시스트 랭킹 계산 헬퍼 함수
const calculateAssistRankings = (allRecords) => {
  const highSchoolRecords = allRecords.filter(record => 
    record['소속팀'] && 
    record['소속팀'].includes('고등학교') && 
    !record['소속팀'].includes('여자고등학교')
  );

  const playerStats = {};

  highSchoolRecords.forEach(record => {
    const playerKey = `${record['선수명']}-${record['등번호']}`;
    if (!playerStats[playerKey]) {
      playerStats[playerKey] = {
        '선수명': record['선수명'],
        '등번호': record['등번호'],
        '소속팀': (record['소속팀'] || '').replace('고등학교', '고'),
        totalAssists: 0,
        gameCount: 0,
      };
    }
    playerStats[playerKey].totalAssists += (parseInt(record['어시스트']) || 0);
    playerStats[playerKey].gameCount += 1;
  });

  const rankedPlayers = Object.values(playerStats)
    .filter(player => player.gameCount > 0)
    .map(player => ({
      ...player,
      averageAssists: player.totalAssists / player.gameCount,
    }));

  rankedPlayers.sort((a, b) => b.averageAssists - a.averageAssists);

  let currentRank = 1;
  let prevAssists = null;
  for (let i = 0; i < rankedPlayers.length; i++) {
    if (rankedPlayers[i].averageAssists !== prevAssists) {
      currentRank = i + 1;
    }
    rankedPlayers[i].rank = currentRank;
    prevAssists = rankedPlayers[i].averageAssists;
  }

  return rankedPlayers.slice(0, 10);
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [uniquePlayers, setUniquePlayers] = useState([]);
  const [displayRecords, setDisplayRecords] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [highSchoolRankings, setHighSchoolRankings] = useState([]);
  const [assistRankings, setAssistRankings] = useState([]); // 어시스트 랭킹 state
  const [showDetailPage, setShowDetailPage] = useState(false); // New state for detail page

  // Fetch rankings on component mount
  useEffect(() => {
    const fetchRankings = async () => {
      const { data, error } = await supabase
        .from('2025 주말리그 선수기록')
        .select('*');

      if (error) {
        console.error('Error fetching all records for rankings:', error);
      } else {
        setHighSchoolRankings(calculateRankings(data));
        setAssistRankings(calculateAssistRankings(data)); // 어시스트 랭킹 계산
      }
    };
    fetchRankings();
  }, []);

  const handleGoHome = () => {
    setShowResults(false);
    setNeedsSelection(false);
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
    setShowDetailPage(false); // Ensure detail page is hidden
  };

  const handleGoToDetailPage = () => {
    setShowDetailPage(true);
    setShowResults(false); // Hide search results
    setNeedsSelection(false); // Hide player selection
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
  };

  const handleGoBackFromDetail = () => {
    setShowDetailPage(false);
    // Optionally reset other states if needed for a clean return to home
    setShowResults(false);
    setNeedsSelection(false);
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    // Reset states
    setUniquePlayers([]);
    setDisplayRecords([]);
    setNeedsSelection(false);
    setShowResults(false);

    if (!searchTerm.trim()) {
      return;
    }

    const { data, error } = await supabase
      .from('2025 주말리그 선수기록')
      .select('*')
      .ilike('선수명', `%${searchTerm}%`);

    if (error) {
      console.error('Error searching players:', error);
      setShowResults(true); // Show error/empty message
      return;
    }

    if (data && data.length > 0) {
      const grouped = data.reduce((acc, player) => {
        const key = `${player['선수명']}_${player['소속팀']}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(player);
        return acc;
      }, {});

      const uniquePlayerGroups = Object.values(grouped);

      if (uniquePlayerGroups.length > 1) {
        setUniquePlayers(uniquePlayerGroups);
        setNeedsSelection(true);
      } else if (uniquePlayerGroups.length === 1) {
        const records = uniquePlayerGroups[0];
        setDisplayRecords(processRecords(records));
        setShowResults(true);
      }
    } else {
      setShowResults(true); // No data, show empty message
    }
  };

  const handlePlayerSelect = (records) => {
    setDisplayRecords(processRecords(records));
    setNeedsSelection(false);
    setShowResults(true);
  };

  return (
    <div className="App">
      {showDetailPage ? (
        <div className="detail-page-container">
          <h2>상세 페이지</h2>
          <p>여기에 상세 내용을 추가할 예정입니다.</p>
          <button onClick={handleGoBackFromDetail}>뒤로 가기</button>
        </div>
      ) : needsSelection ? (
        <div className="selection-container">
          <h2>선택하세요.</h2>
          <ul className="selection-list">
            {uniquePlayers.map(playerGroup => (
              <li key={`${playerGroup[0]['선수명']}_${playerGroup[0]['소속팀']}`} onClick={() => handlePlayerSelect(playerGroup)}>
                <span className="player-name">{playerGroup[0]['선수명']}</span>
                <span className="team-name">({playerGroup[0]['소속팀']})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : !showResults ? (
        <div className="search-container">
          <h1 className="logo">
            <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">g</span><span className="hoopgle-yellow">l</span><span className="hoopgle-navy">e</span>
          </h1>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-bar">
              <input
                type="text"
                placeholder="선수 이름으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="buttons">
              <button type="submit">검색</button>
              <button type="button" onClick={handleGoToDetailPage}>I'm Hooping</button> {/* New button */}
            </div>
          </form>

          <div className="data-source-container">
            <span className="data-source-wrapper">
              Data Source : 
              <a href="http://www.kssbf.or.kr/" target="_blank" rel="noopener noreferrer" className="kssbf-link">
                KSSBF
              </a>
            </span>
          </div>

        </div>
      ) : (
        <div className="results-container">
          <div className="results-header">
            <h1 className="logo-small" onClick={handleGoHome}>
              <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">g</span><span className="hoopgle-yellow">l</span><span className="hoopgle-navy">e</span>
            </h1>
            <form onSubmit={handleSearch} className="search-form-results">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">검색</button>
              <button type="button" onClick={handleGoToDetailPage} className="hide-on-mobile-results">I'm Hooping</button> {/* New button */}
            </form>
          </div>
          {displayRecords.length > 0 ? (
            <>
              <h3 style={{ textAlign: 'left', margin: '10px 0', fontSize: '16px', fontWeight: 'normal' }}>2025 주말리그</h3>
              
              {/* Desktop Table */}
              <table className="desktop-table">
                <thead>
                  <tr>
                    {DISPLAY_COLUMNS.map(colKey => (
                      <th key={colKey} className={colKey === '선수명' ? 'name-column' : ''}>
                        {COLUMN_MAPPING[colKey]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRecords.map((record) => (
                    <tr key={record.id}>
                      {DISPLAY_COLUMNS.map(colKey => (
                        <td key={`${record.id}-${colKey}`} className={colKey === '선수명' ? 'name-column' : ''}>
                          {record[colKey] !== undefined && record[colKey] !== null ? record[colKey] : 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="cards-container">
                {displayRecords.map((record) => (
                  <div key={record.id} className="player-card">
                    <div className="card-header">
                      {record['선수명']} <span className="jersey-number">no.{record['등번호']}</span> (<span className="team-name-mobile">{record['소속팀']}</span>) {record['vs 상대팀']}
                    </div>
                    <div className="card-body">
                      {DISPLAY_COLUMNS.filter(col => !['선수명', '소속팀', 'vs 상대팀', '등번호'].includes(col)).map(colKey => (
                        <div key={`${record.id}-${colKey}`} className="card-item">
                          <span className={`label ${['PTS', '2P%', '3P%', 'AST'].includes(COLUMN_MAPPING[colKey]) ? 'blue-label' : ''}`}>{COLUMN_MAPPING[colKey]}</span>
                          <span className="value">{record[colKey] !== undefined && record[colKey] !== null ? record[colKey] : 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>검색 결과가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;