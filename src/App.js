import React, { useState, useEffect } from 'react';
import CommunityPage from './CommunityPage';
import { db } from './firebaseConfig';
import { collection, getDocs, query } from 'firebase/firestore';
import './App.css';
import HorizontalScrollMenu from './HorizontalScrollMenu';

// Helper to format tournament names into concise labels for cards
const formatCompShortName = (name) => {
  if (!name) return '';
  return name
    .replace(/202[0-9]\s*/g, '')
    .replace(/제[0-9]+회\s*/g, '')
    .replace(/전국남녀중고농구연맹전|전국남녀중고농구|중고농구/g, '')
    .replace('대회', '')
    .trim();
};

// RankingsPage Component Definition
const RankingsPage = ({
  middleSchoolRankings,
  highSchoolRankings,
  onGoHome,
  selectedSeason,
  onSelectSeason,
  isRecordsLoading,
}) => {
  const [activeTab, setActiveTab] = useState('middleSchool'); // 'middleSchool' or 'highSchool'
  const [middleSchoolSubTab, setMiddleSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [highSchoolSubTab, setHighSchoolSubTab] = useState('all'); // 'all', 'male', 'female'
  const [rankingType, setRankingType] = useState('eff'); // 'eff', 'tsPct', 'efgPct', 'astToRatio', 'hustle', 'avgPoints', 'avgAssists', 'avgRebounds', 'avgSteals', 'avgBlocks', 'totalPoints', 'totalAssists', 'totalRebounds', 'totalSteals', 'totalBlocks'
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [timedOut, setTimedOut] = useState(false);

  const hasRankings = Boolean(
    (middleSchoolRankings?.all && middleSchoolRankings.all.length > 0) ||
    (highSchoolRankings?.all && highSchoolRankings.all.length > 0)
  );

  // Safety fallback: if after 15s still no rankings and records finished loading, stop showing spinner
  useEffect(() => {
    if (hasRankings) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [hasRankings, selectedSeason]);

  const isLoading = (isRecordsLoading || !hasRankings) && !timedOut;

  const getSortedRankings = (rankings) => {
    let sorted = [...(rankings || [])];
    if (rankingType === 'eff') {
      sorted.sort((a, b) => (b.eff ?? 0) - (a.eff ?? 0));
    } else if (rankingType === 'tsPct') {
      sorted.sort((a, b) => (b.tsPct ?? 0) - (a.tsPct ?? 0));
    } else if (rankingType === 'efgPct') {
      sorted.sort((a, b) => (b.efgPct ?? 0) - (a.efgPct ?? 0));
    } else if (rankingType === 'astToRatio') {
      sorted.sort((a, b) => (b.astToRatio ?? 0) - (a.astToRatio ?? 0));
    } else if (rankingType === 'hustle') {
      sorted.sort((a, b) => (b.hustle ?? 0) - (a.hustle ?? 0));
    } else if (rankingType === 'avgPoints') {
      sorted.sort((a, b) => (b.avgPoints ?? 0) - (a.avgPoints ?? 0));
    } else if (rankingType === 'avgAssists') {
      sorted.sort((a, b) => (b.avgAssists ?? 0) - (a.avgAssists ?? 0));
    } else if (rankingType === 'avgRebounds') {
      sorted.sort((a, b) => (b.avgRebounds ?? 0) - (a.avgRebounds ?? 0));
    } else if (rankingType === 'avgSteals') {
      sorted.sort((a, b) => (b.avgSteals ?? 0) - (a.avgSteals ?? 0));
    } else if (rankingType === 'avgBlocks') {
      sorted.sort((a, b) => (b.avgBlocks ?? 0) - (a.avgBlocks ?? 0));
    } else if (rankingType === 'totalPoints') {
      sorted.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
    } else if (rankingType === 'totalAssists') {
      sorted.sort((a, b) => (b.totalAssists ?? 0) - (a.totalAssists ?? 0));
    } else if (rankingType === 'totalRebounds') {
      sorted.sort((a, b) => (b.totalRebounds ?? 0) - (a.totalRebounds ?? 0));
    } else if (rankingType === 'totalBlocks') {
      sorted.sort((a, b) => (b.totalBlocks ?? 0) - (a.totalBlocks ?? 0));
    } else if (rankingType === 'totalSteals') {
      sorted.sort((a, b) => (b.totalSteals ?? 0) - (a.totalSteals ?? 0));
    }
    return sorted;
  };

  const renderRankingList = (rankings) => {
    if (isLoading) {
      return (
        <div className="loading-container" style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '16px', color: '#475569', fontWeight: '600', fontSize: '15px' }}>
            랭킹 데이터를 집계하고 있습니다...
          </p>
        </div>
      );
    }

    const sortedRankings = getSortedRankings(rankings || []);

    // Filter by search term and limit to top 50
    const filteredRankings = sortedRankings
      .filter(player =>
        (player.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.team || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 50); // Limit to top 50 players

    if (filteredRankings.length === 0) {
      if (searchTerm.trim()) {
        return <p className="no-results-message">"{searchTerm}"에 대한 검색 결과가 없습니다.</p>;
      }
      return <p className="no-results-message">해당 부문의 랭킹 데이터가 없습니다.</p>;
    }

    return (
      <div className="cards-container">
        {filteredRankings.map((player, index) => {
          const rankFieldMap = {
            eff: 'originalRankEff',
            tsPct: 'originalRankTsPct',
            efgPct: 'originalRankEfgPct',
            astToRatio: 'originalRankAstToRatio',
            hustle: 'originalRankHustle',
            avgPoints: 'originalRankAvgPoints',
            avgAssists: 'originalRankAvgAssists',
            avgRebounds: 'originalRankAvgRebounds',
            avgSteals: 'originalRankAvgSteals',
            avgBlocks: 'originalRankAvgBlocks',
            totalPoints: 'originalRankTotalPoints',
            totalAssists: 'originalRankTotalAssists',
            totalRebounds: 'originalRankTotalRebounds',
            totalBlocks: 'originalRankTotalBlocks',
            totalSteals: 'originalRankTotalSteals',
          };
          const displayRank = player[rankFieldMap[rankingType]] || (index + 1);

          return (
            <div key={player.name + player.team + player.jersey} className="player-card ranking-card">
              <div className="card-header ranking-card-header">
                <div className="ranking-header-title">
                  <span className="ranking-number">{displayRank}위</span>
                  <span className="player-name-text">{player.name}</span>
                  <span className="jersey-number">no.{player.jersey}</span>
                  {rankingType === 'eff' && displayRank <= 5 && <span className="eff-badge" title="효율성 마스터"> ⚡</span>}
                  {rankingType === 'tsPct' && displayRank <= 5 && <span className="ts-badge" title="고효율 슈터"> 🎯</span>}
                  {rankingType === 'efgPct' && displayRank <= 5 && <span className="efg-badge" title="스나이퍼"> 🏹</span>}
                  {rankingType === 'astToRatio' && displayRank <= 5 && <span className="ast-to-badge" title="볼배급 마스터"> 🧠</span>}
                  {rankingType === 'hustle' && displayRank <= 5 && <span className="hustle-badge" title="허슬 킹"> 🛡️</span>}
                  {rankingType === 'avgPoints' && displayRank <= 5 && <span className="flame-emoji" title="Hot Player"> 🔥</span>}
                  {rankingType === 'avgAssists' && displayRank <= 5 && <span className="dime-dealer-emoji" title="Dime Dealer"> 🏀</span>}
                  {rankingType === 'avgRebounds' && displayRank <= 5 && <span className="sky-sweeper-emoji" title="Sky Sweeper"> 🖐️</span>}
                  {rankingType === 'avgSteals' && displayRank <= 5 && <span className="steal-emoji" title="Steal Master"> 🥷</span>}
                  {rankingType === 'avgBlocks' && displayRank <= 5 && <span className="block-emoji" title="Block Master"> 🧱</span>}
                </div>
                <span className="team-name-badge">{player.team.replace('(', '').replace(')', '')}</span>
              </div>
              <div className="card-body">
                {/* 스마트 지표 (우선 배치) */}
                <div className={`card-item ${rankingType === 'eff' ? 'highlight-yellow' : ''}`}>
                  <span className="label">EFF (효율성)</span>
                  <span className="value">{player.eff ?? '-'}</span>
                </div>
                <div className={`card-item ${rankingType === 'tsPct' ? 'highlight-yellow' : ''}`}>
                  <span className="label">TS% (트루슈팅)</span>
                  <span className="value">{player.tsPct ? `${player.tsPct}%` : '-'}</span>
                </div>
                <div className={`card-item ${rankingType === 'efgPct' ? 'highlight-yellow' : ''}`}>
                  <span className="label">eFG% (유효야투)</span>
                  <span className="value">{player.efgPct ? `${player.efgPct}%` : '-'}</span>
                </div>
                <div className={`card-item ${rankingType === 'astToRatio' ? 'highlight-yellow' : ''}`}>
                  <span className="label">AST/TO (어시/실책)</span>
                  <span className="value">{player.astToRatio ?? '-'}</span>
                </div>
                <div className={`card-item ${rankingType === 'hustle' ? 'highlight-yellow' : ''}`}>
                  <span className="label">허슬 / 수비</span>
                  <span className="value">{player.hustle ?? '-'}</span>
                </div>

                {/* 경기수 및 기본 평균 지표 */}
                <div className="card-item">
                  <span className="label">출전 경기수</span>
                  <span className="value">{player.gamesPlayed || 0}G</span>
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
                <div className={`card-item ${rankingType === 'avgBlocks' ? 'highlight-yellow' : ''}`}>
                  <span className="label">평균 블록슛</span>
                  <span className="value">{player.avgBlocks}</span>
                </div>

                {/* 누적 지표 */}
                <div className={`card-item ${rankingType === 'totalPoints' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총득점</span>
                  <span className="value">{player.totalPoints}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalAssists' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 어시스트</span>
                  <span className="value">{player.totalAssists}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalRebounds' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 리바운드</span>
                  <span className="value">{player.totalRebounds}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalSteals' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 스틸</span>
                  <span className="value">{player.totalSteals}</span>
                </div>
                <div className={`card-item ${rankingType === 'totalBlocks' ? 'highlight-yellow' : ''}`}>
                  <span className="label">총 블록슛</span>
                  <span className="value">{player.totalBlocks}</span>
                </div>

                {Object.entries(player.competitions).map(([compName, points]) => (
                  <div key={compName} className="card-item">
                    <span className="label">{formatCompShortName(compName)}</span>
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
      currentRankings = middleSchoolRankings?.all || [];
    } else if (middleSchoolSubTab === 'male') {
      currentRankings = middleSchoolRankings?.male || [];
    } else if (middleSchoolSubTab === 'female') {
      currentRankings = middleSchoolRankings?.female || [];
    }
  } else if (activeTab === 'highSchool') {
    if (highSchoolSubTab === 'all') {
      currentRankings = highSchoolRankings?.all || [];
    } else if (highSchoolSubTab === 'male') {
      currentRankings = highSchoolRankings?.male || [];
    } else if (highSchoolSubTab === 'female') {
      currentRankings = highSchoolRankings?.female || [];
    }
  }

  return (
    <div className="rankings-container">
      <div className="results-header rankings-header-bar">
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
          2026 시즌
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
          onClick={() => { setActiveTab('middleSchool'); setMiddleSchoolSubTab('all'); setRankingType('eff'); setSearchTerm(''); }}
        >
          중등부
        </button>
        <button
          className={`tab-button ${activeTab === 'highSchool' ? 'active' : ''}`}
          onClick={() => { setActiveTab('highSchool'); setHighSchoolSubTab('all'); setRankingType('eff'); setSearchTerm(''); }}
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

      <HorizontalScrollMenu className="ranking-type-tabs">
        <button
          className={`type-tab-button ${rankingType === 'eff' ? 'active' : ''}`}
          onClick={() => { setRankingType('eff'); setSearchTerm(''); }}
        >
          EFF (효율성)
        </button>
        <button
          className={`type-tab-button ${rankingType === 'tsPct' ? 'active' : ''}`}
          onClick={() => { setRankingType('tsPct'); setSearchTerm(''); }}
        >
          TS% (트루 슈팅)
        </button>
        <button
          className={`type-tab-button ${rankingType === 'efgPct' ? 'active' : ''}`}
          onClick={() => { setRankingType('efgPct'); setSearchTerm(''); }}
        >
          eFG% (유효 야투율)
        </button>
        <button
          className={`type-tab-button ${rankingType === 'astToRatio' ? 'active' : ''}`}
          onClick={() => { setRankingType('astToRatio'); setSearchTerm(''); }}
        >
          AST/TO (어시/실책)
        </button>
        <button
          className={`type-tab-button ${rankingType === 'hustle' ? 'active' : ''}`}
          onClick={() => { setRankingType('hustle'); setSearchTerm(''); }}
        >
          허슬 / 수비
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgPoints' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgPoints'); setSearchTerm(''); }}
        >
          AVG 득점
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgAssists' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgAssists'); setSearchTerm(''); }}
        >
          AVG 어시스트
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgRebounds' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgRebounds'); setSearchTerm(''); }}
        >
          AVG 리바운드
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgSteals' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgSteals'); setSearchTerm(''); }}
        >
          AVG 스틸
        </button>
        <button
          className={`type-tab-button ${rankingType === 'avgBlocks' ? 'active' : ''}`}
          onClick={() => { setRankingType('avgBlocks'); setSearchTerm(''); }}
        >
          AVG 블록슛
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalPoints' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalPoints'); setSearchTerm(''); }}
        >
          총득점
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalAssists' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalAssists'); setSearchTerm(''); }}
        >
          총 어시스트
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalRebounds' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalRebounds'); setSearchTerm(''); }}
        >
          총 리바운드
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalSteals' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalSteals'); setSearchTerm(''); }}
        >
          총 스틸
        </button>
        <button
          className={`type-tab-button ${rankingType === 'totalBlocks' ? 'active' : ''}`}
          onClick={() => { setRankingType('totalBlocks'); setSearchTerm(''); }}
        >
          총 블록슛
        </button>
      </HorizontalScrollMenu>

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
  '총 파울': 'Foul',
  '경기구분': '구분',
  '경기 영상': '영상'
};

// 표시할 컬럼 순서 (원본 컬럼명 사용)
const DISPLAY_COLUMNS = [
  '대회명', '경기구분', '경기 영상', '소속팀', '상대팀', '선수명', '등번호', '1Q 득점', '2Q 득점', '3Q 득점', '4Q 득점', '연장 득점', '총득점',
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

    return {
      ...p,
      '총득점': q1 + q2 + q3 + q4 + ot,
      '경기구분': p['경기구분'] || '예선',
      'videoUrl': p['videoUrl'] || null,
    };
  });
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('2026'); // '2026' or '2025' or 'all'
  const [playerSeasonFilter, setPlayerSeasonFilter] = useState('2026'); // '2026', '2025', 'all'
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
  const [isLoading, setIsLoading] = useState(false); // Loading state for search
  const [isRecordsLoading, setIsRecordsLoading] = useState(true); // Loading state for initial records cache

  // Helper function to calculate average stats for a given set of records
  const calculateAvgStatsForRecords = (records) => {
    if (!records || records.length === 0) return null;
    let totalPoints = 0, totalAssists = 0, totalRebounds = 0, totalBlocks = 0, totalSteals = 0;
    records.forEach(r => {
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
    const gamesPlayed = records.length;
    return {
      avgPoints: (totalPoints / gamesPlayed).toFixed(1),
      avgAssists: (totalAssists / gamesPlayed).toFixed(1),
      avgRebounds: (totalRebounds / gamesPlayed).toFixed(1),
      avgBlocks: (totalBlocks / gamesPlayed).toFixed(1),
      avgSteals: (totalSteals / gamesPlayed).toFixed(1),
      gamesPlayed
    };
  };

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

      if (!playerName || !teamName || jerseyNumber === undefined || jerseyNumber === null) {
        return;
      }

      const gamePoints = parseInt(record['총득점']) || 0;
      const gameAssists = parseInt(record['어시스트']) || 0;
      const gameRebounds = parseInt(record['총 리바운드']) || 0;
      const gameBlocks = parseInt(record['블록슛']) || 0;
      const gameSteals = parseInt(record['스틸']) || 0;
      const gameGoodDefense = parseInt(record['굿디펜스']) || 0;
      const gameTurnovers = parseInt(record['턴오버']) || 0;
      const game2PM = parseInt(record['2점슛 성공']) || 0;
      const game2PA = parseInt(record['2점슛 시도']) || 0;
      const game3PM = parseInt(record['3점슛 성공']) || 0;
      const game3PA = parseInt(record['3점슛 시도']) || 0;
      const gameFTM = parseInt(record['자유투 성공']) || 0;
      const gameFTA = parseInt(record['자유투 시도']) || 0;
      const gameOReb = parseInt(record['공격 리바운드']) || 0;
      const gameDReb = parseInt(record['수비 리바운드']) || 0;

      const key = `${playerName}_${teamName}`;

      const isMiddleSchool = teamName.includes('중학교') || teamName.endsWith('중');
      const isHighSchool = teamName.includes('고등학교') || teamName.endsWith('고');

      const isFemaleMiddleSchool = (isMiddleSchool && (teamName.includes('여자') || teamName.includes('여중'))) || specificFemaleMiddleSchools.includes(teamName);
      const isMaleMiddleSchool = isMiddleSchool && !isFemaleMiddleSchool;

      const isFemaleHighSchool = (isHighSchool && (teamName.includes('여자') || teamName.includes('여고'))) || specificFemaleHighSchools.includes(teamName);
      const isMaleHighSchool = isHighSchool && !isFemaleHighSchool;

      const addPlayerStats = (statsObj) => {
        if (!statsObj[key]) {
          statsObj[key] = {
            name: playerName,
            team: teamName,
            jersey: jerseyNumber,
            totalPoints: 0,
            totalAssists: 0,
            totalRebounds: 0,
            totalBlocks: 0,
            totalSteals: 0,
            totalGoodDefense: 0,
            totalTurnovers: 0,
            total2PM: 0,
            total2PA: 0,
            total3PM: 0,
            total3PA: 0,
            totalFTM: 0,
            totalFTA: 0,
            totalOReb: 0,
            totalDReb: 0,
            gamesPlayed: 0,
            competitions: {},
          };
        }
        const p = statsObj[key];
        p.totalPoints += gamePoints;
        p.totalAssists += gameAssists;
        p.totalRebounds += gameRebounds;
        p.totalBlocks += gameBlocks;
        p.totalSteals += gameSteals;
        p.totalGoodDefense += gameGoodDefense;
        p.totalTurnovers += gameTurnovers;
        p.total2PM += game2PM;
        p.total2PA += game2PA;
        p.total3PM += game3PM;
        p.total3PA += game3PA;
        p.totalFTM += gameFTM;
        p.totalFTA += gameFTA;
        p.totalOReb += gameOReb;
        p.totalDReb += gameDReb;
        p.gamesPlayed += 1;
        if (competitionName) {
          p.competitions[competitionName] = (p.competitions[competitionName] || 0) + gamePoints;
        }
      };

      if (isMiddleSchool) addPlayerStats(middleSchoolPlayerStats);
      if (isMaleMiddleSchool) addPlayerStats(maleMiddleSchoolPlayerStats);
      if (isFemaleMiddleSchool) addPlayerStats(femaleMiddleSchoolPlayerStats);
      if (isHighSchool) addPlayerStats(highSchoolPlayerStats);
      if (isMaleHighSchool) addPlayerStats(maleHighSchoolPlayerStats);
      if (isFemaleHighSchool) addPlayerStats(femaleHighSchoolPlayerStats);
    });

    // Calculate averages & advanced metrics
    const calculateAverages = (stats) => {
      for (const key in stats) {
        const player = stats[key];
        const gp = player.gamesPlayed || 1;

        player.avgPoints = Number((player.totalPoints / gp).toFixed(1));
        player.avgAssists = Number((player.totalAssists / gp).toFixed(1));
        player.avgRebounds = Number((player.totalRebounds / gp).toFixed(1));
        player.avgBlocks = Number((player.totalBlocks / gp).toFixed(1));
        player.avgSteals = Number((player.totalSteals / gp).toFixed(1));

        // 1. EFF (효율성) = (득점 + 리바운드 + 어시스트 + 스틸 + 블록슛 + 굿디펜스) - (야투실패 + 자유투실패 + 턴오버)
        const fgAttempts = player.total2PA + player.total3PA;
        const fgMade = player.total2PM + player.total3PM;
        const fgMissed = Math.max(0, fgAttempts - fgMade);
        const ftMissed = Math.max(0, player.totalFTA - player.totalFTM);

        const totalEff = (
          (player.totalPoints + player.totalRebounds + player.totalAssists + player.totalSteals + player.totalBlocks + player.totalGoodDefense)
          - (fgMissed + ftMissed + player.totalTurnovers)
        );
        player.eff = Number((totalEff / gp).toFixed(1));

        // 2. TS% (트루 슈팅 성공률) = 총득점 / [2 * (야투시도 + 0.44 * 자유투시도)] * 100
        const tsAttempts = fgAttempts + (0.44 * player.totalFTA);
        player.tsPct = tsAttempts > 0 ? Number(((player.totalPoints / (2 * tsAttempts)) * 100).toFixed(1)) : 0;

        // 3. eFG% (유효 야투율) = (2점성공 + 1.5 * 3점성공) / 야투시도 * 100
        player.efgPct = fgAttempts > 0 ? Number((((player.total2PM + (1.5 * player.total3PM)) / fgAttempts) * 100).toFixed(1)) : 0;

        // 4. AST/TO (어시스트 대 턴오버 비율)
        player.astToRatio = Number((player.totalAssists / Math.max(1, player.totalTurnovers)).toFixed(2));

        // 5. 수비 & 허슬 지표 = (스틸*1.5 + 블록*1.5 + 굿디펜스*1.0 + 공격리바*1.2) / 경기수
        const totalHustle = (player.totalSteals * 1.5) + (player.totalBlocks * 1.5) + (player.totalGoodDefense * 1.0) + (player.totalOReb * 1.2);
        player.hustle = Number((totalHustle / gp).toFixed(1));
      }
      return stats;
    };

    const middleSchoolStatsWithAverages = calculateAverages(middleSchoolPlayerStats);
    const maleMiddleSchoolStatsWithAverages = calculateAverages(maleMiddleSchoolPlayerStats);
    const femaleMiddleSchoolStatsWithAverages = calculateAverages(femaleMiddleSchoolPlayerStats);
    const highSchoolStatsWithAverages = calculateAverages(highSchoolPlayerStats);
    const maleHighSchoolStatsWithAverages = calculateAverages(maleHighSchoolPlayerStats);
    const femaleHighSchoolStatsWithAverages = calculateAverages(femaleHighSchoolPlayerStats);

    const allSortKeys = [
      'eff',
      'tsPct',
      'efgPct',
      'astToRatio',
      'hustle',
      'avgPoints',
      'avgAssists',
      'avgRebounds',
      'avgSteals',
      'avgBlocks',
      'totalPoints',
      'totalAssists',
      'totalRebounds',
      'totalBlocks',
      'totalSteals',
    ];

    return {
      middleSchool: {
        all: finalizeAndSort(middleSchoolStatsWithAverages, ...allSortKeys),
        male: finalizeAndSort(maleMiddleSchoolStatsWithAverages, ...allSortKeys),
        female: finalizeAndSort(femaleMiddleSchoolStatsWithAverages, ...allSortKeys),
      },
      highSchool: {
        all: finalizeAndSort(highSchoolStatsWithAverages, ...allSortKeys),
        male: finalizeAndSort(maleHighSchoolStatsWithAverages, ...allSortKeys),
        female: finalizeAndSort(femaleHighSchoolStatsWithAverages, ...allSortKeys),
      }
    };
  };

  // Helper function to sort and assign ranks for each stat type
  const finalizeAndSort = (stats, ...sortKeys) => {
    const players = Object.values(stats);
    const rankedPlayers = {};

    sortKeys.forEach(key => {
      const sorted = [...players].sort((a, b) => {
        const valA = a[key] ?? 0;
        const valB = b[key] ?? 0;
        if (valB !== valA) {
          return valB - valA;
        }
        if ((b.eff ?? 0) !== (a.eff ?? 0)) {
          return (b.eff ?? 0) - (a.eff ?? 0);
        }
        return (b.totalPoints ?? 0) - (a.totalPoints ?? 0);
      });
      sorted.forEach((player, index) => {
        const pKey = player.name + player.team + player.jersey;
        if (!rankedPlayers[pKey]) {
          rankedPlayers[pKey] = { ...player };
        }
        rankedPlayers[pKey][`originalRank${key.charAt(0).toUpperCase() + key.slice(1)}`] = index + 1;
      });
    });

    return Object.values(rankedPlayers);
  };

  // Effect to filter displayRecords based on selectedCompetition, playerSeasonFilter and selectedPlayerRecords
  useEffect(() => {
    if (selectedPlayerRecords.length > 0) {
      // 1. Filter by player season
      const seasonFiltered = playerSeasonFilter === 'all'
        ? selectedPlayerRecords
        : selectedPlayerRecords.filter(r => (r.season || '2025') === playerSeasonFilter);

      // Extract unique competitions for this player in this season
      const comps = ['전체', ...new Set(seasonFiltered.map(r => r['대회명']))];
      setAvailableCompetitions(comps);

      // 2. Filter by competition
      const activeComp = comps.includes(selectedCompetition) ? selectedCompetition : '전체';
      const compFiltered = activeComp === '전체'
        ? seasonFiltered
        : seasonFiltered.filter(record => record['대회명'] === activeComp);

      setDisplayRecords(processRecords(compFiltered));
      setSelectedPlayerAvgStats(calculateAvgStatsForRecords(compFiltered.length > 0 ? compFiltered : seasonFiltered));
    }
  }, [selectedCompetition, selectedPlayerRecords, playerSeasonFilter]);

  // Fetch and cache all records from local 2026 data and Firestore
  const fetchRecords = async () => {
    if (cachedRecords.length > 0) return cachedRecords;
    setIsRecordsLoading(true);
    let allRecords = [];

    try {
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

      // 2. Load 2025 records from Firestore (with robust deduplication)
      try {
        const q = query(collection(db, 'player_records'));
        const querySnapshot = await getDocs(q);

        const existingIds = new Set(allRecords.map(r => r.id).filter(Boolean));
        const existingFingerprints = new Set(
          allRecords.map(r => 
            `${r['대회명']}__${r['소속팀']}__${r['상대팀']}__${r['선수명']}__${r['등번호']}__${r['1Q 득점']}__${r['2Q 득점']}__${r['3Q 득점']}__${r['4Q 득점']}__${r['플레잉 타임']}`
          )
        );

        querySnapshot.forEach((doc) => {
          const d = doc.data();
          const docId = doc.id;

          // Skip if ID is already present
          if (existingIds.has(docId) || (d.id && existingIds.has(d.id))) {
            return;
          }

          // Skip 2026 spring records from Firestore since all 2026 spring records are already in static JSON
          if (docId.startsWith('2026_spring_') || d['대회명'] === '제63회 춘계 전국남녀중고농구연맹전') {
            return;
          }

          // Check fingerprint to eliminate any identical duplicate game records
          const fp = `${d['대회명']}__${d['소속팀']}__${d['상대팀']}__${d['선수명']}__${d['등번호']}__${d['1Q 득점']}__${d['2Q 득점']}__${d['3Q 득점']}__${d['4Q 득점']}__${d['플레잉 타임']}`;
          if (!existingFingerprints.has(fp)) {
            existingFingerprints.add(fp);
            existingIds.add(docId);
            allRecords.push({ id: docId, ...d });
          }
        });
      } catch (error) {
        console.warn('Firestore fetch notice (quota/network):', error.message || error);
      }

      // Process all records to calculate total points and assign season
      const invalidKeywords = ['time out', 'timeout', '감독', '코치', 'total', 'tota', 'team', '팀 합계', '합계', '잔여'];
      const processedAllRecords = allRecords
        .filter(p => {
          const name = String(p['선수명'] || '').trim().toLowerCase();
          if (!name) return false;
          return !invalidKeywords.some(kw => name.includes(kw));
        })
        .map(p => {
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
      return processedAllRecords;
    } finally {
      setIsRecordsLoading(false);
    }
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
    setSelectedSeason('2026');
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
    const rawSearch = searchTerm.trim();
    if (!rawSearch) return;

    // Reset states and provide INSTANT visual feedback
    setIsLoading(true);
    setShowResults(true); // Instant transition to results view
    setUniquePlayers([]);
    setDisplayRecords([]);
    setSelectedPlayerRecords([]);
    setSelectedPlayerAvgStats(null);
    setSelectedCompetition('전체');
    setAvailableCompetitions([]);
    setNeedsSelection(false);
    setSelectionMode('');
    setIsTeamSearchMode(false);

    // Yield control to let the browser paint the loading spinner immediately
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      const allRecords = cachedRecords.length > 0 ? cachedRecords : await fetchRecords();

      const normalize = (s) => (s ? String(s).replace(/\s+/g, '').toLowerCase() : '');
      const target = normalize(rawSearch);

      // 1. Search matching players (exact or partial)
      const matchingPlayerRecords = allRecords.filter(r => {
        const pName = normalize(r['선수명']);
        return pName === target || pName.includes(target);
      });

      // 2. Search matching teams
      const matchingTeamRecords = allRecords.filter(r => {
        const tName = normalize(r['소속팀']);
        return tName.includes(target);
      });

      // Check if user specifically searched a school pattern (e.g. ends with 중/고/학교)
      const isExplicitTeam = rawSearch.endsWith('중') || rawSearch.endsWith('고') || rawSearch.endsWith('학교');

      let candidateRecords = [];

      if (isExplicitTeam) {
        candidateRecords = matchingTeamRecords.length > 0 ? matchingTeamRecords : matchingPlayerRecords;
        setIsTeamSearchMode(matchingTeamRecords.length > 0);
      } else {
        // Check if there is an exact player name match first
        const exactPlayers = matchingPlayerRecords.filter(r => normalize(r['선수명']) === target);
        if (exactPlayers.length > 0) {
          candidateRecords = exactPlayers;
          setIsTeamSearchMode(false);
        } else if (matchingPlayerRecords.length > 0) {
          candidateRecords = matchingPlayerRecords;
          setIsTeamSearchMode(false);
        } else if (matchingTeamRecords.length > 0) {
          // E.g. user typed "용산", "휘문", "경복" without "고"
          candidateRecords = matchingTeamRecords;
          setIsTeamSearchMode(true);
        }
      }

      if (candidateRecords.length > 0) {
        const unique = [];
        const seen = new Set();
        candidateRecords.forEach(r => {
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

          const has2026 = unique.some(p => p.season === '2026');
          if (!has2026 && unique.some(p => (p.season || '2025') === '2025')) {
            setSelectedSeason('2025');
          } else if (has2026 && selectedSeason !== 'all') {
            setSelectedSeason('2026');
          }
        } else {
          await handlePlayerSelect(unique[0]);
        }
      } else {
        setDisplayRecords([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerSelect = async (player) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 40));
    try {
      const allRecords = cachedRecords.length > 0 ? cachedRecords : await fetchRecords();
      const records = allRecords.filter(r =>
        r['선수명'] === player.name &&
        r['소속팀'] === player.team &&
        String(r['등번호']) === String(player.jersey)
      );

      if (records.length > 0) {
        setSelectedPlayerRecords(records); // Store all records

        // Set initial season filter: if user selected a season and player has it, use it; otherwise auto-select
        const has2026 = records.some(r => r.season === '2026');
        const has2025 = records.some(r => (r.season || '2025') === '2025');

        let initialSeason = selectedSeason;
        if (selectedSeason === '2026' && !has2026 && has2025) {
          initialSeason = '2025';
        } else if (selectedSeason === '2025' && !has2025 && has2026) {
          initialSeason = '2026';
        }

        setPlayerSeasonFilter(initialSeason);
        setSelectedCompetition('전체');
        setNeedsSelection(false);
      }
    } catch (error) {
      console.error('Error fetching player details:', error);
    } finally {
      setIsLoading(false);
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
        isRecordsLoading={isRecordsLoading}
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
            <div className="results-brand">
              <button className="back-button" onClick={handleGoHome}>
                <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="16px" height="16px">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                </svg>
              </button>
              <h1 className="logo-small" onClick={handleGoHome}>
                <span className="hoopgle-red">H</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">o</span><span className="hoopgle-yellow">p</span><span className="hoopgle-navy"> Z</span><span className="hoopgle-yellow">o</span><span className="hoopgle-navy">n</span><span className="hoopgle-yellow">e</span>
              </h1>
            </div>
            <form onSubmit={handleSearch} className="search-form-results">
              <input
                type="text"
                placeholder="선수명 또는 학교명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner"></span>
                    검색 중...
                  </span>
                ) : (
                  '검색'
                )}
              </button>
            </form>
          </div>

          <div className="results-container">
            {isLoading ? (
              <div className="loading-container" style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="loading-spinner"></div>
                <p style={{ marginTop: '16px', color: '#475569', fontWeight: '600', fontSize: '15px' }}>
                  선수 및 경기 기록을 검색하고 있습니다...
                </p>
              </div>
            ) : (
              <>
                {needsSelection && (
                  <div className="selection-container">
                    <HorizontalScrollMenu className="season-switcher-container">
                      <button
                        type="button"
                        className={`season-tab ${selectedSeason === '2026' ? 'active' : ''}`}
                        onClick={() => setSelectedSeason('2026')}
                      >
                        2026 시즌 ({uniquePlayers.filter(p => p.season === '2026').length}명)
                      </button>
                      <button
                        type="button"
                        className={`season-tab ${selectedSeason === '2025' ? 'active' : ''}`}
                        onClick={() => setSelectedSeason('2025')}
                      >
                        2025 시즌 ({uniquePlayers.filter(p => (p.season || '2025') === '2025').length}명)
                      </button>
                      <button
                        type="button"
                        className={`season-tab ${selectedSeason === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedSeason('all')}
                      >
                        전체 ({uniquePlayers.length}명)
                      </button>
                    </HorizontalScrollMenu>
                    <h3>{selectionMode === 'player' ? '선수를 선택해주세요' : '대회를 선택해주세요'}</h3>
                    <div className="selection-list">
                      {uniquePlayers
                        .filter(player => selectedSeason === 'all' || (player.season || '2025') === selectedSeason)
                        .map((player, index) => (
                          <div key={index} className="selection-item" onClick={() => handlePlayerSelect(player)}>
                            <span className="player-name">{player.name}</span>
                            <span className="player-info">
                              <span className="player-team-text">{player.team} | no.{player.jersey}</span>
                              <span className="season-badge-pill">{player.season || '2025'}시즌</span>
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {!needsSelection && displayRecords.length === 0 && (
                  <div className="no-results">
                    <p>선택된 시즌({selectedSeason === 'all' ? '전체' : selectedSeason + '년'})에 검색 결과가 없습니다.</p>
                  </div>
                )}
              </>
            )}

            {!isLoading && displayRecords.length > 0 && (
              <>
                <div className="player-header">
                  <h2>
                    <span className="player-main-name">{displayRecords[0]['선수명']}</span>
                    <span className="player-sub-info">{displayRecords[0]['소속팀']} | no.{displayRecords[0]['등번호']}</span>
                    {isHotPlayer(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="flame-emoji" title="Hot Player (평균 득점 Top 5)"> 🔥</span>}
                    {isDimeDealer(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="dime-dealer-emoji" title="Dime Dealer (평균 어시스트 Top 5)"> 🏀</span>}
                    {isSkySweeper(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="sky-sweeper-emoji" title="Sky Sweeper (평균 리바운드 Top 5)"> 🖐️</span>}
                    {isStealMaster(displayRecords[0]['선수명'], displayRecords[0]['소속팀']) && <span className="steal-emoji" title="Steal Master (평균 스틸 Top 5)"> 🥷</span>}
                  </h2>
                </div>

                {/* Player Season Selector Tabs */}
                {selectedPlayerRecords.length > 0 && (
                  <HorizontalScrollMenu className="player-season-container">
                    <button
                      type="button"
                      className={`season-tab ${playerSeasonFilter === '2026' ? 'active' : ''}`}
                      onClick={() => {
                        setPlayerSeasonFilter('2026');
                        setSelectedCompetition('전체');
                      }}
                    >
                      2026 시즌 ({selectedPlayerRecords.filter(r => r.season === '2026').length}경기)
                    </button>
                    <button
                      type="button"
                      className={`season-tab ${playerSeasonFilter === '2025' ? 'active' : ''}`}
                      onClick={() => {
                        setPlayerSeasonFilter('2025');
                        setSelectedCompetition('전체');
                      }}
                    >
                      2025 시즌 ({selectedPlayerRecords.filter(r => (r.season || '2025') === '2025').length}경기)
                    </button>
                    <button
                      type="button"
                      className={`season-tab ${playerSeasonFilter === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setPlayerSeasonFilter('all');
                        setSelectedCompetition('전체');
                      }}
                    >
                      전체 ({selectedPlayerRecords.length}경기)
                    </button>
                  </HorizontalScrollMenu>
                )}

                {/* Average Stats Section */}
                {selectedPlayerAvgStats && (
                  <div className="player-avg-stats-container">
                    <div className="avg-stat-card">
                      <span className="label">평균 득점</span>
                      <span className="value">{selectedPlayerAvgStats.avgPoints}</span>
                    </div>
                    <div className="avg-stat-card">
                      <span className="label">평균 어시스트</span>
                      <span className="value">{selectedPlayerAvgStats.avgAssists}</span>
                    </div>
                    <div className="avg-stat-card">
                      <span className="label">평균 리바운드</span>
                      <span className="value">{selectedPlayerAvgStats.avgRebounds}</span>
                    </div>
                    <div className="avg-stat-card">
                      <span className="label">평균 스틸</span>
                      <span className="value">{selectedPlayerAvgStats.avgSteals}</span>
                    </div>
                    <div className="avg-stat-card">
                      <span className="label">평균 블록</span>
                      <span className="value">{selectedPlayerAvgStats.avgBlocks}</span>
                    </div>
                  </div>
                )}

                <HorizontalScrollMenu className="competition-buttons-container">
                  {availableCompetitions.map(comp => (
                    <button
                      key={comp}
                      className={`competition-button ${selectedCompetition === comp ? 'active' : ''}`}
                      onClick={() => setSelectedCompetition(comp)}
                    >
                      {comp === '전체' ? '전체' : (formatCompShortName(comp) || comp.replace('대회', '').trim())}
                    </button>
                  ))}
                </HorizontalScrollMenu>

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
                          {DISPLAY_COLUMNS.map(col => {
                            if (col === '경기구분') {
                              const stage = record['경기구분'] || '예선';
                              const badgeClass = stage === '결승' ? 'stage-final' : stage === '4강' ? 'stage-semifinal' : stage === '결선' ? 'stage-playoff' : 'stage-prelim';
                              return (
                                <td key={col}>
                                  <span className={`stage-badge ${badgeClass}`}>
                                    {stage === '결승' ? '🏆 결승' : stage === '4강' ? '🔥 4강' : stage}
                                  </span>
                                </td>
                              );
                            }
                            if (col === '경기 영상') {
                              return (
                                <td key={col} className="video-cell">
                                  {record.videoUrl ? (
                                    <a
                                      href={record.videoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="video-link-btn"
                                      title="해당 경기 유튜브 영상 보기"
                                    >
                                      ▶ 영상
                                    </a>
                                  ) : (
                                    <span className="no-video-dash">-</span>
                                  )}
                                </td>
                              );
                            }
                            return <td key={col}>{record[col]}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="cards-container hide-on-desktop">
                  {displayRecords.map((record, index) => (
                    <div key={index} className="player-card">
                      <div className="card-header game-card-header">
                        <div className="game-card-title-group">
                          <span className="game-comp-name">{record['대회명']}</span>
                          {record['경기구분'] && (
                            <span className={`stage-badge ${record['경기구분'] === '결승' ? 'stage-final' : record['경기구분'] === '4강' ? 'stage-semifinal' : record['경기구분'] === '결선' ? 'stage-playoff' : 'stage-prelim'}`}>
                              {record['경기구분'] === '결승' ? '🏆 결승' : record['경기구분'] === '4강' ? '🔥 4강' : record['경기구분']}
                            </span>
                          )}
                        </div>
                        <div className="game-card-right-group">
                          <span className="team-name-mobile">vs {record['상대팀']}</span>
                          {record.videoUrl && (
                            <a
                              href={record.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="video-link-btn-mobile"
                            >
                              ▶ 영상
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="card-item highlight-yellow">
                          <span className="label">득점</span>
                          <span className="value">{record['총득점']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">출전시간</span>
                          <span className="value">{record['플레잉 타임'] || '-'}</span>
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
                          <span className="label">턴오버</span>
                          <span className="value">{record['턴오버']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">파울</span>
                          <span className="value">{record['총 파울']}</span>
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
                          <span className="label">3점슛 (성공/시도)</span>
                          <span className="value">{record['3점슛 성공']}/{record['3점슛 시도']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">3점 성공률</span>
                          <span className="value">{record['3점 성공률(%)']}%</span>
                        </div>
                        <div className="card-item">
                          <span className="label">자유투 (성공/시도)</span>
                          <span className="value">{record['자유투 성공']}/{record['자유투 시도']}</span>
                        </div>
                        <div className="card-item">
                          <span className="label">자유투 성공률</span>
                          <span className="value">{record['자유투 성공률(%)']}%</span>
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
            <button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-loading-content">
                  <span className="btn-spinner"></span>
                  검색 중...
                </span>
              ) : (
                '검색'
              )}
            </button>
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
