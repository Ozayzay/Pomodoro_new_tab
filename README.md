# Get Shit Done - Pomodoro Focus Extension 🍅

A minimalist Pomodoro timer Chrome extension with site blocking capabilities. I needed a focusing app that did exactly what I wanted without the bloat, subscriptions, or limitations of existing solutions - so I built this.

## Why I Built This

Every productivity app I tried was either:

- Behind a paywall for basic features
- Overcomplicated with unnecessary features
- Didn't block sites the way I wanted
- Had poor UI/UX that distracted from actual work

This extension does exactly what I need: **simple Pomodoro timing + effective site blocking + clean interface**.

## Features

### 🎯 Core Functionality

- **Pomodoro Timer**: Customizable focus (25min) and break (5min/15min) sessions
- **Site Blocking**: Automatically blocks distracting sites during focus sessions
- **New Tab Override**: Replaces Chrome's new tab with your productivity dashboard
- **Progress Tracking**: Visual GitHub-style contribution grid showing daily focus time
- **Daily Stats**: Track how many hours you've focused each day

### 🚫 Smart Site Blocking

- Sites are **only blocked during focus sessions**
- Automatically unblocks during breaks
- Easy to add/remove sites from blocklist
- Works with both main domains and subdomains
- Default blocked sites: Facebook, Instagram, Reddit, X (Twitter)

### ✅ Task Management

- Quick todo list built into the new tab
- Add, complete, and delete tasks
- Tasks persist across browser sessions

### 🎨 Clean Interface

- Beautiful gradient background
- Circular progress timer with visual feedback
- Responsive design that works on all screen sizes
- No clutter - just what you need to stay focused

## Installation

### Option 1: Load as Unpacked Extension (Recommended)

1. **Download/Clone this repository**

   ```bash
   git clone [repository-url]
   # or download as ZIP and extract
   ```

2. **Open Chrome Extensions page**

   - Go to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**

   - Toggle the "Developer mode" switch in the top right

4. **Load the Extension**

   - Click "Load unpacked"
   - Select the folder containing the extension files
   - The extension should now appear in your extensions list

5. **Set as New Tab (Automatic)**
   - The extension automatically overrides Chrome's new tab page
   - Open a new tab to see your productivity dashboard

### Option 2: Create a Chrome Package (Advanced)

1. In Chrome extensions, click "Pack extension"
2. Select the extension folder
3. Install the generated `.crx` file

## How to Use

### Starting a Focus Session

1. Open a new tab (your dashboard will appear)
2. Optionally adjust the focus/break duration
3. Add what you're working on in the task field
4. Click "Start" to begin your focus session
5. Distracting sites will be automatically blocked

### During Focus

- The timer shows your remaining time
- Blocked sites redirect to a motivational blocking page
- Add quick tasks to your todo list
- Your tab title shows the current timer state

### Breaks

- All sites become accessible again
- Take your break guilt-free
- Timer automatically transitions between focus and break sessions

### Customization

- **Timer Duration**: Adjust focus/break lengths directly on the dashboard
- **Blocked Sites**: Add or remove sites from the blocking list
- **Settings**: Access the options page for advanced configuration

## File Structure

```
focused-pomodoro/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (timer logic, site blocking)
├── newtab.html/css/js     # Main dashboard interface
├── popup.html/css/js      # Extension popup (mini controls)
├── options.html/css/js    # Settings page
├── blocked.html/css/js    # Page shown when sites are blocked
└── assets/                # Icons and images
```

## Key Features Explained

### Site Blocking Logic

- Uses Chrome's `declarativeNetRequest` API for efficient blocking
- Rules are dynamically added/removed based on timer state
- Blocks both `example.com` and `*.example.com` patterns
- Only active during focus sessions - never permanent

### Progress Tracking

- Stores daily focus time in Chrome's local storage
- Creates a GitHub-style contribution graph
- Shows focus levels with color coding (0-6+ hours)
- Data persists across browser restarts

### Timer State Management

- Background service worker manages timer independently
- State is synchronized across all extension pages
- Timer continues running even if dashboard is closed
- Visual and audio notifications when sessions complete

## Permissions Explained

- `storage`: Save your settings and progress data
- `alarms`: Run the timer in the background
- `notifications`: Alert you when sessions complete
- `declarativeNetRequest`: Block distracting websites
- `tabs`: Manage new tab override
- `<all_urls>`: Enable site blocking on any domain

## Customization

### Adding Blocked Sites

1. Open a new tab (dashboard)
2. In the "Blocked Sites" section, enter a domain (e.g., `youtube.com`)
3. Click the "+" button
4. Site will be blocked during your next focus session

### Changing Timer Durations

- Adjust the focus/break inputs on the dashboard
- Changes are automatically saved
- New durations apply to the next timer session

### Advanced Settings

- Click the extension icon → "Options" for detailed settings
- Export/import your configuration
- Reset daily statistics
- Customize notification preferences

## Troubleshooting

### Sites Not Being Blocked

1. Make sure you're in an active focus session (timer running)
2. Check that the site is in your blocked list
3. Try adding both `example.com` and `www.example.com` if needed
4. Refresh the page after starting the timer

### Timer Not Working

1. Check browser console for errors (`F12` → Console)
2. Ensure the extension has all required permissions
3. Try disabling and re-enabling the extension

### New Tab Not Showing

1. Check if another extension is overriding new tabs
2. Disable other new tab extensions
3. Reload the extension in `chrome://extensions/`

## Contributing

Feel free to:

- Report bugs by creating issues
- Suggest new features
- Submit pull requests
- Fork and customize for your needs

## License

MIT License - feel free to use, modify, and distribute as needed.

---

**Built with frustration at existing solutions and a desire for something that just works.** 🚀
