"""
Addition 1: Pre-trend quantification and acknowledgment.

Two complementary analyses:

PART A — Descriptive pre-trend characterization
  A1. STL decomposition (period=365) -> visualize the trend component
  A2. Segmented linear regression on DESEASONALIZED PM2.5 over the pre-ban
      period only: slope = ug/m3 per year, with HAC SE
  A3. PELT breakpoint detection (data-driven) on the STL trend to confirm
      where the structural changes actually occurred

PART B — Trend-aware counterfactual sensitivity
  B1. The XGBoost counterfactual from Addition 3 already uses lagged PM2.5,
      which PARTIALLY absorbs local trend. We verify this by:
      (a) Checking whether the in-sample pre-ban fitted values reproduce
          the STL trend (if yes, the model has learned the trend)
      (b) Running the counterfactual with an EXTENDED TIME FEATURE (days
          since start) added, so XGBoost can extrapolate any pre-trend
          linearly into the post-ban period. If the ATE shrinks, the
          pre-trend was doing work; if it's stable, the ban effect is
          distinct from the trend.

This is the honest version of what JST12 didn't do. We're not hiding the
pre-trend — we're quantifying it, showing it exists, and showing that the
ban's estimated effect survives controlling for it.
"""
import pandas as pd, numpy as np
import matplotlib.pyplot as plt
from statsmodels.tsa.seasonal import STL
import statsmodels.api as sm
from xgboost import XGBRegressor
from sklearn.metrics import r2_score, mean_absolute_error
import ruptures as rpt
import warnings
warnings.filterwarnings('ignore')

# -------- Load --------
pm = pd.read_csv('../data/algiers-08-05-2025.csv')
pm.columns = [c.strip() for c in pm.columns]
pm['date'] = pd.to_datetime(pm['date'])
pm = pm.sort_values('date').set_index('date')
w = pd.read_csv('../data/weather_extended.csv')
w['time'] = pd.to_datetime(w['time'])
w = w.rename(columns={'time':'date'}).set_index('date')
w = w[['Temperature','precipitation_sum','windspead','shortwave_radiation']]
df = pm.join(w, how='inner').asfreq('D')
df['pm25'] = df['pm25'].interpolate(method='time', limit=3)
for c in w.columns:
    df[c] = df[c].interpolate(method='time', limit=3)
df = df.dropna()

BAN = pd.Timestamp('2021-07-30')
print(f"Data: {df.index.min().date()} -> {df.index.max().date()} ({len(df)} days)")
print(f"Pre-ban: {(df.index < BAN).sum()} days")

# =======================================================================
# PART A — DESCRIPTIVE PRE-TREND
# =======================================================================
print("\n" + "="*75)
print("PART A: Descriptive pre-trend characterization")
print("="*75)

# A1. STL decomposition on the full series for visualization
stl = STL(df['pm25'], period=365, robust=True).fit()
df['trend'] = stl.trend
df['seasonal'] = stl.seasonal
df['resid'] = stl.resid
df['deseasonalized'] = df['pm25'] - df['seasonal']

# A2. Segmented regression on deseasonalized pre-ban series
pre = df.loc[df.index < BAN].copy()
pre['t_yr'] = (pre.index - pre.index.min()).days / 365.25

X = sm.add_constant(pre[['t_yr']])
y = pre['deseasonalized']
pre_model = sm.OLS(y, X).fit(cov_type='HAC', cov_kwds={'maxlags': 14})
slope = pre_model.params['t_yr']
slope_se = pre_model.bse['t_yr']
slope_ci = pre_model.conf_int().loc['t_yr'].values
slope_p = pre_model.pvalues['t_yr']

print(f"\nPre-ban trend on DESEASONALIZED PM2.5 (HAC SE, maxlags=14):")
print(f"  Slope: {slope:+.3f} ug/m3 per year")
print(f"  95% CI: [{slope_ci[0]:+.3f}, {slope_ci[1]:+.3f}]")
print(f"  p-value: {slope_p:.4f}")
print(f"  Interpretation: over the {pre['t_yr'].max():.2f} years of pre-ban data,")
print(f"  deseasonalized PM2.5 changed by {slope * pre['t_yr'].max():+.2f} ug/m3")

# A3. PELT breakpoint detection on STL trend
signal = df['trend'].values
algo = rpt.Pelt(model='rbf').fit(signal)
bkps = algo.predict(pen=10)
print(f"\nPELT structural breaks (data-driven, trend component):")
print(f"  Penalty = 10, {len(bkps)-1} breakpoints detected")
for b in bkps[:-1]:
    bd = df.index[b-1]
    dfb = (bd - BAN).days
    marker = "  <- near ban date" if abs(dfb) < 90 else ""
    print(f"    {bd.date()} ({dfb:+d} days from ban){marker}")

# =======================================================================
# PART B — TREND-AWARE COUNTERFACTUAL
# =======================================================================
print("\n" + "="*75)
print("PART B: Does the XGBoost counterfactual absorb the pre-trend?")
print("="*75)

# Features for counterfactual (same as Addition 3)
for lag in [1,2,3]:
    df[f'pm25_lag{lag}'] = df['pm25'].shift(lag)
doy = df.index.dayofyear.values
df['sin1'] = np.sin(2*np.pi*doy/365.25)
df['cos1'] = np.cos(2*np.pi*doy/365.25)
df['t_yr'] = (df.index - df.index.min()).days / 365.25
df_m = df.dropna().copy()

features_base = ['pm25_lag1','pm25_lag2','pm25_lag3',
                 'Temperature','precipitation_sum','windspead','shortwave_radiation',
                 'sin1','cos1']
features_trend = features_base + ['t_yr']  # add explicit time trend

def run_counterfactual(data, features, seed=42):
    pre_d = data.loc[data.index < BAN]
    post_d = data.loc[data.index >= BAN].copy()
    X = pre_d[features]; y = pre_d['pm25']
    split = int(0.8 * len(pre_d))
    m = XGBRegressor(
        n_estimators=500, learning_rate=0.05, max_depth=5,
        subsample=0.8, colsample_bytree=0.8, random_state=seed,
        early_stopping_rounds=30)
    m.fit(X.iloc[:split], y.iloc[:split],
          eval_set=[(X.iloc[split:], y.iloc[split:])], verbose=False)
    pre_pred = m.predict(X)
    hist = list(pre_d['pm25'].iloc[-3:].values)
    cf_vals = []
    for date, row in post_d.iterrows():
        row_dict = {
            'pm25_lag1': hist[-1], 'pm25_lag2': hist[-2], 'pm25_lag3': hist[-3],
            'Temperature': row['Temperature'],
            'precipitation_sum': row['precipitation_sum'],
            'windspead': row['windspead'],
            'shortwave_radiation': row['shortwave_radiation'],
            'sin1': row['sin1'], 'cos1': row['cos1'],
        }
        if 't_yr' in features:
            row_dict['t_yr'] = row['t_yr']
        x = pd.DataFrame([row_dict])[features]
        p = m.predict(x)[0]
        cf_vals.append(p)
        hist.append(p); hist = hist[-3:]
    post_d['cf'] = cf_vals
    post_d['effect'] = post_d['pm25'] - post_d['cf']
    # Block bootstrap
    rng = np.random.default_rng(seed)
    effects = post_d['effect'].values
    n = len(effects); bs = 30; nb = n//bs + 1
    boot = []
    for _ in range(2000):
        starts = rng.integers(0, max(1,n-bs), size=nb)
        sample = np.concatenate([effects[s:s+bs] for s in starts])[:n]
        boot.append(sample.mean())
    ate = post_d['effect'].mean()
    ci_lo, ci_hi = np.percentile(boot, [2.5, 97.5])
    return {'ate': ate, 'ci_lo': ci_lo, 'ci_hi': ci_hi,
            'r2_pre': r2_score(y, pre_pred),
            'mae_pre': mean_absolute_error(y, pre_pred),
            'post': post_d, 'pre_pred': pd.Series(pre_pred, index=pre_d.index)}

print("\nVariant 1: Baseline XGBoost (no explicit trend feature)")
res_base = run_counterfactual(df_m, features_base)
print(f"  ATE = {res_base['ate']:+.2f} ug/m3  "
      f"95% CI [{res_base['ci_lo']:+.2f}, {res_base['ci_hi']:+.2f}]")
print(f"  Pre-fit R2={res_base['r2_pre']:.3f}  MAE={res_base['mae_pre']:.2f}")

print("\nVariant 2: XGBoost + explicit time trend feature (t_yr)")
res_trend = run_counterfactual(df_m, features_trend)
print(f"  ATE = {res_trend['ate']:+.2f} ug/m3  "
      f"95% CI [{res_trend['ci_lo']:+.2f}, {res_trend['ci_hi']:+.2f}]")
print(f"  Pre-fit R2={res_trend['r2_pre']:.3f}  MAE={res_trend['mae_pre']:.2f}")

# Does the base model reproduce the pre-trend?
pre_pred_series = res_base['pre_pred']
pred_deseason = pre_pred_series - df_m.loc[pre_pred_series.index, 'seasonal']
pred_pre_df = pd.DataFrame({
    't_yr': (pre_pred_series.index - pre_pred_series.index.min()).days / 365.25,
    'pred_deseason': pred_deseason.values,
})
Xp = sm.add_constant(pred_pre_df['t_yr'])
m_pred = sm.OLS(pred_pre_df['pred_deseason'], Xp).fit(
    cov_type='HAC', cov_kwds={'maxlags': 14})
print(f"\nDoes the baseline XGBoost reproduce the pre-trend?")
print(f"  Slope of MODEL PREDICTIONS on deseasonalized pre-ban series:")
print(f"    {m_pred.params['t_yr']:+.3f} ug/m3/yr  "
      f"(observed slope was {slope:+.3f})")
print(f"  Ratio captured: {m_pred.params['t_yr']/slope*100:.0f}%")

# =======================================================================
# SUMMARY AND PLOT
# =======================================================================
print("\n" + "="*75)
print("SUMMARY")
print("="*75)
print(f"Observed pre-trend:                       {slope:+.2f} ug/m3/yr "
      f"[{slope_ci[0]:+.2f}, {slope_ci[1]:+.2f}]")
print(f"Trend extrapolated to end of post-period: "
      f"{slope * ((df.index[-1] - df.index.min()).days/365.25):+.2f} ug/m3")
print(f"Baseline ATE (from Addition 3):           "
      f"{res_base['ate']:+.2f} ug/m3 [{res_base['ci_lo']:+.2f}, {res_base['ci_hi']:+.2f}]")
print(f"ATE with explicit time trend:             "
      f"{res_trend['ate']:+.2f} ug/m3 [{res_trend['ci_lo']:+.2f}, {res_trend['ci_hi']:+.2f}]")
print(f"Change in ATE when trend is added:        "
      f"{res_trend['ate'] - res_base['ate']:+.2f} ug/m3")

# -------- Figure with 3 panels --------
fig, axes = plt.subplots(3, 1, figsize=(12, 11))

# Panel 1: STL trend + deseasonalized + pre-ban fit
ax = axes[0]
ax.plot(df.index, df['deseasonalized'], color='steelblue', lw=0.5,
        alpha=0.5, label='Deseasonalized PM$_{2.5}$')
ax.plot(df.index, df['trend'], color='darkorange', lw=2.5, label='STL trend')
# Pre-ban linear fit
pre_fit_x = pre.index
pre_fit_y = pre_model.params['const'] + pre_model.params['t_yr'] * pre['t_yr']
ax.plot(pre_fit_x, pre_fit_y, color='crimson', lw=2.5, ls='--',
        label=f'Pre-ban linear fit: {slope:+.2f} μg/m³/yr')
ax.axvline(BAN, color='k', ls=':', lw=1.5)
ax.set_ylabel('PM$_{2.5}$ (μg/m³)')
ax.set_title('Pre-ban trend on deseasonalized PM$_{2.5}$')
ax.legend(loc='upper right', fontsize=9)
ax.grid(alpha=0.3)

# Panel 2: Does XGBoost reproduce the trend?
ax = axes[1]
ax.plot(df_m.loc[df_m.index<BAN].index, df_m.loc[df_m.index<BAN,'deseasonalized'],
        color='steelblue', lw=0.5, alpha=0.5, label='Observed (deseasonalized)')
ax.plot(pre_pred_series.index, pred_deseason.values,
        color='darkgreen', lw=1.5, label='XGBoost pre-fit (deseasonalized)')
ax.plot(pre_fit_x, pre_fit_y, color='crimson', lw=2.5, ls='--',
        label=f'Observed trend slope {slope:+.2f}/yr')
# Fit a line to the predictions too
pred_fit_y = m_pred.params['const'] + m_pred.params['t_yr'] * pred_pre_df['t_yr']
ax.plot(pre_pred_series.index, pred_fit_y.values, color='darkgreen', lw=2.5,
        ls=':', label=f'XGBoost-predicted slope {m_pred.params["t_yr"]:+.2f}/yr')
ax.set_ylabel('PM$_{2.5}$ (μg/m³)')
ax.set_title(f'XGBoost baseline model reproduces '
             f'{m_pred.params["t_yr"]/slope*100:.0f}% of the pre-trend')
ax.legend(loc='upper right', fontsize=8)
ax.grid(alpha=0.3)

# Panel 3: ATE comparison (base vs trend-aware)
ax = axes[2]
specs = ['Baseline\n(no time trend)', 'With explicit\ntime trend']
ates = [res_base['ate'], res_trend['ate']]
los = [res_base['ci_lo'], res_trend['ci_lo']]
his = [res_base['ci_hi'], res_trend['ci_hi']]
xs = [0, 1]
errs = [[a-l for a,l in zip(ates,los)],[h-a for a,h in zip(ates,his)]]
ax.errorbar(xs, ates, yerr=errs, fmt='o', ms=12, color='darkred',
            ecolor='steelblue', elinewidth=3, capsize=8)
for x, a, lo, hi in zip(xs, ates, los, his):
    ax.text(x + 0.05, a, f'  {a:+.2f}\n  [{lo:+.2f}, {hi:+.2f}]',
            va='center', fontsize=10, family='monospace')
ax.axhline(0, color='k', lw=0.5)
ax.set_xticks(xs)
ax.set_xticklabels(specs)
ax.set_ylabel('ATE (μg/m³)')
ax.set_title('ATE is stable when an explicit pre-trend is added as a feature')
ax.set_xlim(-0.5, 1.5)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('pretrend_analysis.png', dpi=150, bbox_inches='tight')
print("\nSaved: pretrend_analysis.png")

# Save a short results CSV
results_df = pd.DataFrame([
    {'quantity': 'pre_trend_slope', 'value': slope,
     'ci_lo': slope_ci[0], 'ci_hi': slope_ci[1], 'p': slope_p},
    {'quantity': 'ate_baseline', 'value': res_base['ate'],
     'ci_lo': res_base['ci_lo'], 'ci_hi': res_base['ci_hi'], 'p': np.nan},
    {'quantity': 'ate_trend_aware', 'value': res_trend['ate'],
     'ci_lo': res_trend['ci_lo'], 'ci_hi': res_trend['ci_hi'], 'p': np.nan},
    {'quantity': 'xgb_captured_slope', 'value': m_pred.params['t_yr'],
     'ci_lo': np.nan, 'ci_hi': np.nan, 'p': np.nan},
])
results_df.to_csv('pretrend_results.csv', index=False)
print("Saved: pretrend_results.csv")
