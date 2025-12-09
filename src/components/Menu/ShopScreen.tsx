import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/userStore';
import { useAudio } from '../../hooks/useAudio';
import { BLOCK_SKINS, THEMES, GEM_PACKAGES, RARITY_COLORS, RARITY_NAMES } from '../../constants/shopItems';

interface ShopScreenProps {
  onClose: () => void;
}

type ShopTab = 'skins' | 'themes' | 'gems';

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
        {(['skins', 'themes', 'gems'] as ShopTab[]).map((tab) => (
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

                    {/* 미리보기 (간단한 색상 표시) */}
                    <div className="flex gap-1 mb-3">
                      {['#ff4757', '#3742fa', '#2ed573', '#ffa502', '#8854d0'].map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>

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
                          canAfford
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                        onClick={() => handlePurchaseSkin(skin.id)}
                        disabled={!canAfford || skin.currency === 'free'}
                      >
                        {skin.currency === 'free' ? (
                          '무료'
                        ) : (
                          <>
                            {skin.currency === 'coins' ? '🪙' : '💎'}
                            {skin.price}
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
                    className={`bg-game-panel/80 rounded-xl p-4 ${
                      isEquipped ? 'ring-2 ring-game-accent' : ''
                    }`}
                  >
                    <p className="font-bold text-white mb-2">{theme.name}</p>

                    {/* 테마 미리보기 */}
                    <div
                      className="h-20 rounded-lg mb-3 p-2"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div
                        className="w-full h-full rounded"
                        style={{ backgroundColor: theme.colors.panel }}
                      >
                        <div
                          className="w-1/3 h-2 rounded mt-2 ml-2"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>
                    </div>

                    {isOwned ? (
                      <button
                        className={`w-full py-2 rounded-lg font-bold ${
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
                        className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-1 ${
                          canAfford
                            ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                        onClick={() => handlePurchaseTheme(theme.id)}
                        disabled={!canAfford || theme.currency === 'free'}
                      >
                        {theme.currency === 'free' ? (
                          '무료'
                        ) : (
                          <>
                            {theme.currency === 'coins' ? '🪙' : '💎'}
                            {theme.price}
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
          {activeTab === 'gems' && (
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
