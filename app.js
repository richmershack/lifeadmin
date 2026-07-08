const STORAGE_KEY = "lifeadmin-items-v1";

const seedItems = [
  {
    id: "la-001",
    title: "Quarterly estimated tax payment",
    category: "Tax document",
    company: "IRS",
    dueDate: "2026-07-15",
    amount: "$1,240.00",
    action: "Schedule payment and save confirmation",
    status: "tracked",
    note: "Estimated tax payment for freelance income.",
    createdAt: "2026-07-01"
  },
  {
    id: "la-002",
    title: "Professional liability insurance renewal",
    category: "Renewal",
    company: "Northstar Mutual",
    dueDate: "2026-07-20",
    amount: "$38.00/mo",
    action: "Compare renewal price before auto-renewal",
    status: "tracked",
    note: "Premium increased by $7 per month.",
    createdAt: "2026-07-03"
  },
  {
    id: "la-003",
    title: "Design software subscription",
    category: "Subscription",
    company: "Canvasuite",
    dueDate: "2026-07-11",
    amount: "$24.99",
    action: "Cancel or move to annual plan",
    status: "tracked",
    note: "Monthly subscription renews soon.",
    createdAt: "2026-06-28"
  },
  {
    id: "la-004",
    title: "Laptop warranty expiration",
    category: "Warranty",
    company: "Lenovo",
    dueDate: "2026-08-02",
    amount: "No charge",
    action: "Decide whether to extend coverage",
    status: "tracked",
    note: "Warranty ends in early August.",
    createdAt: "2026-06-30"
  },
  {
    id: "la-005",
    title: "Client contract notice window",
    category: "Contract",
    company: "Brightpath Studio",
    dueDate: "2026-08-15",
    amount: "$4,800/mo",
    action: "Send renewal terms before notice period closes",
    status: "tracked",
    note: "Contract requires 30 days notice for rate changes.",
    createdAt: "2026-06-25"
  },
  {
    id: "la-006",
    title: "New health plan notice",
    category: "Renewal",
    company: "Evergreen Health",
    dueDate: "2026-07-24",
    amount: "$312.00",
    action: "Review deductible change",
    status: "inbox",
    note: "LifeAdmin found a premium change and renewal date.",
    createdAt: "2026-07-08"
  }
];

const samples = {
  insurance: {
    title: "Health insurance renewal",
    category: "Renewal",
    dueDate: "2026-07-24",
    text: "Evergreen Health will renew your plan on July 24, 2026. Your premium will be $312.00 per month. Please review the deductible change before renewal."
  },
  tax: {
    title: "Quarterly tax payment notice",
    category: "Tax document",
    dueDate: "2026-07-15",
    text: "Your estimated tax payment of $1,240.00 is due July 15, 2026. Schedule payment and keep the confirmation for records."
  }
};

let items = loadItems();
let activeView = "dashboard";
let searchTerm = "";
let categoryFilter = "All";

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const viewButtons = document.querySelectorAll("[data-view]");
const viewTitle = document.querySelector("#viewTitle");
const globalSearch = document.querySelector("#globalSearch");
const categoryFilterInput = document.querySelector("#categoryFilter");

function loadItems() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedItems;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedItems;
  } catch {
    return seedItems;
  }
}

function saveItems() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function daysUntil(dateString) {
  const today = new Date("2026-07-08T12:00:00");
  const target = new Date(`${dateString}T12:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function urgencyFor(item) {
  const days = daysUntil(item.dueDate);
  if (days <= 3) return "urgent";
  if (days <= 14) return "warning";
  return "normal";
}

function getFilteredItems(source = items) {
  return source.filter((item) => {
    const matchesSearch = [item.title, item.category, item.company, item.action, item.note]
      .join(" ")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });
}

function makeItemNode(item, mode = "tracked") {
  const template = document.querySelector("#itemTemplate").content.cloneNode(true);
  const article = template.querySelector(".admin-item");
  const title = template.querySelector("h3");
  const pill = template.querySelector(".pill");
  const summary = template.querySelector("p");
  const meta = template.querySelector(".item-meta");
  const actions = template.querySelector(".item-actions");
  const urgency = urgencyFor(item);
  const days = daysUntil(item.dueDate);

  article.classList.add(urgency);
  title.textContent = item.title;
  pill.textContent = days < 0 ? "Overdue" : days === 0 ? "Today" : `${days} days`;
  summary.textContent = item.action;
  meta.innerHTML = `
    <span>${item.category}</span>
    <span>${item.company}</span>
    <span>${formatDate(item.dueDate)}</span>
    <span>${item.amount}</span>
  `;

  if (mode === "inbox") {
    actions.append(
      actionButton("Approve", () => updateStatus(item.id, "tracked")),
      actionButton("Dismiss", () => removeItem(item.id))
    );
  } else {
    actions.append(actionButton("Done", () => updateStatus(item.id, "done")));
  }

  return template;
}

function actionButton(label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function updateStatus(id, status) {
  items = items.map((item) => (item.id === id ? { ...item, status } : item));
  saveItems();
  render();
}

function removeItem(id) {
  items = items.filter((item) => item.id !== id);
  saveItems();
  render();
}

function renderMetrics(tracked) {
  const metrics = [
    {
      label: "Needs action",
      value: tracked.filter((item) => daysUntil(item.dueDate) <= 7).length,
      hint: "due in the next 7 days"
    },
    {
      label: "Money at stake",
      value: "$1.6k",
      hint: "tracked this month"
    },
    {
      label: "Renewals",
      value: tracked.filter((item) => item.category === "Renewal" || item.category === "Subscription").length,
      hint: "worth checking"
    },
    {
      label: "Inbox",
      value: items.filter((item) => item.status === "inbox").length,
      hint: "waiting for review"
    }
  ];

  document.querySelector("#metricsGrid").innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric">
          <span>${metric.label}</span>
          <strong>${metric.value}</strong>
          <span>${metric.hint}</span>
        </article>
      `
    )
    .join("");
}

function renderDashboard() {
  const tracked = getFilteredItems(items.filter((item) => item.status === "tracked")).sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
  );
  const attention = tracked.filter((item) => daysUntil(item.dueDate) <= 14);
  const renewals = tracked.filter((item) => ["Renewal", "Subscription"].includes(item.category));

  renderMetrics(tracked);
  renderList("#attentionList", attention, "tracked", "Nothing urgent. Your week is unusually calm.");
  renderList("#renewalList", renewals, "tracked", "No renewals match your current search.");
}

function renderInbox() {
  const inbox = getFilteredItems(items.filter((item) => item.status === "inbox"));
  renderList("#inboxList", inbox, "inbox", "No extracted items are waiting for approval.");
}

function renderCalendar() {
  const tracked = getFilteredItems(items.filter((item) => item.status === "tracked")).sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
  );
  const container = document.querySelector("#calendarList");

  if (!tracked.length) {
    container.innerHTML = `<div class="empty-state">No upcoming deadlines match your filters.</div>`;
    return;
  }

  container.innerHTML = tracked
    .map(
      (item) => `
        <article class="timeline-row">
          <div class="timeline-date">${formatDate(item.dueDate)}</div>
          <div>
            <h3>${item.title}</h3>
            <p class="muted">${item.action}</p>
            <div class="item-meta">
              <span>${item.category}</span>
              <span>${item.company}</span>
              <span>${item.amount}</span>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderVault() {
  const vault = getFilteredItems(items.filter((item) => item.status !== "done"));
  const container = document.querySelector("#vaultGrid");

  if (!vault.length) {
    container.innerHTML = `<div class="empty-state">No vault items match your filters.</div>`;
    return;
  }

  container.innerHTML = vault
    .map(
      (item) => `
        <article class="vault-card">
          <div class="doc-icon">${item.category.slice(0, 2).toUpperCase()}</div>
          <div>
            <h3>${item.title}</h3>
            <p class="muted">${item.note}</p>
          </div>
          <div class="item-meta">
            <span>${item.category}</span>
            <span>${formatDate(item.dueDate)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderList(selector, list, mode, emptyText) {
  const container = document.querySelector(selector);
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  list.forEach((item) => container.append(makeItemNode(item, mode)));
}

function setView(viewName) {
  activeView = viewName;
  views.forEach((view) => view.classList.toggle("active", view.id === viewName));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  viewTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1);
}

function render() {
  renderDashboard();
  renderInbox();
  renderCalendar();
  renderVault();
  setView(activeView);
}

function extractAmount(text) {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  return match ? match[0] : "Needs review";
}

function extractCompany(text, fallback) {
  const words = text.split(/\s+/).slice(0, 4).join(" ");
  return words.length > 4 ? words.replace(/[.,]/g, "") : fallback;
}

function setupEvents() {
  document.querySelector("#dateLabel").textContent = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date("2026-07-08T12:00:00"));

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  globalSearch.addEventListener("input", (event) => {
    searchTerm = event.target.value;
    render();
  });

  categoryFilterInput.addEventListener("change", (event) => {
    categoryFilter = event.target.value;
    render();
  });

  document.querySelector("#markAllDone").addEventListener("click", () => {
    items = items.map((item) =>
      item.status === "done" ? item : daysUntil(item.dueDate) < 0 ? { ...item, status: "done" } : item
    );
    saveItems();
    render();
  });

  document.querySelectorAll(".fillSample").forEach((button) => {
    button.addEventListener("click", () => {
      const sample = samples[button.dataset.sample || "insurance"];
      document.querySelector("#captureTitle").value = sample.title;
      document.querySelector("#captureCategory").value = sample.category;
      document.querySelector("#captureDue").value = sample.dueDate;
      document.querySelector("#captureText").value = sample.text;
    });
  });

  document.querySelector("#captureForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = document.querySelector("#captureTitle").value.trim();
    const category = document.querySelector("#captureCategory").value;
    const dueDate = document.querySelector("#captureDue").value || "2026-07-31";
    const text = document.querySelector("#captureText").value.trim();

    items = [
      {
        id: `la-${Date.now()}`,
        title,
        category,
        company: extractCompany(text, "Needs review"),
        dueDate,
        amount: extractAmount(text),
        action: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        status: "inbox",
        note: "Captured from pasted text.",
        createdAt: "2026-07-08"
      },
      ...items
    ];

    saveItems();
    event.target.reset();
    setView("inbox");
    render();
  });
}

setupEvents();
render();
