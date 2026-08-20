import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { FEATURES } from '../../constants/features';
import { BLOCK_SKINS, THEMES, GEM_PACKAGES, RARITY_COLORS, RARITY_NAMES, SKIN_STYLES } from '../../constants/shopItems';

interface ShopScreenProps {
  onClose: () => void;
}

type ShopTab = 'skins' | 'themes' | 'gems';

/** 노출할 상점 탭. 젬(결제) 탭은 SDK 연동 전까지 감춘다 — features.ts 참조. */
const SHOP_TABS: ShopTab[] = FEATURES.iap
  ? ['skins', 'themes', 'gems']
  : ['skins', 'themes'];

export function ShopScreen({ onClose }: ShopScreenProps) {
  const { currency, ownedSkins, ownedThemes, equippedSkinId, equippedThemeId, purchaseSkin, purchaseTheme, equipSkin, equipTheme } =
    useUserStore();
  const { playSound } = useAudio();
  const [activeTab, setActiveTab] = useState<ShopTab>('skins');

  const handlePurchaseSkin = (skinId: string) => {
    const success = purchaseSkin(skinId);
    if (success) {
      playSound('purchaseSuccess');
    }
  };

  const handlePurchaseTheme = (themeId: string) => {
    const success = purchaseTheme(themeId);
    if (success) {
      playSound('purchaseSuccess');
    }
  };

  const handleEquipSkin = (skinId: string) => {
    playSound('buttonClick');
    equipSkin(skinId);
  };

  const handleEquipTheme = (themeId: string) => {
    playSound('buttonClick');
    equipTheme(themeId);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-game-bg z-50 flex flex-col"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'tween' }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-game-panel/80">
        <button
          className="text-2xl text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-white">상점</h1>
        <div className="flex gap-2">
          <div className="bg-black/30 rounded-full px-3 py-1 flex items-center gap-1">
            <span>🪙</span>
            <span className="text-yellow-400 font-bold text-sm">{currency.coins.toLocaleString()}</span>
          </div>
          <div className="bg-black/30 rounded-full px-3 py-1 flex items-center gap-1">
            <span>💎</span>
            <span className="text-purple-400 font-bold text-sm">{currency.gems.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex bg-game-panel/50">
        {SHOP_TABS.map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === tab
                ? 'text-game-accent border-b-2 border-game-accent'
                : 'text-gray-400'
            }`}
            onClick={() => {
              playSound('buttonClick');
              setActiveTab(tab);
            }}
          >
            {tab === 'skins' && '🎨 스킨'}
            {tab === 'themes' && '🖼️ 테마'}
            {tab === 'gems' && '💎 젬'}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* 스킨 탭 */}
          {activeTab === 'skins' && (
            <motion.div
              key="skins"
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {BLOCK_SKINS.map((skin) => {
                const isOwned = ownedSkins.some((s) => s.id === skin.id);
                const isEquipped = equippedSkinId === skin.id;
                const canAfford =
                  skin.currency === 'coins'
                    ? currency.coins >= skin.price
                    : skin.currency === 'gems'
                    ? currency.gems >= skin.price
                    : true;

                return (
                  <div
                    key={skin.id}
                    className={`bg-game-panel/80 rounded-xl p-4 ${
                      isEquipped ? 'ring-2 ring-game-accent' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-white">{skin.name}</p>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: RARITY_COLORS[skin.rarity] }}
                      >
                        {RARITY_NAMES[skin.rarity]}
                      </span>
                    </div>

                    {/* 미리보기 - 스킨별 고유 스타일 (더 크고 명확하게) */}
                    <div className="bg-black/40 rounded-lg p-3 mb-3">
                      <div className="flex gap-1.5 justify-center">
                        {(() => {
                          const style = SKIN_STYLES[skin.id] || SKIN_STYLES.classic;
                          return style.colors.slice(0, 4).map((color, i) => (
                            <motion.div
                              key={i}
                              className="relative overflow-hidden"
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: style.borderRadius,
                                background: style.innerEffect === 'glow'
                                  ? `radial-gradient(circle at 30% 30%, ${color}dd, ${color}88 70%, ${color}44)`
                                  : style.innerEffect === 'glass'
                                    ? `linear-gradient(145deg, ${color}ee, ${color}aa 50%, ${color}cc)`
                                    : style.innerEffect === 'gradient'
                                      ? `linear-gradient(135deg, ${color}, ${color}88, ${color}cc)`
                                      : style.innerEffect === 'metallic'
                                        ? `linear-gradient(145deg, ${color}ff, ${color}66 30%, ${color}cc 70%, ${color}ff)`
                                        : style.innerEffect === 'flat'
                                          ? color
                                          : `linear-gradient(145deg, ${color}, ${color}dd)`,
                                border: style.borderWidth > 0
                                  ? `${style.borderWidth}px ${style.borderStyle} ${color}aa`
                                  : 'none',
                                boxShadow: style.glowIntensity > 0
                                  ? `0 0 ${Math.round(style.glowIntensity * 15)}px ${color}, 0 0 ${Math.round(style.glowIntensity * 5)}px ${color}`
                                  : '0 2px 4px rgba(0,0,0,0.3)',
                              }}
                              animate={
                                style.animation === 'pulse' ? { boxShadow: [`0 0 8px ${color}`, `0 0 20px ${color}`, `0 0 8px ${color}`] }
                                : style.animation === 'fire' ? { y: [0, -3, 0, -1, 0] }
                                : style.animation === 'ice' ? { opacity: [1, 0.7, 1] }
                                : style.animation === 'electric' ? { x: [-2, 2, -1, 1, 0] }
                                : undefined
                              }
                              transition={
                                style.animation === 'pulse' ? { duration: 1.2, repeat: Infinity }
                                : style.animation === 'fire' ? { duration: 0.4, repeat: Infinity }
                                : style.animation === 'ice' ? { duration: 2.5, repeat: Infinity }
                                : style.animation === 'electric' ? { duration: 0.15, repeat: Infinity }
                                : undefined
                              }
                            >
                              {/* 내부 광택 */}
                              {(style.innerEffect === 'glossy' || style.innerEffect === 'glass') && (
                                <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/10 to-transparent rounded-inherit" />
                              )}
                              {style.innerEffect === 'metallic' && (
                                <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-black/30" />
                              )}
                              {/* 텍스처 */}
                              {style.texture === 'lines' && (
                                <div className="absolute inset-0 opacity-30" style={{
                                  background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)'
                                }} />
                              )}
                              {style.texture === 'dots' && (
                                <div className="absolute inset-0 opacity-40" style={{
                                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                                  backgroundSize: '6px 6px'
                                }} />
                              )}
                              {style.texture === 'cracks' && (
                                <div className="absolute inset-0 opacity-25" style={{
                                  background: 'linear-gradient(30deg, transparent 40%, rgba(255,255,255,0.3) 41%, transparent 42%), linear-gradient(-30deg, transparent 60%, rgba(255,255,255,0.2) 61%, transparent 62%)'
                                }} />
                              )}
                              {style.texture === 'circuit' && (
                                <div className="absolute inset-0 opacity-30" style={{
                                  background: 'linear-gradient(90deg, transparent 48%, rgba(255,255,255,0.4) 50%, transparent 52%), linear-gradient(0deg, transparent 48%, rgba(255,255,255,0.4) 50%, transparent 52%)',
                                  backgroundSize: '8px 8px'
                                }} />
                              )}
                              {/* 쉬머 효과 */}
                              {style.animation === 'shimmer' && (
                                <motion.div
                                  className="absolute inset-0"
                                  style={{ background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)' }}
                                  animate={{ x: ['-150%', '250%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
                                />
                              )}
                            </motion.div>
                          ));
                        })()}
                      </div>
                    </div>
                    {/* 스킨 특징 설명 */}
                    <p className="text-[10px] text-gray-400 mb-2 text-center">
                      {skin.id === 'classic' && '기본 광택 블록'}
                      {skin.id === 'neon' && '네온 글로우 + 펄스'}
                      {skin.id === 'candy' && '동그란 사탕 모양'}
                      {skin.id === 'pixel' && '8비트 레트로 스타일'}
                      {skin.id === 'galaxy' && '우주 그라데이션 + 별빛'}
                      {skin.id === 'crystal' && '투명 보석 + 균열 패턴'}
                      {skin.id === 'holographic' && '무지개빛 메탈릭'}
                      {skin.id === 'animated_fire' && '타오르는 불꽃 효과'}
                      {skin.id === 'animated_ice' && '차가운 얼음 결정'}
                      {skin.id === 'animated_electric' && '번쩍이는 전기 스파크'}
                    </p>

                    {isOwned ? (
                      <button
                        className={`w-full py-2 rounded-lg font-bold ${
                          isEquipped
                            ? 'bg-game-accent text-white'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                        onClick={() => handleEquipSkin(skin.id)}
                        disabled={isEquipped}
                      >
                        {isEquipped ? '장착됨' : '장착하기'}
                      </button>
                    ) : (
                      <button
                        className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                          canAfford || skin.currency === 'free'
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                        onClick={() => handlePurchaseSkin(skin.id)}
                        disabled={!canAfford && skin.currency !== 'free'}
                      >
                        {skin.currency === 'free' ? (
                          '🎁 무료 획득'
                        ) : (
                          <>
                            {skin.currency === 'coins' ? '🪙' : '💎'}
                            {skin.price} 구입
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* 테마 탭 */}
          {activeTab === 'themes' && (
            <motion.div
              key="themes"
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {THEMES.map((theme) => {
                const isOwned = ownedThemes.some((t) => t.id === theme.id);
                const isEquipped = equippedThemeId === theme.id;
                const canAfford =
                  theme.currency === 'coins'
                    ? currency.coins >= theme.price
                    : theme.currency === 'gems'
                    ? currency.gems >= theme.price
                    : true;

                return (
                  <div
                    key={theme.id}
                    className={`bg-game-panel/80 rounded-xl p-3 ${
                      isEquipped ? 'ring-2 ring-game-accent' : ''
                    }`}
                  >
                    <p className="font-bold text-white mb-1 text-sm">{theme.name}</p>
                    {theme.description && (
                      <p className="text-[10px] text-gray-400 mb-2">{theme.description}</p>
                    )}

                    {/* 테마 미리보기 - 더 상세한 프리뷰 */}
                    <div
                      className="h-24 rounded-lg mb-2 p-2 overflow-hidden relative"
                      style={{
                        background: theme.colors.backgroundGradient || theme.colors.background,
                        border: `1px solid ${theme.colors.panelBorder || 'rgba(255,255,255,0.1)'}`
                      }}
                    >
                      {/* 패널 */}
                      <div
                        className="w-full h-full rounded relative"
                        style={{
                          backgroundColor: theme.colors.panel,
                          border: `1px solid ${theme.colors.panelBorder || 'rgba(255,255,255,0.1)'}`
                        }}
                      >
                        {/* 액센트 바 */}
                        <div
                          className="absolute top-2 left-2 w-12 h-1.5 rounded-full"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                        {/* 텍스트 예시 */}
                        <div className="absolute top-5 left-2 flex flex-col gap-1">
                          <div
                            className="w-8 h-1 rounded"
                            style={{ backgroundColor: theme.colors.text || '#fff', opacity: 0.8 }}
                          />
                          <div
                            className="w-6 h-1 rounded"
                            style={{ backgroundColor: theme.colors.textSecondary || '#888', opacity: 0.6 }}
                          />
                        </div>
                        {/* 블록 미리보기 */}
                        <div className="absolute bottom-2 right-2 flex gap-0.5">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#ff4757' }} />
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3742fa' }} />
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#2ed573' }} />
                        </div>
                        {/* 성공/위험 컬러 인디케이터 */}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.colors.success || '#2ed573' }}
                          />
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.colors.danger || '#ff4757' }}
                          />
                        </div>
                      </div>
                    </div>

                    {isOwned ? (
                      <button
                        className={`w-full py-2 rounded-lg font-bold text-sm ${
                          isEquipped
                            ? 'bg-game-accent text-white'
                            : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        }`}
                        onClick={() => handleEquipTheme(theme.id)}
                        disabled={isEquipped}
                      >
                        {isEquipped ? '적용됨' : '적용하기'}
                      </button>
                    ) : (
                      <button
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                          canAfford || theme.currency === 'free'
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                        onClick={() => handlePurchaseTheme(theme.id)}
                        disabled={!canAfford && theme.currency !== 'free'}
                      >
                        {theme.currency === 'free' ? (
                          '🎁 무료 획득'
                        ) : (
                          <>
                            {theme.currency === 'coins' ? '🪙' : '💎'}
                            {theme.price} 구입
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* 젬 탭 */}
          {FEATURES.iap && activeTab === 'gems' && (
            <motion.div
              key="gems"
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {GEM_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-game-panel/80 rounded-xl p-4 flex items-center justify-between ${
                    pkg.highlight ? 'ring-2 ring-yellow-400' : ''
                  } ${pkg.bestValue ? 'ring-2 ring-purple-400' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">💎</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-lg">{pkg.amount} 젬</p>
                        {pkg.bonusAmount > 0 && (
                          <span className="text-green-400 text-sm">+{pkg.bonusAmount} 보너스</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{pkg.label}</p>
                    </div>
                  </div>
                  <button
                    className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl
                               font-bold text-white hover:from-purple-400 hover:to-pink-400"
                    onClick={() => {
                      // TODO: 실제 IAP 연동
                      playSound('purchaseSuccess');
                      alert(`${pkg.amount + pkg.bonusAmount} 젬 구매 (실제 결제 연동 필요)`);
                    }}
                  >
                    ${pkg.price}
                  </button>
                </div>
              ))}

              {/* 무료 젬 광고 */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🎬</span>
                  <div>
                    <p className="font-bold text-white">무료 젬</p>
                    <p className="text-sm text-green-200">광고를 보고 50 젬 받기</p>
                  </div>
                </div>
                <button
                  className="bg-white/20 px-6 py-3 rounded-xl font-bold text-white
                             hover:bg-white/30"
                  onClick={() => {
                    playSound('rewardGet');
                    alert('광고 시청 후 50 젬 지급 (광고 SDK 연동 필요)');
                  }}
                >
                  시청
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default ShopScreen;
