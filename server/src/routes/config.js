// GET /api/config — exposes browser-safe runtime flags.
//
// Only ships non-sensitive values. Tokens and internal settings (TTLs, cache,
// kiosk URLs) are deliberately excluded. Visual toggles let the frontend
// conditionally render new v2 UI without a rebuild.

import { Router } from 'express';

export function configRoute({ config }) {
  const r = Router();

  r.get('/api/config', (_req, res) => {
    // No-cache: flipping a toggle in the add-on UI restarts the server, but
    // browsers on the wall might live for days. Let them re-read on reload.
    res.set('Cache-Control', 'no-store');
    res.json({
      displayMode: config.displayMode || 'now_showing',
      backend: config.backend || 'plex',
      player: config.player || '',
      comingSoon: {
        title: config.comingSoon?.title || 'Coming Soon',
        enabled: !!((config.comingSoon?.radarrUrl && config.comingSoon?.radarrApiKey)
          || (config.comingSoon?.sonarrUrl && config.comingSoon?.sonarrApiKey)),
        moviesCount: config.comingSoon?.moviesCount ?? 5,
        showsCount: config.comingSoon?.showsCount ?? 5,
        cycleInterval: config.comingSoon?.cycleInterval ?? 8,
        daysOffset: config.comingSoon?.daysOffset ?? 0,
        imageType: config.comingSoon?.imageType || 'poster',
      },
      visual: {
        progressBar: !!config.visual?.progressBar,
        ratingsBadges: !!config.visual?.ratingsBadges,
        genreChips: !!config.visual?.genreChips,
        infoPanelMode: config.visual?.infoPanelMode || 'on_tap',
        useBackdrops: !!config.visual?.useBackdrops,
        // #65 frame style. Presentation-only; frontend maps this to body
        // data-frame-style and starts/stops the bulb timer as needed.
        frameStyle: config.visual?.frameStyle || 'bulbs',
        bulbSizePx: config.visual?.bulbSizePx ?? 28,
        marqueeFont: config.visual?.marqueeFont || 'bebas-neue',
        backdropStyle: config.visual?.backdropStyle || 'fullscreen',
        backdropDelayMs: Number.isFinite(config.visual?.backdropDelayMs)
          ? config.visual.backdropDelayMs : 10000,
        // #28 burn-in mitigation. Frontend reads these to decide whether to
        // run the nudge timer and which night-mode trigger to wire up.
        burnInMitigation: !!config.visual?.burnInMitigation,
        nudgeIntervalMs: config.visual?.nudgeIntervalMs ?? 60000,
        nudgeAmplitudePx: config.visual?.nudgeAmplitudePx ?? 4,
        nightModeEntity: config.visual?.nightModeEntity || '',
        nightModeOpacity: config.visual?.nightModeOpacity ?? 0.4,
        // #23 theme preset + #66 accent colour. Both are presentation-only
        // so safe to expose; the frontend turns them into <body data-theme>
        // + a single CSS custom property override.
        theme: config.visual?.theme || 'classic-gold',
        accentColor: config.visual?.accentColor || '',
        marqueeBgColor: config.visual?.marqueeBgColor || '',
        cornerRadiusPx: config.visual?.cornerRadiusPx ?? 0,
      },
    });
  });

  return r;
}
