# Plex Now Showing

A full-screen cinema marquee display for Home Assistant that shows what's currently playing on Plex. Designed for wall-mounted tablets using Fully Kiosk Browser.

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
- Filters to a specific Plex user or specific player so other users' playback doesn't show up
- Idle state when nothing is playing
- Optional automation to switch a Fully Kiosk Browser tablet between your dashboard and the Now Showing page

---

## What You Need

- **Home Assistant** with the [Plex integration](https://www.home-assistant.io/integrations/plex/) configured
- A **Plex Media Server** on your local network
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

Open `now_showing.html` and update these values near the top of the `<script>` section:

```javascript
const HA_URL = 'http://YOUR_HA_IP:8123';           // Your Home Assistant URL
const HA_TOKEN = 'YOUR_LONG_LIVED_ACCESS_TOKEN';    // HA long-lived access token
const PLEX_USERNAME = 'your_plex_username';          // Your Plex username (filters to only your playback)
const PLEX_PLAYER = '';                              // Optional: lock to a specific player (e.g., 'media_player.plex_plex_for_lg_tv')
const PLEX_URL = '';                                 // Optional: Plex server URL for media file info
const PLEX_TOKEN = '';                               // Optional: Plex token for media file info
```

`PLEX_PLAYER` is optional. When set to a specific `media_player` entity ID, the page will only show media from that player. When left empty, it shows media from any active player for your Plex user. You can find your player entity IDs in **Developer Tools → States** by searching for `media_player.plex_`.

`PLEX_URL` and `PLEX_TOKEN` are optional. When configured, the info overlay will show detailed media file information (resolution, codec, bitrate, audio format, file size). Without them, the info overlay still works but only shows what Home Assistant provides (title, synopsis, duration, content rating).

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

- Polls Home Assistant's API every 5 seconds for active Plex `media_player` entities
- Filters to only your user's playback sessions
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
| Poll interval | `POLL_INTERVAL` in script | 5000ms (5 seconds) |
| Plex username filter | `PLEX_USERNAME` in script | Your Plex username |
| Specific player only | `PLEX_PLAYER` in script | Empty (any player for your user) |
| Landscape mode | `LANDSCAPE_MODE` in script | `false` (poster fills screen, may crop) |
| Plex server URL | `PLEX_URL` in script | Empty (media file info disabled) |
| Plex token | `PLEX_TOKEN` in script | Empty |
| Marquee text size | `.marquee-text h1` font-size in CSS | `clamp(3.5rem, 10vw, 8rem)` |
| Bulb size | `.bulb` width/height in CSS | 28px |
| Bulb spacing | `spacing` in `createOuterBulbs()` | 42px |
| Chase animation speed | `setInterval(animateChase, ...)` | 500ms |

### Landscape Mode

If you're using a landscape/widescreen display instead of a portrait tablet, set `LANDSCAPE_MODE = true`. This fits the entire poster on screen with letterboxing (black bars) instead of cropping to fill.

---

## Troubleshooting

- **Blank poster**: Check that your HA token is valid and the Plex `entity_picture` URLs are accessible from the device
- **Only seeing other users' playback**: Update `PLEX_USERNAME` in `now_showing.html` to match your Plex username
- **Automation not triggering**: Verify your Plex session count sensor exists and changes value when playback starts/stops

---

## Related

Looking for a dashboard card showing recently added Plex media? Check out [plex-recently-added-card](https://github.com/rusty4444/plex-recently-added-card).

Using Kodi instead of Plex? Check out [kodi-now-showing](https://github.com/rusty4444/kodi-now-showing) and [kodi-recently-added-card](https://github.com/rusty4444/kodi-recently-added-card).

Using Jellyfin? Check out [jellyfin-now-showing](https://github.com/rusty4444/jellyfin-now-showing) and [jellyfin-recently-added-card](https://github.com/rusty4444/jellyfin-recently-added-card).

Using Emby? Check out [emby-now-showing](https://github.com/rusty4444/emby-now-showing) and [emby-recently-added-card](https://github.com/rusty4444/emby-recently-added-card).

---

## Credits

Built by Sam Russell — AI used in development.
