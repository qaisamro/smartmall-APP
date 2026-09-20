export default async function run(page, ui) {
  // Wait for React to mount and settle
  await page.waitForTimeout(4000);

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource');
    const paint = performance.getEntriesByType('paint');
    const longTasks = performance.getEntriesByType('longtask') || [];

    const tbt = longTasks.reduce((acc, t) => acc + (t.duration - 50), 0);
    const tti = longTasks.length > 0
      ? Math.max(...longTasks.map(t => t.startTime + t.duration)) + 5000
      : (nav.domContentLoadedEventEnd || null);

    const jsSize = res.filter(r => r.name.includes('.js')).reduce((a, b) => a + b.transferSize, 0);
    const cssSize = res.filter(r => r.name.includes('.css')).reduce((a, b) => a + b.transferSize, 0);
    const imgSize = res.filter(r => r.initiatorType === 'img').reduce((a, b) => a + b.transferSize, 0);

    const clsEntries = performance.getEntriesByType('layout-shift') || [];
    let cls = 0;
    for (const entry of clsEntries) {
      if (!entry.hadRecentInput) cls += entry.value;
    }

    return {
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
      lcp: performance.getEntriesByType('largest-contentful-paint').slice(-1)[0]?.startTime || null,
      domContentLoaded: nav.domContentLoadedEventEnd || null,
      load: nav.loadEventEnd || null,
      tti,
      tbt,
      cls,
      requests: res.length,
      totalTransfer: res.reduce((a, b) => a + b.transferSize, 0),
      jsSize,
      cssSize,
      imgSize,
      navigateSize: nav.transferSize || 0,
      legacySizes: res
        .filter(r => r.name.includes('.js'))
        .sort((a, b) => b.transferSize - a.transferSize)
        .slice(0, 8)
        .map(r => ({ name: r.name.split('/').pop(), size: r.transferSize })),
      splashVisible: !!document.getElementById('splash'),
      rootChildren: document.getElementById('root')?.children.length || 0,
    };
  });

  return data;
}