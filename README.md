# Plex Now Showing — Home Assistant Package

A cinema-style "Now Showing" marquee display and a Plex Recently Added dashboard card for Home Assistant.

![Overview](https://img.shields.io/badge/Platform-Home_Assistant-blue)

## Screenshots

<p align="center">
  <img src="screenshots/now-showing.jpg" alt="Now Showing Marquee" width="360">
  &nbsp;&nbsp;&nbsp;
  <img src="screenshots/recently-added.jpg" alt="Recently Added Card" width="480">
</p>

---

## What's Included

| File | Description |
|------|-------------|
| `www/now_showing.html` | Full-screen cinema marquee page — shows a movie-theater-style poster display when Plex is actively playing. Features animated chase bulb lights, a red curtain marquee banner, and poster art with title overlays. |
| `www/plex-recently-added-card.js` | Custom Lovelace card showing the 5 most recently added movies and 5 most recently added TV shows from Plex, with interleaved cycling, poster art, blurred background, synopsis, and ratings. |
| `automations/plex_now_showing_display.yaml` | Automation that switches a Fully Kiosk Browser tablet to the Now Showing page when Plex starts playing, and back to your dashboard when playback stops. |

---

## Prerequisites

- **Home Assistant** with the [Plex integration](https://www.home-assistant.io/integrations/plex/) configured
- **Plex Media Server** accessible on your local network
- **Fully Kiosk Browser** (optional) — only needed if you want the automation to switch a wall-mounted tablet between your dashboard and the Now Showing page
- **Plex sensor** — the automation uses a `sensor.tnas` entity that reports the number of active Plex sessions (this is typically provided by the Plex integration)

---

## Installation

### 1. Copy the Web Files

Place the two files from the `www/` folder into your Home Assistant `www` directory:

```
<config>/www/now_showing.html
<config>/www/plex-recently-added-card.js
```

You can do this via:
- **File Editor add-on** in Home Assistant
- **Samba** or **SSH** access to your HA config directory
- The **VS Code** add-on

### 2. Configure `now_showing.html`

Open `now_showing.html` and update these values near the top of the `<script>` section:

```javascript
const HA_URL = 'http://YOUR_HA_IP:8123';           // Your Home Assistant URL
const HA_TOKEN = 'YOUR_LONG_LIVED_ACCESS_TOKEN';    // HA long-lived access token
const PLEX_USERNAME = 'your_plex_username';          // Your Plex username (filters to only your playback)
```

**To create a long-lived access token:**
1. Go to your HA profile (click your name in the sidebar)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token", give it a name, and copy the token

### 3. Register the Lovelace Resource

To use the Recently Added card on your dashboard:

1. Go to **Settings → Dashboards → Resources** (top right: three dots → Resources)
2. Click **Add Resource**
3. URL: `/local/plex-recently-added-card.js`
4. Type: **JavaScript Module**

### 4. Add the Recently Added Card to a Dashboard

In your dashboard, add a **Manual card** with this YAML:

```yaml
type: custom:plex-recently-added-card
plex_url: http://YOUR_PLEX_IP:32400
plex_token: YOUR_PLEX_TOKEN
movies_count: 5
shows_count: 5
cycle_interval: 8
title: Recently Added
```

**To find your Plex token:**
1. Sign in to Plex Web App
2. Browse to any media item
3. Click "Get Info" → "View XML"
4. The token is in the URL as `X-Plex-Token=XXXXX`

For best results, set the card to span the full width of a section and give it plenty of vertical space (e.g., 8+ grid rows).

### 5. Set Up the Automation (Optional)

If you want a tablet to automatically switch to the Now Showing page during playback:

1. Import the automation from `automations/plex_now_showing_display.yaml`
2. Update these values in the automation:
   - `entity_id: sensor.tnas` — change to your Plex session count sensor
   - `device_id: 7fa13eecefc0809ccc3474398e07580c` — change to your Fully Kiosk Browser device ID
   - `url` in both actions — update to your HA IP and dashboard path

You can import the automation by pasting its contents into your `automations.yaml` file or by creating it manually through the HA UI.

---

## Customization

### Now Showing Page

| Setting | Where | Default |
|---------|-------|---------|
| Poll interval | `POLL_INTERVAL` in script | 5000ms (5 seconds) |
| Plex username filter | `PLEX_USERNAME` in script | Your Plex username |
| Marquee text size | `.marquee-text h1` font-size in CSS | `clamp(3.5rem, 10vw, 8rem)` |
| Bulb size | `.bulb` width/height in CSS | 28px |
| Bulb spacing | `spacing` in `createOuterBulbs()` | 42px |
| Chase animation speed | `setInterval(animateChase, ...)` | 500ms |

### (Bonus) Recently Added Card

| Setting | Where | Default |
|---------|-------|---------|
| `movies_count` | Card config YAML | 5 |
| `shows_count` | Card config YAML | 5 |
| `cycle_interval` | Card config YAML | 8 seconds |
| `title` | Card config YAML | "Recently Added" |

---

## How It Works

### Now Showing Page
- Polls Home Assistant's API every 5 seconds for active Plex `media_player` entities
- Filters to only your user's playback sessions
- Displays the current media's poster art as a full-bleed background
- Shows title, episode info (for TV), and playback state
- When nothing is playing, shows an idle "Waiting for playback" state
- Animated chase lights around the border give it a classic cinema marquee feel

### (Bonus) Recently Added Card
- Connects directly to your Plex server's API
- Fetches the latest movies and TV shows from all libraries
- Deduplicates TV shows (only shows the most recent entry per series)
- Interleaves movies and TV shows for variety
- Auto-cycles through items with smooth background transitions
- Color-coded dots indicate movie (gold) vs TV (blue)

### Automation
- Triggers whenever `sensor.tnas` (Plex session count) changes
- If sessions > 0: waits 5 seconds, then loads the Now Showing page on the tablet
- If sessions < 1: waits 10 seconds, then loads your main dashboard
- Uses `restart` mode so rapid state changes don't queue up

---

## Troubleshooting

- **Blank poster**: Check that your HA token is valid and the Plex `entity_picture` URLs are accessible
- **Card not appearing**: Make sure the Lovelace resource is registered and the browser cache is cleared (append `?v=2` to the resource URL to bust cache)
- **Only seeing other users' playback**: Update `PLEX_USERNAME` in `now_showing.html` to your Plex username
- **Automation not triggering**: Verify `sensor.tnas` exists and changes value when playback starts/stops

---

## Credits

Built by Sam Russell - AI used in development
Built with Home Assistant, Plex, and Fully Kiosk Browser.
