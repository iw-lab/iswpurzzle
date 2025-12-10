import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getTopRankings,
  getPlayerId,
  getPlayerName,
  setPlayerName,
  getMyRank,
  RankingEntry,
  RankingType,
} from '../../services/firebase';

interface LeaderboardScreenProps {
  onClose: () => void;
}

export function LeaderboardScreen({ onClose }: LeaderboardScreenProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingType, setRankingType] = useState<RankingType>('all');
  const [gameMode, setGameMode] = useState<string>('classic');
  const [myRank, setMyRank] = useState<number>(-1);
  const [playerName, setLocalPlayerName] = useState(getPlayerName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(playerName);

  const playerId = getPlayerId();

  // 랭킹 로드
  const loadRankings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTopRankings(rankingType, gameMode, 50);
      setRankings(data);

      // 내 순위 가져오기
      const rank = await getMyRank(playerId, gameMode);
      setMyRank(rank);
    } catch (error) {
      console.error('랭킹 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [rankingType, gameMode, playerId]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // 이름 저장
  const handleSaveName = () => {
    if (newName.trim()) {
      setPlayerName(newName.trim());
      setLocalPlayerName(newName.trim());
    }
    setIsEditingName(false);
  };

  // 순위별 스타일
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-black';
    if (rank === 3) return 'bg-gradient-to-r from-orange-400 to-orange-600 text-black';
    return 'bg-white/10 text-white';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  // 시간 포맷
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 날짜 포맷
  const formatDate = (date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date.toDate();
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return d.toLocaleDateString('ko-KR');
  };

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-b from-[#0a0a20] via-[#1a1a40] to-[#0a0a20] z-50 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 배경 효과 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

      <div className="relative h-full flex flex-col max-w-lg mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            ←
          </button>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            RANKING
          </h1>
          <button
            onClick={loadRankings}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            🔄
          </button>
        </div>

        {/* 내 정보 카드 */}
        <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-2xl p-4 mb-4 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={12}
                      className="bg-black/50 border border-purple-500 rounded px-2 py-1 text-white text-sm w-28"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-green-400 text-sm"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{playerName}</span>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-gray-400 text-xs hover:text-white"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <div className="text-gray-400 text-xs">
                  {myRank > 0 ? `현재 순위: ${myRank}위` : '기록 없음'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 mb-3">
          {/* 기간 필터 */}
          <div className="flex bg-black/30 rounded-xl p-1 flex-1">
            {(['all', 'weekly', 'daily'] as RankingType[]).map((type) => (
              <button
                key={type}
                onClick={() => setRankingType(type)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  rankingType === type
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'text-gray-400'
                }`}
              >
                {type === 'all' ? '전체' : type === 'weekly' ? '주간' : '오늘'}
              </button>
            ))}
          </div>
        </div>

        {/* 모드 필터 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {['classic', 'timeAttack', 'survival', 'puzzle'].map((mode) => (
            <button
              key={mode}
              onClick={() => setGameMode(mode)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                gameMode === mode
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                  : 'bg-white/10 text-gray-400'
              }`}
            >
              {mode === 'classic' ? '클래식' :
               mode === 'timeAttack' ? '타임어택' :
               mode === 'survival' ? '서바이벌' : '퍼즐'}
            </button>
          ))}
        </div>

        {/* 랭킹 목록 */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">로딩 중...</span>
            </div>
          ) : rankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <span className="text-5xl">🏆</span>
              <span className="text-gray-400 text-sm">아직 기록이 없습니다</span>
              <span className="text-gray-500 text-xs">첫 번째 1위가 되어보세요!</span>
            </div>
          ) : (
            <AnimatePresence>
              {rankings.map((entry, index) => {
                const rank = index + 1;
                const isMe = entry.playerId === playerId;

                return (
                  <motion.div
                    key={entry.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`rounded-xl p-3 ${getRankStyle(rank)} ${
                      isMe ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a20]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 순위 */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        rank <= 3 ? '' : 'bg-black/20'
                      }`}>
                        {getRankIcon(rank)}
                      </div>

                      {/* 플레이어 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold truncate ${rank <= 3 ? '' : 'text-white'}`}>
                            {entry.playerName}
                          </span>
                          {isMe && (
                            <span className="text-[10px] bg-cyan-500 text-white px-1.5 py-0.5 rounded-full">
                              ME
                            </span>
                          )}
                        </div>
                        <div className={`text-xs ${rank <= 3 ? 'opacity-70' : 'text-gray-400'}`}>
                          Lv.{entry.level} | {formatTime(entry.playTime)} |{' '}
                          {formatDate(entry.createdAt)}
                        </div>
                      </div>

                      {/* 점수 */}
                      <div className="text-right">
                        <div className={`font-black text-lg ${rank <= 3 ? '' : 'text-cyan-400'}`}>
                          {entry.score.toLocaleString()}
                        </div>
                        <div className={`text-xs ${rank <= 3 ? 'opacity-70' : 'text-gray-500'}`}>
                          {entry.maxCombo}콤보 {entry.maxChain}연쇄
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default LeaderboardScreen;
