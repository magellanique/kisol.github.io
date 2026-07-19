const state = {
  data: null,
  gini: null,
  scope: "city",
  equivalenceRows: [],
  equivalenceQuery: "",
  equivalenceExpanded: false,
};

const elements = {
  scopeTabs: [...document.querySelectorAll("[data-calculator-scope]")],
  offerForm: document.querySelector("#offer-calculator-form"),
  offerCountryField: document.querySelector("#offer-country-field"),
  offerCityField: document.querySelector("#offer-city-field"),
  offerGeographyField: document.querySelector("#offer-geography-field"),
  offerSalary: document.querySelector("#offer-salary"),
  offerCountry: document.querySelector("#offer-country"),
  offerCity: document.querySelector("#offer-city"),
  offerGeography: document.querySelector("#offer-geography"),
  calculatorMethodNote: document.querySelector("#calculator-method-note"),
  offerCalculate: document.querySelector("#offer-calculate"),
  offerResults: document.querySelector("#offer-calculator-results"),
  offerSummaryTitle: document.querySelector("#offer-summary-title"),
  offerLocalPosition: document.querySelector("#offer-local-position"),
  offerLocalDetail: document.querySelector("#offer-local-detail"),
  offerPercentilePosition: document.querySelector("#offer-percentile-position"),
  offerPercentileDetail: document.querySelector("#offer-percentile-detail"),
  offerBasketLabel: document.querySelector("#offer-basket-label"),
  offerBasketPosition: document.querySelector("#offer-basket-position"),
  offerBasketDetail: document.querySelector("#offer-basket-detail"),
  offerBenchmarkLabel: document.querySelector("#offer-benchmark-label"),
  offerEuropePosition: document.querySelector("#offer-europe-position"),
  offerEuropeDetail: document.querySelector("#offer-europe-detail"),
  offerAnalysis: document.querySelector("#offer-analysis"),
  countryEquivalenceBlock: document.querySelector("#country-equivalence-block"),
  countryEquivalenceHeading: document.querySelector("#country-equivalence-heading"),
  countryEquivalenceBody: document.querySelector("#country-equivalence-body"),
  equivalenceKicker: document.querySelector("#equivalence-kicker"),
  equivalenceSearchLabel: document.querySelector("#equivalence-search-label"),
  equivalenceNameHeading: document.querySelector("#equivalence-name-heading"),
  equivalenceParentHeading: document.querySelector("#equivalence-parent-heading"),
  equivalenceSearch: document.querySelector("#equivalence-search"),
  equivalenceBody: document.querySelector("#equivalence-body"),
  equivalenceStatus: document.querySelector("#equivalence-status"),
  equivalenceShowAll: document.querySelector("#equivalence-show-all"),
};

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function createCell(tag, text, className = "") {
  const cell = document.createElement(tag);
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function normalizedQuery(value) {
  return value.trim().toLocaleLowerCase();
}

function basketIndex(row) {
  if (row.weightedPriceIndex != null) return Number(row.weightedPriceIndex) * 100;
  return Number(row.basketIndexExact ?? row.basketIndex);
}

function cityLabel(row) {
  return row.usState ? row.city + ", " + row.usState : row.city;
}

function rowLabel(row) {
  return row.geography ?? cityLabel(row);
}

function rowCountry(row) {
  if (row.geography) return row.type === "U.S. state" ? "United States" : row.geography;
  return row.country;
}

function rowParentLabel(row) {
  return row.geography ? row.type : row.country;
}

function rowMedianWage(row) {
  return Number(row.wageUsd ?? row.netMedianWageUsd);
}

function rowEmployment(row) {
  return Number(row.employment ?? row.primeEmployment);
}

function rowWagePeriod(row) {
  if (row.wagePeriod) return row.wagePeriod;
  const country = rowCountry(row);
  const stateCode = row.type === "U.S. state" ? row.code.replace("US-", "") : null;
  const sourceCity = state.data?.cities.find((city) => (
    city.country === country && (!stateCode || city.usState === stateCode)
  ));
  return sourceCity?.wagePeriod ?? "latest available";
}

function rowSearchText(row) {
  if (row.geography) {
    return [row.geography, row.code, row.type, row.parent, row.region, ...(row.cities ?? [])].join(" ");
  }
  return [row.city, row.country, row.iso, row.region, row.usState ?? ""].join(" ");
}

function comparisonRows() {
  return state.scope === "geography" ? state.data.geographies : state.data.cities;
}

function scopeCopy() {
  return state.scope === "geography"
    ? {
      singular: "country or state",
      plural: "countries / U.S. states",
      sampled: "country/state",
    }
    : {
      singular: "city",
      plural: "cities",
      sampled: "city",
    };
}

function formatUsd(value) {
  return USD_FORMATTER.format(value);
}

function relativeDifferenceText(delta, reference) {
  const percent = Math.abs(delta / reference) * 100;
  if (percent < 0.05) return "Matches the benchmark";
  return percent.toFixed(0) + "% " + (delta > 0 ? "above" : "below") + " the benchmark";
}

function basketDifferenceText(targetBasket, originBasket) {
  const percent = Math.abs((targetBasket / originBasket) - 1) * 100;
  if (percent < 0.05) return "Same basket cost";
  return percent.toFixed(0) + "% " + (targetBasket > originBasket ? "more expensive" : "cheaper");
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function errorFunction(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + (0.3275911 * x));
  const polynomial = (((((1.061405429 * t) - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592;
  return sign * (1 - (polynomial * t * Math.exp(-x * x)));
}

function normalCdf(value) {
  return 0.5 * (1 + errorFunction(value / Math.SQRT2));
}

function ordinalSuffix(value) {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return "th";
  if (value % 10 === 1) return "st";
  if (value % 10 === 2) return "nd";
  if (value % 10 === 3) return "rd";
  return "th";
}

function formatPercentile(value) {
  const percent = value * 100;
  if (percent < 0.1) return "Below 0.1st percentile";
  if (percent > 99.9) return "Above 99.9th percentile";
  if (percent < 1 || percent > 99) return percent.toFixed(1) + "th percentile";
  const rounded = Math.round(percent);
  return rounded + ordinalSuffix(rounded) + " percentile";
}

function formatShare(value) {
  const percent = value * 100;
  if (percent < 0.1) return "<0.1%";
  if (percent > 99.9) return ">99.9%";
  return percent.toFixed(1) + "%";
}

function earningsPosition(row, salary) {
  const input = state.gini?.countries?.[rowCountry(row)];
  const median = rowMedianWage(row);
  const sigma = Number(input?.logWageSigma);
  if (!input || !Number.isFinite(median) || median <= 0 || !Number.isFinite(sigma) || sigma <= 0) {
    return null;
  }
  const zScore = Math.log(salary / median) / sigma;
  const percentile = Math.min(1, Math.max(0, normalCdf(zScore)));
  const shareAtLeast = 1 - percentile;
  return {
    input,
    percentile,
    shareAtLeast,
    employmentAdjustedShare: shareAtLeast * rowEmployment(row),
  };
}

function earningsSourceLabel(row, input) {
  const sourceType = input.sourceIndicatorCode === "EAR_EMTG_SEX_NB_A"
    ? "employee-earnings Gini"
    : "worker-income fallback";
  const medianType = rowCountry(row) === "United States" ? "state median" : "national median";
  return input.year + " " + sourceType + " with the " + medianType;
}

function createEarningsPositionCell(row, salary) {
  const td = document.createElement("td");
  td.className = "earnings-position-cell";
  const position = earningsPosition(row, salary);
  if (!position) {
    td.textContent = "Not available";
    return td;
  }
  const strong = document.createElement("strong");
  strong.textContent = formatPercentile(position.percentile);
  const small = document.createElement("small");
  small.textContent = formatShare(position.shareAtLeast) + " estimated to earn at least";
  td.append(strong, small);
  return td;
}

function populateCityOptions(preferredCity = "") {
  const country = elements.offerCountry.value;
  const rows = state.data.cities
    .filter((row) => row.country === country)
    .sort((a, b) => cityLabel(a).localeCompare(cityLabel(b)));
  elements.offerCity.replaceChildren(...rows.map((row) => option(row.city, cityLabel(row))));
  const selected = rows.some((row) => row.city === preferredCity) ? preferredCity : rows[0]?.city;
  if (selected) elements.offerCity.value = selected;
  elements.offerCity.disabled = rows.length === 0;
}

function selectedOfferCity() {
  return state.data.cities.find((row) => (
    row.country === elements.offerCountry.value && row.city === elements.offerCity.value
  ));
}

function populateGeographyOptions(preferredCode = "CH") {
  const europeanCountries = state.data.geographies
    .filter((row) => row.type === "Country")
    .sort((a, b) => a.geography.localeCompare(b.geography));
  const usStates = state.data.geographies
    .filter((row) => row.type === "U.S. state")
    .sort((a, b) => a.geography.localeCompare(b.geography));
  const countryGroup = document.createElement("optgroup");
  countryGroup.label = "European countries";
  countryGroup.append(...europeanCountries.map((row) => option(row.code, row.geography)));
  const stateGroup = document.createElement("optgroup");
  stateGroup.label = "U.S. states";
  stateGroup.append(...usStates.map((row) => option(row.code, row.geography)));
  elements.offerGeography.replaceChildren(countryGroup, stateGroup);
  const rows = [...europeanCountries, ...usStates];
  elements.offerGeography.value = rows.some((row) => row.code === preferredCode)
    ? preferredCode
    : rows[0]?.code;
  elements.offerGeography.disabled = rows.length === 0;
}

function selectedOfferRow() {
  if (state.scope === "geography") {
    return state.data.geographies.find((row) => row.code === elements.offerGeography.value);
  }
  return selectedOfferCity();
}

function renderCountryEquivalents(origin, salary) {
  const originBasket = basketIndex(origin);
  const rows = state.data.cities
    .filter((row) => row.country === origin.country && row.city !== origin.city)
    .sort((a, b) => basketIndex(a) - basketIndex(b));
  elements.countryEquivalenceHeading.textContent = "Equivalent pay elsewhere in " + origin.country;
  elements.countryEquivalenceBody.replaceChildren();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = createCell("td", "No other city from this country is in the sample.", "empty-cell");
    td.colSpan = 4;
    tr.append(td);
    elements.countryEquivalenceBody.append(tr);
    return;
  }

  for (const row of rows) {
    const targetBasket = basketIndex(row);
    const equivalentSalary = salary * targetBasket / originBasket;
    const tr = document.createElement("tr");
    const cityCell = createCell("th", cityLabel(row), "city-cell");
    cityCell.scope = "row";
    tr.append(cityCell);
    tr.append(createCell("td", formatUsd(equivalentSalary) + " / month", "numeric-cell"));
    tr.append(createEarningsPositionCell(row, equivalentSalary));
    tr.append(createCell("td", basketDifferenceText(targetBasket, originBasket), "calculator-difference"));
    elements.countryEquivalenceBody.append(tr);
  }
}

function renderEquivalents() {
  const query = state.equivalenceQuery;
  const copy = scopeCopy();
  const filtered = query
    ? state.equivalenceRows.filter((item) => normalizedQuery(rowSearchText(item.row)).includes(query))
    : state.equivalenceRows;
  const visible = state.equivalenceExpanded || query ? filtered : filtered.slice(0, 12);
  elements.equivalenceBody.replaceChildren();

  for (const item of visible) {
    const tr = document.createElement("tr");
    const nameCell = createCell("th", rowLabel(item.row), "city-cell");
    nameCell.scope = "row";
    tr.append(nameCell);
    tr.append(createCell("td", rowParentLabel(item.row)));
    tr.append(createCell("td", formatUsd(item.equivalentSalary) + " / month", "numeric-cell"));
    tr.append(createEarningsPositionCell(item.row, item.equivalentSalary));
    tr.append(createCell("td", basketDifferenceText(item.targetBasket, item.originBasket), "calculator-difference"));
    elements.equivalenceBody.append(tr);
  }

  if (visible.length === 0) {
    const tr = document.createElement("tr");
    const td = createCell("td", "No matching " + copy.plural + ".", "empty-cell");
    td.colSpan = 5;
    tr.append(td);
    elements.equivalenceBody.append(tr);
  }

  elements.equivalenceStatus.textContent = query
    ? filtered.length + " matching " + (filtered.length === 1 ? copy.singular : copy.plural)
    : "Showing " + visible.length + " of " + filtered.length + " " + copy.plural;
  elements.equivalenceShowAll.hidden = Boolean(query) || state.equivalenceExpanded || filtered.length <= visible.length;
  elements.equivalenceShowAll.textContent = "Show all " + filtered.length + " " + copy.plural;
}
function renderOfferCalculator() {
  const origin = selectedOfferRow();
  const salary = Number(elements.offerSalary.value);
  if (!origin || !Number.isFinite(salary) || salary <= 0) {
    elements.offerSalary.setCustomValidity(salary > 0 ? "" : "Enter a salary greater than zero.");
    elements.offerSalary.reportValidity();
    return;
  }
  elements.offerSalary.setCustomValidity("");
  state.equivalenceExpanded = false;
  state.equivalenceQuery = "";
  elements.equivalenceSearch.value = "";

  const rows = comparisonRows();
  const copy = scopeCopy();
  const isGeography = state.scope === "geography";
  const originBasket = basketIndex(origin);
  const basketValues = rows.map(basketIndex).sort((a, b) => a - b);
  const middle = Math.floor(basketValues.length / 2);
  const sampleMedianBasket = basketValues.length % 2
    ? basketValues[middle]
    : (basketValues[middle - 1] + basketValues[middle]) / 2;
  const medianWage = rowMedianWage(origin);
  const localWageRatio = salary / medianWage;
  const salaryPosition = earningsPosition(origin, salary);
  const offerCapacity = salary / originBasket;
  const higherBenchmarks = rows.filter((row) => (
    rowMedianWage(row) / basketIndex(row) > offerCapacity
  )).length;
  const comparisonPosition = Math.min(rows.length, higherBenchmarks + 1);
  const percentile = 1 - ((comparisonPosition - 1) / rows.length);
  const affordabilityDescription = percentile >= 0.75
    ? "top-quartile purchasing capacity"
    : percentile >= 0.5
      ? "above-median purchasing capacity"
      : percentile >= 0.25
        ? "below-median purchasing capacity"
        : "bottom-quartile purchasing capacity";
  const benchmarkLabel = isGeography ? rowLabel(origin) : origin.country;
  const basketSampleLabel = isGeography ? "country/state-sample" : "city-sample";

  elements.offerSummaryTitle.textContent = formatUsd(salary) + " per month in " + rowLabel(origin);
  elements.offerLocalPosition.textContent = (localWageRatio * 100).toFixed(0) + "% of benchmark";
  elements.offerLocalDetail.textContent = "Applicable net-wage benchmark: " + formatUsd(medianWage) + " / month (" + rowWagePeriod(origin) + ")";
  if (salaryPosition) {
    elements.offerPercentilePosition.textContent = formatPercentile(salaryPosition.percentile);
    elements.offerPercentileDetail.textContent = formatShare(salaryPosition.shareAtLeast) + " earn at least; " + formatShare(salaryPosition.employmentAdjustedShare) + " employment-adjusted";
  } else {
    elements.offerPercentilePosition.textContent = "Not available";
    elements.offerPercentileDetail.textContent = "No compatible earnings-distribution input";
  }
  elements.offerBasketPosition.textContent = originBasket.toFixed(1);
  elements.offerBasketDetail.textContent = basketDifferenceText(originBasket, sampleMedianBasket) + " than the full " + basketSampleLabel + " median";
  elements.offerEuropePosition.textContent = "#" + comparisonPosition + " of " + rows.length;
  elements.offerEuropeDetail.textContent = "Approximate position against each sampled " + copy.sampled + " net-wage benchmark";
  const percentileAnalysis = salaryPosition
    ? " The salary is estimated at the " + formatPercentile(salaryPosition.percentile).toLowerCase() + " of the applicable earnings distribution; " + formatShare(salaryPosition.shareAtLeast) + " are estimated to earn at least this amount. Multiplying that share by the prime-age employment rate gives an employment-adjusted occurrence of " + formatShare(salaryPosition.employmentAdjustedShare) + ". The estimate uses the " + earningsSourceLabel(origin, salaryPosition.input) + "."
    : "";
  const fallbackWarning = salaryPosition && salaryPosition.input.sourceIndicatorCode !== "EAR_EMTG_SEX_NB_A"
    ? " This country uses grouped worker labour-income deciles because a direct monthly employee-earnings Gini is unavailable."
    : "";
  elements.offerAnalysis.textContent = relativeDifferenceText(salary - medianWage, medianWage) + " for " + benchmarkLabel + ". After adjusting the offer by " + rowLabel(origin) + "'s basket cost, it represents " + affordabilityDescription + " relative to the " + rows.length + " sampled " + copy.plural + "." + percentileAnalysis + fallbackWarning;

  if (isGeography) {
    elements.countryEquivalenceBlock.hidden = true;
  } else {
    elements.countryEquivalenceBlock.hidden = false;
    renderCountryEquivalents(origin, salary);
  }
  state.equivalenceRows = rows
    .map((row) => {
      const targetBasket = basketIndex(row);
      return {
        row,
        originBasket,
        targetBasket,
        equivalentSalary: salary * targetBasket / originBasket,
      };
    })
    .sort((a, b) => a.equivalentSalary - b.equivalentSalary);
  renderEquivalents();
  elements.offerResults.hidden = false;
}
function applyScopeUi() {
  const isGeography = state.scope === "geography";
  for (const tab of elements.scopeTabs) {
    tab.setAttribute("aria-selected", String(tab.dataset.calculatorScope === state.scope));
  }
  elements.offerForm.dataset.scope = state.scope;
  elements.offerCountryField.hidden = isGeography;
  elements.offerCityField.hidden = isGeography;
  elements.offerGeographyField.hidden = !isGeography;
  elements.offerCountry.disabled = isGeography;
  elements.offerCity.disabled = isGeography;
  elements.offerGeography.disabled = !isGeography;
  elements.countryEquivalenceBlock.hidden = isGeography;
  elements.calculatorMethodNote.textContent = isGeography
    ? "The entered salary is treated as net. Equivalent salaries use population-weighted country/state basket-price ratios only. Earnings percentiles are lognormal estimates from the applicable median and national earnings Gini; the employment-adjusted share is shown separately and is not applied to purchasing capacity."
    : "The entered salary is treated as net. Equivalent salaries use city basket-price ratios only. Earnings percentiles are lognormal estimates from the applicable median and national earnings Gini; the employment-adjusted share is shown separately and is not applied to purchasing capacity.";
  elements.offerBasketLabel.textContent = isGeography ? "Country/state basket" : "City basket";
  elements.offerBenchmarkLabel.textContent = isGeography
    ? "Against all country/state benchmarks"
    : "Against all city benchmarks";
  elements.equivalenceKicker.textContent = isGeography
    ? "Country/state equivalents"
    : "All-city equivalents";
  elements.equivalenceSearchLabel.textContent = isGeography
    ? "Find a country or U.S. state"
    : "Find a city or country";
  elements.equivalenceSearch.placeholder = isGeography
    ? "Search countries or U.S. states"
    : "Search cities or countries";
  elements.equivalenceNameHeading.textContent = isGeography ? "Country / state" : "City";
  elements.equivalenceParentHeading.textContent = isGeography ? "Type" : "Country";
}

function switchCalculatorScope(nextScope) {
  if (!state.data || nextScope === state.scope) return;
  if (nextScope === "geography") {
    const city = selectedOfferCity();
    state.scope = "geography";
    const targetCode = city?.country === "United States" ? "US-" + city.usState : city?.iso;
    if (state.data.geographies.some((row) => row.code === targetCode)) {
      elements.offerGeography.value = targetCode;
    }
  } else {
    const geography = state.data.geographies.find((row) => row.code === elements.offerGeography.value);
    state.scope = "city";
    if (geography) {
      const country = geography.type === "U.S. state" ? "United States" : geography.geography;
      elements.offerCountry.value = country;
      populateCityOptions();
      if (geography.type === "U.S. state") {
        const stateCode = geography.code.replace("US-", "");
        const matchingCity = state.data.cities.find((row) => row.country === "United States" && row.usState === stateCode);
        if (matchingCity) elements.offerCity.value = matchingCity.city;
      }
    }
  }
  applyScopeUi();
  renderOfferCalculator();
}

function initializeOfferCalculator() {
  const countries = [...new Set(state.data.cities.map((row) => row.country))]
    .sort((a, b) => a.localeCompare(b));
  elements.offerCountry.replaceChildren(...countries.map((country) => option(country, country)));
  elements.offerCountry.value = countries.includes("Switzerland") ? "Switzerland" : countries[0];
  populateCityOptions("Geneva");
  populateGeographyOptions("CH");
  elements.offerCalculate.disabled = false;
  applyScopeUi();
  renderOfferCalculator();
}

for (const tab of elements.scopeTabs) {
  tab.addEventListener("click", () => switchCalculatorScope(tab.dataset.calculatorScope));
}

elements.offerCountry.addEventListener("change", () => {
  if (state.scope !== "city") return;
  populateCityOptions();
  renderOfferCalculator();
});

elements.offerCity.addEventListener("change", () => {
  if (state.scope === "city") renderOfferCalculator();
});

elements.offerGeography.addEventListener("change", () => {
  if (state.scope === "geography") renderOfferCalculator();
});

elements.offerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderOfferCalculator();
});

elements.equivalenceSearch.addEventListener("input", (event) => {
  state.equivalenceQuery = normalizedQuery(event.target.value);
  renderEquivalents();
});

elements.equivalenceShowAll.addEventListener("click", () => {
  state.equivalenceExpanded = true;
  renderEquivalents();
});
function fetchJson(url, label) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(label + " returned " + response.status);
    return response.json();
  });
}

Promise.all([
  fetchJson("assets/data/results.json", "Result data"),
  fetchJson("assets/data/earnings-gini.json", "Earnings Gini data"),
])
  .then(([data, gini]) => {
    state.data = data;
    state.gini = gini;
    initializeOfferCalculator();
  })
  .catch(() => {
    elements.offerCalculate.disabled = true;
    elements.offerCountry.disabled = true;
    elements.offerCity.disabled = true;
    elements.offerGeography.disabled = true;
    elements.offerResults.hidden = false;
    elements.offerSummaryTitle.textContent = "The calculator data could not be loaded.";
  });
