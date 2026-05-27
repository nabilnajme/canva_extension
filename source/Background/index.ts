import {browser} from 'webextension-polyfill-ts';
import {debounce} from 'ts-debounce';

interface LottieAnimation {
  v?: string;
  ip?: number;
  op?: number;
  layers?: unknown[];
  w?: number;
  h?: number;
  fr?: number;
  meta?: unknown;
}

interface StoredLottie {
  id: string;
  bmVersion?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  numFrames?: number;
  numLayers?: number;
  meta?: unknown;
  lottieUrl: string;
  tabId: number;
  tabUrl?: string;
  wasDotLottie: boolean;
}

const MAX_NESTED_LOTTIES = 20;

const hashUrl = (url: string): string => {
  return Array.from(url)
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 2147483647, 7)
    .toString(36);
};

const isLottieLike = (
  json: Record<string, unknown>
): json is Required<LottieAnimation> => {
  return ['v', 'ip', 'op', 'layers', 'w', 'h', 'fr'].every(
    (key) => key in json
  );
};

const findLottieAnimations = (
  value: unknown,
  found: Required<LottieAnimation>[] = []
): Required<LottieAnimation>[] => {
  if (found.length >= MAX_NESTED_LOTTIES || !value) {
    return found;
  }

  if (Array.isArray(value)) {
    value.some(
      (item) => findLottieAnimations(item, found).length >= MAX_NESTED_LOTTIES
    );

    return found;
  }

  if (typeof value !== 'object') {
    return found;
  }

  const objectValue = value as Record<string, unknown>;

  if (isLottieLike(objectValue)) {
    found.push(objectValue);

    return found;
  }

  Object.values(objectValue).some(
    (item) => findLottieAnimations(item, found).length >= MAX_NESTED_LOTTIES
  );

  return found;
};

const toStoredLottie = (
  animation: Required<LottieAnimation>,
  url: string,
  id: string,
  tabId: number,
  tabUrl?: string
): StoredLottie => {
  return {
    id,
    bmVersion: animation.v,
    width: animation.w,
    height: animation.h,
    frameRate: animation.fr,
    numFrames: animation.op - animation.ip,
    numLayers: animation.layers.length,
    meta: 'meta' in animation ? animation.meta : null,
    lottieUrl: url,
    tabId,
    tabUrl,
    wasDotLottie: url.includes('.lottie'),
  };
};

const getStoredLotties = async (): Promise<StoredLottie[]> => {
  const data = await browser.storage.local.get('lotties');

  return Array.isArray(data.lotties) ? data.lotties : [];
};

const saveLottie = async (lottie: StoredLottie): Promise<void> => {
  const lotties = await getStoredLotties();
  const existingIndex = lotties.findIndex((item) => item.id === lottie.id);

  if (existingIndex >= 0) {
    lotties[existingIndex] = {...lotties[existingIndex], ...lottie};
  } else {
    lotties.push(lottie);
  }

  await browser.storage.local.set({lotties});
};

const validateAndSaveLottieUrl = async (
  url: string,
  tabId: number,
  tabUrl?: string
): Promise<void> => {
  try {
    const response = await fetch(url, {credentials: 'include'});

    if (!response.ok) {
      return;
    }

    const json = await response.json();
    const animations = findLottieAnimations(json);

    await Promise.all(
      animations.map((animation, index) =>
        saveLottie(
          toStoredLottie(
            animation,
            url,
            `${tabId}-${hashUrl(url)}-${index}`,
            tabId,
            tabUrl
          )
        )
      )
    );
  } catch {
    // Ignore non-Lottie JSON and protected resources.
  }
};

const updateBadge = debounce(async (tabId: number): Promise<void> => {
  const lotties = await getStoredLotties();
  const tabLotties = lotties.filter((item) => item.tabId === tabId);

  await browser.browserAction.setBadgeText({
    tabId,
    text: tabLotties.length ? tabLotties.length.toString() : '',
  });
}, 200);

browser.browserAction.setBadgeBackgroundColor({
  color: 'rgb(15, 204, 206)',
});

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type !== 'LOTTIES_FOUND') {
    return;
  }

  const tabId = sender.tab?.id;

  if (typeof tabId !== 'number' || !Array.isArray(msg.lotties)) {
    return;
  }

  await browser.storage.local.set({
    lotties: (
      await getStoredLotties()
    ).filter((lottie) => lottie.tabId !== tabId),
  });

  await Promise.all(
    msg.lotties.map((url: string) =>
      validateAndSaveLottieUrl(url, tabId, sender.tab?.url)
    )
  );

  await updateBadge(tabId);
});

console.log('canva-animation-extractor is ready!');
