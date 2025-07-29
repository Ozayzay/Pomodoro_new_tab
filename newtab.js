// New Tab Page JavaScript
let currentState = null;
let todos = JSON.parse(localStorage.getItem("pomodoroTodos") || "[]");

// DOM elements
const timerDisplay = document.getElementById("timerDisplay");
const timerRingProgress = document.getElementById("timerRingProgress");
const startPauseBtn = document.getElementById("startPauseBtn");
const resetBtn = document.getElementById("resetBtn");
const focusLabel = document.getElementById("focusLabel");
const breakLabel = document.getElementById("breakLabel");
const taskLabel = document.getElementById("taskLabel");
const focusInput = document.getElementById("focusInput");
const breakInput = document.getElementById("breakInput");
const dailyStats = document.getElementById("dailyStats");
const todoInput = document.getElementById("todoInput");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoList = document.getElementById("todoList");
const blockedSiteInput = document.getElementById("blockedSiteInput");
const addBlockedSiteBtn = document.getElementById("addBlockedSiteBtn");
const blockedSitesList = document.getElementById("blockedSitesList");
const progressGrid = document.getElementById("progressGrid");

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing app...");
  await loadState();
  await loadDailyStats();
  renderTodos();
  renderBlockedSites();
  renderProgressGrid();
  setupEventListeners();
});

// Listen for state updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "stateUpdate") {
    currentState = message.state;
    updateUI();
    renderBlockedSites(); // Ensure blocked sites are re-rendered when state updates
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
  updateTimerRing();
  updateModeLabels();
  updateControls();
  updateTimerInputs();
  updateTabTitle();
  renderBlockedSites();

  document.body.className = currentState.isRunning ? "timer-running" : "";
}

function updateTimerDisplay() {
  const minutes = Math.floor(currentState.timeLeft / 60);
  const seconds = currentState.timeLeft % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function updateTimerRing() {
  const totalTime = getTotalTimeForMode(currentState.mode);
  const progress = 1 - currentState.timeLeft / totalTime;
  const circumference = 2 * Math.PI * 90;
  const offset = circumference * (1 - progress);

  timerRingProgress.style.strokeDashoffset = offset;

  if (currentState.mode === "focus") {
    timerRingProgress.style.stroke = "#ffffff";
  } else {
    timerRingProgress.style.stroke = "#4ade80";
  }
}

function updateModeLabels() {
  focusLabel.classList.toggle("active", currentState.mode === "focus");
  breakLabel.classList.toggle("active", currentState.mode !== "focus");
}

function updateControls() {
  if (currentState.isRunning) {
    startPauseBtn.textContent = currentState.isPaused ? "Resume" : "Pause";
  } else {
    startPauseBtn.textContent = "Start";
  }
}

function updateTimerInputs() {
  if (!currentState.isRunning) {
    focusInput.value = currentState.settings.focusMinutes;
    breakInput.value = currentState.settings.shortBreakMinutes;
  }
}

function updateTabTitle() {
  if (!currentState) {
    document.title = "Get Shit Done";
    return;
  }

  const minutes = Math.floor(currentState.timeLeft / 60);
  const seconds = currentState.timeLeft % 60;
  const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  let emoji = "⏱️";
  if (currentState.isRunning && !currentState.isPaused) {
    emoji = currentState.mode === "focus" ? "🔴" : "🟢";
  } else if (currentState.isPaused) {
    emoji = "⏸️";
  }

  const mode = currentState.mode === "focus" ? "Work" : "Break";
  document.title = `${emoji} ${timeString} ${mode} - Get Shit Done`;
}

function updateDailyStatsDisplay(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (dailyStats) {
    dailyStats.textContent = `⏱ ${hours}h ${minutes}m focused today`;
  }
}

function getTotalTimeForMode(mode) {
  switch (mode) {
    case "focus":
      return currentState.settings.focusMinutes * 60;
    case "shortBreak":
      return currentState.settings.shortBreakMinutes * 60;
    case "longBreak":
      return currentState.settings.longBreakMinutes * 60;
    default:
      return currentState.settings.focusMinutes * 60;
  }
}

function setupEventListeners() {
  console.log("Setting up event listeners...");

  startPauseBtn.addEventListener("click", async () => {
    console.log("Start/Pause clicked");
    try {
      if (currentState && currentState.isRunning) {
        await chrome.runtime.sendMessage({ type: "pauseTimer" });
      } else {
        await chrome.runtime.sendMessage({ type: "startTimer" });
      }
    } catch (error) {
      console.error("Timer error:", error);
      // Retry loading state if there's an error
      await loadState();
    }
  });

  resetBtn.addEventListener("click", async () => {
    console.log("Reset clicked");
    try {
      await chrome.runtime.sendMessage({ type: "resetTimer" });
    } catch (error) {
      console.error("Reset error:", error);
    }
  });

  focusInput.addEventListener("change", async () => {
    const minutes = Math.max(
      1,
      Math.min(120, parseInt(focusInput.value) || 25)
    );
    focusInput.value = minutes;

    if (
      currentState &&
      !currentState.isRunning &&
      currentState.mode === "focus"
    ) {
      await chrome.runtime.sendMessage({
        type: "setTimerDuration",
        minutes: minutes,
        mode: "focus",
      });
    }

    await chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { focusMinutes: minutes },
    });
  });

  breakInput.addEventListener("change", async () => {
    const minutes = Math.max(1, Math.min(60, parseInt(breakInput.value) || 5));
    breakInput.value = minutes;

    await chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { shortBreakMinutes: minutes },
    });
  });

  addTodoBtn.addEventListener("click", () => {
    console.log("Add todo clicked");
    addTodo();
  });

  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      console.log("Enter pressed in todo input");
      addTodo();
    }
  });

  addBlockedSiteBtn.addEventListener("click", () => {
    console.log("Add blocked site clicked");
    addBlockedSite();
  });

  blockedSiteInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      console.log("Enter pressed in blocked site input");
      addBlockedSite();
    }
  });

  taskLabel.addEventListener("input", () => {
    localStorage.setItem("pomodoroTaskLabel", taskLabel.value);
  });

  const savedTask = localStorage.getItem("pomodoroTaskLabel");
  if (savedTask) {
    taskLabel.value = savedTask;
  }
}

function addTodo() {
  console.log("addTodo called");
  const text = todoInput.value.trim();
  console.log("Todo text:", text);

  if (!text) {
    console.log("No text entered");
    return;
  }

  const todo = {
    id: Date.now(),
    text: text,
    completed: false,
  };

  todos.push(todo);
  saveTodos();
  renderTodos();
  todoInput.value = "";
  console.log("Todo added successfully");
}

function toggleTodo(id) {
  console.log("Toggle todo:", id);
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
  }
}

function deleteTodo(id) {
  console.log("Delete todo:", id);
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  renderTodos();
}

function saveTodos() {
  localStorage.setItem("pomodoroTodos", JSON.stringify(todos));
}

function renderTodos() {
  console.log("Rendering todos:", todos);
  if (!todoList) {
    console.log("todoList element not found");
    return;
  }

  todoList.innerHTML = "";

  todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = `todo-item ${todo.completed ? "completed" : ""}`;

    const checkbox = document.createElement("div");
    checkbox.className = `todo-checkbox ${todo.completed ? "checked" : ""}`;
    checkbox.addEventListener("click", () => toggleTodo(todo.id));

    const todoText = document.createElement("span");
    todoText.className = "todo-text";
    todoText.textContent = todo.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-delete";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    li.appendChild(checkbox);
    li.appendChild(todoText);
    li.appendChild(deleteBtn);
    todoList.appendChild(li);
  });
}

async function addBlockedSite() {
  console.log("addBlockedSite called");
  const site = blockedSiteInput.value.trim().toLowerCase();
  console.log("Site value:", site);

  if (!site) {
    console.log("No site entered");
    return;
  }

  const cleanSite = site.replace(/^https?:\/\//, "").replace(/^www\./, "");
  console.log("Clean site:", cleanSite);

  if (!currentState?.settings?.blockedSites) {
    console.log("No current state or settings");
    return;
  }

  if (currentState.settings.blockedSites.includes(cleanSite)) {
    console.log("Site already exists");
    blockedSiteInput.value = "";
    return;
  }

  const newBlockedSites = [...currentState.settings.blockedSites, cleanSite];
  console.log("New blocked sites:", newBlockedSites);

  try {
    await chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { blockedSites: newBlockedSites },
    });

    currentState.settings.blockedSites = newBlockedSites;
    blockedSiteInput.value = "";
    renderBlockedSites();
    console.log("Blocked site added successfully");
  } catch (error) {
    console.error("Failed to update blocked sites:", error);
  }
}

async function removeBlockedSite(site) {
  if (!currentState?.settings?.blockedSites) return;

  const newBlockedSites = currentState.settings.blockedSites.filter(
    (s) => s !== site
  );

  try {
    await chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: { blockedSites: newBlockedSites },
    });

    currentState.settings.blockedSites = newBlockedSites;
    renderBlockedSites();
  } catch (error) {
    console.error("Failed to remove blocked site:", error);
  }
}

function renderBlockedSites() {
  if (!blockedSitesList) return;

  if (!currentState?.settings?.blockedSites) {
    blockedSitesList.innerHTML =
      '<p style="color: rgba(255,255,255,0.6); font-size: 14px;">Loading blocked sites...</p>';
    return;
  }

  blockedSitesList.innerHTML = "";

  currentState.settings.blockedSites.forEach((site) => {
    const div = document.createElement("div");
    div.className = "blocked-site-item";

    const siteName = document.createElement("span");
    siteName.className = "blocked-site-name";
    siteName.textContent = site;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "blocked-site-delete";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", () => removeBlockedSite(site));

    div.appendChild(siteName);
    div.appendChild(deleteBtn);
    blockedSitesList.appendChild(div);
  });
}

// Progress Grid Functions
async function renderProgressGrid() {
  if (!progressGrid) {
    console.log("Progress grid element not found");
    return;
  }

  console.log("Rendering progress grid...");
  const progressData = await loadProgressData();
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  progressGrid.innerHTML = "";

  // Create grid for last 365 days
  const firstSunday = new Date(startDate);
  const dayOfWeek = firstSunday.getDay();
  firstSunday.setDate(firstSunday.getDate() - dayOfWeek);

  for (let week = 0; week < 53; week++) {
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(firstSunday);
      currentDate.setDate(firstSunday.getDate() + week * 7 + day);

      const daySquare = document.createElement("div");
      daySquare.className = "day-square";

      const dateString = currentDate.toDateString();
      const focusSeconds = progressData[dateString] || 0;
      const level = getFocusLevel(focusSeconds);

      daySquare.classList.add(`level-${level}`);
      daySquare.style.gridRow = day + 1;
      daySquare.style.gridColumn = week + 1;

      const hours = Math.floor(focusSeconds / 3600);
      const minutes = Math.floor((focusSeconds % 3600) / 60);
      const timeText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      daySquare.title = `${currentDate.toLocaleDateString()}: ${timeText} focused`;

      if (currentDate >= startDate && currentDate <= today) {
        progressGrid.appendChild(daySquare);
      }
    }
  }
  console.log("Progress grid rendered");
}

function getFocusLevel(seconds) {
  const hours = seconds / 3600;

  if (hours === 0) return 0;
  if (hours <= 3) return 1; // Green
  if (hours <= 4.5) return 2; // Blue
  if (hours <= 6) return 3; // Orange
  return 4; // Red (6+ hours)
}

async function loadProgressData() {
  try {
    const result = await chrome.storage.local.get(["progressHistory"]);
    return result.progressHistory || {};
  } catch (error) {
    console.error("Failed to load progress data:", error);
    return {};
  }
}

setInterval(loadDailyStats, 60000);
