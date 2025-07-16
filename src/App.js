import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabase 클라이언트 초기화
const supabaseUrl = 'https://nwggbjyuuhtnrxdhzofo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53Z2dianl1dWh0bnJ4ZGh6b2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODgyMTYsImV4cCI6MjA2NzI2NDIxNn0.a0eIxwPj8GEZNChQxIIm5622bPIqRg7pTXeqTrX5riI';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 컬럼명 매핑
const COLUMN_MAPPING = {
  '대회명': 'Competition',
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
  '대회명', '소속팀', 'vs 상대팀', '선수명', '등번호', '1Q 득점', '2Q 득점', '3Q 득점', '4Q 득점', '연장 득점', '총득점',
  '플레잉 타임', '2점슛 성공', '2점슛 시도', '2점 성공률(%)', '3점슛 성공', '3점슛 시도',
  '3점 성공률(%)', '필드골 성공률(%)', '자유투 성공', '자유투 시도', '자유투 성공률(%)',
  '공격 리바운드', '수비 리바운드', '총 리바운드', '어시스트', '스틸', '굿디펜스', '블록슛',
  '턴오버', '총 파울'
];

// 레코드 처리 헬퍼 함수
const processRecords = (records) => {
  if (records && records.length > 0) {
    console.log("First record from Supabase:", JSON.stringify(records[0], null, 2));
  }
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



function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [uniquePlayers, setUniquePlayers] = useState([]);
  const [displayRecords, setDisplayRecords] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [selectionMode, setSelectionMode] = useState(''); // 'player' or 'competition'
  const [showDetailPage, setShowDetailPage] = useState(false); // New state for detail page
  const [isTeamSearchMode, setIsTeamSearchMode] = useState(false); // New state for team search mode
  const [selectedCompetition, setSelectedCompetition] = useState('전체'); // New state for selected competition filter
  const [availableCompetitions, setAvailableCompetitions] = useState([]); // New state for competitions available for the current search/selection
  const [selectedPlayerRecords, setSelectedPlayerRecords] = useState([]); // Stores all records for a selected player/team, unfiltered by competition

  // Effect to filter displayRecords based on selectedCompetition and selectedPlayerRecords
  useEffect(() => {
    if (selectedPlayerRecords.length > 0) {
      const filteredRecords = selectedCompetition === '전체'
        ? selectedPlayerRecords
        : selectedPlayerRecords.filter(record => record['대회명'] === selectedCompetition);
      setDisplayRecords(processRecords(filteredRecords));
    }
  }, [selectedCompetition, selectedPlayerRecords]);

  // Fetch rankings on component mount
  useEffect(() => {
    const fetchRankings = async () => {
      const { data: allRecords, error } = await supabase
        .from('2025 주말리그 선수기록')
        .select('*');

      if (error) {
        console.error('Error fetching all records for rankings:', error);
      } else {
        // setHighSchoolRankings(calculateRankings(allRecords));
        // setAssistRankings(calculateAssistRankings(allRecords)); // 어시스트 랭킹 계산
        const uniqueCompetitions = ['전체', ...new Set(allRecords.map(record => record['대회명']).filter(Boolean))];
        // setCompetitions(uniqueCompetitions);
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
    setIsTeamSearchMode(false);
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

  const handleGoBack = () => {
    // Case 1: From final results table back to selection screen
    if (showResults) {
      setShowResults(false);
      setNeedsSelection(true);
      return;
    }
    
    // Case 2: From selection screen
    if (needsSelection) {
      // If it was a team search, going back from competition selection should show the player list again.
      if (isTeamSearchMode && selectionMode === 'competition') {
        setSelectionMode('player');
      } else {
        // Otherwise, go to the home page.
        handleGoHome();
      }
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    // Reset states
    setUniquePlayers([]);
    setDisplayRecords([]);
    setNeedsSelection(false);
    setShowResults(false);
    setIsTeamSearchMode(false); // Reset team search mode
    setSelectedCompetition('전체'); // Reset selected competition filter
    setAvailableCompetitions([]); // Reset available competitions
    setSelectedPlayerRecords([]); // Reset selected player records

    if (!searchTerm.trim()) {
      return;
    }

    let searchResults = [];
    let searchError = null;

    // 1. Try searching by team name
    const teamSearchTerm = searchTerm.endsWith('학교') ? searchTerm : `${searchTerm}학교`;
    const teamSearchTermShort = searchTerm.endsWith('중') ? searchTerm : `${searchTerm}중학교`;

    const { data: teamData, error: teamError } = await supabase
      .from('2025 주말리그 선수기록')
      .select('*')
      .or(`소속팀.ilike.%${teamSearchTerm}%,소속팀.ilike.%${searchTerm}%,소속팀.ilike.%${teamSearchTermShort}%`);

    if (teamError) {
      console.error('Error searching teams:', teamError);
      searchError = teamError;
    } else if (teamData && teamData.length > 0) {
      // If team found, display unique players from that team
      const uniquePlayersInTeam = Array.from(new Set(teamData.map(p => `${p['선수명']}_${p['등번호']}_${p['소속팀']}`))) // Include team in key
        .map(key => {
          const [name, no, team] = key.split('_');
          return { '선수명': name, '등번호': no, '소속팀': team };
        });

      if (uniquePlayersInTeam.length > 0) {
        setUniquePlayers(uniquePlayersInTeam);
        setNeedsSelection(true);
        setIsTeamSearchMode(true); // Set team search mode
        setSelectionMode('player'); // Set selection mode to player
        return; // Exit after team search
      }
    }

    // 2. If no team found or no players in team, try searching by player name
    const { data: playerData, error: playerError } = await supabase
      .from('2025 주말리그 선수기록')
      .select('*')
      .ilike('선수명', `%${searchTerm}%`);

    if (playerError) {
      console.error('Error searching players:', playerError);
      searchError = playerError;
    } else {
      searchResults = playerData;
    }

    if (searchError) {
      setShowResults(true); // Show error/empty message
      return;
    }

    if (searchResults && searchResults.length > 0) {
      const groupedByPlayerAndTeam = searchResults.reduce((acc, record) => {
        const key = `${record['선수명']}_${record['소속팀']}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(record);
        return acc;
      }, {});

      const uniquePlayerTeamCombinations = Object.values(groupedByPlayerAndTeam);
      console.log('handleSearch - searchResults:', searchResults);

      if (uniquePlayerTeamCombinations.length > 1) {
        // Multiple players with the same name or same player in different teams
        setUniquePlayers(uniquePlayerTeamCombinations.map(group => group[0])); // Show first record of each group for selection
        setNeedsSelection(true);
        setSelectionMode('player');
        // Extract competitions from searchResults for selection screen
        const comps = ['전체', ...new Set(searchResults.map(record => record['대회명']).filter(Boolean))];
        setAvailableCompetitions(comps);
        console.log('handleSearch - multiple players, uniquePlayers:', uniquePlayers);
        console.log('handleSearch - multiple players, searchResultCompetitions:', comps);
      } else if (uniquePlayerTeamCombinations.length === 1) {
        // Single player-team combination found
        const recordsForSelectedPlayer = uniquePlayerTeamCombinations[0];
        setSelectedPlayerRecords(recordsForSelectedPlayer); // Store all records for this player

        const comps = ['전체', ...new Set(recordsForSelectedPlayer.map(record => record['대회명']).filter(Boolean))];
        setAvailableCompetitions(comps);
        console.log('handleSearch - single player, selectedPlayerRecords:', recordsForSelectedPlayer);
        console.log('handleSearch - single player, availableCompetitions:', comps);

        // Always show competition selection for this player
        setNeedsSelection(true);
        setSelectionMode('competition'); // Set selection mode to competition
        console.log('handleSearch - needs competition selection');
      }
    } else {
      setShowResults(true); // No data, show empty message
      console.log('handleSearch - no search results');
    }
  };

  const handlePlayerSelect = async (player) => {
    console.log('handlePlayerSelect - selected player:', player);
    const { data, error } = await supabase
      .from('2025 주말리그 선수기록')
      .select('*')
      .eq('선수명', player['선수명'])
      .eq('소속팀', player['소속팀']);

    if (error) {
      console.error('Error fetching player records:', error);
      return;
    }

    if (data && data.length > 0) {
      setSelectedPlayerRecords(data); // Store all records for this player
      const comps = ['전체', ...new Set(data.map(record => record['대회명']).filter(Boolean))];
      setAvailableCompetitions(comps);
      setNeedsSelection(true); // Always show competition selection
      setShowResults(false); // Hide results table initially
      setSelectionMode('competition'); // Set selection mode to competition
      console.log('handlePlayerSelect - selectedPlayerRecords set:', data);
      console.log('handlePlayerSelect - availableCompetitions set:', comps);
    }
  };

  const handlePlayerSelectFromTeam = async (playerName, playerTeam) => {
    console.log('handlePlayerSelectFromTeam - playerName:', playerName, 'playerTeam:', playerTeam);
    const { data, error } = await supabase
      .from('2025 주말리그 선수기록')
      .select('*')
      .eq('선수명', playerName)
      .eq('소속팀', playerTeam);

    if (error) {
      console.error('Error fetching player records:', error);
      return;
    }

    if (data && data.length > 0) {
      setSelectedPlayerRecords(data); // Store all records for this player
      const comps = ['전체', ...new Set(data.map(record => record['대회명']).filter(Boolean))];
      setAvailableCompetitions(comps);
      setNeedsSelection(true); // Always show competition selection
      setShowResults(false); // Hide results table initially
      setSelectionMode('competition'); // Set selection mode to competition
      // isTeamSearchMode is already true, so we don't need to set it again.
      console.log('handlePlayerSelectFromTeam - selectedPlayerRecords set:', data);
      console.log('handlePlayerSelectFromTeam - availableCompetitions set:', comps);
    }
  };

  // Helper to render the header
  const renderHeader = () => (
    <div className="results-header">
      <button className="back-button" onClick={handleGoBack}>
        &lt;
      </button>
      <h1 className="logo-small" onClick={handleGoHome}>
        <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
      </h1>
      <form onSubmit={handleSearch} className="search-form-results">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="submit">검색</button>
        <button type="button" onClick={handleGoToDetailPage} className="hide-on-mobile-results">Hoop Zone</button>
      </form>
    </div>
  );

  // Main render logic
  return (
    <div className="App">
      {(() => {
        if (showDetailPage) {
          return (
            <div className="detail-page-container">
              <h2>상세 페이지</h2>
              <p>여기에 상세 내용을 추가할 예정입니다.</p>
              <button onClick={handleGoBackFromDetail}>뒤로 가기</button>
            </div>
          );
        }

        if (needsSelection) {
          return (
            <div className="results-container">
              {renderHeader()}
              <div className="selection-container">
                <h2>{selectionMode === 'player' ? '선수 선택' : '대회 선택'}</h2>
                
                {selectionMode === 'competition' && (
                  <div className="competition-buttons-container">
                    {availableCompetitions.map((comp) => (
                      <button
                        key={comp}
                        className={`competition-button ${selectedCompetition === comp ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedCompetition(comp);
                          setShowResults(true);
                          setNeedsSelection(false);
                        }}
                      >
                        {comp}
                      </button>
                    ))}
                  </div>
                )}

                {selectionMode === 'player' && (
                  <ul className="selection-list">
                    {uniquePlayers.map(player => (
                      <li 
                        key={`${player['선수명']}_${player['등번호']}_${player['소속팀']}`}
                        onClick={() => isTeamSearchMode 
                          ? handlePlayerSelectFromTeam(player['선수명'], player['소속팀']) 
                          : handlePlayerSelect(player)}
                      >
                        <span className="player-name">{player['선수명']}</span>
                        <span className="team-name">({player['소속팀']})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }

        if (showResults) {
          return (
            <div className="results-container">
              {renderHeader()}
              {displayRecords.length > 0 ? (
                <>
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
                  <div className="cards-container">
                    {displayRecords.map((record, index) => (
                      <div key={index} className="player-card">
                        <div className="card-header">
                          {record['대회명']} {record['vs 상대팀']}
                          <br />
                          {record['선수명']} <span className="jersey-number">no.{record['등번호']}</span> <span className="team-name-mobile">{record['소속팀'].replace('(', '').replace(')', '')}</span>
                        </div>
                        <div className="card-body">
                          {DISPLAY_COLUMNS.filter(col => !['대회명', '선수명', '소속팀', 'vs 상대팀', '등번호'].includes(col)).map(colKey => (
                            <div key={`${record.id}-${colKey}`} className={`card-item ${['총득점', '2점 성공률(%)', '3점 성공률(%)', '필드골 성공률(%)', '어시스트'].includes(colKey) ? 'highlight-yellow' : ''}`}>
                              <span className="label">{COLUMN_MAPPING[colKey]}</span>
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
          );
        }

        // Default case: Home page
        return (
          <div className="search-container">
            <h1 className="logo">
              <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
            </h1>
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="선수명 또는 팀명으로 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="buttons">
                <button type="submit">검색</button>
                <button type="button" onClick={handleGoToDetailPage}>Hoop Zone</button>
              </div>
            </form>
            <div className="data-source-container">
              <span className="data-source-wrapper">
                Data Source : 
                <a href="http://www.kssbf.or.kr/" target="_blank" rel="noopener noreferrer" className="kssbf-link">
                  KSSBF
                </a>
                <a href="https://www.koreabasketball.or.kr/main/" target="_blank" rel="noopener noreferrer" className="kssbf-link">
                  KBA
                </a>
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;
