// Options page JavaScript
let currentSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  enableNotifications: true,
  enableChime: true,
  blockedSites: ["facebook.com", "instagram.com", "reddit.com"],
};

// DOM elements
const focusMinutesInput = document.getElementById("focusMinutes");
const shortBreakMinutesInput = document.getElementById("shortBreakMinutes");
const longBreakMinutesInput = document.getElementById("longBreakMinutes");
const cyclesBeforeLongBreakInput = document.getElementById(
  "cyclesBeforeLongBreak"
);
const enableNotificationsInput = document.getElementById("enableNotifications");
const enableChimeInput = document.getElementById("enableChime");
const blockedSitesInput = document.getElementById("blockedSites");
const settingsJsonInput = document.getElementById("settingsJson");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const resetStatsBtn = document.getElementById("resetStatsBtn");
const statusMessage = document.getElementById("statusMessage");

// Initialize options page
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  updateUI();
  setupEventListeners();
});

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(["pomodoroSettings"]);
    if (result.pomodoroSettings) {
      currentSettings = { ...currentSettings, ...result.pomodoroSettings };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
    showStatus("Failed to load settings", "error");
  }
}

function updateUI() {
  focusMinutesInput.value = currentSettings.focusMinutes;
  shortBreakMinutesInput.value = currentSettings.shortBreakMinutes;
  longBreakMinutesInput.value = currentSettings.longBreakMinutes;
  cyclesBeforeLongBreakInput.value = currentSettings.cyclesBeforeLongBreak;
  enableNotificationsInput.checked = currentSettings.enableNotifications;
  enableChimeInput.checked = currentSettings.enableChime;
  blockedSitesInput.value = currentSettings.blockedSites.join("\n");
}

function getSettingsFromUI() {
  return {
    focusMinutes: Math.max(
      1,
      Math.min(120, parseInt(focusMinutesInput.value) || 25)
    ),
    shortBreakMinutes: Math.max(
      1,
      Math.min(60, parseInt(shortBreakMinutesInput.value) || 5)
    ),
    longBreakMinutes: Math.max(
      1,
      Math.min(120, parseInt(longBreakMinutesInput.value) || 15)
    ),
    cyclesBeforeLongBreak: Math.max(
      1,
      Math.min(10, parseInt(cyclesBeforeLongBreakInput.value) || 4)
    ),
    enableNotifications: enableNotificationsInput.checked,
    enableChime: enableChimeInput.checked,
    blockedSites: blockedSitesInput.value
      .split("\n")
      .map((site) => site.trim())
      .filter((site) => site.length > 0),
  };
}

async function saveSettings() {
  try {
    const newSettings = getSettingsFromUI();

    // Validate settings
    if (newSettings.blockedSites.length === 0) {
      showStatus("At least one blocked site is required", "error");
      return;
    }

    // Save to storage
    await chrome.storage.local.set({ pomodoroSettings: newSettings });

    // Update background script
    await chrome.runtime.sendMessage({
      type: "updateSettings",
      settings: newSettings,
    });

    currentSettings = newSettings;
    showStatus("Settings saved successfully!", "success");
  } catch (error) {
    console.error("Failed to save settings:", error);
    showStatus("Failed to save settings", "error");
  }
}

function exportSettings() {
  const settingsToExport = {
    ...currentSettings,
    exportDate: new Date().toISOString(),
    version: "1.0.0",
  };

  const jsonString = JSON.stringify(settingsToExport, null, 2);
  settingsJsonInput.value = jsonString;

  // Also download as file
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "get-shit-done-settings.json";
  a.click();
  URL.revokeObjectURL(url);

  showStatus("Settings exported successfully!", "success");
}

function importSettings() {
  try {
    const jsonString = settingsJsonInput.value.trim();
    if (!jsonString) {
      importFile.click();
      return;
    }

    const importedSettings = JSON.parse(jsonString);

    // Validate imported settings
    const validSettings = {
      focusMinutes: Math.max(
        1,
        Math.min(120, importedSettings.focusMinutes || 25)
      ),
      shortBreakMinutes: Math.max(
        1,
        Math.min(60, importedSettings.shortBreakMinutes || 5)
      ),
      longBreakMinutes: Math.max(
        1,
        Math.min(120, importedSettings.longBreakMinutes || 15)
      ),
      cyclesBeforeLongBreak: Math.max(
        1,
        Math.min(10, importedSettings.cyclesBeforeLongBreak || 4)
      ),
      enableNotifications: importedSettings.enableNotifications !== false,
      enableChime: importedSettings.enableChime !== false,
      blockedSites: Array.isArray(importedSettings.blockedSites)
        ? importedSettings.blockedSites.filter(
            (site) => typeof site === "string" && site.trim()
          )
        : ["facebook.com", "instagram.com", "reddit.com"],
    };

    currentSettings = validSettings;
    updateUI();
    showStatus("Settings imported successfully! Click Save to apply.", "info");
  } catch (error) {
    console.error("Failed to import settings:", error);
    showStatus(
      "Invalid settings format. Please check the JSON syntax.",
      "error"
    );
  }
}

async function resetDailyStats() {
  if (
    !confirm(
      "Are you sure you want to reset your daily focus statistics? This cannot be undone."
    )
  ) {
    return;
  }

  try {
    const today = new Date().toDateString();
    await chrome.storage.local.set({
      focusedTodaySeconds: 0,
      lastFocusDate: today,
    });

    showStatus("Daily statistics reset successfully!", "success");
  } catch (error) {
    console.error("Failed to reset stats:", error);
    showStatus("Failed to reset statistics", "error");
  }
}

function setupEventListeners() {
  saveBtn.addEventListener("click", saveSettings);

  cancelBtn.addEventListener("click", () => {
    if (confirm("Discard unsaved changes?")) {
      updateUI();
      showStatus("Changes discarded", "info");
    }
  });

  exportBtn.addEventListener("click", exportSettings);
  importBtn.addEventListener("click", importSettings);
  resetStatsBtn.addEventListener("click", resetDailyStats);

  // File import
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        settingsJsonInput.value = e.target.result;
        importSettings();
      };
      reader.readAsText(file);
    }
  });

  // Validate number inputs
  [
    focusMinutesInput,
    shortBreakMinutesInput,
    longBreakMinutesInput,
    cyclesBeforeLongBreakInput,
  ].forEach((input) => {
    input.addEventListener("input", () => {
      const value = parseInt(input.value);
      const min = parseInt(input.min);
      const max = parseInt(input.max);

      if (value < min) input.value = min;
      if (value > max) input.value = max;
    });
  });

  // Auto-save settings on input change
  const inputs = [
    focusMinutesInput,
    shortBreakMinutesInput,
    longBreakMinutesInput,
    cyclesBeforeLongBreakInput,
    enableNotificationsInput,
    enableChimeInput,
  ];

  inputs.forEach((input) => {
    input.addEventListener("change", () => {
      clearTimeout(window.autoSaveTimeout);
      window.autoSaveTimeout = setTimeout(() => {
        saveSettings();
      }, 1000);
    });
  });

  // Save blocked sites with longer delay
  blockedSitesInput.addEventListener("input", () => {
    clearTimeout(window.blockedSitesTimeout);
    window.blockedSitesTimeout = setTimeout(() => {
      saveSettings();
    }, 2000);
  });
}

function showStatus(message, type = "info") {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = "none";
    setTimeout(() => {
      statusMessage.className = "status";
    }, 300);
  }, 5000);
}
