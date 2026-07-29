(function () {
  "use strict";

  const STORAGE_KEY = "la-trip-planner-data-v1";
  const ACTIVE_DAY_KEY = "la-trip-planner-active-day";
  const sourceData = window.TRIP_DATA;
  let data = loadData();
  let activeDay = clamp(Number(localStorage.getItem(ACTIVE_DAY_KEY)) || 0, 0, data.days.length - 1);
  let editMode = false;
  let toastTimer;

  const elements = {
    body: document.body,
    tabs: document.querySelector("#day-tabs"),
    timeline: document.querySelector("#timeline"),
    dayKicker: document.querySelector("#day-kicker"),
    dayTitle: document.querySelector("#day-title"),
    daySummary: document.querySelector("#day-summary"),
    visitList: document.querySelector("#visit-list"),
    checklist: document.querySelector("#checklist"),
    checklistProgress: document.querySelector("#checklist-progress"),
    editButton: document.querySelector("#edit-mode-button"),
    toast: document.querySelector("#toast")
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : clone(sourceData);
    } catch (error) {
      console.warn("Stored trip data could not be read. Loading the source file instead.", error);
      return clone(sourceData);
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function setText(selector, value) {
    document.querySelector(selector).textContent = value;
  }

  function renderMeta() {
    setText("#trip-eyebrow", data.meta.eyebrow);
    setText("#page-title", data.meta.title);
    setText("#trip-intro", data.meta.intro);
    setText("#trip-dates", data.meta.dates);
    setText("#trip-timezone", data.meta.timezone);
    setText("#trip-status", data.meta.status);
    setText("#footer-note", data.meta.footerNote);
  }

  function renderTabs() {
    elements.tabs.replaceChildren();

    data.days.forEach((day, index) => {
      const button = document.createElement("button");
      button.className = "day-tab";
      button.type = "button";
      button.id = `day-tab-${index}`;
      button.role = "tab";
      button.textContent = day.label;
      button.setAttribute("aria-selected", String(index === activeDay));
      button.setAttribute("aria-controls", "timeline");
      button.tabIndex = index === activeDay ? 0 : -1;
      button.addEventListener("click", () => selectDay(index));
      button.addEventListener("keydown", handleTabKeydown);
      elements.tabs.append(button);
    });
  }

  function handleTabKeydown(event) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const lastIndex = data.days.length - 1;
    let nextIndex = activeDay;

    if (event.key === "ArrowLeft") nextIndex = activeDay === 0 ? lastIndex : activeDay - 1;
    if (event.key === "ArrowRight") nextIndex = activeDay === lastIndex ? 0 : activeDay + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    selectDay(nextIndex);
    document.querySelector(`#day-tab-${nextIndex}`).focus();
  }

  function selectDay(index) {
    activeDay = index;
    localStorage.setItem(ACTIVE_DAY_KEY, String(activeDay));
    renderTabs();
    renderSchedule();
  }

  function renderSchedule() {
    const day = data.days[activeDay];
    elements.dayKicker.textContent = `${day.label} · Los Angeles time`;
    elements.dayTitle.textContent = day.title;
    elements.daySummary.textContent = day.summary;
    elements.timeline.setAttribute("aria-labelledby", `day-tab-${activeDay} day-title`);
    elements.timeline.replaceChildren();

    if (!day.items.length) {
      elements.timeline.append(createEmptyState("No schedule items yet. Switch on editing to add one."));
      return;
    }

    day.items.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "timeline-row";

      if (editMode) {
        row.append(
          createInput(item.time, "Time in Los Angeles", (value) => updateSchedule(index, "time", value)),
          createInput(item.place, "Activity or place", (value) => updateSchedule(index, "place", value)),
          createTextarea(item.note, "Short note", (value) => updateSchedule(index, "note", value)),
          createDeleteButton("Remove schedule item", () => {
            day.items.splice(index, 1);
            saveData();
            renderSchedule();
          })
        );
      } else {
        row.append(
          createText("time", item.time, item.placeholder),
          createText("place", item.place, item.placeholder),
          createText("note", item.note, item.placeholder)
        );
      }

      elements.timeline.append(row);
    });
  }

  function createText(type, value, isPlaceholder) {
    const element = document.createElement(type === "place" ? "h3" : "div");
    element.className = `timeline-${type}${isPlaceholder ? " placeholder-text" : ""}`;
    element.textContent = value;
    return element;
  }

  function createInput(value, label, onChange) {
    const input = document.createElement("input");
    input.className = "editable-field";
    input.type = "text";
    input.value = value;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => onChange(input.value.trim()));
    return input;
  }

  function createTextarea(value, label, onChange) {
    const textarea = document.createElement("textarea");
    textarea.className = "editable-field";
    textarea.value = value;
    textarea.setAttribute("aria-label", label);
    textarea.addEventListener("change", () => onChange(textarea.value.trim()));
    return textarea;
  }

  function createDeleteButton(label, onClick) {
    const button = document.createElement("button");
    button.className = "item-action";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = "×";
    button.addEventListener("click", onClick);
    return button;
  }

  function createEmptyState(text) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = text;
    return empty;
  }

  function updateSchedule(index, field, value) {
    const item = data.days[activeDay].items[index];
    const defaults = {
      time: "Add time",
      place: "Add activity or place",
      note: "Add a short note, reservation detail, or travel cue."
    };
    item[field] = value || defaults[field];
    item.placeholder = isSchedulePlaceholder(item);
    saveData();
  }

  function isSchedulePlaceholder(item) {
    return (
      !item.place ||
      item.place === "Add activity or place" ||
      item.time === "Add time"
    );
  }

  function renderVisitList() {
    elements.visitList.replaceChildren();

    if (!data.toVisit.length) {
      elements.visitList.append(createEmptyState("No places saved yet. Switch on editing to add one."));
      return;
    }

    data.toVisit.forEach((item, index) => {
      const row = document.createElement("li");
      row.className = "visit-item";

      if (editMode) {
        const fields = document.createElement("div");
        fields.append(
          createInput(item.place, "Place to visit", (value) => {
            item.place = value || "Add a place to consider";
            item.placeholder = !value;
            saveData();
          }),
          createInput(item.note, "Place note", (value) => {
            item.note = value;
            saveData();
          })
        );
        row.append(
          fields,
          createDeleteButton("Remove place", () => {
            data.toVisit.splice(index, 1);
            saveData();
            renderVisitList();
          })
        );
      } else {
        const copy = document.createElement("div");
        const place = document.createElement("strong");
        const note = document.createElement("p");
        place.textContent = item.place;
        note.textContent = item.note;
        if (item.placeholder) {
          place.classList.add("placeholder-text");
          note.classList.add("placeholder-text");
        }
        copy.append(place, note);
        row.append(copy);
      }

      elements.visitList.append(row);
    });
  }

  function renderChecklist() {
    elements.checklist.replaceChildren();
    const completed = data.checklist.filter((item) => item.done).length;
    elements.checklistProgress.textContent = `${completed} of ${data.checklist.length} complete`;

    if (!data.checklist.length) {
      elements.checklist.append(createEmptyState("No tasks yet. Switch on editing to add one."));
      return;
    }

    data.checklist.forEach((item, index) => {
      const row = document.createElement("li");
      row.className = "checklist-item";
      const label = document.createElement("label");
      label.className = "check-label";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.done;
      checkbox.addEventListener("change", () => {
        item.done = checkbox.checked;
        saveData();
        renderChecklist();
      });

      if (editMode) {
        const input = createInput(item.task, "Planning task", (value) => {
          item.task = value || "Add a planning task";
          item.placeholder = !value;
          saveData();
        });
        label.append(checkbox, input);
        row.append(
          label,
          createDeleteButton("Remove task", () => {
            data.checklist.splice(index, 1);
            saveData();
            renderChecklist();
          })
        );
      } else {
        const text = document.createElement("span");
        text.textContent = item.task;
        if (item.placeholder) text.classList.add("placeholder-text");
        label.append(checkbox, text);
        row.append(label);
      }

      elements.checklist.append(row);
    });
  }

  function renderAll() {
    renderMeta();
    renderTabs();
    renderSchedule();
    renderVisitList();
    renderChecklist();
  }

  function setEditMode(enabled) {
    editMode = enabled;
    elements.body.classList.toggle("edit-mode", enabled);
    elements.editButton.setAttribute("aria-pressed", String(enabled));
    elements.editButton.textContent = enabled ? "Finish editing" : "Edit planner";
    renderSchedule();
    renderVisitList();
    renderChecklist();
    if (enabled) showToast("Editing is on. Changes save in this browser.");
  }

  function addScheduleItem() {
    data.days[activeDay].items.push({
      time: "Add time",
      place: "Add activity or place",
      note: "Add a short note, reservation detail, or travel cue.",
      placeholder: true
    });
    saveData();
    renderSchedule();
    focusLast(".timeline-row .editable-field");
  }

  function addVisitItem() {
    data.toVisit.push({
      place: "Add a place to consider",
      note: "Optional neighborhood, reason, or link note",
      placeholder: true
    });
    saveData();
    renderVisitList();
    focusLast(".visit-item .editable-field");
  }

  function addChecklistItem() {
    data.checklist.push({ task: "Add a planning task", done: false, placeholder: true });
    saveData();
    renderChecklist();
    focusLast(".checklist-item .editable-field");
  }

  function focusLast(selector) {
    const fields = document.querySelectorAll(selector);
    const last = fields[fields.length - 1];
    if (last) {
      last.focus();
      last.select();
    }
  }

  function exportData() {
    const contents = [
      "/* LA TRIP CONTENT — edit this object to update the website. */",
      "",
      `window.TRIP_DATA = ${JSON.stringify(data, null, 2)};`,
      ""
    ].join("\n");
    const blob = new Blob([contents], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trip-data.js";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Updated trip-data.js downloaded.");
  }

  function resetData() {
    const confirmed = window.confirm(
      "Reset all browser edits and checklist progress to the contents of trip-data.js?"
    );
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    data = clone(sourceData);
    activeDay = 0;
    renderAll();
    showToast("Browser edits reset.");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  elements.editButton.addEventListener("click", () => setEditMode(!editMode));
  document.querySelector("#add-schedule-item").addEventListener("click", addScheduleItem);
  document.querySelector("#add-visit-item").addEventListener("click", addVisitItem);
  document.querySelector("#add-checklist-item").addEventListener("click", addChecklistItem);
  document.querySelector("#export-button").addEventListener("click", exportData);
  document.querySelector("#reset-button").addEventListener("click", resetData);

  renderAll();
})();
