(() => {
  "use strict";

  const STORAGE_KEY = "taskflow.workspace.tasks.v1";
  const STATUSES = ["pending", "progress", "completed"];
  const STATUS_LABELS = { pending: "Pending", progress: "In progress", completed: "Completed" };
  const PRIORITIES = ["low", "medium", "high"];

  let tasks = [];
  let activeView = "board";
  let lastFocusedElement = null;
  let draggedTaskId = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const elements = {
    modal: $("#task-modal"),
    form: $("#task-form"),
    modalTitle: $("#modal-title"),
    modalDescription: $("#modal-description"),
    title: $("#task-title"),
    description: $("#task-description"),
    priority: $("#task-priority"),
    category: $("#task-category"),
    dueDate: $("#task-due-date"),
    editingId: $("#editing-task-id"),
    saveButton: $("#save-task-button"),
    titleError: $("#title-error"),
    search: $("#search-input"),
    priorityFilter: $("#priority-filter"),
    statusFilter: $("#status-filter"),
    sortFilter: $("#sort-filter"),
    filtersPanel: $("#filters-panel"),
    filterToggle: $("#filter-toggle"),
    board: $("#kanban-board"),
    toastRegion: $("#toast-region"),
    sidebar: $("#sidebar"),
    helpPopover: $("#help-popover")
  };

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function makeTask(data = {}) {
    const now = new Date().toISOString();
    return {
      id: typeof data.id === "string" && data.id ? data.id : createId(),
      title: String(data.title || "").trim(),
      description: String(data.description || ""),
      priority: PRIORITIES.includes(data.priority) ? data.priority : "medium",
      category: String(data.category || ""),
      dueDate: typeof data.dueDate === "string" ? data.dueDate : "",
      status: STATUSES.includes(data.status) ? data.status : "pending",
      createdAt: typeof data.createdAt === "string" ? data.createdAt : now,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : now
    };
  }

  function isValidTask(value) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      typeof value.id === "string" && value.id.length > 0 &&
      typeof value.title === "string" && value.title.trim().length > 0 &&
      STATUSES.includes(value.status) && PRIORITIES.includes(value.priority);
  }

  function demoTasks() {
    const now = Date.now();
    const day = 86400000;
    return [
      makeTask({ id: createId(), title: "Map out the project structure", description: "Break the milestone into small, clear deliverables.", priority: "high", category: "Planning", dueDate: new Date(now + day).toISOString().slice(0, 10), status: "pending", createdAt: new Date(now - day * 2).toISOString() }),
      makeTask({ id: createId(), title: "Build the workspace interface", description: "Create the main layout, task columns, and reusable card styles.", priority: "medium", category: "Development", dueDate: new Date(now + day * 3).toISOString().slice(0, 10), status: "progress", createdAt: new Date(now - day).toISOString() }),
      makeTask({ id: createId(), title: "Review the project brief", description: "Confirm the mandatory DOM methods and submission deliverables.", priority: "low", category: "Research", dueDate: "", status: "completed", createdAt: new Date(now - day * 3).toISOString() })
    ];
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        tasks = demoTasks();
        saveTasks();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new TypeError("Saved task data is not an array.");
      tasks = parsed.filter(isValidTask).map((task) => makeTask(task));
      if (parsed.length > 0 && tasks.length === 0) {
        showToast("Saved task data could not be read. A fresh workspace has been created.", "warning");
        tasks = demoTasks();
        saveTasks();
      }
    } catch (error) {
      console.warn("TaskFlow could not load saved data:", error);
      tasks = demoTasks();
      saveTasks();
      showToast("Your saved workspace was unavailable, so a fresh workspace was loaded.", "warning");
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("TaskFlow could not save data:", error);
      showToast("Changes are visible, but this browser could not save them locally.", "error");
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeButton(label, className, title, action) {
    const button = createElement("button", `task-action ${className || ""}`, label);
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
    button.dataset.action = action;
    return button;
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  }

  function getDueDateClass(dateString, status) {
    if (!dateString || status === "completed") return "";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(due.getTime())) return "";
    if (due < today) return " overdue";
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (due <= tomorrow) return " due-soon";
    return "";
  }

  function createTaskCard(task) {
    // Required internship objective: dynamically create the card DOM node.
    const card = document.createElement("div");
    card.className = `task-card${task.status === "completed" ? " completed-card" : ""}`;
    card.dataset.taskId = task.id;
    card.draggable = true;

    const top = createElement("div", "task-card-top");
    const priority = createElement("span", `priority-badge priority-${task.priority}`, task.priority);
    top.appendChild(priority);
    top.appendChild(makeButton("···", "task-menu", "Task actions: edit or delete", "menu"));

    const title = createElement("h4", "task-title", task.title);
    const description = createElement("p", "task-description", task.description);
    if (!task.description.trim()) description.hidden = true;

    const meta = createElement("div", "task-meta");
    if (task.category.trim()) meta.appendChild(createElement("span", "category-badge", task.category.trim()));
    if (task.dueDate) {
      const due = createElement("span", `due-date${getDueDateClass(task.dueDate, task.status)}`, `◷ ${formatDate(task.dueDate)}`);
      due.title = `Due ${task.dueDate}`;
      meta.appendChild(due);
    }
    if (!meta.childElementCount) meta.hidden = true;

    const bottom = createElement("div", "task-card-bottom");
    bottom.appendChild(createElement("span", "task-status", STATUS_LABELS[task.status]));
    const actions = createElement("div", "task-actions");
    actions.appendChild(makeButton("✎", "edit-action", "Edit task", "edit"));
    const moveLabel = task.status === "pending" ? "→" : task.status === "progress" ? "✓" : "↶";
    const moveTitle = task.status === "pending" ? "Move to In Progress" : task.status === "progress" ? "Move to Completed" : "Move back to Pending";
    actions.appendChild(makeButton(moveLabel, "move-action", moveTitle, "move"));
    actions.appendChild(makeButton("×", "delete-action", "Delete task", "delete"));
    bottom.appendChild(actions);

    card.appendChild(top);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(meta);
    card.appendChild(bottom);
    return card;
  }

  function getVisibleTasks() {
    const query = elements.search.value.trim().toLocaleLowerCase();
    const priority = elements.priorityFilter.value;
    const status = elements.statusFilter.value;
    const sort = elements.sortFilter.value;

    let result = tasks.filter((task) => {
      const matchesQuery = !query || `${task.title} ${task.description} ${task.category}`.toLocaleLowerCase().includes(query);
      const matchesPriority = priority === "all" || task.priority === priority;
      const matchesStatus = status === "all" || task.status === status;
      const matchesView = activeView === "completed" ? task.status === "completed" :
        activeView === "all" ? true : true;
      return matchesQuery && matchesPriority && matchesStatus && matchesView;
    });

    result = result.slice().sort((a, b) => {
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "due") {
        if (!a.dueDate && !b.dueDate) return new Date(b.createdAt) - new Date(a.createdAt);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return result;
  }

  function renderTasks() {
    const visibleTasks = getVisibleTasks();
    const visibleIds = new Set(visibleTasks.map((task) => task.id));

    // Filter without deleting or recreating existing nodes: hide non-matching cards.
    $$(".task-card", elements.board).forEach((card) => {
      card.hidden = !visibleIds.has(card.dataset.taskId);
    });

    visibleTasks.forEach((task) => {
      const list = $(`#list-${task.status}`);
      let card = $(`.task-card[data-task-id="${CSS.escape(task.id)}"]`, elements.board);
      if (!card) {
        card = createTaskCard(task);
        list.appendChild(card);
      } else {
        // If status changed, move the existing DOM node rather than recreating it.
        if (card.parentElement !== list) list.appendChild(card);
        // Update content by replacing only when rendering a full reload.
        const existingTitle = $(".task-title", card);
        if (existingTitle && existingTitle.textContent !== task.title) existingTitle.textContent = task.title;
        const existingDescription = $(".task-description", card);
        if (existingDescription) {
          existingDescription.textContent = task.description;
          existingDescription.hidden = !task.description.trim();
        }
      }
    });

    // Remove stale nodes only if their task no longer exists in application state.
    $$(".task-card", elements.board).forEach((card) => {
      if (!tasks.some((task) => task.id === card.dataset.taskId)) card.remove();
    });

    STATUSES.forEach((status) => {
      const visibleInColumn = visibleTasks.filter((task) => task.status === status).length;
      const allInColumn = tasks.filter((task) => task.status === status).length;
      $(`#count-${status}`).textContent = String(allInColumn);
      $(`#empty-${status}`).hidden = visibleInColumn > 0;
      $(`#list-${status}`).querySelectorAll(".task-card").forEach((card) => {
        card.hidden = !visibleIds.has(card.dataset.taskId);
      });
      const column = $(`.kanban-column[data-status="${status}"]`);
      column.classList.toggle("is-empty", visibleInColumn === 0);
    });

    updateDashboardStats();
  }

  function updateDashboardStats() {
    const count = (status) => tasks.filter((task) => task.status === status).length;
    $("#stat-total").textContent = String(tasks.length);
    $("#stat-pending").textContent = String(count("pending"));
    $("#stat-progress").textContent = String(count("progress"));
    $("#stat-completed").textContent = String(count("completed"));
    $("#nav-total").textContent = String(tasks.length);
    $("#footer-task-count").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} in workspace`;
  }

  function updateColumnCounts() {
    updateDashboardStats();
    STATUSES.forEach((status) => {
      $(`#count-${status}`).textContent = String(tasks.filter((task) => task.status === status).length);
    });
  }

  function filterTasks() {
    renderTasks();
  }

  function sortTasks() {
    renderTasks();
  }

  function addTask(taskData) {
    const title = String(taskData.title || "").trim();
    if (!title) {
      elements.titleError.textContent = "Please enter a task title.";
      elements.title.focus();
      return false;
    }
    const task = makeTask({
      ...taskData,
      id: createId(),
      title,
      description: String(taskData.description || "").trim(),
      category: String(taskData.category || "").trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    tasks.push(task);
    const card = createTaskCard(task);
    // Required internship objective: initial card insertion with appendChild().
    $("#list-pending").appendChild(card);
    saveTasks();
    renderTasks();
    showToast("Task added to Pending.", "success");
    return true;
  }

  function moveTask(taskId, newStatus) {
    if (!STATUSES.includes(newStatus)) {
      showToast("That task status is not valid.", "error");
      return false;
    }
    const task = tasks.find((item) => item.id === taskId);
    const card = $(`.task-card[data-task-id="${CSS.escape(taskId)}"]`, elements.board);
    if (!task || !card) return false;
    if (task.status === newStatus) return true;

    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    card.classList.toggle("completed-card", newStatus === "completed");
    // Required internship objective: appendChild moves this same existing node.
    $(`#list-${newStatus}`).appendChild(card);
    updateCardStatusControls(card, task);
    saveTasks();
    renderTasks();
    showToast(`Moved task to ${STATUS_LABELS[newStatus]}.`, "success");
    return true;
  }

  function updateCardStatusControls(card, task) {
    const status = $(".task-status", card);
    if (status) status.textContent = STATUS_LABELS[task.status];
    const move = $('[data-action="move"]', card);
    if (move) {
      if (task.status === "pending") {
        move.textContent = "→"; move.title = "Move to In Progress"; move.setAttribute("aria-label", move.title);
      } else if (task.status === "progress") {
        move.textContent = "✓"; move.title = "Move to Completed"; move.setAttribute("aria-label", move.title);
      } else {
        move.textContent = "↶"; move.title = "Move back to Pending"; move.setAttribute("aria-label", move.title);
      }
    }
  }

  function updateTask(taskId, updatedData) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return false;
    const title = String(updatedData.title || "").trim();
    if (!title) {
      elements.titleError.textContent = "Please enter a task title.";
      elements.title.focus();
      return false;
    }
    task.title = title;
    task.description = String(updatedData.description || "").trim();
    task.priority = PRIORITIES.includes(updatedData.priority) ? updatedData.priority : "medium";
    task.category = String(updatedData.category || "").trim();
    task.dueDate = String(updatedData.dueDate || "");
    task.updatedAt = new Date().toISOString();

    const card = $(`.task-card[data-task-id="${CSS.escape(taskId)}"]`, elements.board);
    if (card) {
      const newCard = createTaskCard(task);
      // Editing refreshes the card contents; status transitions themselves preserve node identity.
      card.replaceWith(newCard);
    }
    saveTasks();
    renderTasks();
    showToast("Task updated successfully.", "success");
    return true;
  }

  function editTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    openTaskModal(task);
  }

  function deleteTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const confirmed = window.confirm(`Delete "${task.title}"? This action cannot be undone.`);
    if (!confirmed) return;
    const card = $(`.task-card[data-task-id="${CSS.escape(taskId)}"]`, elements.board);
    if (card) {
      // Required internship objective: destroy the active DOM node.
      card.remove();
    }
    tasks = tasks.filter((item) => item.id !== taskId);
    saveTasks();
    renderTasks();
    showToast("Task deleted.", "success");
  }

  function clearCompletedTasks() {
    const completed = tasks.filter((task) => task.status === "completed");
    if (!completed.length) {
      showToast("There are no completed tasks to clear.", "warning");
      return;
    }
    if (!window.confirm(`Delete all ${completed.length} completed ${completed.length === 1 ? "task" : "tasks"}? This cannot be undone.`)) return;
    const ids = new Set(completed.map((task) => task.id));
    $$(".task-card", elements.board).forEach((card) => {
      if (ids.has(card.dataset.taskId)) card.remove();
    });
    tasks = tasks.filter((task) => task.status !== "completed");
    saveTasks();
    renderTasks();
    showToast(`${completed.length} completed ${completed.length === 1 ? "task" : "tasks"} cleared.`, "success");
  }

  function openTaskModal(task = null, initialStatus = "pending") {
    lastFocusedElement = document.activeElement;
    elements.form.reset();
    elements.titleError.textContent = "";
    elements.editingId.value = task ? task.id : "";
    elements.modalTitle.textContent = task ? "Edit task" : "Create a new task";
    elements.modalDescription.textContent = task ? "Make changes to keep your task up to date." : "A small step is still a step forward.";
    elements.saveButton.innerHTML = task ? "Save changes" : '<span class="plus">+</span> Create task';
    elements.title.value = task ? task.title : "";
    elements.description.value = task ? task.description : "";
    elements.priority.value = task ? task.priority : "medium";
    elements.category.value = task ? task.category : "";
    elements.dueDate.value = task ? task.dueDate : "";
    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => elements.title.focus(), 0);
  }

  function closeTaskModal() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") lastFocusedElement.focus();
  }

  function showToast(message, type = "success") {
    const toast = createElement("div", `toast ${type}`);
    const icon = createElement("span", "toast-icon", type === "error" ? "!" : type === "warning" ? "i" : "✓");
    icon.setAttribute("aria-hidden", "true");
    const text = createElement("span", "", message);
    toast.appendChild(icon);
    toast.appendChild(text);
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      window.setTimeout(() => toast.remove(), 180);
    }, 3200);
  }

  function handleCardAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const card = button.closest(".task-card");
    if (!card) return;
    const taskId = card.dataset.taskId;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    switch (button.dataset.action) {
      case "edit": editTask(taskId); break;
      case "delete": deleteTask(taskId); break;
      case "move": {
        const next = task.status === "pending" ? "progress" : task.status === "progress" ? "completed" : "pending";
        moveTask(taskId, next);
        break;
      }
      case "menu": editTask(taskId); break;
      default: break;
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const taskData = {
      title: elements.title.value,
      description: elements.description.value,
      priority: elements.priority.value,
      category: elements.category.value,
      dueDate: elements.dueDate.value
    };
    const editingId = elements.editingId.value;
    const success = editingId ? updateTask(editingId, taskData) : addTask(taskData);
    if (success) closeTaskModal();
  }

  function setView(view) {
    activeView = ["overview", "all", "board", "completed"].includes(view) ? view : "board";
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === activeView));
    const titles = {
      overview: ["Workspace", "Overview", "A clear view of what is moving and what comes next."],
      all: ["My", "Tasks", "Every task in your workspace, all in one place."],
      board: ["Workspace", "Overview", "Manage your tasks and turn plans into progress."],
      completed: ["Completed", "Tasks", "Take a moment to appreciate what you have finished."]
    };
    const [first, second, subtitle] = titles[activeView];
    $("#page-title").textContent = `${first} ${second}`;
    if (activeView === "board") {
      $("#page-title").replaceChildren(document.createTextNode("Workspace "), createElement("span", "", "Overview"));
    } else if (activeView === "completed") {
      $("#page-title").replaceChildren(document.createTextNode("Completed "), createElement("span", "", "Tasks"));
    } else if (activeView === "all") {
      $("#page-title").replaceChildren(document.createTextNode("My "), createElement("span", "", "Tasks"));
    } else {
      $("#page-title").replaceChildren(document.createTextNode("Workspace "), createElement("span", "", "Overview"));
    }
    $("#page-subtitle").textContent = subtitle;
    $("#breadcrumb-title").textContent = activeView === "board" ? "Overview" : activeView === "all" ? "My Tasks" : activeView === "completed" ? "Completed" : "Overview";
    $("#board-title").textContent = activeView === "completed" ? "Completed tasks" : activeView === "all" ? "All tasks" : "Kanban board";
    renderTasks();
    elements.sidebar.classList.remove("open");
  }

  function resetFilters() {
    elements.search.value = "";
    elements.priorityFilter.value = "all";
    elements.statusFilter.value = "all";
    elements.sortFilter.value = "newest";
    renderTasks();
  }

  function attachDragAndDrop() {
    elements.board.addEventListener("dragstart", (event) => {
      const card = event.target.closest(".task-card");
      if (!card) return;
      draggedTaskId = card.dataset.taskId;
      card.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedTaskId);
      }
    });
    elements.board.addEventListener("dragend", (event) => {
      const card = event.target.closest(".task-card");
      if (card) card.classList.remove("dragging");
      $$(".kanban-column").forEach((column) => column.classList.remove("drag-over"));
      draggedTaskId = null;
    });
    $$(".kanban-column").forEach((column) => {
      column.addEventListener("dragover", (event) => {
        event.preventDefault();
        column.classList.add("drag-over");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });
      column.addEventListener("dragleave", (event) => {
        if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
      });
      column.addEventListener("drop", (event) => {
        event.preventDefault();
        column.classList.remove("drag-over");
        const taskId = (event.dataTransfer && event.dataTransfer.getData("text/plain")) || draggedTaskId;
        const status = column.dataset.status;
        if (taskId && status) moveTask(taskId, status);
      });
    });
  }

  function initializeApp() {
    $("#current-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
    loadTasks();
    renderTasks();

    $("#add-task-top").addEventListener("click", () => openTaskModal());
    $$("[data-add-status]").forEach((button) => button.addEventListener("click", () => openTaskModal()));
    $("#modal-close").addEventListener("click", closeTaskModal);
    $("#modal-cancel").addEventListener("click", closeTaskModal);
    elements.modal.addEventListener("click", (event) => {
      if (event.target === elements.modal) closeTaskModal();
    });
    elements.form.addEventListener("submit", handleFormSubmit);
    elements.title.addEventListener("input", () => { elements.titleError.textContent = ""; });
    elements.board.addEventListener("click", handleCardAction);
    elements.search.addEventListener("input", filterTasks);
    elements.priorityFilter.addEventListener("change", filterTasks);
    elements.statusFilter.addEventListener("change", filterTasks);
    elements.sortFilter.addEventListener("change", sortTasks);
    elements.filterToggle.addEventListener("click", () => {
      const opening = elements.filtersPanel.hidden;
      elements.filtersPanel.hidden = !opening;
      elements.filterToggle.setAttribute("aria-expanded", String(opening));
    });
    $("#reset-filters").addEventListener("click", resetFilters);
    $("#clear-completed").addEventListener("click", clearCompletedTasks);
    $$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    $("#mobile-menu").addEventListener("click", () => elements.sidebar.classList.toggle("open"));
    $("#help-button").addEventListener("click", () => { elements.helpPopover.hidden = !elements.helpPopover.hidden; });
    $("#close-help").addEventListener("click", () => { elements.helpPopover.hidden = true; });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!elements.modal.hidden) closeTaskModal();
        elements.helpPopover.hidden = true;
        elements.sidebar.classList.remove("open");
      }
      if (event.key === "Tab" && !elements.modal.hidden) {
        const focusable = $$('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]', elements.modal).filter((el) => !el.hidden);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    attachDragAndDrop();
    updateColumnCounts();
  }

  document.addEventListener("DOMContentLoaded", initializeApp);
})();
