const GROUPS = [
  {
    id: "local",
    body: "local-inputs",
    items: [
      { key: "fuel", label: "Road fuel, commonly purchased grade", unit: "per U.S. gallon", reference: 7.01310824034786, usAnchor: 4.64469807, europeAnchor: 8.567014195605209 },
    ],
  },
  {
    id: "housing",
    body: "housing-inputs",
    items: [
      { key: "rent", label: "New asking rent", unit: "per m2 / month", reference: 17.9957157407703, usAnchor: 65, europeAnchor: 37.635710077144076 },
      { key: "purchase", label: "New asking purchase price", unit: "per m2", reference: 4000.00228372027, usAnchor: 17000, europeAnchor: 10834.9966429312 },
    ],
  },
  {
    id: "everyday",
    body: "everyday-inputs",
    items: [
      { key: "eggs", label: "Eggs", unit: "one standard dozen", reference: 2.60915041038453, usAnchor: 3.6, europeAnchor: 3.505510617015543 },
      { key: "dairy", label: "Dairy Product", unit: "one kilogram/liter", reference: 0.949911159087676, usAnchor: 1.12, europeAnchor: 1.198953142627466 },
      { key: "vegetable", label: "Vegetable", unit: "one kilogram", reference: 0.987709017497865, usAnchor: 1.27, europeAnchor: 1.313139156211034 },
      { key: "carbohydrate", label: "Carbohydrate", unit: "one kilogram", reference: 1.61672747507856, usAnchor: 2.29, europeAnchor: 1.8041390146203773 },
      { key: "animal-protein", label: "Animal Protein", unit: "one kilogram", reference: 6.42867256475489, usAnchor: 8, europeAnchor: 12.000950027633015 },
    ],
  },
  {
    id: "comparable",
    body: "comparable-inputs",
    items: [
      { key: "used-car", label: "Used compact Korean car", unit: "comparable recent model-year band", reference: 13038.7981236954, usAnchor: 13770.49, europeAnchor: 13952.617371803364 },
      { key: "new-car", label: "New compact Korean car", unit: "entry trim", reference: 26993.2995647229, usAnchor: 22332.33, europeAnchor: 26626.865228531886 },
      { key: "phone", label: "Current premium smartphone", unit: "standardized storage tier", reference: 1036.25003590545, usAnchor: 829, europeAnchor: 1106.4624716247756 },
      { key: "prepared-food", label: "Standard prepared-food portion", unit: "international quick-service chain", reference: 4.38474292160902, usAnchor: 5.4, europeAnchor: 5.423835645219488 },
      { key: "sports-shoe", label: "Standard white leather sports shoe", unit: "adult standard model", reference: 106.310131313574, usAnchor: 106.67, europeAnchor: 110.21234031086 },
    ],
  },
];

const WEIGHTS = { local: 0.35, housing: 0.15, combined: 0.5 };
const WEIGHTED_BASKET_MEDIAN = 0.985976014818401;
const RAW_AFFORDABILITY_MEDIAN = 1275.40490286964;
const LITRES_PER_US_GALLON = 3.78541;

const state = { data: null, equivalents: [], query: "", expanded: false };
const elements = {
  form: document.querySelector("#your-city-form"),
  cityName: document.querySelector("#custom-city-name"),
  salary: document.querySelector("#custom-salary"),
  medianWage: document.querySelector("#custom-median-wage"),
  employment: document.querySelector("#custom-employment"),
  calculate: document.querySelector("#custom-calculate"),
  results: document.querySelector("#custom-results"),
  resultsHeading: document.querySelector("#custom-results-heading"),
  basketIndex: document.querySelector("#custom-basket-index"),
  basketRank: document.querySelector("#custom-basket-rank"),
  affordabilityIndex: document.querySelector("#custom-affordability-index"),
  affordabilityRank: document.querySelector("#custom-affordability-rank"),
  offerRank: document.querySelector("#custom-offer-rank"),
  incomeCapacity: document.querySelector("#custom-income-capacity"),
  analysis: document.querySelector("#custom-analysis"),
  breakdownBody: document.querySelector("#custom-breakdown-body"),
  search: document.querySelector("#custom-equivalence-search"),
  equivalenceBody: document.querySelector("#custom-equivalence-body"),
  equivalenceStatus: document.querySelector("#custom-equivalence-status"),
  showAll: document.querySelector("#custom-show-all"),
};

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_ANCHOR = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function createAnchorCell(item, anchorKey, label) {
  const cell = document.createElement("td");
  cell.className = "custom-anchor-cell numeric-cell";
  cell.textContent = USD_ANCHOR.format(item[anchorKey]);
  cell.setAttribute("aria-label", label + ": " + cell.textContent);
  if (item.key === "fuel") {
    cell.dataset.fuelAnchor = String(item[anchorKey]);
    cell.dataset.anchorLabel = label;
  }
  return cell;
}

function renderFuelAnchors(unit) {
  for (const cell of document.querySelectorAll("[data-fuel-anchor]")) {
    const gallonPrice = Number(cell.dataset.fuelAnchor);
    const displayPrice = unit === "litre" ? gallonPrice / LITRES_PER_US_GALLON : gallonPrice;
    cell.textContent = USD_ANCHOR.format(displayPrice);
    cell.setAttribute("aria-label", cell.dataset.anchorLabel + ": " + cell.textContent);
  }
}

function createCell(tag, text, className = "") {
  const cell = document.createElement(tag);
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function addOption(select, value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function fuelInputValue(value) {
  return String(Math.round(Number(value) * 1000) / 1000);
}
function createInputRows() {
  for (const group of GROUPS) {
    const body = document.querySelector("#" + group.body);
    for (const item of group.items) {
      const row = document.createElement("tr");
      row.dataset.group = group.id;
      row.dataset.basketItem = item.key;
      row.dataset.reference = String(item.reference);
      const nameCell = document.createElement("th");
      nameCell.scope = "row";
      nameCell.textContent = item.label;
      const unitCell = document.createElement("td");
      unitCell.className = "custom-unit-cell";
      if (item.key === "fuel") {
        const unitSelect = document.createElement("select");
        unitSelect.id = "custom-fuel-unit";
        unitSelect.className = "custom-unit-select";
        unitSelect.dataset.previousUnit = "gallon";
        unitSelect.setAttribute("aria-label", "Road fuel unit");
        addOption(unitSelect, "gallon", "Per U.S. gallon");
        addOption(unitSelect, "litre", "Per litre");
        unitCell.append(unitSelect);
      } else {
        unitCell.textContent = item.unit;
      }
      const usAnchorCell = createAnchorCell(item, "usAnchor", "US Anchor - New York");
      const europeAnchorCell = createAnchorCell(item, "europeAnchor", "European Anchor - Paris");
      row.append(nameCell, unitCell, usAnchorCell, europeAnchorCell);
      const cell = document.createElement("td");
      const wrap = document.createElement("span");
      wrap.className = "custom-price-wrap";
      const dollar = document.createElement("span");
      dollar.textContent = "$";
      dollar.setAttribute("aria-hidden", "true");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0.000001";
      input.step = "any";
      input.required = true;
      input.dataset.price = "city";
      input.dataset.item = item.key;
      input.setAttribute("aria-label", item.label + " price in USD, " + item.unit);
      wrap.append(dollar, input);
      cell.append(wrap);
      row.append(cell);
      body.append(row);
    }
  }
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function handleFuelUnitChange(event) {
  const select = event.currentTarget;
  const previousUnit = select.dataset.previousUnit || "gallon";
  const nextUnit = select.value;
  const input = document.querySelector('[data-item="fuel"]');
  if (input.value && previousUnit !== nextUnit) {
    const currentValue = Number(input.value);
    const convertedValue = previousUnit === "gallon"
      ? currentValue / LITRES_PER_US_GALLON
      : currentValue * LITRES_PER_US_GALLON;
    const formattedValue = fuelInputValue(convertedValue);
    input.value = formattedValue;
  }
  input.setAttribute(
    "aria-label",
    "Road fuel, commonly purchased grade price in USD, " + (nextUnit === "litre" ? "per litre" : "per U.S. gallon")
  );
  renderFuelAnchors(nextUnit);
  select.dataset.previousUnit = nextUnit;
}
function collectGroup(groupId) {
  return [...document.querySelectorAll('tr[data-group="' + groupId + '"]')].map((row) => {
    let city = Number(row.querySelector('[data-price="city"]').value);
    if (row.dataset.basketItem === "fuel" && document.querySelector("#custom-fuel-unit").value === "litre") {
      city *= LITRES_PER_US_GALLON;
    }
    const reference = Number(row.dataset.reference);
    return city / reference;
  });
}

function cityLabel(row) {
  return row.usState ? row.city + ", " + row.usState : row.city;
}

function basketIndex(row) {
  return Number(row.basketIndexExact ?? row.basketIndex);
}

function placeRank(value, rows, selector, lowerIsBetter = false) {
  const better = rows.filter((row) => lowerIsBetter ? selector(row) < value : selector(row) > value).length;
  return better + 1;
}

function basketDifference(target, origin) {
  const percent = Math.abs((target / origin) - 1) * 100;
  if (percent < 0.05) return "Same basket cost";
  return percent.toFixed(0) + "% " + (target > origin ? "more expensive" : "cheaper");
}

function normalizedQuery(value) {
  return value.trim().toLocaleLowerCase();
}

function renderBreakdown(values) {
  const rows = [
    ["Road fuel relative price", values.local * 100],
    ["Housing relative price", values.housing * 100],
    ["Food relative cost", values.everyday * 100],
    ["Standardized goods relative cost", values.combined * 100],
    ["Rebased city basket", values.basketIndex],
  ];
  elements.breakdownBody.replaceChildren();
  for (const [label, value] of rows) {
    const row = document.createElement("tr");
    const heading = createCell("th", label);
    heading.scope = "row";
    row.append(heading, createCell("td", value.toFixed(1), "numeric-cell"));
    elements.breakdownBody.append(row);
  }
}

function renderEquivalents() {
  const filtered = state.query
    ? state.equivalents.filter((item) => (item.row.city + " " + item.row.country + " " + (item.row.usState ?? "")).toLocaleLowerCase().includes(state.query))
    : state.equivalents;
  const visible = state.expanded || state.query ? filtered : filtered.slice(0, 12);
  elements.equivalenceBody.replaceChildren();
  for (const item of visible) {
    const row = document.createElement("tr");
    const heading = createCell("th", cityLabel(item.row), "city-cell");
    heading.scope = "row";
    row.append(heading);
    row.append(createCell("td", item.row.country));
    row.append(createCell("td", USD.format(item.salary) + " / month", "numeric-cell"));
    row.append(createCell("td", basketDifference(item.basket, item.originBasket), "calculator-difference"));
    row.append(createCell("td", "#" + item.row.basketRank, "numeric-cell"));
    elements.equivalenceBody.append(row);
  }
  if (visible.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("td", "No matching cities.", "empty-cell");
    cell.colSpan = 5;
    row.append(cell);
    elements.equivalenceBody.append(row);
  }
  elements.equivalenceStatus.textContent = state.query
    ? filtered.length + " matching " + (filtered.length === 1 ? "city" : "cities")
    : "Showing " + visible.length + " of " + filtered.length + " cities";
  elements.showAll.hidden = Boolean(state.query) || state.expanded || visible.length >= filtered.length;
  elements.showAll.textContent = "Show all " + filtered.length + " cities";
}

function calculate(event) {
  event.preventDefault();
  if (!state.data || !elements.form.reportValidity()) return;
  const local = average(collectGroup("local"));
  const housing = average(collectGroup("housing"));
  const everyday = average(collectGroup("everyday"));
  const comparableItems = collectGroup("comparable");
  const combined = average([everyday, ...comparableItems]);
  const weightedBasket = (WEIGHTS.local * local) + (WEIGHTS.housing * housing) + (WEIGHTS.combined * combined);
  const customBasketIndex = 100 * weightedBasket / WEIGHTED_BASKET_MEDIAN;
  const salary = Number(elements.salary.value);
  const medianWage = Number(elements.medianWage.value);
  const employment = Number(elements.employment.value) / 100;
  const incomeCapacity = medianWage * employment;
  const rawAffordability = incomeCapacity / weightedBasket;
  const customAffordabilityIndex = 100 * rawAffordability / RAW_AFFORDABILITY_MEDIAN;
  const rows = state.data.cities;
  const basketRank = placeRank(customBasketIndex, rows, basketIndex, true);
  const affordabilityRank = placeRank(customAffordabilityIndex, rows, (row) => Number(row.affordabilityIndex));
  const offerCapacity = salary / customBasketIndex;
  const offerRank = placeRank(offerCapacity, rows, (row) => Number(row.netMedianWageUsd) / basketIndex(row));
  const city = elements.cityName.value.trim();
  const place = city;

  elements.resultsHeading.textContent = place + " compared with the KISoL city sample";
  elements.basketIndex.textContent = customBasketIndex.toFixed(1);
  elements.basketRank.textContent = "#" + basketRank + " of " + (rows.length + 1) + " including your city";
  elements.affordabilityIndex.textContent = customAffordabilityIndex.toFixed(1);
  elements.affordabilityRank.textContent = "#" + affordabilityRank + " of " + (rows.length + 1) + " including your city";
  elements.offerRank.textContent = "#" + offerRank + " of " + (rows.length + 1);
  elements.incomeCapacity.textContent = USD.format(incomeCapacity) + " / month";
  const basketPosition = customBasketIndex < 100 ? ((100 - customBasketIndex).toFixed(0) + "% below") : ((customBasketIndex - 100).toFixed(0) + "% above");
  const wagePosition = ((salary / medianWage - 1) * 100);
  elements.analysis.textContent = place + "'s user-defined basket is " + basketPosition + " the current city-sample median. The entered salary is " + Math.abs(wagePosition).toFixed(0) + "% " + (wagePosition >= 0 ? "above" : "below") + " the supplied net-median wage. With the supplied employment rate, the city places #" + affordabilityRank + " in the expanded affordability comparison, while the entered offer places #" + offerRank + " by purchasing capacity.";
  renderBreakdown({ local, housing, everyday, combined, basketIndex: customBasketIndex });

  state.query = "";
  state.expanded = false;
  elements.search.value = "";
  state.equivalents = rows.map((row) => {
    const targetBasket = basketIndex(row);
    return { row, basket: targetBasket, originBasket: customBasketIndex, salary: salary * targetBasket / customBasketIndex };
  }).sort((a, b) => a.salary - b.salary);
  renderEquivalents();
  elements.results.hidden = false;
  elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

createInputRows();
document.querySelector("#custom-fuel-unit").addEventListener("change", handleFuelUnitChange);
elements.form.addEventListener("submit", calculate);
elements.search.addEventListener("input", (event) => { state.query = normalizedQuery(event.target.value); renderEquivalents(); });
elements.showAll.addEventListener("click", () => { state.expanded = true; renderEquivalents(); });

fetch("assets/data/results.json")
  .then((response) => {
    if (!response.ok) throw new Error("Result data returned " + response.status);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    elements.calculate.disabled = false;
  })
  .catch(() => {
    elements.calculate.disabled = true;
    elements.calculate.textContent = "Ranking data unavailable";
  });
