import React, { useState, useEffect } from 'react';
import CommunityPage from './CommunityPage';
import { db } from './firebaseConfig';
import { collection, getDocs, query } from 'firebase/firestore';
import './App.css';

// RankingsPage Component Definition
const RankingsPage = ({ middleSchoolRankings, highSchoolRankings, onGoHome, selectedSeason, onSelectSeason }) => {
  const [activeTab, setActiveTab] = useState('middleSchool'); // 'middleSchool' or 'highSchool'
  const [middleSchoolSubTab, setMiddleSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [highSchoolSubTab, setHighSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [rankingType, setRankingType] = useState('avgPoints'); // 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [isLoading, setIsLoading] = useState(true); // Loading state for rankings

  // Simulate loading or check if data is available
  useEffect(() => {
    if (middleSchoolRankings.all.length > 0 || highSchoolRankings.all.length > 0) {
      setIsLoading(false);
    } else {
      // If data is empty, it might still be fetching in the parent. 
      // However, since we pass props, we rely on parent's fetch. 
      // But we can show loading if the lists are empty initially.
      // A better approach is to pass 'isLoading' from parent or simply assume loading if empty.
      // For now, let's use a timeout if it stays empty too long, or better, 
      // let's assume if props are empty arrays, we are loading? 
      // Actually, parent does the fetch. Let's add an effect to turn off loading when data arrives.
      const timer = setTimeout(() => setIsLoading(false), 2000); // Fallback timeout
      return () => clearTimeout(timer);
    }
  }, [middleSchoolRankings, highSchoolRankings]);

  const getSortedRankings = (rankings) => {
    let sorted = [...rankings];
    if (rankingType === 'totalPoints') {
      sorted.sort((a, b) => b.totalPoints - a.totalPoints);
    } else if (rankingType === 'totalAssists') {
      sorted.sort((a, b) => b.totalAssists - a.totalAssists);
    } else if (rankingType === 'totalRebounds') {
      sorted.sort((a, b) => b.totalRebounds - a.totalRebounds);
    } else if (rankingType === 'totalBlocks') {
      sorted.sort((a, b) => b.totalBlocks - a.totalBlocks);
    } else if (rankingType === 'totalSteals') {
      sorted.sort((a, b) => b.totalSteals - a.totalSteals);
    } else if (rankingType === 'avgPoints') {
      sorted.sort((a, b) => b.avgPoints - a.avgPoints);
    } else if (rankingType === 'avgAssists') {
      sorted.sort((a, b) => b.avgAssists - a.avgAssists);
    } else if (rankingType === 'avgRebounds') {
      sorted.sort((a, b) => b.avgRebounds - a.avgRebounds);
    } else if (rankingType === 'avgSteals') {
      sorted.sort((a, b) => b.avgSteals - a.avgSteals);
    }
    return sorted;
  };

  const renderRankingList = (rankings) => {
    const sortedRankings = getSortedRankings(rankings);

    // Filter by search term and limit to top 50
    const filteredRankings = sortedRankings
      .filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 50); // Limit to top 50 players

    if (isLoading) {
      return (
        <div className="loading-container" style={{ padding: '50px 0' }}>
          <div className="loading-spinner"></div>
          <p>랭킹 불러오는 중...</p>
        </div>
      );
    }

    if (filteredRankings.length === 0) {
      return <p className="no-results-message">검색 결과가 없습니다.</p>;
    }

    return (
      <div className="cards-container">
        {filteredRankings.map((player, index) => {
          let displayRank;
          if (rankingType === 'totalPoints') {
            displayRank = player.originalRankTotalPoints;
          } else if (rankingType === 'totalAssists') {
            displayRank = player.originalRankTotalAssists;
          } else if (rankingType === 'totalRebounds') {
            displayRank = player.originalRankTotalRebounds;
          } else if (rankingType === 'totalBlocks') {
            displayRank = player.originalRankTotalBlocks;
          } else if (rankingType === 'totalSteals') {
            displayRank = player.originalRankTotalSteals;
          } else if (rankingType === 'avgPoints') {
            displayRank = player.originalRankAvgPoints;
          } else if (rankingType === 'avgAssists') {
            displayRank = player.originalRankAvgAssists;
          } else if (rankingType === 'avgRebounds') {
            displayRank = player.originalRankAvgRebounds;
          } else if (rankingType === 'avgSteals') {
            displayRank = player.originalRankAvgSteals;
          }

          return (
            <div key={player.name + player.team + player.jersey} className="player-card ranking-card">
              <div className="card-header">
                <span className="ranking-number">{displayRank}위</span>
                {player.name} <span className="jersey-number">no.{player.jersey}</span>
                {rankingType === 'avgPoints' && displayRank <= 5 && <span className="flame-emoji"> 🔥</span>}
                {rankingType === 'avgAssists' && displayRank <= 5 && <span className="dime-dealer-emoji"> 🏀</span>}
                {rankingType === 'avgRebounds' && displayRank <= 5 && <span className="sky-sweeper-emoji"> 🖐️</span>}
                {rankingType === 'avgSteals' && displayRank <= 5 && <span className="steal-emoji"> 🥷</span>}
                <span className="team-name-mobile">{player.team.replace('(', '').replace(')', '')}</span>
              </div>
              <div className="card-body">
                <div className={`card-item ${rankingType === 'totalPoints' || rankingType === 'avgPoints' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총득점</span>
                  <span className="value">{player.totalPoints}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalAssists' || rankingType === 'avgAssists' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 어시스트</span>
                  <span className="value">{player.totalAssists}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalRebounds' || rankingType === 'avgRebounds' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 리바운드</span>
                  <span className="value">{player.totalRebounds}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalBlocks' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 블록슛</span>
                  <span className="value">{player.totalBlocks}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalSteals' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 스틸</span>
                  <span className="value">{player.totalSteals}</span>
                </div>
                <div className={`card-item ${rankingType === 'avgPoints' ? 'highlight-yellow' : ''}`}>
                  <span className="label">평균 득점</span>
                  <span className="value">{player.avgPoints}</span>
                </div>
                <div className={`card-item ${rankingType === 'avgAssists' ? 'highlight-yellow' : ''}`}>
                  <span className="label">평균 어시스트</span>
                  <span className="value">{player.avgAssists}</span>
                </div>
                <div className={`card-item ${rankingType === 'avgRebounds' ? 'highlight-yellow' : ''}`}>
                  <span className="label">평균 리바운드</span>
                  <span className="value">{player.avgRebounds}</span>
                </div>
                <div className={`card-item ${rankingType === 'avgSteals' ? 'highlight-yellow' : ''}`}>
                  <span className="label">평균 스틸</span>
                  <span className="value">{player.avgSteals}</span>
                </div>
                {Object.entries(player.competitions).map(([compName, points]) => (
                  <div key={compName} className="card-item">
                    <span className="label">{compName.replace('대회', '').trim()} 총득점</span>
                    <span className="value">{points}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  let currentRankings = [];
  if (activeTab === 'middleSchool') {
    if (middleSchoolSubTab === 'all') {
      currentRankings = middleSchoolRankings.all;
    } else if (middleSchoolSubTab === 'male') {
      currentRankings = middleSchoolRankings.male;
    } else if (middleSchoolSubTab === 'female') {
      currentRankings = middleSchoolRankings.female;
    }
  } else if (activeTab === 'highSchool') {
    if (highSchoolSubTab === 'all') {
      currentRankings = highSchoolRankings.all;
    } else if (highSchoolSubTab === 'male') {
      currentRankings = highSchoolRankings.male;
    } else if (highSchoolSubTab === 'female') {
      currentRankings = highSchoolRankings.female;
    }
  }

  return (
    <div className="rankings-container">
      <div className="results-header">
        <h1 className="logo-small" onClick={onGoHome}>
          <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy"> Z</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">n</span><span className="hoopgle-yellow">e</span>
        </h1>
        <button onClick={onGoHome} className="home-button-rankings">홈으로</button>
      </div>

      <div className="season-switcher-container">
        <button
          className={`season-tab ${selectedSeason === '2026' ? 'active' : ''}`}
          onClick={() => onSelectSeason('2026')}
        >
          2026 시즌 (최신)
        </button>
        <button
          className={`season-tab ${selectedSeason === '2025' ? 'active' : ''}`}
          onClick={() => onSelectSeason('2025')}
        >
          2025 시즌
        </button>
      </div>

      <div className="ranking-tabs">
        <button
          className={`tab-button ${activeTab === 'middleSchool' ? 'active' : ''}`}
          onClick={() => { setActiveTab('middleSchool'); setMiddleSchoolSubTab('all'); setRankingType('avgPoints'); setSearchTerm(''); }}
        >
          중등부
        </button>
        <button
          className={`tab-button ${activeTab === 'highSchool' ? 'active' : ''}`}
          onClick={() => { setActiveTab('highSchool'); setHighSchoolSubTab('all'); setRankingType('avgPoints'); setSearchTerm(''); }}
        >
          고등부
        </button>
      </div>

      {activeTab === 'middleSchool' && (
        <div className="ranking-sub-tabs">
          <button
            className={`sub-tab-button ${middleSchoolSubTab === 'all' ? 'active' : ''}`}
            onClick={() => { setMiddleSchoolSubTab('all'); setSearchTerm(''); }}
          >
            전체 중등부
          </button>
          <button
            className={`sub-tab-button ${middleSchoolSubTab === 'male' ? 'active' : ''}`}
            onClick={() => { setMiddleSchoolSubTab('male'); setSearchTerm(''); }}
          >
            남중부
          </button>
          <button
            className={`sub-tab-button ${middleSchoolSubTab === 'female' ? 'active' : ''}`}
            onClick={() => { setMiddleSchoolSubTab('female'); setSearchTerm(''); }}
          >
            여중부
          </button>
        </div>
      )}

      {activeTab === 'highSchool' && (
        <div className="ranking-sub-tabs">
          <button
            className={`sub-tab-button ${highSchoolSubTab === 'all' ? 'active' : ''}`}
            onClick={() => { setHighSchoolSubTab('all'); setSearchTerm(''); }}
          >
            전체 고등부
          </button>
          <button
            className={`sub-tab-button ${highSchoolSubTab === 'male' ? 'active' : ''}`}
            onClick={() => { setHighSchoolSubTab('male'); setSearchTerm(''); }}
          >
            남고부
          </button>
          <button
            className={`sub-tab-button ${highSchoolSubTab === 'female' ? 'active' : ''}`}
            onClick={() => { setHighSchoolSubTab('female'); setSearchTerm(''); }}
          >
            여고부
          </button>
        </div>
      )}

      <div className="ranking-type-tabs">
        <button
          className={`type-tab-button ${rankingType === 'avgPoints' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgPoints'); setSearchTerm(''); }}
        >
          <span className="desktop-text">AVG 득점</span>
          <span className="mobile-text">평득</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgAssists' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgAssists'); setSearchTerm(''); }}
        >
          <span className="desktop-text">AVG 어시스트</span>
          <span className="mobile-text">평어</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgRebounds' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgRebounds'); setSearchTerm(''); }}
        >
          <span className="desktop-text">AVG 리바운드</span>
          <span className="mobile-text">평리</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgSteals' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgSteals'); setSearchTerm(''); }}
        >
          <span className="desktop-text">AVG 스틸</span>
          <span className="mobile-text">평스</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalBlocks' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalBlocks'); setSearchTerm(''); }}
        >
          <span className="desktop-text">블록슛</span>
          <span className="mobile-text">블</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalPoints' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalPoints'); setSearchTerm(''); }}
        >
          <span className="desktop-text">총득점</span>
          <span className="mobile-text">총득</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalAssists' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalAssists'); setSearchTerm(''); }}
        >
          <span className="desktop-text">총 어시스트</span>
          <span className="mobile-text">총어</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalRebounds' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalRebounds'); setSearchTerm(''); }}
        >
          <span className="desktop-text">총 리바운드</span>
          <span className="mobile-text">총리</span>
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalSteals' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalSteals'); setSearchTerm(''); }}
        >
          <span className="desktop-text">총 스틸</span>
          <span className="mobile-text">총스</span>
        </button>
      </div>

      <div className="ranking-search-bar">
        <input
          type="text"
          placeholder="선수명 또는 학교명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rankings-content">
        {renderRankingList(currentRankings)}
      </div>
    </div>
  );
};

// 컬럼명 매핑
const COLUMN_MAPPING = {
  '대회명': 'Competition',
  '소속팀': 'Team',
  '상대팀': 'vs',
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
  '대회명', '소속팀', '상대팀', '선수명', '등번호', '1Q 득점', '2Q 득점', '3Q 득점', '4Q 득점', '연장 득점', '총득점',
  '플레잉 타임', '2점슛 성공', '2점슛 시도', '2점 성공률(%)', '3점슛 성공', '3점슛 시도',
  '3점 성공률(%)', '필드골 성공률(%)', '자유투 성공', '자유투 시도', '자유투 성공률(%)',
  '공격 리바운드', '수비 리바운드', '총 리바운드', '어시스트', '스틸', '굿디펜스', '블록슛',
  '턴오버', '총 파울'
];

// 레코드 처리 헬퍼 함수
const processRecords = (records) => {
  if (records && records.length > 0) {
    // console.log("processRecords - first record (before processing):");
    // console.log(JSON.stringify(records[0], null, 2));
  }
  return records.map(p => {
    const q1 = parseInt(p['1Q 득점']) || 0;
    const q2 = parseInt(p['2Q 득점']) || 0;
    const q3 = parseInt(p['3Q 득점']) || 0;
    const q4 = parseInt(p['4Q 득점']) || 0;
    const ot = parseInt(p['연장 득점']) || 0;

    // console.log(`Processing player: ${p['선수명']}, 1Q: ${p['1Q 득점']}, 2Q: ${p['2Q 득점']}, 3Q: ${p['3Q 득점']}, 4Q: ${p['4Q 득점']}, OT: ${p['연장 득점']}`);
    // console.log(`Parsed points: 1Q=${q1}, 2Q=${q2}, 3Q=${q3}, 4Q=${q4}, OT=${ot}`);
    return {
      ...p,
      '총득점': q1 + q2 + q3 + q4 + ot,
    };
  });
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2026'); // '2026' or '2025'
  const [cachedRecords, setCachedRecords] = useState([]); // In-memory cache for all records
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
  const [showRankingsPage, setShowRankingsPage] = useState(false); // New state for rankings page
  const [middleSchoolRankings, setMiddleSchoolRankings] = useState({ all: [], male: [], female: [] }); // State to store middle school rankings
  const [highSchoolRankings, setHighSchoolRankings] = useState({ all: [], male: [], female: [] }); // State to store high school rankings
  const [selectedPlayerAvgStats, setSelectedPlayerAvgStats] = useState(null);
  const [session, setSession] = useState(null); // Add session state for CommunityPage
  const [isLoading, setIsLoading] = useState(false); // Loading state for search

  // Helper function to find player's ranking data
  const findPlayerRanking = (playerName, playerTeam) => {
    const isMiddleSchoolPlayer = playerTeam.includes('중학교') || playerTeam.endsWith('중');
    const isHighSchoolPlayer = playerTeam.includes('고등학교') || playerTeam.endsWith('고');

    let rankingsToSearch = [];
    if (isMiddleSchoolPlayer) {
      rankingsToSearch = middleSchoolRankings.all;
    } else if (isHighSchoolPlayer) {
      rankingsToSearch = highSchoolRankings.all;
    }

    if (rankingsToSearch.length > 0) {
      const playerRankData = rankingsToSearch.find(p => p.name === playerName && p.team === playerTeam);
      return playerRankData;
    }
    return null;
  };

  // Helper function to calculate total points rankings, separated by school type
  const calculateRankingsBySchoolType = (records) => {
    const middleSchoolPlayerStats = {};
    const maleMiddleSchoolPlayerStats = {};
    const femaleMiddleSchoolPlayerStats = {};
    const highSchoolPlayerStats = {};
    const maleHighSchoolPlayerStats = {};
    const femaleHighSchoolPlayerStats = {};

    // Specific schools to be categorized as female
    const specificFemaleMiddleSchools = ['수원제일중학교', '연암중학교', '인천동수중학교', '전주기전중학교', '효성중학교', '영광홍농중학교', '수피아여자중학교', '봉의중학교', '대전월평중학교', '구미중학교'];
    const specificFemaleHighSchools = ['법서고등학교', '분당경영고등학교', '법성고등학교'];

    records.forEach(record => {
      const playerName = record['선수명'];
      const teamName = record['소속팀'];
      const jerseyNumber = record['등번호'];
      const competitionName = record['대회명'];

      // Check for essential identifying information
      if (!playerName || !teamName || jerseyNumber === undefined || jerseyNumber === null) {
        // console.warn("Skipping record due to missing player identifying information:", record);
        return; // Skip this record
      }

      const gamePoints = parseInt(record['총득점']) || 0;
      const gameAssists = parseInt(record['어시스트']) || 0;
      const gameRebounds = parseInt(record['총 리바운드']) || 0;
      const gameBlocks = parseInt(record['블록슛']) || 0;
      const gameSteals = parseInt(record['스틸']) || 0;

      const key = `${playerName}_${teamName}`;

      const isMiddleSchool = teamName.includes('중학교') || teamName.endsWith('중');
      const isHighSchool = teamName.includes('고등학교') || teamName.endsWith('고');

      // Middle School Gender Classification
      const isFemaleMiddleSchool = (isMiddleSchool && (teamName.includes('여자') || teamName.includes('여중'))) || specificFemaleMiddleSchools.includes(teamName);
      const isMaleMiddleSchool = isMiddleSchool && !isFemaleMiddleSchool; // Assume male if not explicitly female middle school

      // High School Gender Classification
      const isFemaleHighSchool = (isHighSchool && (teamName.includes('여자') || teamName.includes('여고'))) || specificFemaleHighSchools.includes(teamName);
      const isMaleHighSchool = isHighSchool && !isFemaleHighSchool; // Assume male if not explicitly female high school

      // Function to initialize player stats
      const initializePlayerStats = () => ({
        name: playerName,
        team: teamName,
        jersey: jerseyNumber,
        totalPoints: 0,
        totalAssists: 0,
        totalRebounds: 0,
        totalBlocks: 0,
        totalSteals: 0,
        gamesPlayed: 0, // Add gamesPlayed
        competitions: {}, // For points per competition
      });

      // Aggregate for general middle school
      if (isMiddleSchool) {
        if (!middleSchoolPlayerStats[key]) {
          middleSchoolPlayerStats[key] = initializePlayerStats();
        }
        middleSchoolPlayerStats[key].totalPoints += gamePoints;
        middleSchoolPlayerStats[key].totalAssists += gameAssists;
        middleSchoolPlayerStats[key].totalRebounds += gameRebounds;
        middleSchoolPlayerStats[key].totalBlocks += gameBlocks;
        middleSchoolPlayerStats[key].totalSteals += gameSteals;
        middleSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          middleSchoolPlayerStats[key].competitions[competitionName] = (middleSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }

      // Aggregate for male middle school
      if (isMaleMiddleSchool) {
        if (!maleMiddleSchoolPlayerStats[key]) {
          maleMiddleSchoolPlayerStats[key] = initializePlayerStats();
        }
        maleMiddleSchoolPlayerStats[key].totalPoints += gamePoints;
        maleMiddleSchoolPlayerStats[key].totalAssists += gameAssists;
        maleMiddleSchoolPlayerStats[key].totalRebounds += gameRebounds;
        maleMiddleSchoolPlayerStats[key].totalBlocks += gameBlocks;
        maleMiddleSchoolPlayerStats[key].totalSteals += gameSteals;
        maleMiddleSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          maleMiddleSchoolPlayerStats[key].competitions[competitionName] = (maleMiddleSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }

      // Aggregate for female middle school
      if (isFemaleMiddleSchool) {
        if (!femaleMiddleSchoolPlayerStats[key]) {
          femaleMiddleSchoolPlayerStats[key] = initializePlayerStats();
        }
        femaleMiddleSchoolPlayerStats[key].totalPoints += gamePoints;
        femaleMiddleSchoolPlayerStats[key].totalAssists += gameAssists;
        femaleMiddleSchoolPlayerStats[key].totalRebounds += gameRebounds;
        femaleMiddleSchoolPlayerStats[key].totalBlocks += gameBlocks;
        femaleMiddleSchoolPlayerStats[key].totalSteals += gameSteals;
        femaleMiddleSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          femaleMiddleSchoolPlayerStats[key].competitions[competitionName] = (femaleMiddleSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }

      // Aggregate for high school
      if (isHighSchool) {
        if (!highSchoolPlayerStats[key]) {
          highSchoolPlayerStats[key] = initializePlayerStats();
        }
        highSchoolPlayerStats[key].totalPoints += gamePoints;
        highSchoolPlayerStats[key].totalAssists += gameAssists;
        highSchoolPlayerStats[key].totalRebounds += gameRebounds;
        highSchoolPlayerStats[key].totalBlocks += gameBlocks;
        highSchoolPlayerStats[key].totalSteals += gameSteals;
        highSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          highSchoolPlayerStats[key].competitions[competitionName] = (highSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }

      // Aggregate for male high school
      if (isMaleHighSchool) {
        if (!maleHighSchoolPlayerStats[key]) {
          maleHighSchoolPlayerStats[key] = initializePlayerStats();
        }
        maleHighSchoolPlayerStats[key].totalPoints += gamePoints;
        maleHighSchoolPlayerStats[key].totalAssists += gameAssists;
        maleHighSchoolPlayerStats[key].totalRebounds += gameRebounds;
        maleHighSchoolPlayerStats[key].totalBlocks += gameBlocks;
        maleHighSchoolPlayerStats[key].totalSteals += gameSteals;
        maleHighSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          maleHighSchoolPlayerStats[key].competitions[competitionName] = (maleHighSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }

      // Aggregate for female high school
      if (isFemaleHighSchool) {
        if (!femaleHighSchoolPlayerStats[key]) {
          femaleHighSchoolPlayerStats[key] = initializePlayerStats();
        }
        femaleHighSchoolPlayerStats[key].totalPoints += gamePoints;
        femaleHighSchoolPlayerStats[key].totalAssists += gameAssists;
        femaleHighSchoolPlayerStats[key].totalRebounds += gameRebounds;
        femaleHighSchoolPlayerStats[key].totalBlocks += gameBlocks;
        femaleHighSchoolPlayerStats[key].totalSteals += gameSteals;
        femaleHighSchoolPlayerStats[key].gamesPlayed += 1; // Increment gamesPlayed
        if (competitionName) {
          femaleHighSchoolPlayerStats[key].competitions[competitionName] = (femaleHighSchoolPlayerStats[key].competitions[competitionName] || 0) + gamePoints;
        }
      }
    });

    // Calculate averages before finalizing and sorting
    const calculateAverages = (stats) => {
      for (const key in stats) {
        const player = stats[key];
        player.avgPoints = player.gamesPlayed > 0 ? (player.totalPoints / player.gamesPlayed).toFixed(1) : 0;
        player.avgAssists = player.gamesPlayed > 0 ? (player.totalAssists / player.gamesPlayed).toFixed(1) : 0;
        player.avgRebounds = player.gamesPlayed > 0 ? (player.totalRebounds / player.gamesPlayed).toFixed(1) : 0;
        player.avgBlocks = player.gamesPlayed > 0 ? (player.totalBlocks / player.gamesPlayed).toFixed(1) : 0;
        player.avgSteals = player.gamesPlayed > 0 ? (player.totalSteals / player.gamesPlayed).toFixed(1) : 0;
      }
      return stats;
    };

    const middleSchoolStatsWithAverages = calculateAverages(middleSchoolPlayerStats);
    const maleMiddleSchoolStatsWithAverages = calculateAverages(maleMiddleSchoolPlayerStats);
    const femaleMiddleSchoolStatsWithAverages = calculateAverages(femaleMiddleSchoolPlayerStats);
    const highSchoolStatsWithAverages = calculateAverages(highSchoolPlayerStats);
    const maleHighSchoolStatsWithAverages = calculateAverages(maleHighSchoolPlayerStats);
    const femaleHighSchoolStatsWithAverages = calculateAverages(femaleHighSchoolPlayerStats);

    return {
      middleSchool: {
        all: finalizeAndSort(middleSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
        male: finalizeAndSort(maleMiddleSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
        female: finalizeAndSort(femaleMiddleSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
      },
      highSchool: {
        all: finalizeAndSort(highSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
        male: finalizeAndSort(maleHighSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
        female: finalizeAndSort(femaleHighSchoolStatsWithAverages, 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'),
      }
    };
  };

  // Helper function to sort and assign ranks for each stat type
  const finalizeAndSort = (stats, ...sortKeys) => {
    const players = Object.values(stats);
    const rankedPlayers = {};

    sortKeys.forEach(key => {
      const sorted = [...players].sort((a, b) => {
        // Primary sort by the current key (e.g., totalAssists)
        if (b[key] !== a[key]) {
          return b[key] - a[key];
        }
        // Secondary sort by totalPoints if primary key is equal
        return b.totalPoints - a.totalPoints;
      });
      sorted.forEach((player, index) => {
        if (!rankedPlayers[player.name + player.team + player.jersey]) {
          rankedPlayers[player.name + player.team + player.jersey] = { ...player };
        }
        rankedPlayers[player.name + player.team + player.jersey][`originalRank${key.charAt(0).toUpperCase() + key.slice(1)}`] = index + 1;
      });
    });

    return Object.values(rankedPlayers);
  };

  // Effect to filter displayRecords based on selectedCompetition and selectedPlayerRecords
  useEffect(() => {
    if (selectedPlayerRecords.length > 0) {
      const filteredRecords = selectedCompetition === '전체'
        ? selectedPlayerRecords
        : selectedPlayerRecords.filter(record => record['대회명'] === selectedCompetition);
      setDisplayRecords(processRecords(filteredRecords));
    }
  }, [selectedCompetition, selectedPlayerRecords]);

  // Fetch and cache all records from local 2026 data and Firestore
  const fetchRecords = async () => {
    if (cachedRecords.length > 0) return cachedRecords;
    setIsLoading(true);
    let allRecords = [];

    // 1. Load 2026 Spring data from bundled static JSON (Super fast & 0 quota cost!)
    try {
      const res = await fetch('/data/spring_2026.json');
      if (res.ok) {
        const spring2026 = await res.json();
        allRecords = allRecords.concat(spring2026);
      }
    } catch (err) {
      console.warn('Could not load local spring_2026.json:', err);
    }

    // 2. Load 2025 records from Firestore
    try {
      const q = query(collection(db, 'player_records'));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const d = doc.data();
        if (!d.id || !allRecords.some(r => r.id === d.id)) {
          allRecords.push(d);
        }
      });
    } catch (error) {
      console.warn('Firestore fetch notice (quota/network):', error.message || error);
    }

    // Process all records to calculate total points and assign season
    const processedAllRecords = allRecords.map(p => {
      const q1 = parseInt(p['1Q 득점']) || 0;
      const q2 = parseInt(p['2Q 득점']) || 0;
      const q3 = parseInt(p['3Q 득점']) || 0;
      const q4 = parseInt(p['4Q 득점']) || 0;
      const ot = parseInt(p['연장 득점']) || 0;
      const season = p['시즌'] ? String(p['시즌']) : (p['대회명'] && String(p['대회명']).includes('2026') ? '2026' : '2025');

      return {
        ...p,
        '총득점': q1 + q2 + q3 + q4 + ot,
        season: season,
      };
    });

    setCachedRecords(processedAllRecords);
    setIsLoading(false);
    return processedAllRecords;
  };

  // Initial load
  useEffect(() => {
    fetchRecords();
  }, []);

  // Update rankings whenever cachedRecords or selectedSeason changes
  useEffect(() => {
    if (cachedRecords.length > 0) {
      const seasonRecords = cachedRecords.filter(r => r.season === selectedSeason);
      const { middleSchool, highSchool } = calculateRankingsBySchoolType(seasonRecords);
      setMiddleSchoolRankings(middleSchool);
      setHighSchoolRankings(highSchool);
    }
  }, [cachedRecords, selectedSeason]);

  const handleGoHome = () => {
    setShowResults(false);
    setNeedsSelection(false);
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
    setShowDetailPage(false); // Ensure detail page is hidden
    setIsTeamSearchMode(false);
    setShowRankingsPage(false); // Ensure rankings page is hidden
    setSelectedPlayerAvgStats(null);
  };

  const handleGoToDetailPage = () => {
    setShowDetailPage(true);
    setShowResults(false); // Hide search results
    setNeedsSelection(false); // Hide player selection
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
    setShowRankingsPage(false); // Hide rankings page
  };

  const handleGoToRankingsPage = () => {
    setShowRankingsPage(true);
    setShowResults(false);
    setNeedsSelection(false);
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
    setShowDetailPage(false);
  };

  const handleGoBackFromDetail = () => {
    setShowDetailPage(false);
    // Optionally reset other states if needed for a clean return to home
    setShowResults(false);
    setNeedsSelection(false);
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSearchTerm('');
    setShowRankingsPage(false); // Ensure rankings page is hidden
  };

  // Helper function to check if a player is a hot player (top 5 in avgPoints within their school category)
  const isHotPlayer = (playerName, playerTeam) => {
    // Determine if the player is middle school or high school
    const isMiddleSchoolPlayer = playerTeam.includes('중학교') || playerTeam.endsWith('중');
    const isHighSchoolPlayer = playerTeam.includes('고등학교') || playerTeam.endsWith('고');

    let relevantRankings = [];
    if (isMiddleSchoolPlayer) {
      relevantRankings = middleSchoolRankings.all;
    } else if (isHighSchoolPlayer) {
      relevantRankings = highSchoolRankings.all;
    } else {
      // If team type cannot be determined, or it's not a school team, not a hot player
      return false;
    }

    const sortedByAvgPoints = [...relevantRankings].sort((a, b) => b.avgPoints - a.avgPoints);

    for (let i = 0; i < Math.min(5, sortedByAvgPoints.length); i++) {
      const player = sortedByAvgPoints[i];
      // Compare name and team to identify the player
      if (player.name === playerName && player.team === playerTeam) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if a player is a dime dealer (top 5 in avgAssists within their school category)
  const isDimeDealer = (playerName, playerTeam) => {
    const isMiddleSchoolPlayer = playerTeam.includes('중학교') || playerTeam.endsWith('중');
    const isHighSchoolPlayer = playerTeam.includes('고등학교') || playerTeam.endsWith('고');

    // Determine gender classification for middle school
    const specificFemaleMiddleSchools = ['수원제일중학교', '연암중학교', '인천동수중학교', '전주기전중학교', '효성중학교', '영광홍농중학교', '수피아여자중학교', '봉의중학교', '대전월평중학교'];
    const isFemaleMiddleSchool = (isMiddleSchoolPlayer && (playerTeam.includes('여자') || playerTeam.includes('여중'))) || specificFemaleMiddleSchools.includes(playerTeam);
    const isMaleMiddleSchool = isMiddleSchoolPlayer && !isFemaleMiddleSchool;

    // Determine gender classification for high school
    const specificFemaleHighSchools = ['법서고등학교', '분당경영고등학교', '법성고등학교'];
    const isFemaleHighSchool = (isHighSchoolPlayer && (playerTeam.includes('여자') || playerTeam.includes('여고'))) || specificFemaleHighSchools.includes(playerTeam);
    const isMaleHighSchool = isHighSchoolPlayer && !isFemaleHighSchool;

    let relevantRankings = [];
    if (isMiddleSchoolPlayer) {
      relevantRankings = middleSchoolRankings.all;
    } else if (isHighSchoolPlayer) {
      relevantRankings = highSchoolRankings.all;
    } else {
      return false;
    }

    const sortedByAvgAssists = [...relevantRankings].sort((a, b) => b.avgAssists - a.avgAssists);

    for (let i = 0; i < Math.min(5, sortedByAvgAssists.length); i++) {
      const player = sortedByAvgAssists[i];
      if (player.name === playerName && player.team === playerTeam) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if a player is a sky sweeper (top 5 in avgRebounds within their school category)
  const isSkySweeper = (playerName, playerTeam) => {
    const isMiddleSchoolPlayer = playerTeam.includes('중학교') || playerTeam.endsWith('중');
    const isHighSchoolPlayer = playerTeam.includes('고등학교') || playerTeam.endsWith('고');

    let relevantRankings = [];
    if (isMiddleSchoolPlayer) {
      relevantRankings = middleSchoolRankings.all;
    } else if (isHighSchoolPlayer) {
      relevantRankings = highSchoolRankings.all;
    } else {
      return false;
    }

    const sortedByAvgRebounds = [...relevantRankings].sort((a, b) => b.avgRebounds - a.avgRebounds);

    for (let i = 0; i < Math.min(5, sortedByAvgRebounds.length); i++) {
      const player = sortedByAvgRebounds[i];
      if (player.name === playerName && player.team === playerTeam) {
        return true;
      }
    }
    return false;
  };

  // Helper function to check if a player is a steal master (top 5 in avgSteals within their school category)
  const isStealMaster = (playerName, playerTeam) => {
    const isMiddleSchoolPlayer = playerTeam.includes('중학교') || playerTeam.endsWith('중');
    const isHighSchoolPlayer = playerTeam.includes('고등학교') || playerTeam.endsWith('고');

    let relevantRankings = [];
    if (isMiddleSchoolPlayer) {
      relevantRankings = middleSchoolRankings.all;
    } else if (isHighSchoolPlayer) {
      relevantRankings = highSchoolRankings.all;
    } else {
      return false;
    }

    const sortedByAvgSteals = [...relevantRankings].sort((a, b) => b.avgSteals - a.avgSteals);

    for (let i = 0; i < Math.min(5, sortedByAvgSteals.length); i++) {
      const player = sortedByAvgSteals[i];
      if (player.name === playerName && player.team === playerTeam) {
        return true;
      }
    }
    return false;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true); // Start loading

    // Reset states
    setUniquePlayers([]);
    setDisplayRecords([]);
    setShowResults(false);
    setNeedsSelection(false);
    setSelectionMode('');
    setIsTeamSearchMode(false);
    setSelectedCompetition('전체');
    setAvailableCompetitions([]);
    setSelectedPlayerRecords([]);
    setSelectedPlayerAvgStats(null);

    // Check if the search term ends with '중' or '고' or '학교' (Team Search)
    const cleanedSearchTerm = searchTerm.trim();
    if (!cleanedSearchTerm) {
      setIsLoading(false);
      return;
    }

    if (cleanedSearchTerm.endsWith('중') || cleanedSearchTerm.endsWith('고') || cleanedSearchTerm.endsWith('학교')) {
      setIsTeamSearchMode(true);
      try {
        const allRecords = cachedRecords.length > 0 ? cachedRecords : await fetchRecords();
        // Search in selected season first, fallback to all records if none found
        let teamRecords = allRecords.filter(r => r.season === selectedSeason && r['소속팀'] && r['소속팀'].includes(cleanedSearchTerm));
        if (teamRecords.length === 0) {
          teamRecords = allRecords.filter(r => r['소속팀'] && r['소속팀'].includes(cleanedSearchTerm));
        }

        if (teamRecords.length > 0) {
          // Extract unique players from the team records
          const players = [];
          const seen = new Set();
          teamRecords.forEach(r => {
            const key = `${r['선수명']}_${r['등번호']}_${r['소속팀']}`;
            if (!seen.has(key)) {
              seen.add(key);
              players.push({
                name: r['선수명'],
                team: r['소속팀'],
                jersey: r['등번호'],
                season: r.season
              });
            }
          });
          setUniquePlayers(players);
          setNeedsSelection(true);
          setSelectionMode('player');
          setShowResults(true);
        } else {
          setShowResults(true); // Show "no results" message
        }
      } catch (error) {
        console.error('Error searching team:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Player Search
      try {
        const allRecords = cachedRecords.length > 0 ? cachedRecords : await fetchRecords();
        let playerRecords = allRecords.filter(r => r.season === selectedSeason && r['선수명'] && r['선수명'].trim() === cleanedSearchTerm);
        if (playerRecords.length === 0) {
          playerRecords = allRecords.filter(r => r['선수명'] && r['선수명'].trim() === cleanedSearchTerm);
        }

        if (playerRecords.length > 0) {
          const unique = [];
          const seen = new Set();
          playerRecords.forEach(r => {
            const key = `${r['소속팀']}_${r['등번호']}_${r['선수명']}`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({
                name: r['선수명'],
                team: r['소속팀'],
                jersey: r['등번호'],
                season: r.season
              });
            }
          });

          if (unique.length > 1) {
            setUniquePlayers(unique);
            setNeedsSelection(true);
            setSelectionMode('player');
          } else {
            await handlePlayerSelect(unique[0]);
          }
          setShowResults(true);
        } else {
          setShowResults(true); // Show "no results" message
        }
      } catch (error) {
        console.error('Error searching player:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePlayerSelect = async (player) => {
    // Filter records for the selected player from memory cache
    try {
      const allRecords = cachedRecords.length > 0 ? cachedRecords : await fetchRecords();
      const records = allRecords.filter(r =>
        r['선수명'] === player.name &&
        r['소속팀'] === player.team &&
        String(r['등번호']) === String(player.jersey)
      );

      if (records.length > 0) {
        setSelectedPlayerRecords(records); // Store all records

        // Extract unique competitions for this player
        const competitions = ['전체', ...new Set(records.map(r => r['대회명']))];
        setAvailableCompetitions(competitions);
        setSelectedCompetition('전체'); // Default to '전체'

        setDisplayRecords(processRecords(records));
        setNeedsSelection(false);

        // Find and set average stats
        const rankingData = findPlayerRanking(player.name, player.team);
        if (rankingData) {
          setSelectedPlayerAvgStats(rankingData);
        } else {
          // Fallback: calculate averages if not found in rankings
          let totalPoints = 0, totalAssists = 0, totalRebounds = 0, totalBlocks = 0, totalSteals = 0;
          let gamesPlayed = 0;

          records.forEach(r => {
            // Basic validation for games played - if they have stats, they played
            gamesPlayed++;

            let q1 = parseInt(r['1Q 득점']) || 0;
            let q2 = parseInt(r['2Q 득점']) || 0;
            let q3 = parseInt(r['3Q 득점']) || 0;
            let q4 = parseInt(r['4Q 득점']) || 0;
            let ot = parseInt(r['연장 득점']) || 0;

            totalPoints += (q1 + q2 + q3 + q4 + ot);
            totalAssists += parseInt(r['어시스트']) || 0;
            totalRebounds += parseInt(r['총 리바운드']) || 0;
            totalBlocks += parseInt(r['블록슛']) || 0;
            totalSteals += parseInt(r['스틸']) || 0;
          });

          if (gamesPlayed > 0) {
            setSelectedPlayerAvgStats({
              avgPoints: (totalPoints / gamesPlayed).toFixed(1),
              avgAssists: (totalAssists / gamesPlayed).toFixed(1),
              avgRebounds: (totalRebounds / gamesPlayed).toFixed(1),
              avgBlocks: (totalBlocks / gamesPlayed).toFixed(1),
              avgSteals: (totalSteals / gamesPlayed).toFixed(1)
            });
          } else {
            setSelectedPlayerAvgStats(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  };

  // Render logic
  if (showRankingsPage) {
    return (
      <RankingsPage
        middleSchoolRankings={middleSchoolRankings}
        highSchoolRankings={highSchoolRankings}
        onGoHome={handleGoHome}
        selectedSeason={selectedSeason}
        onSelectSeason={setSelectedSeason}
      />
    );
  }

  if (showDetailPage) {
    return <CommunityPage onGoBack={handleGoBackFromDetail} />;
  }

  // Search Results View
  if (showResults) {
    return (
      <div className="app-container results-mode">
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div className="results-header">
            <button className="back-button" onClick={handleGoHome}>
              <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16px" height="16px">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
              </svg>
            </button>
            <h1 className="logo-small" onClick={handleGoHome}>
              <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy"> Z</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">n</span><span className="hoopgle-yellow">e</span>
            </h1>
            <form onSubmit={handleSearch} className="search-form-results">
              <input
                type="text"
                placeholder="선수명 또는 학교명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">검색</button>
            </form>
          </div>

          <div className="results-container">
            {needsSelection && (
              <div className="selection-container">
                <h3>{selectionMode === 'player' ? '선수를 선택해주세요' : '대회를 선택해주세요'}</h3>
                <div className="selection-list">
                  {uniquePlayers.map((player, index) => (
                    <div key={index} className="selection-item" onClick={() => handlePlayerSelect(player)}>
                      <span className="player-name">{player.name}</span>
                      <span className="player-info">{player.team} | no.{player.jersey}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>검색중...</p>
              </div>
            ) : (
              <>
                {!needsSelection && displayRecords.length === 0 && (
                  <div className="no-results">
                    <p>검색 결과가 없습니다.</p>
                  </div>
                )}
              </>
            )}

            {!isLoading && displayRecords.length > 0 && (
              <>
                <div className="player-header">
                  <h2>
                    {displayRecords[0]['선수명']}
                    <span className="player-sub-info"> {displayRecords[0]['소속팀']} | no.{displayRecords[0]['등번호']}</span>
                    {isHotPlayer(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="flame-emoji" title="Hot Player (평균 득점 Top 5)"> 🔥</span>}
                    {isDimeDealer(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="dime-dealer-emoji" title="Dime Dealer (평균 어시스트 Top 5)"> 🏀</span>}
                    {isSkySweeper(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="sky-sweeper-emoji" title="Sky Sweeper (평균 리바운드 Top 5)"> 🖐️</span>}
                    {isStealMaster(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="steal-emoji" title="Steal Master (평균 스틸 Top 5)"> 🥷</span>}
                  </h2>
                </div>

                {/* Average Stats Section */}
                {selectedPlayerAvgStats && (
                  <div className="player-avg-stats-container">
                    <div className="avg-stat-item-circle">
                      <span className="label">평균 득점</span>
                      <span className="value">{selectedPlayerAvgStats.avgPoints}</span>
                    </div>
                    <div className="avg-stat-item-circle">
                      <span className="label">평균 어시스트</span>
                      <span className="value">{selectedPlayerAvgStats.avgAssists}</span>
                    </div>
                    <div className="avg-stat-item-circle">
                      <span className="label">평균 리바운드</span>
                      <span className="value">{selectedPlayerAvgStats.avgRebounds}</span>
                    </div>
                    <div className="avg-stat-item-circle">
                      <span className="label">평균 스틸</span>
                      <span className="value">{selectedPlayerAvgStats.avgSteals}</span>
                    </div>
                    <div className="avg-stat-item-circle">
                      <span className="label">평균 블록</span>
                      <span className="value">{selectedPlayerAvgStats.avgBlocks}</span>
                    </div>
                  </div>
                )}

                <div className="competition-buttons-container">
                  {availableCompetitions.map(comp => (
                    <button
                      key={comp}
                      className={`competition-button ${selectedCompetition === comp ? 'active' : ''}`}
                      onClick={() => setSelectedCompetition(comp)}
                    >
                      {comp.replace('대회', '').trim()}
                    </button>
                  ))}
                </div>

                <div className="table-container desktop-table">
                  <table>
                    <thead>
                      <tr>
                        {DISPLAY_COLUMNS.map(col => (
                          <th key={col}>{COLUMN_MAPPING[col] || col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRecords.map((record, index) => (
                        <tr key={index}>
                          {DISPLAY_COLUMNS.map(col => (
                            <td key={col}>{record[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="cards-container hide-on-desktop">
                  {displayRecords.map((record, index) => (
                    <div key={index} className="player-card">
                      <div className="card-header">
                        {record['대회명']} <span className="team-name-mobile">vs {record['상대팀']}</span>
                      </div>
                      <div className="card-body">
                        <div className="card-item highlight-yellow">
                          <span className="label">득점</span>
                          <span className="value">{record['총득점']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">어시스트</span>
                          <span className="value">{record['어시스트']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">리바운드</span>
                          <span className="value">{record['총 리바운드']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">스틸</span>
                          <span className="value">{record['스틸']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">블록</span>
                          <span className="value">{record['블록슛']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">3점슛 (성공/시도)</span>
                          <span className="value">{record['3점슛 성공']}/{record['3점슛 시도']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">3점 성공률</span>
                          <span className="value">{record['3점 성공률(%)']}%</span>
                        </div>
                        <div className="card-item">
                          <span className="label">2점슛 (성공/시도)</span>
                          <span className="value">{record['2점슛 성공']}/{record['2점슛 시도']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">2점 성공률</span>
                          <span className="value">{record['2점 성공률(%)']}%</span>
                        </div>
                        <div className="card-item">
                          <span className="label">자유투 (성공/시도)</span>
                          <span className="value">{record['자유투 성공']}/{record['자유투 시도']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">자유투 성공률</span>
                          <span className="value">{record['자유투 성공률(%)']}%</span>
                        </div>
                        <div className="card-item">
                          <span className="label">파울</span>
                          <span className="value">{record['총 파울']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">턴오버</span>
                          <span className="value">{record['턴오버']}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default Home View (Google-like)
  return (
    <div className="App">
      <div className="search-container">
        <h1 className="logo">
          <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy"> Z</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">n</span><span className="hoopgle-yellow">e</span>
        </h1>
        <div className="season-switcher-container">
          <button 
            type="button"
            className={`season-tab ${selectedSeason === '2026' ? 'active' : ''}`}
            onClick={() => setSelectedSeason('2026')}
          >
            2026 시즌 (최신)
          </button>
          <button 
            type="button"
            className={`season-tab ${selectedSeason === '2025' ? 'active' : ''}`}
            onClick={() => setSelectedSeason('2025')}
          >
            2025 시즌
          </button>
        </div>
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
            <button type="button" onClick={handleGoToRankingsPage}>Rankings</button>
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
    </div>
  );
}

export default App;
