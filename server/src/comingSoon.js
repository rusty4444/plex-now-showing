const DAY_MS = 86400000;
const DEFAULT_LOOKAHEAD_DAYS = 90;

export function hasComingSoonSource(config = {}) {
  const c = config.comingSoon || {};
  return !!((c.radarrUrl && c.radarrApiKey) || (c.sonarrUrl && c.sonarrApiKey));
}

export async function fetchComingSoonItems({
  config,
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  const c = config?.comingSoon || {};
  const offsetDays = numberOr(c.daysOffset, 0);
  const lookaheadDays = numberOr(c.lookaheadDays, DEFAULT_LOOKAHEAD_DAYS);
  const start = startOfDay(new Date(now.getTime() - offsetDays * DAY_MS));
  const end = new Date(now.getTime() + lookaheadDays * DAY_MS);

  const [movies, shows] = await Promise.all([
    fetchRadarrItems({ config: c, fetchImpl, start, end, now }),
    fetchSonarrItems({ config: c, fetchImpl, start, end, now }),
  ]);

  return interleave(
    movies.slice(0, numberOr(c.moviesCount, 5)),
    shows.slice(0, numberOr(c.showsCount, 5)),
  );
}

async function fetchRadarrItems({ config, fetchImpl, start, end, now }) {
  if (!config.radarrUrl || !config.radarrApiKey) return [];
  const base = trimSlash(config.radarrUrl);
  const url = `${base}/api/v3/calendar?start=${dateOnly(start)}&end=${dateOnly(end)}&unmonitored=false`;
  const resp = await fetchImpl(url, { headers: { 'X-Api-Key': config.radarrApiKey } });
  if (!resp.ok) {
    const err = new Error(`Radarr calendar returned ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  return (Array.isArray(data) ? data : [])
    .map(item => ({ item, releaseDate: pickRadarrReleaseDate(item, start, end) }))
    .filter(({ item, releaseDate }) => !item.hasFile && releaseDate)
    .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))
    .map(({ item, releaseDate }) => {
      const id = item.id || item.movieId || '';
      const genres = Array.isArray(item.genres) ? item.genres.filter(Boolean).join(' / ') : '';
      return {
        type: 'movie',
        typeLabel: 'Movie',
        title: item.title || 'Untitled Movie',
        subtitle: [item.year, genres].filter(Boolean).join(' / '),
        releaseDate,
        countdown: formatCountdown(releaseDate, now),
        releaseLabel: formatReleaseDate(releaseDate),
        overview: item.overview || '',
        posterUrl: imageUrl(item.images, 'poster'),
        fanartUrl: imageUrl(item.images, 'fanart'),
        localPosterUrl: id ? `${base}/api/v3/MediaCover/${id}/poster.jpg?apikey=${encodeURIComponent(config.radarrApiKey)}` : '',
        localFanartUrl: id ? `${base}/api/v3/MediaCover/${id}/fanart.jpg?apikey=${encodeURIComponent(config.radarrApiKey)}` : '',
      };
    });
}

// Return the earliest of digitalRelease/physicalRelease that falls inside the
// [start, end] look-ahead window, or null if neither qualifies. inCinemas is
// deliberately not considered — theatrical dates aren't a "coming home soon"
// signal for a Plex/Radarr workflow.
function pickRadarrReleaseDate(item, start, end) {
  const candidates = [item.digitalRelease, item.physicalRelease]
    .filter(Boolean)
    .map(d => ({ raw: d, ts: new Date(d).getTime() }))
    .filter(({ ts }) => Number.isFinite(ts) && ts >= start.getTime() && ts <= end.getTime());
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.ts - b.ts);
  return candidates[0].raw;
}

async function fetchSonarrItems({ config, fetchImpl, start, end, now }) {
  if (!config.sonarrUrl || !config.sonarrApiKey) return [];
  const base = trimSlash(config.sonarrUrl);
  const url = `${base}/api/v3/calendar?start=${dateOnly(start)}&end=${dateOnly(end)}&unmonitored=false&includeSeries=true`;
  const resp = await fetchImpl(url, { headers: { 'X-Api-Key': config.sonarrApiKey } });
  if (!resp.ok) {
    const err = new Error(`Sonarr calendar returned ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  const data = await resp.json();
  const seenSeries = new Set();
  return (Array.isArray(data) ? data : [])
    .filter(item => {
      if (item.hasFile || !item.airDateUtc) return false;
      const ts = new Date(item.airDateUtc).getTime();
      return Number.isFinite(ts) && ts >= start.getTime() && ts <= end.getTime();
    })
    .sort((a, b) => new Date(a.airDateUtc) - new Date(b.airDateUtc))
    .filter(item => {
      const id = item.seriesId || item.series?.id || item.series?.title || item.title;
      if (seenSeries.has(id)) return false;
      seenSeries.add(id);
      return true;
    })
    .map(item => {
      const series = item.series || {};
      const id = series.id || item.seriesId || '';
      const season = String(item.seasonNumber || 0).padStart(2, '0');
      const episode = String(item.episodeNumber || 0).padStart(2, '0');
      const episodeLabel = `S${season}E${episode}${item.title ? ` / ${item.title}` : ''}`;
      const releaseDate = item.airDate || (item.airDateUtc ? item.airDateUtc.split('T')[0] : '');
      return {
        type: 'tv',
        typeLabel: 'TV',
        title: series.title || item.title || 'Untitled Series',
        subtitle: episodeLabel,
        releaseDate,
        countdown: formatCountdown(releaseDate, now),
        releaseLabel: formatReleaseDate(releaseDate),
        overview: item.overview || '',
        posterUrl: imageUrl(series.images, 'poster'),
        fanartUrl: imageUrl(series.images, 'fanart'),
        localPosterUrl: id ? `${base}/api/v3/MediaCover/${id}/poster.jpg?apikey=${encodeURIComponent(config.sonarrApiKey)}` : '',
        localFanartUrl: id ? `${base}/api/v3/MediaCover/${id}/fanart.jpg?apikey=${encodeURIComponent(config.sonarrApiKey)}` : '',
        seriesTitle: series.title || '',
        seasonNumber: item.seasonNumber || null,
        episodeNumber: item.episodeNumber || null,
      };
    });
}

function interleave(movies, shows) {
  const items = [];
  const max = Math.max(movies.length, shows.length);
  for (let i = 0; i < max; i += 1) {
    if (i < movies.length) items.push(movies[i]);
    if (i < shows.length) items.push(shows[i]);
  }
  return items;
}

function imageUrl(images, coverType) {
  if (!Array.isArray(images)) return '';
  const image = images.find(i => i && i.coverType === coverType);
  return image?.remoteUrl || '';
}

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateOnly(value) {
  return value.toISOString().split('T')[0];
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatReleaseDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const day = d.getUTCDate();
  return `${ordinal(day)} of ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatCountdown(dateStr, now = new Date()) {
  if (!dateStr) return '';
  const target = startOfDay(new Date(`${String(dateStr).substring(0, 10)}T00:00:00`));
  if (Number.isNaN(target.getTime())) return '';
  const today = startOfDay(now);
  const diff = Math.round((target - today) / DAY_MS);
  if (diff < 0) return 'Available';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return `In ${diff} days`;
  if (diff < 14) return 'In 1 week';
  if (diff < 30) return `In ${Math.round(diff / 7)} weeks`;
  if (diff < 60) return 'In 1 month';
  if (diff < 365) return `In ${Math.round(diff / 30)} months`;
  const years = Math.round(diff / 365);
  return `In ${years} year${years === 1 ? '' : 's'}`;
}

function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}
