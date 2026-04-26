# Plex Now Showing

<p align="center">
  <a href="https://buymeacoffee.com/rusty4" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
  </a>
</p>



A full-screen cinema marquee display for Home Assistant that shows what's currently playing on Plex, Jellyfin, Emby, or Kodi. Designed for wall-mounted tablets using Fully Kiosk Browser.

Features animated chase bulb lights, a red curtain banner, poster art with title overlays, and automatic switching between your dashboard and the Now Showing page.

![Platform](https://img.shields.io/badge/Platform-Home_Assistant-blue)

<p align="center">
  <img src="screenshots/now-showing.jpg" alt="Now Showing Marquee" width="300">
  &nbsp;&nbsp;
  <img src="screenshots/info-overlay.jpg" alt="Tap for Info Overlay" width="300">
</p>

<p align="center">
  <img src="screenshots/landscape-mode.jpg" alt="Landscape Mode with Blurred Background" width="620">
</p>

## Features

- Cinema-style marquee with animated chase bulb lights around the border
- Red curtain banner with "NOW SHOWING" text
- Full-bleed poster art from the currently playing media
- Title, episode info (for TV), and playback state overlays
- **Tap for info** — tap the poster to see synopsis, content rating, duration, and media file details (resolution, codec, audio, bitrate, file size)
- **Landscape mode** — optional flag to fit the entire poster on widescreen displays
- Selects a Plex, Jellyfin, Emby, or Kodi backend and can pin to a specific player
- Plex installs can still filter to a specific Plex user
- Idle state when nothing is playing
- Optional automation to switch a Fully Kiosk Browser tablet between your dashboard and the Now Showing page

---

## What You Need

- **Home Assistant** with the Plex, Jellyfin, Emby, or Kodi integration configured
- A **Plex, Jellyfin, Emby, or Kodi** server/player on your local network
- **Fully Kiosk Browser** (optional) — for automatic switching between your dashboard and the Now Showing page

## Files

| File | Description |
|------|-------------|
| `www/now_showing.html` | The full-screen marquee page |
| `automations/plex_now_showing_display.yaml` | Automation to auto-switch a tablet when playback starts/stops |

---

## Setup

**Step 1 — Copy the file**

Place `www/now_showing.html` into your Home Assistant `www` directory:

```
<config>/www/now_showing.html
```

You can do this via the **File Editor** add-on, **Samba**, **SSH**, or the **VS Code** add-on.

**Step 2 — Configure your credentials**

Tokens are never hard-coded in `now_showing.html` anymore. Instead, the page reads them at runtime. Pick whichever option suits you:

**Option A — runtime config file (recommended for a single tablet)**

1. Copy `www/now_showing.config.example.js` to `www/now_showing.config.js`
2. Edit the new file with your values. `now_showing.config.js` is git-ignored so tokens stay local.

```javascript
window.NOW_SHOWING_CONFIG = {
  haUrl:        'http://YOUR_HA_IP:8123',
  haToken:      'YOUR_LONG_LIVED_ACCESS_TOKEN',
  backend:      'plex', // plex | jellyfin | emby | kodi
  player:       '',     // optional, e.g. 'media_player.kodi'
  plexUsername: 'your_plex_username',
  plexUrl:      '',    // optional, enables detailed media-file info
  plexToken:    '',    // optional
  landscape:    false, // true for widescreen displays
  poll:         5000,
};
```

**Option B — URL hash fragment (recommended for multi-tablet setups)**

Open the page with the tokens after the `#`, so they stay out of referrer headers and server logs:

```
http://YOUR_HA_IP:8123/local/now_showing.html#haToken=...&backend=jellyfin&player=media_player.jellyfin_living_room
```

**Option C — localStorage (set once per device)**

Open DevTools on the tablet and run:

```javascript
localStorage.setItem('pns.haToken', 'YOUR_LONG_LIVED_ACCESS_TOKEN');
localStorage.setItem('pns.backend', 'plex');
localStorage.setItem('pns.player', '');
localStorage.setItem('pns.plexUsername', 'your_plex_username');
```

The in-page setup form can save these values for each tablet.

`backend` defaults to `plex`. `player` is optional. When set to a specific `media_player` entity ID, the page will only show media from that player. When left empty, it scans active players for the selected backend. You can find your player entity IDs in **Developer Tools -> States** by searching for `media_player.plex_`, `media_player.jellyfin`, `media_player.emby`, or `media_player.kodi`.

`plexUrl` and `plexToken` are optional. When configured, the info overlay will show detailed media file information (resolution, codec, bitrate, audio format, file size). Without them, the info overlay still works but only shows what Home Assistant provides (title, synopsis, duration, content rating).

To create a long-lived access token:
1. Go to your HA profile (click your name in the sidebar)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token", give it a name, and copy the token

**Step 3 — Open it**

Navigate to `http://YOUR_HA_IP:8123/local/now_showing.html` in a browser to test it. If Plex is playing something, you should see the poster appear.

**Step 4 (Optional) — Set up the automation**

If you want a Fully Kiosk Browser tablet to automatically switch to the Now Showing page when playback starts:

1. Copy the contents of `automations/plex_now_showing_display.yaml` into your `automations.yaml` file, or recreate it through the HA UI
2. Update the following values in the automation:

| What to change | Where in the file | How to find yours |
|---|---|---|
| **Plex session sensor** | `entity_id: sensor.tnas` (appears 3 times — trigger + 2 conditions) | Go to **Developer Tools → States**, search for your Plex server name. Look for a `sensor.*` entity that shows the number of active sessions (e.g., `sensor.plex_myserver`, `sensor.tnas`). Its state will be a number like `0` or `1`. |
| **Fully Kiosk device ID** | `device_id: YOUR_FULLY_KIOSK_DEVICE_ID` (appears 2 times) | Go to **Settings → Devices**, find your Fully Kiosk tablet, and copy the device ID from the URL (the long string after `/device/`). |
| **Now Showing URL** | `url:` in the first action | Change to `http://YOUR_HA_IP:8123/local/now_showing.html` |
| **Dashboard URL** | `url:` in the second action | Change to the URL of the dashboard you want to return to after playback stops (e.g., `http://YOUR_HA_IP:8123/lovelace/0`). |

---

## How It Works

- Polls Home Assistant's API every 5 seconds for active `media_player` entities matching the selected backend
- Filters Plex sessions to only your user's playback when `plexUsername` is set
- Displays the current media's poster art as a full-bleed background
- Shows title, episode info (for TV), and playback state
- When nothing is playing, shows an idle "Waiting for playback" state
- The automation triggers when the Plex session count sensor changes — it waits 5 seconds then loads the page, or waits 10 seconds after playback stops to return to your dashboard

---

## Tap for Info

Tap anywhere on the poster while media is playing to show an info panel. It slides up from the bottom and shows:

- Title and episode info
- Media type (Movie / TV Series), content rating, and duration
- **Synopsis** (pulled from the Plex integration's `media_summary` attribute)
- **Media file details** (requires `PLEX_URL` and `PLEX_TOKEN` to be configured):
  - Resolution (e.g., 1920×1080)
  - Video codec, profile, and bit depth (e.g., HEVC Main 10bit)
  - HDR / Dolby Vision (if applicable)
  - Audio format (e.g., English EAC3 5.1)
  - Bitrate (e.g., 4.2 Mbps)
  - Container and file size (e.g., MKV, 2.3 GB)
- Player name

The panel auto-dismisses after 8 seconds, or tap again to close it.

---

## Customization

| Setting | Where | Default |
|---------|-------|---------|
| Poll interval | `poll` in config | 5000ms (5 seconds) |
| Backend | `backend` in config | `plex` |
| Specific player only | `player` in config | Empty (auto-detect for backend) |
| Plex username filter | `plexUsername` in config | Your Plex username |
| Landscape mode | `landscape` in config | `false` (poster fills screen, may crop) |
| Plex server URL | `plexUrl` in config | Empty (media file info disabled) |
| Plex token | `plexToken` in config | Empty |
| Marquee text size | `.marquee-text h1` font-size in CSS | `clamp(3.5rem, 10vw, 8rem)` |
| Bulb size | `.bulb` width/height in CSS | 28px |
| Bulb spacing | `spacing` in `createOuterBulbs()` | 42px |
| Chase animation speed | `setInterval(animateChase, ...)` | 500ms |

### Landscape Mode

If you're using a landscape/widescreen display instead of a portrait tablet, set `LANDSCAPE_MODE = true`. This fits the entire poster on screen with letterboxing (black bars) instead of cropping to fill.

---

## Troubleshooting

- **Blank poster**: Check that your HA token is valid and the Plex `entity_picture` URLs are accessible from the device
- **Only seeing other users' playback**: Set `plexUsername` in your config to match your Plex username
- **Automation not triggering**: Verify your Plex session count sensor exists and changes value when playback starts/stops

---

## Related

Looking for a dashboard card showing recently added media? Check out [recently-added-media-card](https://github.com/rusty4444/recently-added-media-card) — a unified Lovelace card that supports Plex, Kodi, Jellyfin and Emby.

Want to show upcoming movies and TV episodes alongside your recently added media? Check out [coming-soon-card](https://github.com/rusty4444/coming-soon-card) — a companion card powered by Radarr, Sonarr and Trakt.

Using Kodi, Jellyfin, or Emby? Set `backend` to `kodi`, `jellyfin`, or `emby`.

---

## Credits

Built by Sam Russell — AI used in development.
