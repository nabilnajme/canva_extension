import React, {useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import {DotLottiePlayer} from '@dotlottie/react-player';
import {browser, Storage, Tabs} from 'webextension-polyfill-ts';

import './styles.scss';

interface StoredLottie {
  id?: string;
  bmVersion?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  numFrames?: number;
  numLayers?: number;
  lottieUrl?: string;
  url?: string;
  wasDotLottie?: boolean;
}

const getLottieUrl = (lottie: StoredLottie | string): string => {
  if (typeof lottie === 'string') {
    return lottie;
  }

  return lottie.lottieUrl || lottie.url || '';
};

const getFilename = (url: string): string => {
  return url.split('/').pop()?.split('?')[0] || 'animation.json';
};

const Popup: React.FC = () => {
  const [lotties, setLotties] = useState<Array<StoredLottie | string>>([]);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const loadLotties = useCallback(async (tabId?: number): Promise<void> => {
    const data = await browser.storage.local.get('lotties');
    const storedLotties = Array.isArray(data.lotties) ? data.lotties : [];

    setLotties(
      typeof tabId === 'number'
        ? storedLotties.filter((lottie) => lottie.tabId === tabId)
        : storedLotties
    );
  }, []);

  const getActiveTab = async (): Promise<Tabs.Tab | null> => {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    return tabs[0] || null;
  };

  const scanActiveTab = useCallback(async (): Promise<void> => {
    try {
      setError('');
      setIsScanning(true);

      const tab = await getActiveTab();

      if (!tab?.id || !tab.url?.includes('canva.com')) {
        setLotties([]);
        setError('Open a Canva tab, then click the extension again.');

        return;
      }

      const data = await browser.storage.local.get('lotties');
      const storedLotties = Array.isArray(data.lotties) ? data.lotties : [];
      const otherTabLotties = storedLotties.filter(
        (lottie) => lottie.tabId !== tab.id
      );

      await browser.storage.local.set({lotties: otherTabLotties});
      setLotties([]);

      await browser.tabs.executeScript(tab.id, {
        file: 'js/contentScript.bundle.js',
      });

      window.setTimeout(() => {
        loadLotties(tab.id);
        setIsScanning(false);
      }, 1800);
    } catch {
      setError('Scan failed. Refresh Canva and try again.');
      setIsScanning(false);
    }
  }, [loadLotties]);

  const downloadLottie = async (url: string): Promise<void> => {
    try {
      setError('');

      const response = await fetch(url, {credentials: 'include'});

      if (!response.ok) {
        throw new Error(`Failed: ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = objectUrl;
      link.download = getFilename(url);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError('Download failed. This URL may need authentication.');
    }
  };

  useEffect(() => {
    const onStorageChanged = (
      changes: Record<string, Storage.StorageChange>
    ): void => {
      if (changes.lotties) {
        getActiveTab().then((tab) => loadLotties(tab?.id));
      }
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    scanActiveTab();

    return (): void => {
      browser.storage.onChanged.removeListener(onStorageChanged);
    };
  }, [loadLotties, scanActiveTab]);

  return (
    <section id="popup">
      <h2>Discovered Lotties</h2>
      <button
        className="scan-button"
        type="button"
        onClick={scanActiveTab}
        disabled={isScanning}
      >
        {isScanning ? 'Scanning...' : 'Scan Canva'}
      </button>
      {error && <p className="error">{error}</p>}
      {lotties.length === 0 ? (
        <p>No animations found</p>
      ) : (
        <ul>
          {lotties.map((lottie, i) => {
            const url = getLottieUrl(lottie);
            const details = typeof lottie === 'string' ? {} : lottie;
            const key = details.id || url || i;

            return (
              <li key={key}>
                <div className="preview">
                  <DotLottiePlayer
                    src={url}
                    background="transparent"
                    className="player"
                    loop
                    autoplay
                  />
                </div>
                <div className="lottie-info">
                  <a
                    className="lottie-url"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {url}
                  </a>
                  <div className="details">
                    {details.width && details.height && (
                      <span>
                        {details.width}x{details.height}
                      </span>
                    )}
                    {details.frameRate && (
                      <span>{Number(details.frameRate).toFixed(2)} fps</span>
                    )}
                    {details.numFrames && (
                      <span>{Math.ceil(details.numFrames)} frames</span>
                    )}
                    {details.numLayers && (
                      <span>{Math.ceil(details.numLayers)} layers</span>
                    )}
                    {details.bmVersion && <span>v{details.bmVersion}</span>}
                    {typeof details.wasDotLottie === 'boolean' && (
                      <span>{details.wasDotLottie ? '.lottie' : 'json'}</span>
                    )}
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={(): Promise<void> => downloadLottie(url)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={(): Promise<void> =>
                        navigator.clipboard.writeText(url)
                      }
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const popupRoot = document.getElementById('popup-root');

if (popupRoot) {
  createRoot(popupRoot).render(<Popup />);
}
