const MODES = {
  affordability: {
    dataKey: "cities",
    rankKey: "affordabilityRank",
    indexKey: "affordabilityIndex",
    title: "Affordability ranking",
    mapTitle: "Affordability ranks",
    indexHeading: "Affordability index",
    direction: "Higher is better",
    explainer: "Higher scores indicate greater affordability after national European or state-level U.S. income capacity is compared with local prices.",
    captionEurope: "Rank 1 has the greatest income-adjusted affordability. European cities use national labor inputs.",
    captionUs: "Rank 1 has the greatest income-adjusted affordability. U.S. cities use state-level labor inputs.",
    mapEurope: "assets/maps/KISoL_City_Affordability_Ranks_Europe_No_Microstates_US_State_Adjusted_Corrected.png",
    mapUs: "assets/maps/KISoL_City_Affordability_Ranks_United_States_No_Microstates_US_State_Adjusted_Corrected.png",
    altEurope: "Affordability rank map of European cities",
    altUs: "Affordability rank map of United States cities",
    sampleLabel: "Cities",
    sampleSizeKey: "sampleSize",
    tableKicker: "City table",
    searchLabel: "Find a city or country",
    searchPlaceholder: "Search cities",
    nameHeading: "City",
    parentHeading: "Country",
    groupHeading: "Region",
    itemSingular: "city",
    itemPlural: "cities",
    mapNote: "The sample uses the two largest cities by population in each covered European country and the ten largest in the United States. The main view excludes European microstates; Luxembourg remains included.",
  },
  basket: {
    dataKey: "cities",
    rankKey: "basketRank",
    indexKey: "basketIndex",
    title: "Basket cost ranking",
    mapTitle: "Basket cost ranks",
    indexHeading: "Basket cost index",
    direction: "Lower is cheaper",
    explainer: "Lower scores indicate a cheaper standardized basket. Income and employment are excluded from this view.",
    captionEurope: "Rank 1 has the cheapest standardized basket. Income and employment are excluded.",
    captionUs: "Rank 1 has the cheapest standardized basket. Income and employment are excluded.",
    mapEurope: "assets/maps/KISoL_City_Basket_Cost_Ranks_Europe_No_Microstates_Corrected.png",
    mapUs: "assets/maps/KISoL_City_Basket_Cost_Ranks_United_States_No_Microstates_Corrected.png",
    altEurope: "Basket cost rank map of European cities",
    altUs: "Basket cost rank map of United States cities",
    sampleLabel: "Cities",
    sampleSizeKey: "sampleSize",
    tableKicker: "City table",
    searchLabel: "Find a city or country",
    searchPlaceholder: "Search cities",
    nameHeading: "City",
    parentHeading: "Country",
    groupHeading: "Region",
    itemSingular: "city",
    itemPlural: "cities",
    mapNote: "The sample uses the two largest cities by population in each covered European country and the ten largest in the United States. The main view excludes European microstates; Luxembourg remains included.",
  },
  geography: {
    dataKey: "geographies",
    rankKey: "affordabilityRank",
    indexKey: "affordabilityIndex",
    title: "Country and state affordability ranking",
    mapTitle: "Country and state affordability ranks",
    indexHeading: "Affordability index",
    direction: "Higher is better",
    explainer: "For each country or U.S. state, the sampled cities' basket costs are averaged according to their populations. The affordability calculation then uses country-level wage and employment data in Europe and state-level data in the United States.",
    captionEurope: "Rank 1 has the greatest income-adjusted affordability. Country baskets are weighted across the sampled cities.",
    captionUs: "Rank 1 has the greatest income-adjusted affordability. State baskets are weighted across the sampled cities.",
    mapEurope: "assets/maps/KISoL_Country_Affordability_Ranks_Europe_No_Microstates.png",
    mapUs: "assets/maps/KISoL_State_Affordability_Ranks_United_States.png",
    altEurope: "Affordability rank map of sampled European countries",
    altUs: "Affordability rank map of sampled United States states",
    sampleLabel: "Geographies",
    sampleSizeKey: "geographySampleSize",
    tableKicker: "Geography table",
    searchLabel: "Find a country, state, or sampled city",
    searchPlaceholder: "Search geographies",
    nameHeading: "Country / state",
    parentHeading: "Type",
    groupHeading: "Sampled cities",
    itemSingular: "geography",
    itemPlural: "geographies",
    mapNote: "European cities are grouped by country and U.S. cities by state. Each city weight is its share of the sampled-city population in that geography; one-city states receive 100%.",
  },
};

const state = {
  data: null,
  mode: "affordability",
  query: "",
  expanded: false,
};

const elements = {
  tabs: [...document.querySelectorAll("[data-mode]")],
  modeExplainer: document.querySelector("#mode-explainer"),
  rankDirection: document.querySelector("#rank-direction"),
  mapHeading: document.querySelector("#map-heading"),
  mapEurope: document.querySelector("#result-map-europe"),
  mapUs: document.querySelector("#result-map-us"),
  mapCaptionEurope: document.querySelector("#map-caption-europe"),
  mapCaptionUs: document.querySelector("#map-caption-us"),
  rankingHeading: document.querySelector("#ranking-heading"),
  indexHeading: document.querySelector("#index-column-heading"),
  search: document.querySelector("#result-search"),
  body: document.querySelector("#results-body"),
  status: document.querySelector("#results-status"),
  showAll: document.querySelector("#show-all"),
  sampleSize: document.querySelector("#sample-size"),
  sampleLabel: document.querySelector("#sample-label"),
  mapNote: document.querySelector("#map-note"),
  tableKicker: document.querySelector("#table-kicker"),
  searchLabel: document.querySelector("#search-label"),
  nameHeading: document.querySelector("#result-name-heading"),
  parentHeading: document.querySelector("#result-parent-heading"),
  groupHeading: document.querySelector("#result-group-heading"),
};


function createCell(tag, text, className = "") {
  const cell = document.createElement(tag);
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function normalizedQuery(value) {
  return value.trim().toLocaleLowerCase();
}

function currentRows() {
  const mode = MODES[state.mode];
  const rows = [...state.data[mode.dataKey]].sort((a, b) => a[mode.rankKey] - b[mode.rankKey]);
  if (!state.query) return rows;

  return rows.filter((row) => {
    const haystack = mode.dataKey === "geographies"
      ? `${row.geography} ${row.code} ${row.type} ${row.parent} ${row.region} ${row.cities.join(" ")}`.toLocaleLowerCase()
      : `${row.city} ${row.country} ${row.iso} ${row.region} ${row.usState ?? ""}`.toLocaleLowerCase();
    return haystack.includes(state.query);
  });
}

function renderRows() {
  const mode = MODES[state.mode];
  const rows = currentRows();
  const visibleRows = state.expanded || state.query ? rows : rows.slice(0, 20);
  elements.body.replaceChildren();

  for (const row of visibleRows) {
    const tr = document.createElement("tr");
    const rankCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "rank-number";
    badge.textContent = row[mode.rankKey];
    rankCell.append(badge);
    tr.append(rankCell);
    const primaryLabel = mode.dataKey === "geographies"
      ? row.geography
      : (row.usState ? `${row.city}, ${row.usState}` : row.city);
    tr.append(createCell("th", primaryLabel, "city-cell"));
    tr.lastElementChild.scope = "row";
    tr.append(createCell("td", mode.dataKey === "geographies" ? row.type : row.country));
    tr.append(createCell("td", mode.dataKey === "geographies" ? row.cities.join(", ") : row.region, "region-cell"));
    tr.append(createCell("td", row[mode.indexKey].toFixed(1), "numeric-cell"));
    elements.body.append(tr);
  }

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = createCell("td", `No matching ${mode.itemPlural}.`, "empty-cell");
    td.colSpan = 5;
    tr.append(td);
    elements.body.append(tr);
  }

  const hiddenCount = rows.length - visibleRows.length;
  elements.status.textContent = state.query
    ? `${rows.length} matching ${rows.length === 1 ? mode.itemSingular : mode.itemPlural}`
    : `Showing ${visibleRows.length} of ${rows.length} ${mode.itemPlural}`;
  elements.showAll.hidden = state.query || hiddenCount <= 0;
  elements.showAll.textContent = `Show all ${rows.length} ${mode.itemPlural}`;
}

function renderMode() {
  const mode = MODES[state.mode];
  for (const tab of elements.tabs) {
    const selected = tab.dataset.mode === state.mode;
    tab.setAttribute("aria-selected", String(selected));
  }

  elements.modeExplainer.textContent = mode.explainer;
  elements.rankDirection.textContent = mode.direction;
  elements.mapHeading.textContent = mode.mapTitle;
  elements.mapEurope.src = mode.mapEurope;
  elements.mapEurope.alt = mode.altEurope;
  elements.mapUs.src = mode.mapUs;
  elements.mapUs.alt = mode.altUs;
  elements.mapCaptionEurope.textContent = mode.captionEurope;
  elements.mapCaptionUs.textContent = mode.captionUs;
  elements.rankingHeading.textContent = mode.title;
  elements.indexHeading.textContent = mode.indexHeading;
  elements.sampleLabel.textContent = mode.sampleLabel;
  elements.sampleSize.textContent = state.data[mode.sampleSizeKey];
  elements.mapNote.textContent = mode.mapNote;
  elements.tableKicker.textContent = mode.tableKicker;
  elements.searchLabel.textContent = mode.searchLabel;
  elements.search.placeholder = mode.searchPlaceholder;
  elements.nameHeading.textContent = mode.nameHeading;
  elements.parentHeading.textContent = mode.parentHeading;
  elements.groupHeading.textContent = mode.groupHeading;
  renderRows();
}

for (const tab of elements.tabs) {
  tab.addEventListener("click", () => {
    if (!state.data || tab.dataset.mode === state.mode) return;
    state.mode = tab.dataset.mode;
    state.expanded = false;
    renderMode();
  });
}

elements.search.addEventListener("input", (event) => {
  state.query = normalizedQuery(event.target.value);
  renderRows();
});

elements.showAll.addEventListener("click", () => {
  state.expanded = true;
  renderRows();
});

fetch("assets/data/results.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Result data returned ${response.status}`);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    renderMode();
  })
  .catch(() => {
    elements.status.textContent = "The ranking data could not be loaded. Contact the author for the complete workbooks.";
    elements.showAll.hidden = true;
  });
