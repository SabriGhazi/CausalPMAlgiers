"""Resume the 40-cutoff placebo from where it stopped."""
import pandas as pd, numpy as np, time, warnings
from xgboost import XGBRegressor
from sklearn.metrics import r2_score
warnings.filterwarnings('ignore')

# Load
pm = pd.read_csv('../data/algiers-08-05-2025.csv')
pm.columns = [c.strip() for c in pm.columns]
pm['date'] = pd.to_datetime(pm['date'])
pm = pm.sort_values('date').set_index('date')
w = pd.read_csv('../data/weather_extended.csv')
w['date'] = pd.to_datetime(w['date'])
w = w.set_index('date')[['Temperature','precipitation_sum','windspead','shortwave_radiation']]
df = pm.join(w, how='inner').asfreq('D')
df['pm25'] = df['pm25'].interpolate(method='time', limit=3)
for c in w.columns: df[c] = df[c].interpolate(method='time', limit=3)
df = df.dropna()
for lag in [1,2,3]: df[f'pm25_lag{lag}'] = df['pm25'].shift(lag)
doy = df.index.dayofyear.values
df['sin1'] = np.sin(2*np.pi*doy/365.25); df['cos1'] = np.cos(2*np.pi*doy/365.25)
df = df.dropna()

REAL_BAN = pd.Timestamp('2021-07-30')
features = ['pm25_lag1','pm25_lag2','pm25_lag3','Temperature','precipitation_sum',
            'windspead','shortwave_radiation','sin1','cos1']

# Recreate the same random sample
truncated = df.loc[:REAL_BAN - pd.Timedelta(days=1)]
elig_start = truncated.index.min() + pd.Timedelta(days=180)
elig_end = truncated.index.max() - pd.Timedelta(days=180)
elig = pd.date_range(elig_start, elig_end, freq='D')
rng = np.random.default_rng(2024)
sample_idx = rng.choice(len(elig), size=40, replace=False)
fake_cutoffs = sorted(elig[sample_idx])

# Read partial results
done = pd.read_csv('../data/placebo40_results.csv')
done['cutoff'] = pd.to_datetime(done['cutoff'])
done_dates = set(done['cutoff'].dt.strftime('%Y-%m-%d'))
print(f"Already done: {len(done_dates)} cutoffs")

# Filter to remaining
remaining = [c for c in fake_cutoffs if c.strftime('%Y-%m-%d') not in done_dates]
print(f"Remaining: {len(remaining)}")

def fit_ate(data, cutoff, end_date, seed=42):
    d = data.loc[:end_date]
    pre_d = d.loc[d.index < cutoff]
    post_d = d.loc[d.index >= cutoff]
    if len(pre_d) < 180 or len(post_d) < 180:
        return None
    X = pre_d[features].values
    y = pre_d['pm25'].values
    split = int(0.8 * len(pre_d))
    m = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5,
                     subsample=0.8, colsample_bytree=0.8, random_state=seed,
                     early_stopping_rounds=20, n_jobs=2)
    m.fit(X[:split], y[:split], eval_set=[(X[split:], y[split:])], verbose=False)
    post_arr = post_d[['Temperature','precipitation_sum','windspead',
                       'shortwave_radiation','sin1','cos1']].values
    obs_post = post_d['pm25'].values
    n_post = len(post_arr)
    cf_vals = np.empty(n_post)
    lag1 = pre_d['pm25'].iloc[-1]
    lag2 = pre_d['pm25'].iloc[-2]
    lag3 = pre_d['pm25'].iloc[-3]
    fb = np.empty((1, 9))
    for i in range(n_post):
        fb[0, 0] = lag1; fb[0, 1] = lag2; fb[0, 2] = lag3
        fb[0, 3:] = post_arr[i]
        p = m.predict(fb, validate_features=False)[0]
        cf_vals[i] = p
        lag3 = lag2; lag2 = lag1; lag1 = p
    effects = obs_post - cf_vals
    ate = float(effects.mean())
    rng2 = np.random.default_rng(seed)
    n = len(effects); bs = 30; nb = n // bs + 1
    boot = np.empty(2000)
    for j in range(2000):
        starts = rng2.integers(0, max(1, n - bs), size=nb)
        sample = np.concatenate([effects[s:s+bs] for s in starts])[:n]
        boot[j] = sample.mean()
    ci_lo, ci_hi = np.percentile(boot, [2.5, 97.5])
    return {'ate': ate, 'ci_lo': float(ci_lo), 'ci_hi': float(ci_hi),
            'n_train': len(pre_d), 'n_eval': len(post_d)}

results = done.to_dict('records')
end_date = REAL_BAN - pd.Timedelta(days=1)
t0 = time.time()
for i, fc in enumerate(remaining, 1):
    r = fit_ate(df, fc, end_date)
    if r is None:
        print(f"  [{i}/{len(remaining)}] {fc.date()}: skip")
        continue
    results.append({'cutoff': fc, **r})
    print(f"  [{i}/{len(remaining)}] {fc.date()}  ATE={r['ate']:+6.2f}  "
          f"({time.time()-t0:.0f}s)", flush=True)
    pd.DataFrame(results).to_csv('../data/placebo40_results.csv', index=False)

print(f"\nTotal: {len(results)} placebos done in {time.time()-t0:.0f}s additional time")
