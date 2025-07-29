// Background service worker - manages timer state and site blocking
let timerState = {
  isRunning: false,
  isPaused: false,
  mode: "focus", // 'focus', 'shortBreak', 'longBreak'
  timeLeft: 25 * 60, // seconds
  completedCycles: 0,
  settings: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    enableNotifications: true,
    enableChime: true,
    blockedSites: ["facebook.com", "instagram.com", "reddit.com", "x.com"],
  },
};

const BLOCKED_RULE_ID_START = 1000;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  await resetDailyStatsIfNeeded();
  chrome.alarms.create("pomodoroTick", { periodInMinutes: 1 / 60 }); // Every second
  chrome.alarms.create("saveState", { periodInMinutes: 1 }); // Save every minute
});

chrome.runtime.onStartup.addListener(async () => {
  await loadState();
  await loadSettings();
  chrome.alarms.create("pomodoroTick", { periodInMinutes: 1 / 60 });
  chrome.alarms.create("saveState", { periodInMinutes: 1 });
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pomodoroTick") {
    await handleTick();
  } else if (alarm.name === "saveState") {
    await saveState();
  }
});

async function handleTick() {
  if (!timerState.isRunning || timerState.isPaused) return;

  timerState.timeLeft--;

  if (timerState.timeLeft <= 0) {
    await completeCurrentPhase();
  }

  // Broadcast update to all listeners
  broadcastStateUpdate();
}

async function completeCurrentPhase() {
  // Play notification
  if (timerState.settings.enableNotifications) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "assets/icon128.png",
      title: "Get Shit Done",
      message: getPhaseCompleteMessage(),
    });
  }

  // Update stats if completing focus session
  if (timerState.mode === "focus") {
    timerState.completedCycles++;
    await updateFocusedTime(timerState.settings.focusMinutes * 60);
    await updateProgressHistory(
      new Date(),
      timerState.settings.focusMinutes * 60
    );
  }

  // Determine next phase
  if (timerState.mode === "focus") {
    if (
      timerState.completedCycles % timerState.settings.cyclesBeforeLongBreak ===
      0
    ) {
      timerState.mode = "longBreak";
      timerState.timeLeft = timerState.settings.longBreakMinutes * 60;
    } else {
      timerState.mode = "shortBreak";
      timerState.timeLeft = timerState.settings.shortBreakMinutes * 60;
    }
    await removeBlockingRules();
  } else {
    timerState.mode = "focus";
    timerState.timeLeft = timerState.settings.focusMinutes * 60;
    await addBlockingRules();
  }

  broadcastStateUpdate();
}

function getPhaseCompleteMessage() {
  switch (timerState.mode) {
    case "focus":
      return "Focus session complete! Time for a break.";
    case "shortBreak":
      return "Break over! Ready for another focus session?";
    case "longBreak":
      return "Long break over! Ready to focus again?";
    default:
      return "Phase complete!";
  }
}

async function startTimer() {
  timerState.isRunning = true;
  timerState.isPaused = false;

  if (timerState.mode === "focus") {
    await addBlockingRules();
  }

  broadcastStateUpdate();
}

async function pauseTimer() {
  timerState.isPaused = !timerState.isPaused;
  broadcastStateUpdate();
}

async function resetTimer() {
  timerState.isRunning = false;
  timerState.isPaused = false;
  timerState.mode = "focus";
  timerState.timeLeft = timerState.settings.focusMinutes * 60;

  await removeBlockingRules();
  broadcastStateUpdate();
}

async function addBlockingRules() {
  const rules = timerState.settings.blockedSites.map((site, index) => ({
    id: BLOCKED_RULE_ID_START + index,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" },
    },
    condition: {
      urlFilter: `*://*.${site}/*`,
      resourceTypes: ["main_frame"],
    },
  }));

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
    });
  } catch (error) {
    console.error("Failed to add blocking rules:", error);
  }
}

async function removeBlockingRules() {
  const ruleIds = timerState.settings.blockedSites.map(
    (_, index) => BLOCKED_RULE_ID_START + index
  );

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
    });
  } catch (error) {
    console.error("Failed to remove blocking rules:", error);
  }
}
async function updateProgressHistory(date, seconds) {
  try {
    const result = await chrome.storage.local.get(["progressHistory"]);
    const progressHistory = result.progressHistory || {};

    const dateString = date.toDateString();
    progressHistory[dateString] = (progressHistory[dateString] || 0) + seconds;

    await chrome.storage.local.set({ progressHistory });
  } catch (error) {
    console.error("Failed to update progress history:", error);
  }
}

async function updateFocusedTime(seconds) {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get([
    "focusedTodaySeconds",
    "lastFocusDate",
  ]);

  let focusedSeconds = 0;
  if (result.lastFocusDate === today) {
    focusedSeconds = result.focusedTodaySeconds || 0;
  }

  focusedSeconds += seconds;

  await chrome.storage.local.set({
    focusedTodaySeconds: focusedSeconds,
    lastFocusDate: today,
  });
}

async function resetDailyStatsIfNeeded() {
  const today = new Date().toDateString();
  const result = await chrome.storage.local.get(["lastFocusDate"]);

  if (result.lastFocusDate !== today) {
    await chrome.storage.local.set({
      focusedTodaySeconds: 0,
      lastFocusDate: today,
    });
  }
}

async function loadSettings() {
  const result = await chrome.storage.local.get(["pomodoroSettings"]);
  if (result.pomodoroSettings) {
    timerState.settings = {
      ...timerState.settings,
      ...result.pomodoroSettings,
    };
  }
}

async function saveSettings() {
  await chrome.storage.local.set({ pomodoroSettings: timerState.settings });
}

async function saveState() {
  await chrome.storage.local.set({
    timerState: {
      isRunning: timerState.isRunning,
      isPaused: timerState.isPaused,
      mode: timerState.mode,
      timeLeft: timerState.timeLeft,
      completedCycles: timerState.completedCycles,
    },
  });
}

async function loadState() {
  const result = await chrome.storage.local.get(["timerState"]);
  if (result.timerState) {
    Object.assign(timerState, result.timerState);
  }
}

function broadcastStateUpdate() {
  chrome.runtime
    .sendMessage({
      type: "stateUpdate",
      state: timerState,
    })
    .catch(() => {}); // Ignore errors if no listeners
}

// Handle messages from popup and newtab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "getState":
      sendResponse(timerState);
      break;
    case "startTimer":
      startTimer();
      sendResponse({ success: true });
      break;
    case "pauseTimer":
      pauseTimer();
      sendResponse({ success: true });
      break;
    case "resetTimer":
      resetTimer();
      sendResponse({ success: true });
      break;
    case "updateSettings":
      timerState.settings = { ...timerState.settings, ...message.settings };
      saveSettings();
      sendResponse({ success: true });
      break;
    case "setTimerDuration":
      if (!timerState.isRunning) {
        timerState.timeLeft = message.minutes * 60;
        if (message.mode) {
          timerState.mode = message.mode;
        }
        broadcastStateUpdate();
      }
      sendResponse({ success: true });
      break;
  }
  return true;
});
