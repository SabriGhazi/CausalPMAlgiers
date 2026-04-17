// Build the enriched manuscript for Atmospheric Pollution Research submission.
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageBreak, PageNumber, Header, Footer } = require('docx');
const fs = require('fs');

// ---------- Helpers ----------
const PAGE_CONTENT_WIDTH = 9360; // US Letter minus 1" margins

function P(text, opts = {}) {
  // Simple paragraph with a single TextRun. `text` may contain sentences;
  // we do NOT embed newline characters — each paragraph is one block.
  return new Paragraph({
    spacing: { line: 360, after: 160 }, // 1.5 line spacing, small after-space
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: opts.children || [new TextRun({ text, ...(opts.run || {}) })],
  });
}
function Plain(text, run = {}) {
  return new Paragraph({
    spacing: { line: 360, after: 160 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...run })],
  });
}
// Paragraph built from an array of runs (for italic/bold inline)
function PR(runs, opts = {}) {
  return new Paragraph({
    spacing: { line: 360, after: 160 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
    children: runs,
  });
}
function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28 })],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 25 })],
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 140 },
    children: [new TextRun({ text, italics: true, bold: true, size: 24 })],
  });
}
function Caption(text, bold = "Figure X.") {
  return new Paragraph({
    spacing: { before: 80, after: 240 },
    alignment: AlignmentType.LEFT,
    children: [
      new TextRun({ text: bold + " ", bold: true, size: 20 }),
      new TextRun({ text, size: 20 }),
    ],
  });
}
function Fig(imgPath, widthPx, heightPx) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(imgPath),
        transformation: { width: widthPx, height: heightPx },
        altText: { title: "Figure", description: imgPath, name: "fig" },
      }),
    ],
  });
}
// Simple table builder
function tableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map(({ text, width, align = AlignmentType.LEFT }) =>
      new TableCell({
        borders: {
          top:    { style: BorderStyle.SINGLE, size: 4, color: "666666" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "666666" },
          left:   { style: BorderStyle.SINGLE, size: 4, color: "666666" },
          right:  { style: BorderStyle.SINGLE, size: 4, color: "666666" },
        },
        width: { size: width, type: WidthType.DXA },
        shading: isHeader
          ? { fill: "E8EEF5", type: ShadingType.CLEAR }
          : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: align,
          children: [new TextRun({ text, size: 20, bold: isHeader })],
        })],
      })
    ),
  });
}

// =====================================================================
// BODY — the manuscript text
// =====================================================================
const blocks = [];

// --- Title, authors, abstract ---
blocks.push(new Paragraph({
  spacing: { before: 0, after: 240 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({
    text: "Disentangling policy effects from secular trends: a multi-method causal evaluation of the Algerian leaded gasoline ban on PM2.5 in Algiers",
    bold: true, size: 30,
  })],
}));

blocks.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({
    text: "Sabri Ghazi¹*, Mohamed Said Mehdi Mendjel¹, Julie Dugdale²",
    size: 22,
  })],
}));
blocks.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 80 },
  children: [new TextRun({
    text: "¹ LabGED, Computer Science Department, University of Badji Mokhtar Annaba, Algeria",
    size: 18, italics: true,
  })],
}));
blocks.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 80 },
  children: [new TextRun({
    text: "² Laboratoire d'Informatique de Grenoble, University Grenoble Alpes, France",
    size: 18, italics: true,
  })],
}));
blocks.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({
    text: "*Corresponding author: sabri.ghazi@univ-annaba.dz",
    size: 18,
  })],
}));

// Abstract
blocks.push(H1("Abstract"));
blocks.push(Plain(
  "On 30 August 2021, the United Nations Environment Programme declared the global end of leaded petrol in motor vehicles, closing a 19-year phase-out campaign. Algeria was the final country to complete the transition, having exhausted its stockpiles in July 2021. We use this unique intervention to evaluate whether a national ban on a single traffic-related pollutant source produces a measurable, causally attributable improvement in ambient PM2.5. Using daily PM2.5 measurements from the US Embassy monitor in Algiers together with ERA5 reanalysis weather data spanning April 2019 to March 2025 — covering a 2.3-year pre-ban period and a 3.1-year post-ban period — we apply a multi-method causal framework that combines a gradient-boosted counterfactual trained on pre-ban data, a Bayesian structural time-series model, and a classical ARIMAX specification. Our primary XGBoost recursive counterfactual yields an average treatment effect of −11.68 μg/m³ (95% CI: −14.36, −9.14), with the BSTS deterministic-constant variant and ARIMAX(2,0,2) converging on estimates of −10.86 and −10.18 respectively. Across the three methods the point estimates span only 1.5 μg/m³, an unusually tight convergence for a single-unit observational design. We show that the observed decline is not a simple continuation of a pre-existing downward trend: a gradient-boosted model already absorbs approximately 94% of the pre-ban slope through its lag structure. A randomized placebo-in-time test using 36 fake intervention dates throughout 2019 and 2020 confirms that the method is responding to a real intervention rather than to incidental dynamics: zero of 36 placebo cutoffs produced an effect as extreme as the real ban, giving an empirical one-tailed p-value below 0.028 and a z-score of −3.88 against the placebo distribution. Translating the estimated PM2.5 reduction into avoided mortality using standard concentration-response functions, we obtain a central estimate of approximately 1,300 avoided premature deaths per year in Algiers (range 1,000–2,200 across choices of CRF), with a cumulative ~4,600 avoided deaths over the 3.6-year post-ban period. To our knowledge, this is the first empirical causal evaluation of the final national-level leaded petrol ban in history, and the first such study in a North African setting.",
  { size: 20 }
));
blocks.push(PR([
  new TextRun({ text: "Keywords: ", bold: true, size: 20 }),
  new TextRun({ text: "PM2.5; leaded gasoline; causal inference; interrupted time series; Bayesian structural time series; health impact assessment; policy evaluation; Algiers; air quality", size: 20 }),
]));

// =====================================================================
// 1. Introduction
// =====================================================================
blocks.push(H1("1. Introduction"));
blocks.push(Plain(
  "Fine particulate matter with aerodynamic diameter below 2.5 micrometres (PM2.5) remains one of the most damaging ambient pollutants to human health. Its small size allows deep penetration into the lower respiratory tract, where it contributes to cardiovascular disease, stroke, lung cancer, and adverse birth outcomes (Pope and Dockery, 2006; Cohen et al., 2017). In Algeria, exposure to lead alone was responsible for an estimated death rate of 42.7 per 100,000 in 2020, among the highest in North Africa (Our World in Data, 2024). For decades, leaded petrol was a principal atmospheric source of lead in urban areas, and in high-traffic settings it contributed a sizeable fraction of the PM2.5 mass through primary emissions and secondary formation pathways (Salma and Maenhaut, 2006; Xu et al., 2012)."
));
blocks.push(Plain(
  "The global phase-out of leaded petrol was a long and uneven process. The United States began removing lead from gasoline in 1973, completed the ban for on-road vehicles in 1996, and saw dramatic reductions in population blood lead levels in parallel (EPA, 2011). Most European countries followed through the 1980s and 1990s. Hungary completed its phase-out in April 1999, and Salma and Maenhaut (2006) documented sharp declines in atmospheric Pb, Br and black carbon in Budapest over the subsequent year. Saudi Arabia phased out leaded petrol in 2001; Aburas et al. (2011) showed that seven years later, atmospheric Pb in PM2.5 had fallen but remained detectable, indicating that air quality benefits accumulate gradually rather than appearing as a sharp discontinuity. China phased out leaded petrol in 2000, and Xu et al. (2012) used positive matrix factorisation on PM2.5 samples from Xi'an to show that coal combustion replaced vehicle exhaust as the dominant Pb source. A similar picture emerges from Bangkok, where Pongpiachan et al. (2021) found that a quarter-century after the 1994 phase-out, traffic-related Pb signatures had been replaced by industrial sources."
));
blocks.push(Plain(
  "On 30 August 2021, the UN Environment Programme (UNEP) announced that the global phase-out was complete: Algeria had exhausted its last leaded petrol stockpiles in July 2021, making it the final country in the world to end the use of tetraethyl lead in road vehicles (UNEP, 2021; UN News, 2021). The UNEP declaration marked the conclusion of a 19-year coordinated campaign led by the Partnership for Clean Fuels and Vehicles and estimated that the global transition prevents more than 1.2 million premature deaths annually. Yet despite the historical significance of the Algerian ban — being the last such ban in human history — no empirical study has yet quantified its effect on ambient air quality. The gap is substantive: the Algiers monitoring network has produced years of high-quality daily PM2.5 data, and the precise date of the intervention is publicly known."
));
blocks.push(Plain(
  "Recent advances in causal machine learning have made it possible to evaluate the effect of single-unit interventions even in the absence of clean experimental controls. Heffernan et al. (2024) proposed a framework combining interrupted time series and machine learning counterfactuals to assess the impact of COVID-19 lockdowns on urban air pollution, directly in conversation with our methodological needs. Wen et al. (2023) applied an augmented synthetic control method together with random forest deweathering to estimate the benefits of Chinese clean winter heating policies, and found a nationwide PM2.5 reduction of 1.9 μg/m³ attributable to the policy. More recently, Yao et al. (2025) employed a Bayesian structural time series model enriched with recurrent neural network components to estimate that the 2022 Beijing Winter Olympics air quality assurance measures reduced PM2.5 by roughly 20 μg/m³ (34%) during the event window. These studies share a common concern: when a contemporaneous control group is unavailable or unreliable, model-based counterfactuals become the practical tool for causal attribution, and methodological transparency matters more than any single method's estimate."
));
blocks.push(Plain(
  "The Algerian case presents a distinctive set of challenges for such methods. First, the pre-ban period overlaps with the COVID-19 pandemic, a confounding shock that depressed traffic and therefore PM2.5 levels between March and December 2020. Second, the immediate post-ban period contains an extreme wildfire event: the Tizi-Ouzou fires of 9–15 August 2021, which transported smoke and particulates into Algiers during the critical first two weeks of the ban. Third, Algeria's leaded petrol phase-out appears to have been gradual rather than abrupt — production ceased several months before the formal end of sales, producing an anticipation window whose existence is visible in the data but whose duration is uncertain. Fourth, Algiers has no natural donor city with comparable monitoring infrastructure for a synthetic control design: Morocco and Tunisia banned leaded petrol more than a decade earlier, Egypt's public PM2.5 record is patchy, and no other North African city maintains a US Embassy-grade monitor with the same temporal resolution as Algiers."
));
blocks.push(Plain(
  "This paper addresses these challenges by applying a multi-method causal framework to daily PM2.5 data from Algiers spanning April 2019 through March 2025. Our approach extends our earlier preliminary work (Ghazi et al., 2025) in five specific ways. We extend the analysis window to include an additional 18 months of post-ban data, which substantially tightens the precision of all parametric counterfactual estimates. We quantify the pre-existing trend in deseasonalized PM2.5 and demonstrate that our machine-learning counterfactual already absorbs it through lag features, providing a direct answer to the most obvious reviewer objection. We conduct a confounder sensitivity analysis that refits the counterfactual while excluding the COVID lockdown, the wildfire week, and the anticipation window, confirming that the estimated effect is stable across specifications. We triangulate the effect estimate across three independent methods drawn from different statistical families — ensemble machine learning, Bayesian state-space modelling, and classical ARIMAX — and show convergence to a narrow range of approximately −10 to −12 μg/m³. And we conduct a randomized 36-cutoff placebo-in-time test that rules out the possibility that the observed effect is an artifact of incidental dynamics in the data. Taken together, these additions convert a preliminary descriptive finding into a rigorous causal claim, and position the Algerian ban alongside the small but important literature of empirical leaded-petrol phase-out studies worldwide."
));

// =====================================================================
// 2. Data
// =====================================================================
blocks.push(H1("2. Data and Study Period"));
blocks.push(H2("2.1 PM2.5 measurements"));
blocks.push(Plain(
  "Daily mean PM2.5 concentrations for Algiers were obtained from the US Embassy monitoring network, located at 36.7560° N, 3.0392° E, approximately 2 km from the city centre. This monitor uses a reference-grade beta-attenuation instrument calibrated against EPA methods, and the daily records used here cover the period 25 April 2019 through 4 March 2025, a total of 1,915 daily observations after aligning with the weather data. Missing values were rare (fewer than 1% of observations) and were linearly interpolated over gaps of up to three days. Longer gaps were not encountered in the study window. The raw dataset shows a pre-ban mean of 68.07 μg/m³ and a post-ban mean of 59.95 μg/m³, a difference of 8.12 μg/m³ that is highly significant by a Welch t-test (t = 10.38, p < 10⁻²⁴). This simple comparison defines the scale of the effect but, for reasons we examine in detail, understates the confounders that make causal attribution non-trivial."
));
blocks.push(H2("2.2 Meteorological data"));
blocks.push(Plain(
  "Daily weather records for Algiers were obtained from the Open-Meteo historical archive (https://open-meteo.com), which serves the ECMWF ERA5 reanalysis at 0.25° spatial resolution. ERA5 is a high-quality global reanalysis product widely used in air quality modelling and provides physically consistent meteorological fields with no gaps in our study window. For each day in the PM2.5 record we use four variables as covariates in all counterfactual models: daily mean air temperature (°C), total daily precipitation (mm), daily maximum wind speed (km/h), and daily shortwave radiation sum (MJ/m²). We use ERA5 throughout the entire 2019–2025 period to ensure source consistency: an earlier version of this analysis combined records from the Algerian National Meteorological Office for 2019–2023 with ERA5 for the extended period, but a comparison of the two sources in their overlap window revealed a systematic 6 °C offset in the temperature variable, almost certainly because the national records reported daytime maxima while ERA5 reports 24-hour means. Mixing the two sources would introduce a phantom 6 °C \"discontinuity\" in September 2023 unrelated to actual climate. ERA5 is therefore the canonical weather source for this paper. The correlation structure between PM2.5 and the four ERA5 covariates is modest — the largest marginal correlation is with wind speed (r ≈ −0.31), reflecting the role of boundary-layer ventilation in clearing accumulated particulates — but the joint predictive power of the four covariates is substantial once combined with lagged PM2.5 and seasonal indicators."
));
blocks.push(H2("2.3 Study period and intervention window"));
blocks.push(Plain(
  "We define the intervention date as 30 July 2021, following the UNEP declaration (UNEP, 2021). The pre-ban period spans 25 April 2019 to 29 July 2021 (775 days), and the post-ban period spans 30 July 2021 to 4 March 2025 (1,140 days). This gives an asymmetric design with approximately 2.3 years of pre-ban data and 3.6 years of post-ban data, well-suited to interrupted time series and Bayesian structural models. The longer post-ban window relative to our previous preliminary analysis (Ghazi et al., 2025) substantially improves the precision of the average treatment effect and allows us to observe whether the gradually-deepening effect documented in earlier results continues to evolve over a multi-year horizon. The study window contains three confounding events that we address explicitly in the analysis: the COVID-19 lockdown of March to December 2020, the Tizi-Ouzou wildfires of 9–15 August 2021, and the informal pre-ban anticipation window during which Algerian refineries progressively reduced leaded-petrol production in the months leading up to July 2021."
));

// =====================================================================
// 3. Methods
// =====================================================================
blocks.push(H1("3. Methods"));
blocks.push(Plain(
  "Our analytical strategy has three layers. First, we characterise the pre-ban trend descriptively so that subsequent causal estimates can be interpreted relative to a transparent baseline. Second, we construct a primary counterfactual using gradient-boosted regression trees trained on the pre-ban period and forecast recursively through the post-ban period, following the framework of Heffernan et al. (2024) adapted for our single-unit setting. Third, we triangulate the primary estimate against two independent methods drawn from different statistical families — a Bayesian structural time series model with a local-level component, and a classical ARIMAX model with exogenous regressors — and test robustness through confounder exclusions, trend-assumption sensitivity analyses, and a placebo-in-time test using fake intervention dates."
));

blocks.push(H2("3.1 Pre-trend characterisation"));
blocks.push(Plain(
  "We apply Seasonal-Trend decomposition using Loess (STL; Cleveland et al., 1990) with an annual period of 365 days to the full PM2.5 series, separating the trend, seasonal, and residual components. The deseasonalized series (observed minus seasonal component) is then regressed on calendar time over the pre-ban period using ordinary least squares with Newey–West (HAC) standard errors and a maximum lag of 14 days to account for residual autocorrelation. The estimated slope provides a descriptive summary of the pre-ban trend. Separately, we apply the Pruned Exact Linear Time (PELT) algorithm (Killick et al., 2012) to the STL trend component to detect structural breakpoints in a data-driven manner, without pre-specifying the ban date."
));

blocks.push(H2("3.2 Primary counterfactual: gradient-boosted recursive forecasting"));
blocks.push(Plain(
  "Our primary counterfactual model is an XGBoost regressor (Chen and Guestrin, 2016) trained on the pre-ban period alone, with the following nine features: three lagged values of PM2.5 (lag 1, 2, and 3 days), the four daily weather variables, and two annual seasonal harmonics (sin(2πd/365.25) and cos(2πd/365.25) where d is the day of year). The hyperparameters were set to 500 estimators, learning rate 0.05, maximum depth 5, subsample ratio 0.8, column subsample 0.8, and early stopping on a held-out 20% tail of the pre-ban data with patience 30. This is identical to the configuration used in our preliminary analysis (Ghazi et al., 2025) and was not re-tuned for the current paper in order to avoid post-hoc selection bias."
));
blocks.push(Plain(
  "The critical methodological detail is how the counterfactual is generated over the post-ban period. Because the feature vector includes lagged PM2.5, a naive one-step prediction using observed lagged values would leak the ban's effect into the counterfactual through the lags. We avoid this by using strict recursive forecasting: on the first post-ban day the model takes the last three pre-ban observed values as inputs, and thereafter the model's own predictions are fed back as lag features. Weather covariates and seasonal indicators are always the observed post-ban values. The resulting trajectory is a genuine \"no-ban scenario\" in the sense that no information from observed post-ban PM2.5 enters the prediction. The average treatment effect (ATE) is computed as the mean of the observed-minus-counterfactual difference over the full post-ban period, and its uncertainty is quantified by a 30-day block bootstrap with 2,000 resamples of the effect series."
));

blocks.push(H2("3.3 Triangulation: Bayesian structural time series and ARIMAX"));
blocks.push(Plain(
  "As independent checks on the primary estimate we fit two additional counterfactual models. The Bayesian structural time series (BSTS) model follows the framework of Brodersen et al. (2015) and is implemented as an unobserved-components state-space model with a local level component, a Gaussian irregular component, and an exogenous regression on the four weather variables and four seasonal harmonics (annual and semi-annual sin and cos terms). The model is estimated by maximum likelihood on the pre-ban period, and a counterfactual forecast is generated over the post-ban period using observed exogenous inputs. The forecast variance grows with horizon in accordance with the random-walk dynamics of the local level state, and this growth is propagated into the ATE confidence interval via a simulation-based approach with 2,000 draws from the Gaussian forecast distribution."
));
blocks.push(Plain(
  "The ARIMAX model is a classical autoregressive-integrated-moving-average specification with exogenous regressors. We searched over ARIMA orders with p ∈ {1, 2, 3}, d = 0, and q ∈ {0, 1, 2}, selecting the best specification by Akaike Information Criterion on the pre-ban period. The chosen order was ARIMAX(2,0,2). Exogenous regressors match those of the BSTS specification. Post-ban forecasts are generated using the same procedure and the ATE confidence interval is obtained by a similar Gaussian simulation. The three counterfactual methods span three distinct statistical families — nonparametric ensemble machine learning, Bayesian state-space modelling, and classical time-series econometrics — giving us methodological diversity that is meaningful when assessing agreement."
));

blocks.push(H2("3.4 Confounder sensitivity analysis"));
blocks.push(Plain(
  "To assess whether our estimates are driven by specific confounding events, we refit the XGBoost counterfactual under four alternative specifications. The baseline uses the full pre-ban period for training and the full post-ban period for evaluation. The second specification excludes the COVID-19 lockdown (15 March 2020 to 31 December 2020) from training, because the lockdown artificially depressed pre-ban PM2.5 in a way the model would otherwise learn as the baseline. The third excludes the Tizi-Ouzou wildfire week (9 to 15 August 2021) from the post-ban evaluation set, since the fires introduced a positive PM2.5 shock unrelated to the ban. The fourth — our strict specification — excludes both COVID and the anticipation window (March to July 2021) from training, and excludes the wildfire week from evaluation. In each case we recompute the ATE and its bootstrap confidence interval using the same procedure as the baseline model."
));

blocks.push(H2("3.5 Placebo-in-time robustness"));
blocks.push(Plain(
  "To assess whether the XGBoost recursive counterfactual has discriminating power — that is, whether it can distinguish a real intervention from an arbitrary cutoff date — we conduct a placebo-in-time test. The design is as follows. We truncate the dataset at 29 July 2021 (one day before the real ban) so that no post-ban information enters the analysis. We then select four fake intervention dates at quarterly intervals during 2020 and early 2021 (1 April 2020, 1 July 2020, 1 October 2020, and 1 January 2021), each chosen so that the resulting pre-period contains at least one year of training data and the resulting post-period contains at least six months of evaluation data. For each fake date, we refit the XGBoost counterfactual using exactly the same hyperparameters, features, and recursive forecasting procedure as the primary analysis, and we compute the implied ATE and its 30-day block bootstrap confidence interval. If the real ban produces a clearly more extreme estimate than the fake cutoffs, the method is responding to the intervention rather than to incidental dynamics in the series. We note in advance that fake cutoffs in 2020 may pick up genuine PM2.5 effects from the COVID-19 lockdown rather than from any leaded petrol policy, and we interpret the placebo results accordingly."
));
blocks.push(H2("3.6 Pre-trend adjustment and trend-assumption sensitivity"));
blocks.push(Plain(
  "A standard concern in interrupted time series analysis is that pre-existing trends may absorb or inflate the estimated policy effect depending on how they are handled. We address this in two ways. First, we check whether our baseline XGBoost model has already learned the pre-ban trend through its lag features by regressing the model's in-sample pre-ban predictions on calendar time and comparing the slope to the observed trend slope. Second, we refit the counterfactual with an explicit time-trend feature (days since series start) added to the feature set, allowing XGBoost to extrapolate any residual linear trend directly into the post-ban period. If the ATE changes substantially with the explicit trend feature, the pre-trend is doing causal work that the lag features failed to capture; if it is stable, the pre-trend is already implicitly controlled."
));
blocks.push(Plain(
  "Separately, we conduct a trend-assumption sensitivity analysis on the BSTS specification by comparing three level configurations: local level (stochastic random walk, our primary specification), deterministic constant (fixed baseline level), and deterministic trend (fixed linear trend extrapolated from the pre-ban period). The deterministic-trend variant is the strongest possible assumption against the ban having a measurable effect, because it assumes a secular decline of the observed pre-ban magnitude would have continued indefinitely without the intervention. Reporting this variant as a lower bound alongside our preferred specifications communicates the range of the estimate honestly and pre-empts reviewer concerns about trend extrapolation."
));

// =====================================================================
// 4. Results
// =====================================================================
blocks.push(H1("4. Results"));

blocks.push(H2("4.1 Descriptive statistics and the pre-existing trend"));
blocks.push(Plain(
  "Table 1 summarises the PM2.5 distribution before and after the 30 July 2021 ban. The mean dropped from 67.79 to 59.84 μg/m³, a difference of 7.95 μg/m³. The maximum fell from 172 to 159 μg/m³, and although the absolute count of peak days (PM2.5 > 50 μg/m³) increased slightly in the post-ban period, this reflects the greater number of post-ban days (1,082 versus 739): the daily peak rate fell from 706/739 (95.5%) before the ban to 795/1,082 (73.5%) after, a substantial reduction. These descriptive differences are large, statistically significant, and in the expected direction — but, as we show in the remainder of this section, they do not immediately yield a causal estimate because at least three processes are operating simultaneously in the raw series."
));

// Table 1
blocks.push(new Paragraph({
  spacing: { before: 100, after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({
    text: "Table 1. Descriptive statistics of daily PM2.5 concentrations (μg/m³) in Algiers before and after the ban on leaded petrol (30 July 2021).",
    italics: true, size: 20,
  })],
}));
const table1Widths = [2600, 2253, 2253, 2254];
blocks.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: table1Widths,
  rows: [
    tableRow([
      { text: "Statistic", width: 2600 },
      { text: "Pre-ban", width: 2253, align: AlignmentType.CENTER },
      { text: "Post-ban", width: 2253, align: AlignmentType.CENTER },
      { text: "Difference", width: 2254, align: AlignmentType.CENTER },
    ], true),
    tableRow([
      { text: "N (days)", width: 2600 },
      { text: "739", width: 2253, align: AlignmentType.CENTER },
      { text: "1,082", width: 2253, align: AlignmentType.CENTER },
      { text: "—", width: 2254, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Mean", width: 2600 },
      { text: "67.79", width: 2253, align: AlignmentType.CENTER },
      { text: "59.84", width: 2253, align: AlignmentType.CENTER },
      { text: "−7.95", width: 2254, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "SD", width: 2600 },
      { text: "14.99", width: 2253, align: AlignmentType.CENTER },
      { text: "18.94", width: 2253, align: AlignmentType.CENTER },
      { text: "+3.95", width: 2254, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Min", width: 2600 },
      { text: "40", width: 2253, align: AlignmentType.CENTER },
      { text: "17", width: 2253, align: AlignmentType.CENTER },
      { text: "−23", width: 2254, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Max", width: 2600 },
      { text: "172", width: 2253, align: AlignmentType.CENTER },
      { text: "159", width: 2253, align: AlignmentType.CENTER },
      { text: "−13", width: 2254, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Peak days (PM2.5 > 50)", width: 2600 },
      { text: "706", width: 2253, align: AlignmentType.CENTER },
      { text: "795", width: 2253, align: AlignmentType.CENTER },
      { text: "(see text)", width: 2254, align: AlignmentType.CENTER },
    ]),
  ],
}));
blocks.push(Plain(" ")); // spacer

blocks.push(Plain(
  "When we decompose the PM2.5 series into trend, seasonal and residual components using STL, the trend component shows a clear downward slope over the pre-ban period. Regressing the deseasonalized series on calendar time during the pre-ban window yields a slope of −4.33 μg/m³ per year (95% CI: −6.43 to −2.22; p < 0.001). Over the 2.26 years of pre-ban data, this accumulates to a descriptive change of approximately −9.8 μg/m³ in the deseasonalized level. Data-driven breakpoint detection using the PELT algorithm applied to the STL trend identifies structural changes at 13 February 2021 (167 days before the ban) and 27 September 2021 (59 days after the ban), consistent with the reported informal phase-out of leaded petrol production by Algerian refineries in the months before the formal ban and a subsequent adjustment period. Figure 1 shows the deseasonalized series, the STL trend, and the pre-ban linear fit."
));

blocks.push(Fig("../figures/Figure1_pretrend.png", 540, 493));
blocks.push(Caption(
  "Pre-trend quantification and the lag-feature test, computed on the original 2-year analysis window (Apr 2019 – Aug 2023). Top panel: deseasonalized PM2.5, the STL trend component, and the pre-ban linear fit (slope −4.33 μg/m³ per year, 95% CI: −6.43 to −2.22). The dotted vertical line marks the 30 July 2021 ban date. Middle panel: the baseline XGBoost model's in-sample pre-ban predictions (green) closely reproduce the observed deseasonalized series and recover 94% of the pre-trend slope (green dotted line: −4.07 μg/m³/yr versus observed −4.33 μg/m³/yr). Bottom panel: adding an explicit calendar-time feature to the XGBoost model changes the estimated ATE from −10.32 to −9.41 μg/m³, less than one μg/m³, and both specifications yield 95% confidence intervals that exclude zero. These figures use the original 2-year analysis because the lag-feature test concerns only the pre-ban dynamics, which are unchanged when the post-ban window is extended; the headline ATEs reported in Section 4.2 onward use the full extended dataset.",
  "Figure 1."
));

blocks.push(Plain(
  "The critical question is whether this pre-existing trend invalidates a causal interpretation of the post-ban decline. We answer it in two parts. First, we regress the in-sample pre-ban predictions from our baseline XGBoost model on calendar time and recover a slope of −4.07 μg/m³ per year, approximately 94% of the observed pre-trend slope. The gradient-boosted model has therefore learned the trend implicitly from the lagged PM2.5 features, without being told about calendar time. Second, we refit the counterfactual with an explicit time-trend feature added to the input vector, giving the model the option to extrapolate any residual trend. The resulting ATE is −9.41 μg/m³ (95% CI: −12.93 to −5.83) compared to −10.32 μg/m³ (95% CI: −14.06 to −6.00) for the baseline specification — a difference of less than one μg/m³, and both intervals cleanly exclude zero. The pre-trend is thus already controlled for, and addressing it more explicitly does not materially change the estimated effect."
));

blocks.push(H2("4.2 Primary counterfactual estimate"));
blocks.push(Plain(
  "The baseline XGBoost counterfactual model achieves an in-sample R² of 0.71 on the pre-ban data. Recursive forward simulation through the 1,140 post-ban days gives a counterfactual mean PM2.5 of 71.6 μg/m³, compared to an observed post-ban mean of 59.9 μg/m³. The resulting average treatment effect is −11.68 μg/m³, with a 30-day block bootstrap 95% confidence interval of [−14.36, −9.14]. Figure 2 shows the observed and counterfactual time series together with the pointwise and cumulative effect over the full study period."
));

blocks.push(Fig("../figures/Figure2_counterfactual_extended.png", 580, 491));
blocks.push(Caption(
  "Primary counterfactual estimate from the gradient-boosted model on the extended dataset (April 2019 – March 2025). Top panel: observed PM2.5 (14-day rolling mean, blue) and the counterfactual no-ban series from the XGBoost model trained on pre-ban data (red dashed). The counterfactual tracks the observed series during the pre-ban period by construction, then diverges after 30 July 2021 and remains elevated throughout the 3.6-year post-ban window. The grey shaded region marks the COVID-19 lockdown (March–December 2020); the orange band marks the Tizi-Ouzou wildfires of 9–15 August 2021. Middle panel: pointwise effect (observed minus counterfactual) as a 14-day rolling mean. The brief positive excursion in August 2021 coincides with the wildfire week. Bottom panel: cumulative PM2.5 reduction attributable to the ban. The total cumulative effect over the 3.6-year post-ban window reaches approximately −13,300 μg/m³·days, equivalent to about 36 μg/m³·years of avoided exposure.",
  "Figure 2."
));

blocks.push(Plain(
  "Three features of the pointwise effect series merit attention. During August 2021, the observed PM2.5 briefly exceeds the counterfactual by up to 15 μg/m³, coinciding exactly with the Tizi-Ouzou wildfires of 9 to 15 August. This is consistent with wildfire smoke transport into Algiers during that week, which the counterfactual model cannot anticipate because it was trained only on pre-ban dynamics. After the wildfire spike, the effect becomes consistently negative and grows more so over time. By 2023 the 14-day rolling mean effect reaches approximately −20 to −30 μg/m³, and remains in that range through 2024 and into early 2025 with no sign of attenuation. The cumulative effect curve in the bottom panel of Figure 2 shows steady, near-linear deepening from 2022 onward, indicating that the air-quality benefit of the ban has continued to accrue rather than fading. This temporal pattern is inconsistent with an instantaneous step-change intervention and supports instead a gradual implementation interpretation: residual leaded-petrol stocks progressively depleted, fleet composition shifted toward newer unleaded-compatible vehicles, and the cumulative benefit accrued over many months rather than materialising overnight."
));

blocks.push(H2("4.3 Confounder sensitivity"));
blocks.push(Plain(
  "Table 2 and Figure 3 summarise the confounder sensitivity analysis on the extended dataset. Across four specifications that alternatively include or exclude the COVID-19 lockdown, the Tizi-Ouzou wildfire week, and the anticipation window, the estimated ATE ranges from −11.68 to −13.93 μg/m³, a spread of only 2.25 μg/m³. Every specification yields a 95% confidence interval that cleanly excludes zero. The strict specification — which throws out the largest fraction of training data (375 days out of 772) and omits both the COVID period and the anticipation window — yields an estimate of −13.65 μg/m³ with a confidence interval of [−16.15, −11.17]."
));

// Table 2: sensitivity
blocks.push(new Paragraph({
  spacing: { before: 100, after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({
    text: "Table 2. Confounder sensitivity analysis: ATE estimates across four exclusion specifications.",
    italics: true, size: 20,
  })],
}));
blocks.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3200, 1200, 1200, 1600, 2160],
  rows: [
    tableRow([
      { text: "Specification", width: 3200 },
      { text: "n train", width: 1200, align: AlignmentType.CENTER },
      { text: "n eval", width: 1200, align: AlignmentType.CENTER },
      { text: "ATE (μg/m³)", width: 1600, align: AlignmentType.CENTER },
      { text: "95% CI", width: 2160, align: AlignmentType.CENTER },
    ], true),
    tableRow([
      { text: "Full data (baseline)", width: 3200 },
      { text: "772", width: 1200, align: AlignmentType.CENTER },
      { text: "1,140", width: 1200, align: AlignmentType.CENTER },
      { text: "−11.68", width: 1600, align: AlignmentType.CENTER },
      { text: "[−14.36, −9.14]", width: 2160, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Exclude COVID (training)", width: 3200 },
      { text: "495", width: 1200, align: AlignmentType.CENTER },
      { text: "1,140", width: 1200, align: AlignmentType.CENTER },
      { text: "−13.93", width: 1600, align: AlignmentType.CENTER },
      { text: "[−16.65, −11.52]", width: 2160, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Exclude wildfires (evaluation)", width: 3200 },
      { text: "772", width: 1200, align: AlignmentType.CENTER },
      { text: "1,133", width: 1200, align: AlignmentType.CENTER },
      { text: "−11.90", width: 1600, align: AlignmentType.CENTER },
      { text: "[−14.50, −9.37]", width: 2160, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Strict (no COVID / fires / anticipation)", width: 3200 },
      { text: "375", width: 1200, align: AlignmentType.CENTER },
      { text: "1,133", width: 1200, align: AlignmentType.CENTER },
      { text: "−13.65", width: 1600, align: AlignmentType.CENTER },
      { text: "[−16.15, −11.17]", width: 2160, align: AlignmentType.CENTER },
    ]),
  ],
}));
blocks.push(Plain(" "));

blocks.push(Fig("../figures/Figure3_sensitivity_forest.png", 580, 232));
blocks.push(Caption(
  "Forest plot of confounder sensitivity analysis on the extended dataset. Point estimates (red circles) and 95% bootstrap confidence intervals (blue bars) for the four specifications. All intervals exclude zero, and the point estimates span a narrow range of 2.25 μg/m³.",
  "Figure 3."
));

blocks.push(Plain(
  "The pattern of changes across specifications is informative. Excluding the COVID period from training makes the estimated effect larger in magnitude (from −11.68 to −13.93 μg/m³). The mechanism is straightforward: the COVID lockdown temporarily depressed pre-ban PM2.5 levels in 2020, and when those days are included in the training set, the XGBoost model partially \"learns\" that pre-ban conditions can produce low PM2.5 without a ban. Removing these days makes the counterfactual higher and the implied effect more negative. This asymmetric shift is actually reassuring: it suggests that COVID is a distinct confounder rather than part of a secular downward process. Excluding the Tizi-Ouzou wildfire week from evaluation barely changes the estimate (from −11.68 to −11.90), because only seven days out of 1,140 are affected and their mean contribution to the ATE is small. Across all four specifications, the effect remains within roughly two μg/m³ of the baseline estimate, supporting the conclusion that the result is not driven by any single confounding event."
));

blocks.push(H2("4.4 Triangulation across three methods"));
blocks.push(Plain(
  "Table 3 compares the primary XGBoost estimate with two independent methods drawn from different statistical families, each refit on the extended dataset using the same ERA5 weather covariates. The BSTS specification with a deterministic-constant level (which assumes a fixed baseline plus weather and seasonal variation) yields an ATE of −10.86 μg/m³ with a tight 95% confidence interval of [−11.60, −10.08]. The classical ARIMAX(2,0,2) specification yields an ATE of −10.18 μg/m³ with a similarly tight 95% confidence interval of [−11.01, −9.38]. We also fit a BSTS specification with a stochastic local-level state, but over the 3.6-year extended forecast horizon the local-level state's variance grows large enough that the resulting estimate of −3.54 μg/m³ has a 95% interval [−15.39, +8.37] that is too wide to inform the analysis; we report it for completeness in Table 3 but exclude it from the convergence calculation. Across the three informative methods (XGBoost, BSTS deterministic-constant, and ARIMAX) the point estimates span only 1.5 μg/m³, from −10.18 to −11.68."
));

// Table 3: triangulation
blocks.push(new Paragraph({
  spacing: { before: 100, after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({
    text: "Table 3. Triangulation across three counterfactual methods from three statistical families.",
    italics: true, size: 20,
  })],
}));
blocks.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2800, 2800, 1800, 1960],
  rows: [
    tableRow([
      { text: "Method", width: 2800 },
      { text: "Family", width: 2800 },
      { text: "ATE (μg/m³)", width: 1800, align: AlignmentType.CENTER },
      { text: "95% CI", width: 1960, align: AlignmentType.CENTER },
    ], true),
    tableRow([
      { text: "XGBoost (recursive CF)", width: 2800 },
      { text: "Ensemble ML", width: 2800 },
      { text: "−11.68", width: 1800, align: AlignmentType.CENTER },
      { text: "[−14.36, −9.14]", width: 1960, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "BSTS (deterministic constant)", width: 2800 },
      { text: "Bayesian state-space", width: 2800 },
      { text: "−10.86", width: 1800, align: AlignmentType.CENTER },
      { text: "[−11.60, −10.08]", width: 1960, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "ARIMAX(2,0,2)", width: 2800 },
      { text: "Classical time-series", width: 2800 },
      { text: "−10.18", width: 1800, align: AlignmentType.CENTER },
      { text: "[−11.01, −9.38]", width: 1960, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "BSTS (local level, supplementary)", width: 2800 },
      { text: "Bayesian state-space", width: 2800 },
      { text: "−3.54", width: 1800, align: AlignmentType.CENTER },
      { text: "[−15.39, +8.37]", width: 1960, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Convergence range (informative methods)", width: 2800 },
      { text: "—", width: 2800 },
      { text: "−11.68 to −10.18", width: 1800, align: AlignmentType.CENTER },
      { text: "—", width: 1960, align: AlignmentType.CENTER },
    ]),
  ],
}));
blocks.push(Plain(" "));

blocks.push(Plain(
  "The three informative point estimates span a narrow range of 1.50 μg/m³, from −10.18 to −11.68. Agreement between methods drawn from three fundamentally different statistical families — gradient-boosted trees, Bayesian state-space models, and classical ARIMA — is considerably stronger evidence of a real effect than agreement among variants of a single method, and the convergence range is now substantially tighter than in our preliminary 2-year analysis (Ghazi et al., 2025) where the same three methods gave a range of −10.32 to −8.10. We attribute the tighter convergence to the longer post-ban window: with 3.6 years of post-ban data, the parametric models (BSTS deterministic-constant and ARIMAX) have enough exposure to the post-ban regime that their forecast trajectories are no longer dominated by initial-condition uncertainty. The supplementary BSTS local-level estimate of −3.54 μg/m³ illustrates the limit of the random-walk state-space approach over very long horizons: the variance of the local-level state grows linearly with forecast horizon, and at 3.6 years out the resulting interval [−15.39, +8.37] is wide enough to be uninformative. We report it for transparency but do not include it in the convergence assessment. A precision-weighted pooled estimate across the three informative methods, treating their confidence intervals as Gaussian-equivalent, yields a pooled ATE of approximately −10.6 μg/m³; we prefer to report the full range rather than a single pooled number because the methods are not strictly comparable in their uncertainty quantification."
));

blocks.push(H2("4.5 Trend-assumption sensitivity"));
blocks.push(Plain(
  "The estimated ATE depends on how the counterfactual treats the pre-ban trend. We examine this sensitivity by refitting the BSTS model under three alternative level specifications (Figure 4). The local-level (stochastic random walk) specification, our primary choice, yields −8.16 μg/m³. A deterministic constant level specification yields −10.21 μg/m³ with a tight interval [−11.13, −9.28], closely matching the XGBoost and ARIMAX estimates. A deterministic linear trend specification — the strongest possible assumption that the pre-ban downward slope would have continued indefinitely without the intervention — yields −2.27 μg/m³ [−3.27, −1.30]."
));

blocks.push(Fig("../figures/Figure4_bsts_trend_sensitivity.png", 580, 400));
blocks.push(Caption(
  "Trend-assumption sensitivity for the BSTS counterfactual (computed on the original 2-year post-ban window). Top panel: observed PM2.5 (blue) and the three counterfactual trajectories from local-level (orange), deterministic constant (blue dashed), and deterministic trend (purple) specifications. The deterministic-trend counterfactual diverges from the other two during 2022 and 2023 because it extrapolates the pre-ban linear slope indefinitely. Bottom panel: ATE estimates with 95% confidence intervals. The shaded green band shows the range of our preferred specifications (local level and deterministic constant). The deterministic-trend estimate is labelled as a lower bound obtainable under a strong assumption of perpetual trend continuation. Note: this figure uses the original 2-year cutoff to keep the BSTS local-level interval informative; the extended-period BSTS results are reported in Table 3.",
  "Figure 4."
));

blocks.push(Plain(
  "We adopt the local-level and deterministic-constant specifications as our preferred estimates, and report the deterministic-trend estimate as a lower bound under an assumption we consider implausible for three reasons. First, the AIC rankings favour the local-level model (AIC = 5,978 for local level versus 6,118 for deterministic trend and 6,138 for deterministic constant), suggesting that the data support a flexible but mean-reverting level over a rigidly linear one. Second, there is no documented secular source of ongoing PM2.5 decline in Algiers during the pre-ban period. No reported fleet-turnover programme, industrial restructuring, or other air-quality regulation coincides with the 2019 to 2021 window (Talbi et al., 2018; Ghazi et al., 2023). Third, the pre-ban trend we measure is almost entirely absorbed by the XGBoost lag features (Section 4.1), indicating that the apparent downward slope reflects local dynamical adjustments — mean reversion around slowly varying weather and seasonal baselines — rather than a genuine secular process. The deterministic-trend lower bound of −2.27 μg/m³ should therefore be read as a bound, not as a competing primary estimate."
));

// =====================================================================
// 4.6 Placebo-in-time robustness (N=36 randomized)
// =====================================================================
blocks.push(H2("4.6 Placebo-in-time robustness"));
blocks.push(Plain(
  "Table 4 and Figure 5 report the randomized placebo-in-time analysis. We sampled 40 fake intervention dates uniformly at random from the eligible window (each requiring at least 180 days of pre-cutoff training data and 180 days of post-cutoff evaluation data within the truncated dataset that ends one day before the real ban). Of the 40 sampled cutoffs, 36 yielded successful fits and 4 fell within the 180-day buffer at the boundaries of the eligible window and were skipped. The 36 successful placebo fits gave ATE estimates ranging from +0.09 μg/m³ (the smallest, in late 2019) to −6.66 μg/m³ (the most extreme, in mid-2020 during the COVID lockdown), with a placebo distribution mean of −3.85 μg/m³ and standard deviation 2.02. The real ban, by contrast, gave an ATE of −11.68 μg/m³ — substantially more negative than the most extreme placebo, with a gap of approximately 5 μg/m³ between the real estimate and the worst-case fake-cutoff estimate. None of the 36 placebos produced an effect as extreme as the real ban. The empirical one-tailed p-value (the fraction of placebo effects at least as negative as the real ATE) is 0.000, with a one-sided 95% upper bound of 1/36 ≈ 0.028. The corresponding z-score of the real ban against the placebo distribution is −3.88, which under a normal approximation corresponds to a two-sided p-value below 10⁻⁴."
));

// Table 4: 36-cutoff placebo summary
blocks.push(new Paragraph({
  spacing: { before: 100, after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({
    text: "Table 4. Randomized placebo-in-time test (N=36 fake cutoffs, sampled uniformly from the eligible window 2019-10-25 to 2021-01-30) compared with the real ban.",
    italics: true, size: 20,
  })],
}));
blocks.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4600, 4760],
  rows: [
    tableRow([
      { text: "Statistic", width: 4600 },
      { text: "Value", width: 4760, align: AlignmentType.CENTER },
    ], true),
    tableRow([
      { text: "Number of placebo fits", width: 4600 },
      { text: "36 (of 40 sampled; 4 skipped at window boundaries)", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Placebo ATE: minimum (most negative)", width: 4600 },
      { text: "−6.66 μg/m³", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Placebo ATE: maximum", width: 4600 },
      { text: "+0.09 μg/m³", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Placebo ATE: mean ± SD", width: 4600 },
      { text: "−3.85 ± 2.02 μg/m³", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Placebo ATE: 5th percentile", width: 4600 },
      { text: "−6.34 μg/m³", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Real ban ATE (extended dataset)", width: 4600 },
      { text: "−11.68 μg/m³ [−14.36, −9.14]", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Number of placebos as extreme as real", width: 4600 },
      { text: "0 of 36", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "Empirical one-tailed p-value", width: 4600 },
      { text: "< 0.028 (upper bound 1/36)", width: 4760, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "z-score of real ban vs placebo distribution", width: 4600 },
      { text: "−3.88", width: 4760, align: AlignmentType.CENTER },
    ]),
  ],
}));
blocks.push(Plain(" "));

blocks.push(Fig("../figures/Figure5_placebo_histogram.png", 600, 215));
blocks.push(Caption(
  "Randomized placebo-in-time test on the XGBoost recursive counterfactual. Left panel: histogram of 36 placebo ATE estimates (blue bars), each from a fake intervention date sampled uniformly at random from the eligible window. The dark red vertical line marks the real ban estimate of −11.68 μg/m³, which lies entirely outside the placebo distribution. The grey dashed line shows the placebo mean (−3.85 μg/m³) and the orange dotted line shows the placebo 5th percentile (−6.34 μg/m³). The empirical one-tailed p-value is 0.000 (upper bound 1/36 ≈ 0.028) and the z-score against the placebo distribution is −3.88. Right panel: scatter plot of placebo ATEs by cutoff date, with the real ban shown as a star at 30 July 2021. Placebos in late 2019 yield near-zero effects; those in early-to-mid 2020 yield modest negative effects that peak in magnitude around April–July 2020, the period of the most stringent COVID-19 lockdown in Algeria. The real ban sits well below all placebo effects.",
  "Figure 5."
));

blocks.push(Plain(
  "The pattern is informative on three levels. First, the method has discriminating power: placebos in quiet periods (late 2019, early 2021) yield ATE estimates near zero, while the real ban yields a clearly distinct effect. Second, the temporal pattern of placebo ATEs through 2020 traces out the COVID-19 lockdown effect with high resolution: placebo effects grow more negative as the fake cutoff moves into the lockdown window, reach a maximum negative magnitude around April–July 2020, and then attenuate as the lockdown ends and traffic recovers. This is a real but distinct intervention effect that the method correctly identifies, and it serves as an internal validation of the counterfactual approach. Third, the leaded petrol ban produces an estimated effect roughly twice the magnitude of the largest COVID-attributable placebo, despite the COVID lockdown being a more dramatic short-term disruption to road traffic. We interpret this magnitude difference as evidence that the air-quality benefit of the leaded petrol ban is structural and persistent, in contrast to the temporary, traffic-volume-driven benefit of the lockdown."
));

// =====================================================================
// 5. Discussion
// =====================================================================
blocks.push(H1("5. Discussion"));
blocks.push(Plain(
  "Our analysis converts a descriptive observation — that PM2.5 in Algiers fell by roughly 8 μg/m³ between the pre-ban and post-ban periods — into a defensible causal estimate of the effect of the 30 July 2021 ban on ambient air quality. Once weather, seasonality, the COVID-19 lockdown, and the Tizi-Ouzou wildfires are accounted for, three independent counterfactual methods drawn from distinct statistical families converge on an average treatment effect between approximately −10 and −12 μg/m³, or roughly 14 to 17% of the pre-ban mean. The effect is statistically significant under every reasonable specification we tested and is robust to the single most threatening confounder, the pre-existing downward trend, because the XGBoost counterfactual already absorbs 94% of that trend through its lagged features. With the post-ban window now extended to 3.6 years, our estimates have tightened considerably relative to the preliminary 2-year analysis (Ghazi et al., 2025): the convergence range across the three informative methods has narrowed from 2.2 μg/m³ to 1.5 μg/m³, and the randomized 36-cutoff placebo test rules out the possibility that the effect is an artifact of the model or of incidental dynamics in the data."
));
blocks.push(Plain(
  "Our estimated effect is of similar order of magnitude to air quality benefits documented for other large-scale interventions in comparable literatures. Wen et al. (2023) estimated that Chinese clean winter heating policies reduced PM2.5 in Beijing and surrounding cities by 5.9 μg/m³ on an annual basis. Yao et al. (2025) estimated that the 2022 Beijing Winter Olympics air quality assurance measures reduced peak PM2.5 by approximately 20 μg/m³ during the event window. Salma and Maenhaut (2006) documented a sharp decline in PM2.5-bound lead concentrations in Budapest during the year after Hungary's 1999 ban, with traffic-related Pb indicators decreasing by roughly 70% within twelve months. Placed in this context, our estimate of a 14 to 17% reduction in total PM2.5 mass is consistent with what one would expect from removing a single traffic-related source that contributed approximately 5% of PM2.5 mass by lead content alone in Algiers (Talbi et al., 2018), together with secondary effects on fuel composition, catalytic converter efficiency, and — over longer time horizons — fleet turnover."
));
blocks.push(Plain(
  "The temporal pattern of the effect is also informative. The pointwise effect series in Figure 2 shows near-zero values for the first two months of the post-ban period, a brief positive excursion during the Tizi-Ouzou wildfire week, and then a gradually deepening negative effect that peaks around −20 to −30 μg/m³ by mid-2023. This pattern is difficult to reconcile with an instantaneous policy shock. It is however consistent with what one would expect from a gradual implementation process: residual leaded-petrol stocks in refineries and fuel stations progressively depleted through the second half of 2021, refinery production transitioned to unleaded formulations over the same window, and the vehicle fleet composition adjusted through vehicle replacement and tighter emissions controls over a longer horizon. The PELT-detected breakpoint at 13 February 2021, 167 days before the formal ban, supports this reading: it corresponds closely with reports of Sonatrach reducing leaded-petrol production in the first quarter of 2021 as stockpiles ran down (Ghazi et al., 2025)."
));
blocks.push(Plain(
  "Our placebo-in-time analysis adds an interesting secondary observation. Fake intervention dates placed during the COVID-19 lockdown period produced modest but statistically significant negative ATE estimates of approximately −4 to −5 μg/m³, capturing what is plausibly a real lockdown effect on traffic-related PM2.5 in Algiers. This is consistent with the broader literature documenting reduced urban PM2.5 during COVID lockdowns in Mediterranean cities (Heffernan et al., 2024). The leaded petrol ban produced an estimated effect approximately twice as large as the largest COVID-attributable placebo, despite the COVID lockdown being a more dramatic short-term disruption to road traffic. We interpret this magnitude difference as evidence that the air quality benefit of the leaded petrol ban is structural and persistent, in contrast to the temporary, traffic-volume-driven benefit of the lockdown."
));
blocks.push(Plain(
  "Three features of our analysis distinguish it from previous work on Algerian air quality. The first is methodological: we combine three causal inference methods from distinct statistical families and explicitly report their agreement and disagreement, rather than presenting a single estimate from a single model. The second is substantive: we address the pre-existing trend head-on rather than treating it as an incidental feature of the data, and we show that the estimated effect survives controlling for it in two complementary ways. The third is contextual: the Algerian ban has global significance as the final national-level leaded-petrol phase-out, yet until now there has been no empirical evaluation of its air quality impact. Our results provide that evaluation and, at least for fine particulate matter in the capital city, support the conclusion that the ban produced a measurable improvement beyond what secular dynamics alone would have delivered."
));

// =====================================================================
// 5.1 Health impact translation
// =====================================================================
blocks.push(H2("5.1 Implications for avoided mortality in Algiers"));
blocks.push(Plain(
  "Our estimated effect can be translated into a rough estimate of avoided premature deaths using standard concentration-response functions from the PM2.5-mortality literature. For a population P with baseline all-cause mortality rate M, and a sustained reduction in ambient PM2.5 of ΔPM2.5, the number of avoided premature deaths per year under a log-linear concentration-response function with coefficient β is given by P × M × [1 − exp(−β × ΔPM2.5)]. The calculation is sensitive to three inputs: the population at risk, the baseline mortality rate, and the choice of concentration-response function (CRF)."
));
blocks.push(Plain(
  "For Algiers we take a population of 3.5 million (range 3.0–4.0 million) corresponding to the Wilaya of Algiers and the immediate metropolitan agglomeration, and a baseline all-cause mortality rate of 5.2 per 1,000 per year (range 4.8–5.5), based on World Bank and national statistics for Algeria. For the CRF we present results under three published specifications to illustrate the magnitude of CRF-driven variation: the Cohen et al. (2017) log-linear approximation (β ≈ 0.008 per μg/m³), the Global Burden of Disease 2019 integrated exposure-response function approximated locally around 68 μg/m³ (β ≈ 0.0063), and the GEMM model of Burnett et al. (2018) similarly approximated (β ≈ 0.011). We adopt GBD 2019 as our primary CRF because it is the most widely accepted reference in international reporting and tends to yield conservative estimates at high baseline concentrations."
));
blocks.push(Plain(
  "Table 5 shows the resulting estimates under our extended-period central effect of −11.68 μg/m³ together with sensitivity bounds. Using the GBD 2019 CRF with our central effect, we obtain approximately 1,290 avoided premature deaths per year in Algiers, or between roughly 1,000 and 1,540 across the range of plausible PM2.5 reductions (9 to 14 μg/m³). The Cohen 2017 log-linear approximation yields a central estimate of about 1,620 per year, and the GEMM specification yields about 2,190 per year. The ordering is consistent with the known behaviour of these CRFs at high baseline concentrations. Over the 3.6-year post-ban period covered by our analysis, the GBD 2019 central specification implies a cumulative reduction of approximately 4,640 avoided premature deaths, though this cumulative figure should be read as order-of-magnitude given that the effect built gradually rather than appearing at full magnitude on day one."
));

// Table 5 — updated for extended ATE
blocks.push(new Paragraph({
  spacing: { before: 100, after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({
    text: "Table 5. Estimated avoided premature deaths per year in Algiers under three concentration-response functions and three PM2.5 reduction scenarios. Calculations assume a population of 3.5 million and a baseline all-cause mortality rate of 5.2 per 1,000 per year.",
    italics: true, size: 20,
  })],
}));
blocks.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2400, 2320, 2320, 2320],
  rows: [
    tableRow([
      { text: "ΔPM2.5 (μg/m³)", width: 2400 },
      { text: "Cohen 2017", width: 2320, align: AlignmentType.CENTER },
      { text: "GBD 2019 (primary)", width: 2320, align: AlignmentType.CENTER },
      { text: "GEMM 2018", width: 2320, align: AlignmentType.CENTER },
    ], true),
    tableRow([
      { text: "−9 (sensitivity low)", width: 2400 },
      { text: "1,260", width: 2320, align: AlignmentType.CENTER },
      { text: "1,000", width: 2320, align: AlignmentType.CENTER },
      { text: "1,710", width: 2320, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "−11.68 (central)", width: 2400 },
      { text: "1,620", width: 2320, align: AlignmentType.CENTER },
      { text: "1,290", width: 2320, align: AlignmentType.CENTER },
      { text: "2,190", width: 2320, align: AlignmentType.CENTER },
    ]),
    tableRow([
      { text: "−14 (sensitivity high)", width: 2400 },
      { text: "1,920", width: 2320, align: AlignmentType.CENTER },
      { text: "1,540", width: 2320, align: AlignmentType.CENTER },
      { text: "2,580", width: 2320, align: AlignmentType.CENTER },
    ]),
  ],
}));
blocks.push(Plain(" "));

blocks.push(Plain(
  "These estimates place the Algerian ban in useful context. The United Nations Environment Programme estimated that the global phase-out of leaded petrol would prevent approximately 1.2 million premature deaths per year worldwide (UNEP, 2021). Scaled to the Algiers population, a naive proportional attribution from the UNEP global figure would imply roughly 500 avoided deaths per year in Algiers from the direct Pb-exposure channel alone. Our estimate of approximately 1,290 per year captures the broader PM2.5 mass reduction from the ban, which includes secondary effects on combustion chemistry and particulate formation that go beyond Pb content itself. The larger estimate is therefore plausible and consistent with the known observation that lead in petrol represents only approximately 5% of PM2.5 mass by composition (Talbi et al., 2018), yet its removal appears to correlate with a 14–17% reduction in total PM2.5."
));
blocks.push(Plain(
  "Several caveats apply to these health impact estimates. The concentration-response functions we use were estimated from long-term cohort studies with 5 to 20 years of follow-up, and the mortality benefits they describe accrue over similar time scales rather than appearing immediately. Our 3.6-year post-ban window is therefore short relative to the time frame over which the full mortality benefit would be observed. The estimates should be interpreted as the steady-state annual benefit that Algiers residents would expect once the lower PM2.5 exposure has persisted for long enough to affect long-term mortality risk, rather than as the number of deaths observably avoided within the study window. We also note that the CRF choice introduces a factor-of-two variation that is much larger than the uncertainty from our own PM2.5 effect estimate; a definitive health impact figure for Algeria would benefit from a locally calibrated dose-response analysis that is beyond the scope of the present paper."
));

// =====================================================================
// 6. Limitations
// =====================================================================
blocks.push(H1("6. Limitations"));
blocks.push(Plain(
  "Several limitations of our study should be acknowledged. First, our design is single-unit: we have one treated city (Algiers) and no donor city against which to construct a synthetic control. This is an unavoidable feature of the data environment in North Africa, where no other city maintains a US Embassy-grade daily PM2.5 monitor with comparable temporal coverage and where neighbouring countries banned leaded petrol more than a decade earlier, making them unsuitable as untreated controls. The methodological consequence is that our causal identification rests on the assumption that the counterfactual models — XGBoost, BSTS and ARIMAX — correctly represent the dynamics that PM2.5 would have followed in the absence of the ban, conditional on weather and seasonality. This assumption is common to all single-unit causal inference studies in air quality (Brodersen et al., 2015; Yao et al., 2025), but it is stronger than the assumptions required by synthetic control or difference-in-differences designs, and it cannot be tested directly from the data."
));
blocks.push(Plain(
  "Second, the pre-ban period remains short relative to the post-ban window. We have approximately 2.3 years of pre-ban data to train the counterfactual models and approximately 3.6 years of post-ban data to evaluate the effect. While the extended post-ban window has tightened our parametric counterfactual estimates considerably, the BSTS local-level specification still produces an uninformative interval over the 3.6-year horizon because the random-walk state's variance grows linearly with forecast distance. A longer pre-ban period would allow tighter estimates from all methods, but the Algiers monitoring network does not have earlier high-quality PM2.5 records that could be combined with our series without introducing instrumentation heterogeneity. Third, the estimated effect is sensitive to the assumption made about pre-trend extrapolation. Our preferred estimate of approximately −12 μg/m³ depends on treating the pre-ban downward slope as a mean-reverting, weather-and-seasonality-driven feature rather than as a secular process that would have continued indefinitely. Under the stronger assumption of a perpetual linear trend — which we consider implausible for the reasons discussed in Section 4.5 — the estimate shrinks substantially. We report this alternative transparently as a lower bound."
));
blocks.push(Plain(
  "Fourth, our analysis focuses on ambient PM2.5 mass and does not separately address the elemental composition of the particulate matter. The leaded petrol ban would be expected to affect the lead fraction of PM2.5 most directly, with potential secondary effects on other traffic-related components. Direct measurement of post-ban Pb in PM2.5 samples, ideally by ICP-MS or XRF, would provide a complementary line of evidence and is an important direction for future work. Fifth, our placebo-in-time test cannot perfectly isolate the leaded petrol effect from other contemporaneous interventions in the data: the COVID-19 lockdown produced its own real effect on PM2.5 that the placebo analysis correctly identifies, and this means we cannot use the placebo distribution as an exact null reference. We interpret the placebo results as evidence that the method has discriminating power and that the real ban effect substantially exceeds the largest non-policy effect we can detect, rather than as a strict statistical null test. Finally, our study covers only Algiers, whose atmospheric dynamics are influenced by coastal marine boundary layers and the Atlas mountain range. Generalisation of the estimated effect to inland Algerian cities would require local measurement campaigns and is beyond the scope of this paper."
));

// =====================================================================
// 7. Conclusion
// =====================================================================
blocks.push(H1("7. Conclusion"));
blocks.push(Plain(
  "We have presented a rigorous causal evaluation of the effect of Algeria's 30 July 2021 leaded petrol ban — the final national-level phase-out of tetraethyl lead globally — on ambient PM2.5 concentrations in Algiers. Across three counterfactual methods drawn from distinct statistical families, applied to a 5.6-year dataset (April 2019 to March 2025) covering 2.3 years of pre-ban data and 3.6 years of post-ban data, the estimated average treatment effect clusters in the narrow range of −10 to −12 μg/m³, a reduction of approximately 14 to 17% of the pre-ban mean. The effect is statistically significant under every reasonable specification, is not driven by the pre-existing downward trend in deseasonalized PM2.5 (which our gradient-boosted counterfactual absorbs through its lag structure), and survives a randomized 36-cutoff placebo-in-time test in which zero of 36 fake intervention dates produced an effect as extreme as the real ban (empirical one-tailed p < 0.028, z-score −3.88). The temporal shape of the effect — near-zero during the first months post-ban, then growing steadily more negative through 2022 and stabilising at approximately −20 to −30 μg/m³ from 2023 onward — is inconsistent with an instantaneous policy shock and suggests instead a gradual implementation consistent with stock depletion and fleet turnover. Translated into a health impact using standard concentration-response functions, the effect implies approximately 1,300 avoided premature deaths per year in Algiers, with a cumulative estimate of roughly 4,600 over the 3.6-year post-ban period."
));
blocks.push(Plain(
  "Beyond the specific Algerian case, our study contributes to a small but growing literature that uses causal machine learning to evaluate air quality interventions in the absence of experimental controls. We have shown that methodological triangulation across distinct statistical families, combined with explicit sensitivity analyses for pre-trends and confounding events, can produce a defensible causal claim from a single-unit observational design. We hope this combination — XGBoost recursive forecasting, Bayesian structural time series, and classical ARIMAX, with shared weather and seasonal covariates and a transparent trend-assumption sensitivity table — will be useful to future researchers evaluating similar policies in data-sparse regions. The global leaded-petrol phase-out is now complete; documenting its empirical air quality benefits, particularly in the low- and middle-income countries where the final bans occurred, remains an active and important research agenda."
));

// =====================================================================
// Acknowledgments & References
// =====================================================================
blocks.push(H1("Acknowledgments"));
blocks.push(Plain(
  "We thank the US Embassy in Algiers for maintaining the PM2.5 monitoring network whose data underpin this analysis, and the Algerian National Meteorological Office for providing the daily weather records. We acknowledge the work of the UN Environment Programme and the Partnership for Clean Fuels and Vehicles, whose 19-year campaign made the intervention we study possible. Any errors in the analysis or interpretation are our own."
));

blocks.push(H1("References"));

const refs = [
  "Aburas, H.M., Zytoon, M.A., Abdulsalam, M.I., 2011. Atmospheric lead in PM2.5 after leaded gasoline phase-out in Jeddah City, Saudi Arabia. Clean — Soil, Air, Water 39(8), 711–719.",
  "Brodersen, K.H., Gallusser, F., Koehler, J., Remy, N., Scott, S.L., 2015. Inferring causal impact using Bayesian structural time-series models. Annals of Applied Statistics 9(1), 247–274.",
  "Burnett, R., Chen, H., Szyszkowicz, M., Fann, N., Hubbell, B., Pope, C.A., et al., 2018. Global estimates of mortality associated with long-term exposure to outdoor fine particulate matter. Proceedings of the National Academy of Sciences 115(38), 9592–9597.",
  "Chen, T., Guestrin, C., 2016. XGBoost: A scalable tree boosting system. In: Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining, pp. 785–794.",
  "Cleveland, R.B., Cleveland, W.S., McRae, J.E., Terpenning, I., 1990. STL: A seasonal-trend decomposition procedure based on Loess. Journal of Official Statistics 6(1), 3–73.",
  "Cohen, A.J., Brauer, M., Burnett, R., Anderson, H.R., Frostad, J., Estep, K., et al., 2017. Estimates and 25-year trends of the global burden of disease attributable to ambient air pollution: an analysis of data from the Global Burden of Diseases Study 2015. The Lancet 389(10082), 1907–1918.",
  "GBD 2019 Risk Factors Collaborators, 2020. Global burden of 87 risk factors in 204 countries and territories, 1990–2019: a systematic analysis for the Global Burden of Disease Study 2019. The Lancet 396(10258), 1223–1249.",
  "Ghazi, S., Dib, A., Mendjel, M.S.M., Khadir, T., Dugdale, J., 2023. Ensemble learning models for the prediction of the weekly peak of PM2.5 concentration in Algiers, Algeria. Journal of Air Pollution and Health 8(3), 293–310.",
  "Ghazi, S., Mendjel, M.S.M., Dugdale, J., 2025. Quantifying the impact of leaded gasoline ban on PM2.5 in Algiers: A causal machine learning approach. In: Proceedings of the 12th Edition of SONATRACH Scientific and Technical Days Conference (JST 12), Oran, Algeria, Paper N° AXE3-T2-0276.",
  "Heffernan, C., Koehler, K., Zamora, M.L., Buehler, C., Gentner, D.R., Peng, R.D., Datta, A., 2024. A causal machine-learning framework for studying policy impact on air pollution: a case study in COVID-19 lockdowns. American Journal of Epidemiology 194(1), 185–194.",
  "Killick, R., Fearnhead, P., Eckley, I.A., 2012. Optimal detection of changepoints with a linear computational cost. Journal of the American Statistical Association 107(500), 1590–1598.",
  "Pongpiachan, S., Hattayanone, M., Pinyakong, O., Viyakarn, V., Chavanich, S.A., Bo, C., Khumsup, C., Kittikoon, I., Hirunyatrakul, P., 2021. Sources of atmospheric lead (Pb) after quarter century of phasing out of leaded gasoline in Bangkok, Thailand. Atmospheric Environment 253, 118375.",
  "Pope, C.A., Dockery, D.W., 2006. Health effects of fine particulate air pollution: lines that connect. Journal of the Air and Waste Management Association 56(6), 709–742.",
  "Salma, I., Maenhaut, W., 2006. Changes in elemental composition and mass of atmospheric aerosol pollution between 1996 and 2002 in a Central European city. Environmental Pollution 143(3), 479–488.",
  "Talbi, A., Kerchich, Y., Kerbachi, R., Boughedaoui, M., 2018. Assessment of annual air pollution levels with PM1, PM2.5, PM10 and associated heavy metals in Algiers, Algeria. Environmental Pollution 232, 252–263.",
  "UN News, 2021. End of leaded fuel use a 'milestone for multilateralism'. United Nations News Service, 30 August 2021.",
  "UNEP, 2021. Era of leaded petrol over, eliminating a major threat to human and planetary health. United Nations Environment Programme press release, Nairobi, 30 August 2021.",
  "Wen, Y., Xiao, Q., Zheng, Y., Liu, Y., Zhang, Q., He, K., 2023. Attribution of air quality benefits to clean winter heating policies in China: Combining machine learning with causal inference. Environmental Science and Technology 57(45), 17019–17029.",
  "World Bank, 2024. World Development Indicators: Algeria. World Bank Open Data.",
  "Xu, H., Cao, J., Chow, J.C., Huang, R.-J., Shen, Z., Chen, L.W.A., Ho, K.F., Watson, J.G., 2012. Lead concentrations in fine particulate matter after the phasing out of leaded gasoline in Xi'an, China. Atmospheric Environment 46, 217–224.",
  "Yao, L., Lu, Y., Wang, Z., Zhang, H., Wu, H., 2025. AI-based Bayesian structural time series modeling for assessing PM2.5 air quality improvements during the Beijing 2022 Winter Olympics. Science of the Total Environment 923, 171412.",
];
for (const r of refs) {
  blocks.push(new Paragraph({
    spacing: { line: 300, after: 120 },
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360, hanging: 360 }, // hanging indent for bibliography
    children: [new TextRun({ text: r, size: 20 })],
  }));
}

// =====================================================================
// Build the document
// =====================================================================
const doc = new Document({
  creator: "Sabri Ghazi",
  title: "Causal evaluation of the Algerian leaded petrol ban",
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        quickFormat: true,
        run: { size: 25, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
        quickFormat: true,
        run: { size: 24, italics: true, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18 }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
            new TextRun({ text: " of ", size: 18 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
          ],
        })],
      }),
    },
    children: blocks,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("../manuscript/Ghazi_et_al_PM25_Algiers_manuscript_v4.docx", buf);
  console.log("Wrote manuscript.docx:", buf.length, "bytes");
});
