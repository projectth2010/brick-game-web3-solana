const STORAGE_KEY = 'brick-game-nft-collection';

export function loadCollectibles() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to load NFT collectibles from storage', error);
    return [];
  }
}

export async function registerCollectible(entry) {
  const collectibles = loadCollectibles();
  const record = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  collectibles.push(record);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectibles));
  } catch (error) {
    console.warn('Unable to persist NFT collectible locally', error);
  }

  return collectibles;
}
