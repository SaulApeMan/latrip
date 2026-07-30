(function () {
  "use strict";

  const STORAGE_KEY = "la-trip-planner-data-v1";
  const ACTIVE_DAY_KEY = "la-trip-planner-active-day";
  const ACTIVE_VIEW_KEY = "la-trip-planner-active-view";
  const MAP_FILTER_KEY = "la-trip-planner-map-filter";
  const DATA_VERSION_KEY = "la-trip-planner-data-version";
  const DATA_VERSION = 19;
  const sourceData = window.TRIP_DATA;
  const MIGRATED_MAP_ONLY_PLACE_IDS = new Set(["vandenberg-falcon-9-launch-site"]);
  const CATEGORY_ICONS = {
    animals: { letter: "A", label: "Animals" },
    food: { letter: "F", label: "Food / restaurant" },
    hotel: { letter: "H", label: "Hotel" },
    shop: { letter: "S", label: "Shop" },
    science: { letter: "M", label: "Museum / science" },
    sightseeing: { letter: "L", label: "Landmark / venue" }
  };
  let data = normalizeData(loadData());
  let activeDay = clamp(Number(localStorage.getItem(ACTIVE_DAY_KEY)) || 0, 0, data.days.length - 1);
  let activeView = localStorage.getItem(ACTIVE_VIEW_KEY) || `day-${activeDay}`;
  let activeMapFilter = localStorage.getItem(MAP_FILTER_KEY) || "all";
  let activeVisitFilter = "all";
  if (
    activeMapFilter !== "all" &&
    (!Number.isInteger(Number(activeMapFilter)) ||
      Number(activeMapFilter) < 0 ||
      Number(activeMapFilter) >= data.days.length)
  ) {
    activeMapFilter = "all";
  }
  if (/^day-\d+$/.test(activeView)) {
    activeDay = clamp(Number(activeView.split("-")[1]), 0, data.days.length - 1);
    activeView = `day-${activeDay}`;
  }
  let editMode = false;
  let toastTimer;
  let laMap;
  let mapMarkerLayer;
  let mapRouteLayer;
  let mapFallbackTimer;
  let mapRouteRenderToken = 0;
  let categoryMapMarkers = [];
  const mapRouteCache = new Map();

  const elements = {
    body: document.body,
    tabs: document.querySelector("#primary-tabs"),
    schedulePanel: document.querySelector("#day-schedule"),
    visitPanel: document.querySelector("#to-visit-panel"),
    checklistPanel: document.querySelector("#checklist-panel"),
    mapPanel: document.querySelector("#map-panel"),
    mapContainer: document.querySelector("#la-map"),
    mapFallback: document.querySelector("#map-fallback"),
    mapDayFilter: document.querySelector("#map-day-filter"),
    mapRouteStatus: document.querySelector("#map-route-status"),
    mapGoogleRoute: document.querySelector("#map-google-route"),
    mapLegend: document.querySelector("#map-legend"),
    fixedBlocksBefore: document.querySelector("#fixed-blocks-before"),
    fixedBlocksAfter: document.querySelector("#fixed-blocks-after"),
    timeline: document.querySelector("#timeline"),
    visitPlaceSelect: document.querySelector("#visit-place-select"),
    visitTimeInput: document.querySelector("#visit-time-input"),
    addFromVisitButton: document.querySelector("#add-from-visit-button"),
    dayKicker: document.querySelector("#day-kicker"),
    dayTitle: document.querySelector("#day-title"),
    daySummary: document.querySelector("#day-summary"),
    visitList: document.querySelector("#visit-list"),
    visitCategoryFilters: document.querySelector("#visit-category-filters"),
    visitCategoryStatus: document.querySelector("#visit-category-status"),
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

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function createUniquePlaceId(label, places) {
    const used = new Set(places.map((place) => place.id).filter(Boolean));
    const base = slugify(label) || "place";
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  function ensurePlaceIds(places) {
    const processed = [];
    places.forEach((place, index) => {
      const preferred = place.id || slugify(place.place) || `place-${index + 1}`;
      place.id = createUniquePlaceId(preferred, processed);
      processed.push(place);
    });
  }

  function getCategoryIcon(item) {
    let key = item.categoryKey;
    if (!CATEGORY_ICONS[key]) {
      const category = String(item.category || "").toLowerCase();
      if (/food|restaurant|burger|sausage/.test(category)) key = "food";
      else if (/shop|grocery|store/.test(category)) key = "shop";
      else if (/animal|aquarium|zoo|theme park/.test(category)) key = "animals";
      else if (/science|museum/.test(category)) key = "science";
      else key = "sightseeing";
    }
    return { key, ...CATEGORY_ICONS[key] };
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

  function normalizeData(value) {
    const normalized = value;
    const storedVersion = Number(localStorage.getItem(DATA_VERSION_KEY)) || 1;
    let normalizedChanged = false;
    normalized.meta.title = sourceData.meta.title;
    normalized.meta.intro = sourceData.meta.intro;
    normalized.meta.dates = sourceData.meta.dates;
    normalized.meta.eyebrow = sourceData.meta.eyebrow;
    sourceData.days.forEach((sourceDay, index) => {
      if (!normalized.days[index]) {
        normalized.days.push(clone(sourceDay));
        normalizedChanged = true;
        return;
      }
      const day = normalized.days[index];
      day.label = sourceDay.label;
      day.date = sourceDay.date;
      day.title = sourceDay.title;
      if (
        storedVersion < DATA_VERSION &&
        (index === 0 || index === sourceData.days.length - 1)
      ) {
        day.summary = sourceDay.summary;
        normalizedChanged = true;
      }
      if (!Object.prototype.hasOwnProperty.call(day, "summary")) {
        day.summary = sourceDay.summary;
        normalizedChanged = true;
      }
      if (!Array.isArray(day.fixedBlocks)) {
        day.fixedBlocks = [];
        normalizedChanged = true;
      }
      if (storedVersion < DATA_VERSION) {
        sourceDay.fixedBlocks.forEach((sourceBlock) => {
          const existingBlock = day.fixedBlocks.find(
            (block) => block.label === sourceBlock.label
          );
          if (!existingBlock) {
            day.fixedBlocks.push(clone(sourceBlock));
            normalizedChanged = true;
            return;
          }
          ["kind", "startTime", "endTime", "note", "dayBoundary"].forEach((field) => {
            if (existingBlock[field] !== sourceBlock[field]) {
              existingBlock[field] = clone(sourceBlock[field]);
              normalizedChanged = true;
            }
          });
        });
      }
    });
    if (!Array.isArray(normalized.toVisit)) {
      normalized.toVisit = [];
      normalizedChanged = true;
    }
    if (mergeDefaultPlaces(normalized.toVisit, sourceData.toVisit)) {
      normalizedChanged = true;
    }
    if (!Array.isArray(normalized.mapOnlyPins)) {
      normalized.mapOnlyPins = [];
      normalizedChanged = true;
    }
    if (mergeDefaultMapOnlyPins(normalized.mapOnlyPins, sourceData.mapOnlyPins || [])) {
      normalizedChanged = true;
    }
    const mapOnlyCountBeforeMigration = normalized.mapOnlyPins.length;
    normalized.mapOnlyPins = normalized.mapOnlyPins.filter(
      (pin) => !MIGRATED_MAP_ONLY_PLACE_IDS.has(pin.id)
    );
    if (normalized.mapOnlyPins.length !== mapOnlyCountBeforeMigration) {
      normalizedChanged = true;
    }
    if (storedVersion < DATA_VERSION) {
      localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
    }
    const placeIdsBefore = normalized.toVisit.map((place) => place.id || "").join("|");
    ensurePlaceIds(normalized.toVisit);
    if (placeIdsBefore !== normalized.toVisit.map((place) => place.id || "").join("|")) {
      normalizedChanged = true;
    }
    if (normalizedChanged) {
      persistNormalizedData(normalized);
    }
    return normalized;
  }

  function mergeDefaultPlaces(existingPlaces, defaultPlaces) {
    let changed = false;

    defaultPlaces.forEach((defaultPlace) => {
      const stableId = defaultPlace.id;
      let existing = stableId
        ? existingPlaces.find((place) => place.id === stableId)
        : null;

      if (!existing) {
        const normalizedName = String(defaultPlace.place || "").trim().toLowerCase();
        existing = existingPlaces.find(
          (place) => String(place.place || "").trim().toLowerCase() === normalizedName
        );
      }

      if (!existing) {
        existingPlaces.push(clone(defaultPlace));
        changed = true;
        return;
      }

      if (!existing.id && stableId) {
        existing.id = stableId;
        changed = true;
      }

      Object.entries(defaultPlace).forEach(([field, defaultValue]) => {
        if (field === "icon" && existing.icon !== defaultValue) {
          existing.icon = clone(defaultValue);
          changed = true;
        } else if (!Object.prototype.hasOwnProperty.call(existing, field)) {
          existing[field] = clone(defaultValue);
          changed = true;
        }
      });
    });

    return changed;
  }

  function mergeDefaultMapOnlyPins(existingPins, defaultPins) {
    let changed = false;

    defaultPins.forEach((defaultPin) => {
      let existing = defaultPin.id
        ? existingPins.find((pin) => pin.id === defaultPin.id)
        : null;

      if (!existing) {
        existing = existingPins.find((pin) => pin.label === defaultPin.label);
      }

      if (!existing) {
        existingPins.push(clone(defaultPin));
        changed = true;
        return;
      }

      Object.entries(defaultPin).forEach(([field, defaultValue]) => {
        if (!Object.prototype.hasOwnProperty.call(existing, field)) {
          existing[field] = clone(defaultValue);
          changed = true;
        }
      });
    });

    return changed;
  }

  function persistNormalizedData(normalized) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.warn("Updated trip defaults could not be saved in this browser.", error);
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
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
    const views = getViews();
    const dayRow = document.createElement("div");
    const utilityRow = document.createElement("div");
    dayRow.className = "tab-row day-tab-row";
    utilityRow.className = "tab-row utility-tab-row";
    dayRow.setAttribute("role", "presentation");
    utilityRow.setAttribute("role", "presentation");

    if (!views.some((view) => view.key === activeView)) {
      activeView = "day-0";
      activeDay = 0;
    }

    views.forEach((view) => {
      const button = document.createElement("button");
      const label = document.createElement("span");
      const meta = document.createElement("span");
      const accentClass =
        view.type === "day" ? `day-tone-${view.dayIndex + 1}` : `utility-${view.key}`;
      button.className =
        `primary-tab${view.type === "utility" ? " utility-tab" : ""} ${accentClass}`;
      button.type = "button";
      button.id = `primary-tab-${view.key}`;
      button.role = "tab";
      button.setAttribute("aria-label", view.ariaLabel);
      button.setAttribute("aria-selected", String(view.key === activeView));
      button.setAttribute("aria-controls", view.panelId);
      button.tabIndex = view.key === activeView ? 0 : -1;
      label.className = "tab-label";
      label.textContent = view.label;
      meta.className = "tab-meta";
      meta.textContent = view.meta;
      button.append(label, meta);
      button.addEventListener("click", () =>
        selectView(view.key, { scrollUtilityIntoView: view.type === "utility" })
      );
      button.addEventListener("keydown", handleTabKeydown);
      (view.type === "day" ? dayRow : utilityRow).append(button);
    });

    elements.tabs.append(dayRow, utilityRow);
  }

  function getViews() {
    const dayViews = data.days.map((day, index) => ({
      key: `day-${index}`,
      label: day.label,
      meta: compactDate(day.date),
      ariaLabel: `${day.label}, ${day.date}`,
      panelId: "day-schedule",
      type: "day",
      dayIndex: index
    }));

    return [
      ...dayViews,
      {
        key: "to-visit",
        label: "To Visit",
        meta: "Places",
        ariaLabel: "To Visit places",
        panelId: "to-visit-panel",
        type: "utility"
      },
      {
        key: "checklist",
        label: "Trip Checklist",
        meta: "Trip prep",
        ariaLabel: "Trip Checklist",
        panelId: "checklist-panel",
        type: "utility"
      },
      {
        key: "map",
        label: "LA Map",
        meta: "Pins",
        ariaLabel: "LA Map",
        panelId: "map-panel",
        type: "utility"
      }
    ];
  }

  function compactDate(date) {
    return date.replace(", September", " · Sep");
  }

  function handleTabKeydown(event) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const views = getViews();
    const currentIndex = views.findIndex((view) => view.key === activeView);
    const lastIndex = views.length - 1;
    let nextIndex = currentIndex;

    if (event.key === "ArrowLeft") nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    if (event.key === "ArrowRight") nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    selectView(views[nextIndex].key);
    document.querySelector(`#primary-tab-${views[nextIndex].key}`).focus();
  }

  function selectView(viewKey, options = {}) {
    const view = getViews().find((candidate) => candidate.key === viewKey);
    if (!view) return;

    activeView = view.key;
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    if (view.type === "day") {
      activeDay = view.dayIndex;
      localStorage.setItem(ACTIVE_DAY_KEY, String(activeDay));
      renderSchedule();
    }
    renderTabs();
    updatePanelVisibility();
    if (view.type === "utility" && options.scrollUtilityIntoView) {
      scrollUtilityPanelIntoView(view);
    }
  }

  function scrollUtilityPanelIntoView(view) {
    const panel = document.querySelector(`#${view.panelId}`);
    if (!panel) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.requestAnimationFrame(() => {
      panel.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
      if (view.key === "map") scheduleMapResize();
    });
  }

  function updatePanelVisibility() {
    const isDay = activeView.startsWith("day-");
    elements.schedulePanel.hidden = !isDay;
    elements.visitPanel.hidden = activeView !== "to-visit";
    elements.checklistPanel.hidden = activeView !== "checklist";
    elements.mapPanel.hidden = activeView !== "map";

    if (isDay) {
      elements.schedulePanel.setAttribute("aria-labelledby", `primary-tab-${activeView}`);
    } else if (activeView === "to-visit") {
      elements.visitPanel.setAttribute("aria-labelledby", "primary-tab-to-visit");
    } else if (activeView === "checklist") {
      elements.checklistPanel.setAttribute("aria-labelledby", "primary-tab-checklist");
    } else {
      elements.mapPanel.setAttribute("aria-labelledby", "primary-tab-map");
      initializeMap();
    }
  }

  function renderSchedule() {
    const day = data.days[activeDay];
    elements.dayKicker.textContent = `${day.date} · Los Angeles time`;
    elements.dayTitle.textContent = day.title;
    elements.daySummary.textContent = day.summary;
    elements.timeline.replaceChildren();
    renderFixedBlocks(day);

    if (!day.items.length) {
      elements.timeline.append(createEmptyState("No activities planned yet."));
      renderVisitPicker();
      return;
    }

    day.items.forEach((item, index) => {
      const row = document.createElement("article");
      row.className = "timeline-row";

      if (editMode) {
        const placeField = item.placeId
          ? createMasterPlaceReference(item)
          : createInput(item.place, "Activity or place", (value) => {
              updateSchedule(index, "place", value);
            });
        const tools = createScheduleItemTools(item, index);
        row.append(
          createInput(item.time, "Time in Los Angeles", (value) => {
            updateSchedule(index, "time", value);
          }, { placeholder: item.placeId ? "TBD" : "Add time" }),
          placeField,
          createTextarea(
            item.note,
            "Short note",
            (value) => updateSchedule(index, "note", value),
            { placeholder: item.placeId ? "Add a short note" : "" }
          ),
          tools
        );
      } else {
        const place = resolveSchedulePlace(item);
        const note = item.note || (item.placeId ? "Add a short note" : "");
        row.append(
          createText("time", item.time, item.placeholder),
          createText("place", place?.place || item.place, item.placeholder),
          createText("note", note, item.placeholder || !item.note)
        );
      }

      elements.timeline.append(row);
    });
    renderVisitPicker();
  }

  function renderFixedBlocks(day) {
    elements.fixedBlocksBefore.replaceChildren();
    elements.fixedBlocksAfter.replaceChildren();

    (day.fixedBlocks || []).forEach((block, index) => {
      const target =
        block.dayBoundary === "ends-before"
          ? elements.fixedBlocksAfter
          : elements.fixedBlocksBefore;
      target.append(createFixedBlock(block, index));
    });
  }

  function createFixedBlock(block, index) {
    const article = document.createElement("article");
    const boundaryClass =
      block.dayBoundary === "ends-before" ? "ends-before" : "starts-after";
    article.className = `fixed-block fixed-block-${block.kind || "commitment"} fixed-boundary-${boundaryClass}`;

    if (editMode) {
      const fields = document.createElement("div");
      const tools = document.createElement("div");
      fields.className = "fixed-block-edit-fields";
      tools.className = "fixed-block-tools";
      fields.append(
        createInput(block.label, "Fixed block label", (value) => {
          updateFixedBlock(index, "label", value || "Fixed commitment");
        }),
        createInput(block.startTime, "Fixed block start time", (value) => {
          updateFixedBlock(index, "startTime", value);
        }, { type: "time" }),
        createInput(block.endTime || "", "Fixed block end time (optional)", (value) => {
          updateFixedBlock(index, "endTime", value);
        }, { type: "time" }),
        createTextarea(block.note || "", "Fixed block note", (value) => {
          updateFixedBlock(index, "note", value);
        })
      );
      tools.append(
        createDeleteButton(`Remove ${block.label || "fixed block"}`, () => {
          data.days[activeDay].fixedBlocks.splice(index, 1);
          saveData();
          renderSchedule();
        })
      );
      article.append(fields, tools);
      return article;
    }

    const time = document.createElement("p");
    const kicker = document.createElement("p");
    const title = document.createElement("h3");
    const note = document.createElement("p");
    const boundary = document.createElement("p");
    time.className = "fixed-block-time";
    kicker.className = "fixed-block-kicker";
    note.className = "fixed-block-note";
    boundary.className = "fixed-block-boundary";
    time.textContent = formatTimeRange(block.startTime, block.endTime);
    kicker.textContent = block.kind === "travel" ? "Travel block" : "Fixed block";
    title.textContent = block.label || "Fixed commitment";
    note.textContent = block.note || "";
    boundary.textContent =
      block.dayBoundary === "ends-before"
        ? "Day ends here · Plan activities before departure."
        : "Day begins here · Plan activities after arrival.";
    article.append(time, kicker, title);
    if (note.textContent) article.append(note);
    article.append(boundary);
    return article;
  }

  function updateFixedBlock(index, field, value) {
    const block = data.days[activeDay].fixedBlocks[index];
    if (!block) return;
    block[field] = value;
    saveData();
  }

  function formatTimeRange(startTime, endTime) {
    const start = formatLocalTime(startTime) || "Time TBD";
    const end = formatLocalTime(endTime);
    return `${end ? `${start}–${end}` : start} · Los Angeles time`;
  }

  function formatLocalTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return "";
    const hours = Number(match[1]);
    const minutes = match[2];
    if (hours < 0 || hours > 23) return "";
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  }

  function resolveSchedulePlace(item) {
    if (!item.placeId) return null;
    return data.toVisit.find((place) => place.id === item.placeId) || null;
  }

  function createMasterPlaceReference(item) {
    const masterPlace = resolveSchedulePlace(item);
    const reference = document.createElement("div");
    const label = document.createElement("span");
    const name = document.createElement("h3");
    reference.className = "master-place-reference";
    label.textContent = "From To Visit";
    name.textContent = masterPlace?.place || "Missing To Visit place";
    reference.append(label, name);
    return reference;
  }

  function createScheduleItemTools(item, index) {
    const tools = document.createElement("div");
    tools.className = "schedule-item-tools";

    if (item.placeId) {
      const move = document.createElement("select");
      move.className = "move-day-select";
      move.setAttribute("aria-label", `Move ${resolveSchedulePlace(item)?.place || "place"} to another day`);
      data.days.forEach((day, dayIndex) => {
        const option = document.createElement("option");
        option.value = String(dayIndex);
        option.textContent = day.label;
        option.selected = dayIndex === activeDay;
        move.append(option);
      });
      move.addEventListener("change", () => moveScheduleItem(index, Number(move.value)));
      tools.append(move);
    }

    tools.append(
      createDeleteButton("Remove schedule item", () => {
        data.days[activeDay].items.splice(index, 1);
        saveData();
        renderSchedule();
      })
    );
    return tools;
  }

  function moveScheduleItem(index, destinationDay) {
    if (destinationDay === activeDay || !data.days[destinationDay]) return;
    const [item] = data.days[activeDay].items.splice(index, 1);
    data.days[destinationDay].items.push(item);
    saveData();
    renderSchedule();
    showToast(`Place moved to ${data.days[destinationDay].label}.`);
  }

  function renderVisitPicker() {
    const selectedId = elements.visitPlaceSelect.value;
    elements.visitPlaceSelect.replaceChildren();

    data.toVisit.forEach((place) => {
      const assignedDays = data.days
        .map((day, index) => day.items.some((item) => item.placeId === place.id) ? index : -1)
        .filter((index) => index >= 0);
      const status = assignedDays.length
        ? assignedDays.map((index) => data.days[index].label).join(", ")
        : "unplanned";
      const option = document.createElement("option");
      option.value = place.id;
      option.textContent = `${place.place} — ${status}`;
      option.selected = place.id === selectedId;
      elements.visitPlaceSelect.append(option);
    });

    const hasPlaces = data.toVisit.length > 0;
    elements.visitPlaceSelect.disabled = !hasPlaces;
    elements.visitTimeInput.disabled = !hasPlaces;
    elements.addFromVisitButton.disabled = !hasPlaces;
  }

  function addFromVisit() {
    const placeId = elements.visitPlaceSelect.value;
    const masterPlace = data.toVisit.find((place) => place.id === placeId);
    if (!masterPlace) return;

    const day = data.days[activeDay];
    if (day.items.length === 1 && isSchedulePlaceholder(day.items[0])) {
      day.items.length = 0;
    }
    day.items.push({
      time: elements.visitTimeInput.value.trim() || "TBD",
      placeId,
      note: "",
      placeholder: false
    });
    elements.visitTimeInput.value = "TBD";
    saveData();
    renderSchedule();
    showToast(`${masterPlace.place} added to ${data.days[activeDay].label}.`);
  }

  function createText(type, value, isPlaceholder) {
    const element = document.createElement(type === "place" ? "h3" : "div");
    element.className = `timeline-${type}${isPlaceholder ? " placeholder-text" : ""}`;
    element.textContent = value;
    return element;
  }

  function createInput(value, label, onChange, options = {}) {
    const input = document.createElement("input");
    input.className = "editable-field";
    input.type = options.type || "text";
    input.value = value ?? "";
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.maxLength) input.maxLength = options.maxLength;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => onChange(input.value.trim()));
    return input;
  }

  function createTextarea(value, label, onChange, options = {}) {
    const textarea = document.createElement("textarea");
    textarea.className = "editable-field";
    textarea.value = value;
    if (options.placeholder) textarea.placeholder = options.placeholder;
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
    const referencedFallbacks = { time: "TBD", note: "" };
    const fallback = item.placeId && Object.prototype.hasOwnProperty.call(referencedFallbacks, field)
      ? referencedFallbacks[field]
      : defaults[field];
    item[field] = value || fallback;
    item.placeholder = isSchedulePlaceholder(item);
    saveData();
  }

  function isSchedulePlaceholder(item) {
    if (item.placeId) return false;
    return (
      !item.place ||
      item.place === "Add activity or place" ||
      item.time === "Add time"
    );
  }

  function renderVisitList() {
    elements.visitList.replaceChildren();
    const filteredPlaces = data.toVisit.filter(
      (item) =>
        activeVisitFilter === "all" || getCategoryIcon(item).key === activeVisitFilter
    );

    if (!filteredPlaces.length) {
      const categoryLabel =
        activeVisitFilter === "all"
          ? ""
          : CATEGORY_ICONS[activeVisitFilter]?.label || "this category";
      elements.visitList.append(
        createEmptyState(
          activeVisitFilter === "all"
            ? "No places saved yet. Switch on editing to add one."
            : `No To Visit places are currently listed for ${categoryLabel}.`
        )
      );
      return;
    }

    data.toVisit.forEach((item, index) => {
      if (
        activeVisitFilter !== "all" &&
        getCategoryIcon(item).key !== activeVisitFilter
      ) {
        return;
      }
      const row = document.createElement("li");
      row.className = "visit-item";
      row.dataset.placeId = item.id;

      if (editMode) {
        const fields = document.createElement("div");
        fields.className = "visit-edit-fields";
        fields.append(
          createInput(item.place, "Place to visit", (value) => {
            item.place = value || "Add a place to consider";
            item.placeholder = !value;
            saveData();
            renderMapMarkers();
          }),
          createInput(item.note, "Place note", (value) => {
            item.note = value;
            saveData();
            renderMapMarkers();
          }),
          createInput(item.category || "", "Place category", (value) => {
            item.category = value;
            saveData();
          }),
          createCategorySelect(item, (value) => {
            item.categoryKey = value;
            const categoryIcon = getCategoryIcon(item);
            item.icon = categoryIcon.letter;
            saveData();
            renderVisitList();
            renderMapMarkers();
          }),
          createInput(item.estimatedTicket || "", "Estimated ticket", (value) => {
            item.estimatedTicket = value;
            saveData();
          }, { placeholder: "Estimated ticket, e.g. $50" }),
          createInput(item.estimatedParking || "", "Estimated parking", (value) => {
            item.estimatedParking = value;
            saveData();
          }, { placeholder: "Estimated parking, e.g. $20 or confirm" }),
          createInput(item.mapLabel || "", "Short map label (optional)", (value) => {
            item.mapLabel = value;
            saveData();
            renderMapMarkers();
          }),
          createCoordinateInput(item.coordinates?.lat, "Latitude (optional)", (value) => {
            updateCoordinate(item, "lat", value);
          }),
          createCoordinateInput(item.coordinates?.lng, "Longitude (optional)", (value) => {
            updateCoordinate(item, "lng", value);
          }),
          createInput(item.officialUrl || "", "Official website URL", (value) => {
            item.officialUrl = value;
            saveData();
          }, { type: "url", placeholder: "Official website URL" }),
          createInput(item.googleMapsUrl || "", "Google Maps or reviews URL", (value) => {
            item.googleMapsUrl = value;
            saveData();
          }, { type: "url", placeholder: "Google Maps or reviews URL" })
        );
        row.append(
          createPlaceIcon(item),
          fields,
          createDeleteButton("Remove place", () => {
            data.toVisit.splice(index, 1);
            saveData();
            renderVisitList();
            renderMapMarkers();
          })
        );
      } else {
        const copy = document.createElement("div");
        const category = document.createElement("p");
        const place = document.createElement("strong");
        const note = document.createElement("p");
        copy.className = "visit-copy";
        category.className = "visit-category";
        category.textContent = item.category || "Place";
        place.textContent = item.place;
        note.textContent = item.note;
        if (item.placeholder) {
          place.classList.add("placeholder-text");
          note.classList.add("placeholder-text");
        }
        copy.append(category, place, note);
        row.append(createPlaceIcon(item), copy, createVisitActions(item));
      }

      elements.visitList.append(row);
    });
  }

  function renderVisitCategoryFilters() {
    if (!elements.visitCategoryFilters || !elements.visitCategoryStatus) return;
    elements.visitCategoryFilters.replaceChildren();

    Object.entries(CATEGORY_ICONS).forEach(([key, config]) => {
      const button = document.createElement("button");
      const badge = document.createElement("span");
      const label = document.createElement("span");
      const isActive = activeVisitFilter === key;
      button.type = "button";
      button.className = `visit-category-filter category-icon-${key}`;
      button.setAttribute("aria-pressed", String(isActive));
      button.setAttribute("aria-label", `${config.letter}: ${config.label}`);
      button.title = `${config.letter}: ${config.label}`;
      badge.className = "visit-category-filter-badge";
      badge.textContent = config.letter;
      badge.setAttribute("aria-hidden", "true");
      label.className = "visit-category-filter-name";
      label.textContent = config.label;
      button.append(badge, label);
      button.addEventListener("click", () => {
        activeVisitFilter = activeVisitFilter === key ? "all" : key;
        renderVisitCategoryFilters();
        renderVisitList();
      });
      elements.visitCategoryFilters.append(button);
    });

    if (activeVisitFilter === "all") {
      elements.visitCategoryStatus.textContent = `Showing all ${data.toVisit.length} places.`;
      return;
    }

    const visibleCount = data.toVisit.filter(
      (item) => getCategoryIcon(item).key === activeVisitFilter
    ).length;
    elements.visitCategoryStatus.textContent =
      `Showing ${visibleCount} ${CATEGORY_ICONS[activeVisitFilter].label} ` +
      `${visibleCount === 1 ? "place" : "places"}. Select the active badge again to show all.`;
  }

  function createPlaceIcon(item) {
    const categoryIcon = getCategoryIcon(item);
    const icon = document.createElement("span");
    const symbol = document.createElement("span");
    icon.className = `place-icon category-icon-${categoryIcon.key}`;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", categoryIcon.label);
    icon.title = categoryIcon.label;
    symbol.className = "category-icon-symbol";
    symbol.textContent = categoryIcon.letter;
    symbol.setAttribute("aria-hidden", "true");
    icon.append(symbol);
    return icon;
  }

  function createCategorySelect(item, onChange) {
    const select = document.createElement("select");
    const selected = getCategoryIcon(item).key;
    select.className = "editable-field";
    select.setAttribute("aria-label", "Place icon category");

    Object.entries(CATEGORY_ICONS)
      .filter(([key]) => key !== "hotel")
      .forEach(([key, config]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = `${config.letter} — ${config.label}`;
      option.selected = key === selected;
      select.append(option);
      });

    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function createVisitActions(item) {
    const actions = document.createElement("div");
    const links = document.createElement("div");
    actions.className = "visit-actions";
    links.className = "visit-action-links";
    actions.append(createShowOnMapButton(item));
    const estimates = createVisitEstimates(item);
    if (estimates) actions.append(estimates);

    const actionLinks = [
      ["Google Reviews", item.googleMapsUrl, "google-reviews"],
      ["Official Site", item.officialUrl, "official-site"]
    ];
    (item.extraLinks || []).forEach((extraLink) => {
      actionLinks.push([extraLink.label, extraLink.url, "resource"]);
    });

    actionLinks.forEach(([label, url, style]) => {
      if (!isSafeExternalUrl(url)) return;
      const link = document.createElement("a");
      const arrow = document.createElement("span");
      link.className = `visit-action-link visit-action-${style}`;
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `${label} for ${item.place} (opens in a new tab)`);
      link.append(document.createTextNode(label), arrow);
      arrow.textContent = "↗";
      arrow.setAttribute("aria-hidden", "true");
      links.append(link);
    });

    if (links.childElementCount) actions.append(links);
    return actions;
  }

  function createShowOnMapButton(item) {
    const button = document.createElement("button");
    const glyph = document.createElement("span");
    const canMap = hasMapCoordinates(item);
    button.className = "visit-map-action";
    button.type = "button";
    button.disabled = !canMap;
    button.title = canMap ? "Show on map" : "Map location unavailable";
    button.setAttribute(
      "aria-label",
      canMap ? `Show ${item.place} on map` : `Map location unavailable for ${item.place}`
    );
    glyph.className = "visit-map-action-glyph";
    glyph.textContent = "⌖";
    glyph.setAttribute("aria-hidden", "true");
    button.append(glyph);
    if (canMap) button.addEventListener("click", () => showPlaceOnMap(item.id));
    return button;
  }

  function showPlaceOnMap(placeId) {
    const place = data.toVisit.find((item) => item.id === placeId);
    if (!place || !hasMapCoordinates(place)) return;

    activeMapFilter = "all";
    activeView = "map";
    localStorage.setItem(MAP_FILTER_KEY, activeMapFilter);
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    renderTabs();
    renderMapFilter();
    updatePanelVisibility();
    scrollUtilityPanelIntoView(
      getViews().find((view) => view.key === "map")
    );
    scheduleMapResize();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => focusPlaceMarker(place));
    });
  }

  function focusPlaceMarker(place) {
    if (!laMap || elements.mapPanel.hidden) return;
    const markerEntry = categoryMapMarkers.find((entry) => entry.placeId === place.id);
    if (!markerEntry) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      updateCategoryMarkerScale();
      markerEntry.marker.openPopup();
      window.requestAnimationFrame(() => {
        const markerElement = markerEntry.marker.getElement();
        if (!markerElement) return;
        markerElement.classList.add("is-place-highlighted");
        window.setTimeout(
          () => markerElement.classList.remove("is-place-highlighted"),
          reduceMotion ? 900 : 1900
        );
      });
      showToast(`Showing ${place.place} on the map.`);
    };

    laMap.once("moveend", reveal);
    laMap.setView(
      [Number(place.coordinates.lat), Number(place.coordinates.lng)],
      14,
      { animate: !reduceMotion }
    );
    window.setTimeout(reveal, reduceMotion ? 0 : 650);
  }

  function createVisitEstimates(item) {
    const values = [
      ["Est. ticket", item.estimatedTicket],
      ["Est. parking", item.estimatedParking]
    ].filter(([, value]) => value);
    if (!values.length) return null;

    const estimates = document.createElement("div");
    estimates.className = "visit-estimates";
    estimates.setAttribute("aria-label", `Planning estimates for ${item.place}`);

    values.forEach(([label, value]) => {
      const line = document.createElement("p");
      const term = document.createElement("span");
      const amount = document.createElement("strong");
      line.className = "visit-estimate";
      term.textContent = label;
      amount.textContent = value;
      line.append(term, amount);
      estimates.append(line);
    });

    return estimates;
  }

  function isSafeExternalUrl(value) {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
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

  function renderMapFilter() {
    elements.mapDayFilter.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All places";
    elements.mapDayFilter.append(allOption);

    data.days.forEach((day, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = day.label;
      elements.mapDayFilter.append(option);
    });

    elements.mapDayFilter.value = activeMapFilter;
  }

  function renderMapLegend() {
    elements.mapLegend.replaceChildren();
    ["animals", "food", "hotel", "shop", "science", "sightseeing"].forEach((key) => {
      const config = CATEGORY_ICONS[key];
      const item = document.createElement("li");
      const badge = document.createElement("span");
      const label = document.createElement("span");
      badge.className = `map-legend-badge category-icon-${key}`;
      badge.textContent = config.letter;
      badge.setAttribute("aria-hidden", "true");
      label.textContent = config.label;
      item.title = `${config.letter} — ${config.label}`;
      item.setAttribute("aria-label", `${config.letter} means ${config.label}`);
      item.append(badge, label);
      elements.mapLegend.append(item);
    });
  }

  function selectMapFilter(value) {
    const dayIndex = Number(value);
    activeMapFilter =
      value === "all" ||
      (Number.isInteger(dayIndex) && dayIndex >= 0 && dayIndex < data.days.length)
        ? value
        : "all";
    localStorage.setItem(MAP_FILTER_KEY, activeMapFilter);
    renderMapMarkers();
  }

  function initializeMap() {
    if (laMap) {
      renderMapMarkers();
      scheduleMapResize();
      return;
    }

    if (!window.L) {
      showMapFallback();
      return;
    }

    try {
      laMap = window.L.map(elements.mapContainer, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: true
      }).setView([34.05, -118.35], 9);

      window.L.control.zoom({ position: "topright" }).addTo(laMap);

      const tileLayer = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(laMap);

      let tileErrors = 0;
      let tileLayerSettled = false;

      tileLayer.on("load", () => {
        tileLayerSettled = true;
        window.clearTimeout(mapFallbackTimer);
        mapFallbackTimer = undefined;
        elements.mapFallback.hidden = tileErrors >= 3 ? false : true;
      });

      tileLayer.on("tileerror", () => {
        tileErrors += 1;
        if (tileErrors >= 3) showMapFallback();
      });

      mapFallbackTimer = window.setTimeout(() => {
        if (!tileLayerSettled) showMapFallback();
      }, 8000);
      mapRouteLayer = window.L.layerGroup().addTo(laMap);
      mapMarkerLayer = window.L.layerGroup().addTo(laMap);
      laMap.on("zoomend", updateCategoryMarkerScale);
      renderMapMarkers();
      scheduleMapResize();
    } catch (error) {
      console.warn("The LA map could not be initialized.", error);
      showMapFallback();
    }
  }

  function scheduleMapResize() {
    if (!laMap || elements.mapPanel.hidden) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!elements.mapPanel.hidden) {
          laMap.invalidateSize({ animate: false, pan: false });
          updateCategoryMarkerScale();
        }
      });
    });
  }

  function renderMapMarkers() {
    if (!mapMarkerLayer || !window.L) return;

    const renderToken = ++mapRouteRenderToken;
    mapMarkerLayer.clearLayers();
    mapRouteLayer?.clearLayers();
    categoryMapMarkers = [];

    if (activeMapFilter === "all") {
      data.toVisit
        .filter((item) => !item.placeholder && hasMapCoordinates(item))
        .forEach((item) => addPlaceMapMarker({ place: item }));
      addMapOnlyPins();
      setMapRouteStatus(
        "All confirmed places and map-only references are shown, including the generalized Hotel marker. Choose a day to review its route."
      );
      fitAllMapPoints();
      return;
    }

    const dayIndex = Number(activeMapFilter);
    const dayEntries = getDayMapEntries(dayIndex);
    dayEntries.forEach((entry, index) => addPlaceMapMarker(entry, index + 1));
    if (activeView !== "map") return;
    renderDayRoute(dayEntries, dayIndex, renderToken);
  }

  function hasMapCoordinates(item) {
    return (
      Number.isFinite(Number(item.coordinates?.lat)) &&
      Number.isFinite(Number(item.coordinates?.lng))
    );
  }

  function fitAllMapPoints() {
    const points = [
      ...data.toVisit
        .filter((item) => !item.placeholder && hasMapCoordinates(item))
        .map((item) => [Number(item.coordinates.lat), Number(item.coordinates.lng)]),
      ...(data.mapOnlyPins || [])
        .filter((pin) => hasMapCoordinates(pin))
        .map((pin) => [Number(pin.coordinates.lat), Number(pin.coordinates.lng)])
    ];

    if (!points.length) {
      laMap.setView([34.05, -118.35], 9);
      return;
    }

    laMap.fitBounds(window.L.latLngBounds(points), {
      padding: [42, 42],
      maxZoom: 9,
      animate: false
    });
  }

  function getDayMapEntries(dayIndex) {
    const day = data.days[dayIndex];
    if (!day) return [];

    return day.items
      .map((scheduleItem) => ({
        place: resolveSchedulePlace(scheduleItem),
        scheduleItem
      }))
      .filter(({ place }) => place && !place.placeholder && hasMapCoordinates(place));
  }

  function addPlaceMapMarker(entry, stopNumber) {
    const item = entry.place;
    const categoryIcon = getCategoryIcon(item);
    const lat = Number(item.coordinates.lat);
    const lng = Number(item.coordinates.lng);
    const popup = document.createElement("div");
    const category = document.createElement("span");
    const name = document.createElement("strong");
    const context = document.createElement("p");
    popup.className = "map-popup";
    category.className = "map-category-label";
    category.textContent = `${categoryIcon.letter} · ${categoryIcon.label}`;
    popup.append(category);

    if (stopNumber) {
      const order = document.createElement("span");
      order.className = "map-stop-order";
      order.textContent = `Stop ${stopNumber} · ${entry.scheduleItem.time || "TBD"}`;
      popup.append(order);
    }

    name.textContent = item.place;
    context.textContent = entry.scheduleItem?.note || item.note;
    popup.append(name, context);

    const marker = window.L.marker([lat, lng], {
      alt: `${item.place} — ${categoryIcon.label}`,
      title: `${item.mapLabel || item.place} — ${categoryIcon.label}`,
      icon: createCategoryMapIcon(categoryIcon, laMap?.getZoom())
    }).bindPopup(popup);

    const tooltip = document.createElement("span");
    tooltip.textContent = stopNumber
      ? `${stopNumber} · ${categoryIcon.label} · ${item.mapLabel || item.place}`
      : `${categoryIcon.label} · ${item.mapLabel || item.place}`;
    marker.bindTooltip(tooltip, {
      direction: "top",
      offset: [0, -12],
      opacity: 0.94
    });
    marker.addTo(mapMarkerLayer);
    categoryMapMarkers.push({ marker, categoryIcon, placeId: item.id });
  }

  function createCategoryMapIcon(categoryIcon, zoom = 9) {
    const dimensions = getCategoryMarkerDimensions(zoom);
    const marker = document.createElement("span");
    const symbol = document.createElement("span");
    marker.className = `category-map-marker category-icon-${categoryIcon.key}`;
    marker.title = categoryIcon.label;
    marker.setAttribute("aria-hidden", "true");
    marker.style.setProperty("--marker-body-size", `${dimensions.body}px`);
    marker.style.setProperty("--marker-symbol-size", `${dimensions.symbol}px`);
    symbol.className = "category-map-symbol";
    symbol.textContent = categoryIcon.letter;
    marker.append(symbol);

    return window.L.divIcon({
      className: "category-map-icon",
      html: marker,
      iconAnchor: [dimensions.width / 2, dimensions.height],
      iconSize: [dimensions.width, dimensions.height],
      popupAnchor: [0, -dimensions.height + 4],
      tooltipAnchor: [0, -dimensions.height + 7]
    });
  }

  function getCategoryMarkerDimensions(zoom) {
    const normalizedZoom = clamp(Number(zoom) || 9, 6, 16);
    const body = Math.round(clamp(40 + (normalizedZoom - 6) * 3.2, 40, 72));
    return {
      body,
      width: body + 8,
      height: body + 13,
      symbol: Math.round(clamp(body * 0.43, 18, 30))
    };
  }

  function updateCategoryMarkerScale() {
    if (!laMap || !window.L) return;
    const zoom = laMap.getZoom();
    categoryMapMarkers.forEach(({ marker, categoryIcon }) => {
      marker.setIcon(createCategoryMapIcon(categoryIcon, zoom));
    });
  }

  function addMapOnlyPins() {
    (data.mapOnlyPins || []).forEach((pin) => {
      const lat = Number(pin.coordinates?.lat);
      const lng = Number(pin.coordinates?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !pin.label) return;

      const popup = document.createElement("div");
      const category = document.createElement("span");
      const label = document.createElement("strong");
      const categoryIcon = getCategoryIcon(pin);
      popup.className = "map-popup";
      category.className = "map-category-label";
      category.textContent = `${categoryIcon.letter} · ${categoryIcon.label}`;
      label.textContent = pin.label;
      popup.append(category, label);

      if (pin.note) {
        const note = document.createElement("p");
        note.textContent = pin.note;
        popup.append(note);
      }

      if (pin.officialUrl) {
        const officialLink = document.createElement("a");
        officialLink.href = pin.officialUrl;
        officialLink.target = "_blank";
        officialLink.rel = "noopener noreferrer";
        officialLink.textContent = "Official source ↗";
        popup.append(officialLink);
      }

      const marker = window.L.marker([lat, lng], {
        alt: `${pin.label} — ${categoryIcon.label}`,
        title: `${pin.label} — ${categoryIcon.label}`,
        icon: createCategoryMapIcon(categoryIcon, laMap?.getZoom())
      })
        .bindPopup(popup)
        .bindTooltip(pin.label, {
          direction: "top",
          offset: [0, -12],
          opacity: 0.94
        });

      marker.addTo(mapMarkerLayer);
      categoryMapMarkers.push({ marker, categoryIcon });
    });
  }

  async function renderDayRoute(entries, dayIndex, renderToken) {
    const dayLabel = data.days[dayIndex]?.label || "Selected day";
    const points = entries.map(({ place }) => [
      Number(place.coordinates.lat),
      Number(place.coordinates.lng)
    ]);

    if (!points.length) {
      setMapRouteStatus(
        `${dayLabel} has no mapped To Visit places yet. Add places from a day schedule to begin planning.`
      );
      laMap.setView([34.05, -118.35], 9);
      return;
    }

    if (points.length === 1) {
      setMapRouteStatus(
        `${dayLabel} has one mapped stop. A route will appear after another mapped place is added.`
      );
      laMap.setView(points[0], 13);
      return;
    }

    const googleRouteUrl = createGoogleRouteUrl(points);
    setMapRouteStatus(
      `Calculating a driving route for ${dayLabel} in the existing schedule order…`,
      googleRouteUrl
    );
    laMap.fitBounds(points, { padding: [40, 40] });

    const geometry = await requestDrivableRoute(points);
    if (renderToken !== mapRouteRenderToken || activeMapFilter !== String(dayIndex)) return;

    if (geometry) {
      window.L.geoJSON(geometry, {
        style: {
          color: "#84afbf",
          opacity: 0.9,
          weight: 4
        }
      }).addTo(mapRouteLayer);
      setMapRouteStatus(
        `Driving route via OSRM for ${dayLabel}. Stops follow the existing schedule order; no optimization applied.`,
        googleRouteUrl
      );
      return;
    }

    window.L.polyline(points, {
      color: "#dc8b64",
      dashArray: "7 9",
      opacity: 0.85,
      weight: 3
    }).addTo(mapRouteLayer);
    setMapRouteStatus(
      `Visual planning line for ${dayLabel} — not a calculated driving route. Stops remain in schedule order.`,
      googleRouteUrl
    );
  }

  function setMapRouteStatus(message, googleRouteUrl = "") {
    elements.mapRouteStatus.textContent = message;
    elements.mapGoogleRoute.hidden = !googleRouteUrl;
    if (googleRouteUrl) {
      elements.mapGoogleRoute.href = googleRouteUrl;
      elements.mapGoogleRoute.setAttribute(
        "aria-label",
        "Open this route in Google Maps (opens in a new tab)"
      );
    } else {
      elements.mapGoogleRoute.removeAttribute("href");
      elements.mapGoogleRoute.removeAttribute("aria-label");
    }
  }

  function createGoogleRouteUrl(points) {
    const [origin, ...remaining] = points;
    const destination = remaining[remaining.length - 1];
    const waypoints = remaining.slice(0, -1);
    const params = new URLSearchParams({
      api: "1",
      origin: origin.join(","),
      destination: destination.join(","),
      travelmode: "driving"
    });
    if (waypoints.length) {
      params.set("waypoints", waypoints.map((point) => point.join(",")).join("|"));
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  function requestDrivableRoute(points) {
    const key = points
      .map(([lat, lng]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
      .join(";");
    if (mapRouteCache.has(key)) return mapRouteCache.get(key);

    const request = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      const url =
        `https://router.project-osrm.org/route/v1/driving/${key}` +
        "?overview=full&geometries=geojson&steps=false";
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        const result = await response.json();
        if (result.code !== "Ok" || !result.routes?.[0]?.geometry) return null;
        return result.routes[0].geometry;
      } catch (error) {
        console.warn("The driving route could not be loaded. Using a planning line instead.", error);
        return null;
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    mapRouteCache.set(key, request);
    return request;
  }

  function showMapFallback() {
    elements.mapFallback.hidden = false;
  }

  function renderAll() {
    renderMeta();
    renderTabs();
    renderSchedule();
    renderVisitCategoryFilters();
    renderVisitList();
    renderChecklist();
    renderMapFilter();
    renderMapLegend();
    renderMapMarkers();
    updatePanelVisibility();
  }

  function setEditMode(enabled) {
    editMode = enabled;
    elements.body.classList.toggle("edit-mode", enabled);
    if (elements.editButton) {
      elements.editButton.setAttribute("aria-pressed", String(enabled));
      elements.editButton.textContent = enabled ? "Finish editing" : "Edit planner";
    }
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
      id: createUniquePlaceId("custom-place", data.toVisit),
      place: "Add a place to consider",
      note: "Optional neighborhood, reason, or link note",
      category: "Sightseeing / venue",
      categoryKey: "sightseeing",
      icon: "L",
      officialUrl: "",
      googleMapsUrl: "",
      estimatedTicket: "",
      estimatedParking: "",
      mapLabel: "",
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

  function createCoordinateInput(value, label, onChange) {
    const input = document.createElement("input");
    input.className = "editable-field coordinate-field";
    input.type = "number";
    input.step = "any";
    input.inputMode = "decimal";
    input.value = value ?? "";
    input.placeholder = label;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => onChange(input.value.trim()));
    return input;
  }

  function updateCoordinate(item, key, value) {
    if (!item.coordinates || typeof item.coordinates !== "object") {
      item.coordinates = {};
    }

    if (value === "") {
      delete item.coordinates[key];
    } else {
      item.coordinates[key] = Number(value);
    }

    saveData();
    renderMapMarkers();
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
    localStorage.removeItem(ACTIVE_DAY_KEY);
    localStorage.removeItem(ACTIVE_VIEW_KEY);
    localStorage.removeItem(MAP_FILTER_KEY);
    localStorage.removeItem(DATA_VERSION_KEY);
    data = clone(sourceData);
    activeDay = 0;
    activeView = "day-0";
    activeMapFilter = "all";
    renderAll();
    showToast("Browser edits reset.");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  elements.editButton?.addEventListener("click", () => setEditMode(!editMode));
  elements.addFromVisitButton.addEventListener("click", addFromVisit);
  elements.mapDayFilter.addEventListener("change", () => {
    selectMapFilter(elements.mapDayFilter.value);
  });
  document.querySelector("#add-schedule-item").addEventListener("click", addScheduleItem);
  document.querySelector("#add-visit-item").addEventListener("click", addVisitItem);
  document.querySelector("#add-checklist-item").addEventListener("click", addChecklistItem);
  document.querySelector("#export-button").addEventListener("click", exportData);
  document.querySelector("#reset-button").addEventListener("click", resetData);

  renderAll();
})();
