// Popup JavaScript
let currentState = null;

// DOM elements
const timerDisplay = document.getElementById("timerDisplay");
const modeIndicator = document.getElementById("modeIndicator");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const blockingToggle = document.getElementById("blockingToggle");
const dailyStats = document.getElementById("dailyStats");
const optionsBtn = document.getElementById("optionsBtn");

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  await loadDailyStats();
  setupEventListeners();
});

// Listen for state updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "stateUpdate") {
    currentState = message.state;
    updateUI();
  }
});

async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "getState" });
    currentState = response;
    updateUI();
  } catch (error) {
    console.error("Failed to load state:", error);
  }
}

async function loadDailyStats() {
  try {
    const result = await chrome.storage.local.get(["focusedTodaySeconds"]);
    const seconds = result.focusedTodaySeconds || 0;
    updateDailyStatsDisplay(seconds);
  } catch (error) {
    console.error("Failed to load daily stats:", error);
  }
}

function updateUI() {
  if (!currentState) return;

  updateTimerDisplay();
  updateModeIndicator();
  updateControls();
  updateBlockingToggle();
  updateBodyClass();
}

function updateTimerDisplay() {
  const minutes = Math.floor(currentState.timeLeft / 60);
  const seconds = currentState.timeLeft % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function updateModeIndicator() {
  switch (currentState.mode) {
    case "focus":
      modeIndicator.textContent = "FOCUS";
      break;
    case "shortBreak":
      modeIndicator.textContent = "SHORT BREAK";
      break;
    case "longBreak":
      modeIndicator.textContent = "LONG BREAK";
      break;
    default:
      modeIndicator.textContent = "FOCUS";
  }
}

function updateControls() {
  if (currentState.isRunning) {
    startPauseBtn.textContent = currentState.isPaused ? "Resume" : "Pause";
  } else {
    startPauseBtn.textContent = "Start";
  }
}

function updateBlockingToggle() {
  blockingToggle.checked =
    currentState.isRunning && currentState.mode === "focus";
  blockingToggle.disabled =
    !currentState.isRunning || currentState.mode !== "focus";
}

function updateBodyClass() {
  document.body.className = "";
  if (currentState.isRunning && !currentState.isPaused) {
    document.body.classList.add("timer-running");
  } else if (currentState.isPaused) {
    document.body.classList.add("timer-paused");
  }
}

function updateDailyStatsDisplay(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  dailyStats.textContent = `⏱ ${hours}h ${minutes}m focused today`;
}

function setupEventListeners() {
  startPauseBtn.addEventListener("click", async () => {
    try {
      if (currentState.isRunning) {
        await chrome.runtime.sendMessage({ type: "pauseTimer" });
      } else {
        await chrome.runtime.sendMessage({ type: "startTimer" });
      }
    } catch (error) {
      console.error("Failed to control timer:", error);
    }
  });

  resetBtn.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({ type: "resetTimer" });
    } catch (error) {
      console.error("Failed to reset timer:", error);
    }
  });

  optionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Note: Blocking toggle is display-only since blocking is automatic during focus
  blockingToggle.addEventListener("change", (e) => {
    // Prevent user from unchecking during focus session
    if (currentState.isRunning && currentState.mode === "focus") {
      e.preventDefault();
      blockingToggle.checked = true;
    }
  });
}

// Periodically refresh data
setInterval(() => {
  loadDailyStats();
}, 30000); // Every 30 seconds
