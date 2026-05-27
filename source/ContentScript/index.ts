import {browser} from 'webextension-polyfill-ts';

export {};

const foundUrls = new Set<string>();
const lottieUrlPattern =
  /https?:\/\/[^\s"'<>\\]+?\.(?:json|lottie)(?:\?[^\s"'<>\\]*)?/gi;

const normalizeUrl = (url: string): string | null => {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return null;
  }
};

const queueUrl = (url: string | null): void => {
  if (!url) {
    return;
  }

  if (url.includes('.json') || url.includes('.lottie')) {
    foundUrls.add(url);
  }
};

const queueTextUrls = (text: string): void => {
  Array.from(text.matchAll(lottieUrlPattern)).forEach((match) => {
    queueUrl(normalizeUrl(match[0]));
  });
};

const collectElementUrls = (): void => {
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      queueUrl(normalizeUrl(attribute.value));
      queueTextUrls(attribute.value);
    });
  });

  document.querySelectorAll('script').forEach((script) => {
    queueTextUrls(script.textContent || '');
  });
};

const collectPerformanceUrls = (): void => {
  performance.getEntriesByType('resource').forEach((entry) => {
    queueUrl(normalizeUrl(entry.name));
  });
};

const sendFoundUrls = (): void => {
  if (foundUrls.size === 0) {
    return;
  }

  browser.runtime
    .sendMessage({
      type: 'LOTTIES_FOUND',
      lotties: Array.from(foundUrls),
    })
    .catch(() => undefined);
};

const collectAndSend = (): void => {
  collectElementUrls();
  collectPerformanceUrls();
  sendFoundUrls();
};

collectAndSend();
window.setTimeout(collectAndSend, 1500);
window.setTimeout(collectAndSend, 5000);
