// Blocked page JavaScript
let currentState = null;

// DOM elements
const timeRemaining = document.getElementById("timeRemaining");
const backBtn = document.getElementById("backBtn");
const newTabBtn = document.getElementById("newTabBtn");

// Initialize blocked page
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  updateUI();
  setupEventListeners();

  // Update time every second
  setInterval(updateTimeDisplay, 1000);
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
  } catch (error) {
    console.error("Failed to load state:", error);
    // Fallback if we can't connect to background script
    timeRemaining.textContent = "Time remaining: Unknown";
  }
}

function updateUI() {
  updateTimeDisplay();
}

function updateTimeDisplay() {
  if (
    !currentState ||
    !currentState.isRunning ||
    currentState.mode !== "focus"
  ) {
    timeRemaining.textContent = "Focus session not active";
    return;
  }

  const minutes = Math.floor(currentState.timeLeft / 60);
  const seconds = currentState.timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  timeRemaining.textContent = `Time remaining: ${timeString}`;
}

function setupEventListeners() {
  backBtn.addEventListener("click", () => {
    history.back();
  });

  newTabBtn.addEventListener("click", () => {
    // Open new tab to the extension's new tab page
    chrome.tabs?.create({ url: "chrome://newtab/" }) ||
      window.open("chrome://newtab/", "_blank");
  });
}

// Handle cases where chrome extension APIs aren't available
if (typeof chrome === "undefined" || !chrome.runtime) {
  // Fallback for testing or if APIs aren't available
  timeRemaining.textContent = "Time remaining: Focus session active";

  newTabBtn.addEventListener("click", () => {
    window.open("about:blank", "_blank");
  });
}
