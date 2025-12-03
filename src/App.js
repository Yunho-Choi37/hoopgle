import React, { useState, useEffect } from 'react';
import CommunityPage from './CommunityPage';
import { db } from './firebaseConfig';
import { collection, getDocs, query } from 'firebase/firestore';
import './App.css';

// RankingsPage Component Definition
const RankingsPage = ({ middleSchoolRankings, highSchoolRankings, onGoHome }) => {
  const [activeTab, setActiveTab] = useState('middleSchool'); // 'middleSchool' or 'highSchool'
  const [middleSchoolSubTab, setMiddleSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [highSchoolSubTab, setHighSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [rankingType, setRankingType] = useState('avgPoints'); // 'totalPoints', 'totalAssists', 'totalRebounds', 'totalBlocks', 'totalSteals', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals'
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

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
    // console.log('renderRankingList: sortedRankings (first 10):', JSON.stringify(sortedRankings.slice(0, 10), null, 2));

    // Filter by search term and limit to top 50
    const filteredRankings = sortedRankings
      .filter(player =>
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 50); // Limit to top 50 players
    // console.log('renderRankingList: filteredRankings (first 10):', JSON.stringify(filteredRankings.slice(0, 10), null, 2));

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
          <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
        </h1>
        <button onClick={onGoHome} className="home-button-rankings">홈으로</button>
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

  // Fetch rankings on component mount
  useEffect(() => {
    const fetchRankings = async () => {
      let allRecords = [];

      try {
        // Fetch all records from 'player_records' collection
        const q = query(collection(db, 'player_records'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
          allRecords.push(doc.data());
        });

      } catch (error) {
        console.error('Error fetching records:', error);
      }

      // Process all records to calculate total points for each game
      const processedAllRecords = allRecords.map(p => {
        const q1 = parseInt(p['1Q 득점']) || 0;
        const q2 = parseInt(p['2Q 득점']) || 0;
        const q3 = parseInt(p['3Q 득점']) || 0;
        const q4 = parseInt(p['4Q 득점']) || 0;
        const ot = parseInt(p['연장 득점']) || 0;
        return {
          ...p,
          '총득점': q1 + q2 + q3 + q4 + ot,
        };
      });

      const { middleSchool, highSchool } = calculateRankingsBySchoolType(processedAllRecords);
      setMiddleSchoolRankings(middleSchool);
      setHighSchoolRankings(highSchool);
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
    if (searchTerm.endsWith('중') || searchTerm.endsWith('고') || searchTerm.endsWith('학교')) {
      setIsTeamSearchMode(true);
      // Fetch all records for the team
      try {
        const q = query(collection(db, 'player_records')); // In a real app, use where clause
        const querySnapshot = await getDocs(q);
        let allRecords = [];
        querySnapshot.forEach((doc) => {
          allRecords.push(doc.data());
        });

        const teamRecords = allRecords.filter(r => r['소속팀'].includes(searchTerm));

        if (teamRecords.length > 0) {
          // Extract unique players from the team records
          const players = [];
          const seen = new Set();
          teamRecords.forEach(r => {
            const key = `${r['선수명']}_${r['등번호']}`;
            if (!seen.has(key)) {
              seen.add(key);
              players.push({
                name: r['선수명'],
                team: r['소속팀'],
                jersey: r['등번호']
              });
            }
          });
          setUniquePlayers(players);
          setNeedsSelection(true);
          setSelectionMode('player'); // Even in team search, we select a player to view details
          setShowResults(true);
        } else {
          setShowResults(true); // Show "no results" message
        }
      } catch (error) {
        console.error('Error searching team:', error);
      }
    } else {
      // Player Search
      try {
        const q = query(collection(db, 'player_records')); // In a real app, use where clause
        const querySnapshot = await getDocs(q);
        let allRecords = [];
        querySnapshot.forEach((doc) => {
          allRecords.push(doc.data());
        });

        const playerRecords = allRecords.filter(r => r['선수명'] === searchTerm);

        if (playerRecords.length > 0) {
          // Check for duplicate players (same name, different team or jersey)
          const unique = [];
          const seen = new Set();
          playerRecords.forEach(r => {
            const key = `${r['소속팀']}_${r['등번호']}`;
            if (!seen.has(key)) {
              seen.add(key);
              unique.push({
                name: r['선수명'],
                team: r['소속팀'],
                jersey: r['등번호']
              });
            }
          });

          if (unique.length > 1) {
            setUniquePlayers(unique);
            setNeedsSelection(true);
            setSelectionMode('player');
          } else {
            // Only one player found, select automatically
            handlePlayerSelect(unique[0]);
          }
          setShowResults(true);
        } else {
          setShowResults(true); // Show "no results" message
        }
      } catch (error) {
        console.error('Error searching player:', error);
      }
    }
  };

  const handlePlayerSelect = async (player) => {
    // Fetch all records for the selected player
    try {
      const q = query(collection(db, 'player_records')); // In a real app, use where clause
      const querySnapshot = await getDocs(q);
      let allRecords = [];
      querySnapshot.forEach((doc) => {
        allRecords.push(doc.data());
      });

      const records = allRecords.filter(r =>
        r['선수명'] === player.name &&
        r['소속팀'] === player.team &&
        r['등번호'] === player.jersey
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
          setSelectedPlayerAvgStats(null);
        }
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    }
  };

  return (
    <div className="app-container">
      {showRankingsPage ? (
        <RankingsPage
          middleSchoolRankings={middleSchoolRankings}
          highSchoolRankings={highSchoolRankings}
          onGoHome={handleGoHome}
        />
      ) : showDetailPage ? (
        <CommunityPage onGoBack={handleGoBackFromDetail} />
      ) : (
        <>
          <header className="app-header">
            <h1 className="logo" onClick={handleGoHome}>
              <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy">d</span><span className="hoopgle-yellow">e</span><span className="hoopgle-navy">x</span>
            </h1>
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  className="search-input"
                  placeholder="선수명 또는 학교명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="search-button">
                  <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                  </svg>
                </button>
              </form>
            </div>
          </header>

          <main className="app-main">
            {!showResults && !needsSelection && displayRecords.length === 0 && (
              <div className="main-buttons-container">
                <button className="main-nav-button" onClick={handleGoToDetailPage}>
                  <span className="button-icon">💬</span>
                  <span className="button-text">커뮤니티</span>
                </button>
                <button className="main-nav-button" onClick={handleGoToRankingsPage}>
                  <span className="button-icon">🏆</span>
                  <span className="button-text">랭킹</span>
                </button>
              </div>
            )}

            {showResults && needsSelection && (
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

            {showResults && !needsSelection && displayRecords.length === 0 && (
              <div className="no-results">
                <p>검색 결과가 없습니다.</p>
              </div>
            )}

            {displayRecords.length > 0 && (
              <div className="results-container">
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
                  <div className="average-stats-container">
                    <div className="avg-stat-item">
                      <span className="avg-label">평균 득점</span>
                      <span className="avg-value">{selectedPlayerAvgStats.avgPoints}</span>
                    </div>
                    <div className="avg-stat-item">
                      <span className="avg-label">평균 어시스트</span>
                      <span className="avg-value">{selectedPlayerAvgStats.avgAssists}</span>
                    </div>
                    <div className="avg-stat-item">
                      <span className="avg-label">평균 리바운드</span>
                      <span className="avg-value">{selectedPlayerAvgStats.avgRebounds}</span>
                    </div>
                    <div className="avg-stat-item">
                      <span className="avg-label">평균 스틸</span>
                      <span className="avg-value">{selectedPlayerAvgStats.avgSteals}</span>
                    </div>
                    <div className="avg-stat-item">
                      <span className="avg-label">평균 블록</span>
                      <span className="avg-value">{selectedPlayerAvgStats.avgBlocks}</span>
                    </div>
                  </div>
                )}

                <div className="competition-filter">
                  {availableCompetitions.map(comp => (
                    <button
                      key={comp}
                      className={`filter-button ${selectedCompetition === comp ? 'active' : ''}`}
                      onClick={() => setSelectedCompetition(comp)}
                    >
                      {comp.replace('대회', '').trim()}
                    </button>
                  ))}
                </div>

                <div className="table-container">
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
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
