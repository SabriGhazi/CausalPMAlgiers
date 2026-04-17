"""Generate the extended counterfactual 3-panel figure."""
import pandas as pd, numpy as np, warnings
import matplotlib.pyplot as plt
from xgboost import XGBRegressor
warnings.filterwarnings('ignore')

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

pre = df.loc[df.index < REAL_BAN]
post = df.loc[df.index >= REAL_BAN]
X = pre[features].values; y = pre['pm25'].values
split = int(0.8 * len(pre))
m = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5,
                 subsample=0.8, colsample_bytree=0.8, random_state=42,
                 early_stopping_rounds=20, n_jobs=2)
m.fit(X[:split], y[:split], eval_set=[(X[split:], y[split:])], verbose=False)

# Recursive forecast
post_arr = post[['Temperature','precipitation_sum','windspead',
                 'shortwave_radiation','sin1','cos1']].values
obs_post = post['pm25'].values
n_post = len(post_arr)
cf_vals = np.empty(n_post)
lag1 = pre['pm25'].iloc[-1]; lag2 = pre['pm25'].iloc[-2]; lag3 = pre['pm25'].iloc[-3]
fb = np.empty((1, 9))
for i in range(n_post):
    fb[0, 0] = lag1; fb[0, 1] = lag2; fb[0, 2] = lag3
    fb[0, 3:] = post_arr[i]
    p = m.predict(fb, validate_features=False)[0]
    cf_vals[i] = p
    lag3 = lag2; lag2 = lag1; lag1 = p

cf = pd.Series(cf_vals, index=post.index)
effects = pd.Series(obs_post - cf_vals, index=post.index)
ate = effects.mean()
print(f"Extended ATE = {ate:+.2f}")

# Save the series
out = pd.DataFrame({
    'pm25': obs_post,
    'pm25_counterfactual': cf_vals,
    'effect': effects.values,
}, index=post.index)
out.to_csv('counterfactual_extended.csv')

# 3-panel figure
fig, axes = plt.subplots(3, 1, figsize=(13, 11), sharex=True)

ax = axes[0]
obs_smooth = df['pm25'].rolling(14, center=True).mean()
cf_smooth = cf.rolling(14, center=True).mean()
ax.plot(obs_smooth.index, obs_smooth.values, color='steelblue', lw=1.4,
        label='Observed PM$_{2.5}$ (14-day mean)', alpha=0.9)
ax.plot(cf_smooth.index, cf_smooth.values, '--', color='crimson', lw=2,
        label='Counterfactual (no-ban scenario)')
ax.axvline(REAL_BAN, color='k', ls=':', lw=1.5)
ax.text(REAL_BAN, ax.get_ylim()[1]*0.97, '  Ban', va='top', fontsize=9)
ax.axvspan('2020-03-15','2020-12-31', alpha=0.10, color='gray', label='COVID lockdown')
ax.axvspan('2021-08-09','2021-08-15', alpha=0.25, color='orange', label='Tizi-Ouzou wildfires')
ax.set_ylabel('PM$_{2.5}$ (μg/m³)', fontsize=11)
ax.set_title(f'Extended counterfactual: April 2019 – March 2025  '
             f'(post-ban window now 3.6 years)', fontsize=12)
ax.legend(loc='upper right', fontsize=9, framealpha=0.9)
ax.grid(alpha=0.3)

ax = axes[1]
eff_smooth = effects.rolling(14, center=True).mean()
ax.plot(eff_smooth.index, eff_smooth.values, color='darkred', lw=1.5)
ax.fill_between(eff_smooth.index, eff_smooth.values, 0,
                where=eff_smooth.values<0, alpha=0.25, color='green',
                interpolate=True, label='Reduction (ban effect)')
ax.fill_between(eff_smooth.index, eff_smooth.values, 0,
                where=eff_smooth.values>0, alpha=0.25, color='red',
                interpolate=True, label='Increase')
ax.axhline(0, color='k', lw=0.5)
ax.axhline(ate, color='darkred', ls='--', lw=1, alpha=0.6,
           label=f'Mean effect: {ate:+.2f} μg/m³')
ax.axvline(REAL_BAN, color='k', ls=':', lw=1.5)
ax.set_ylabel('Effect (μg/m³)', fontsize=11)
ax.set_title('Pointwise ban effect (extended period)', fontsize=12)
ax.legend(loc='lower left', fontsize=9)
ax.grid(alpha=0.3)

ax = axes[2]
cum = effects.cumsum()
ax.plot(cum.index, cum.values, color='darkred', lw=1.8)
ax.fill_between(cum.index, cum.values, 0, alpha=0.25, color='green',
                where=cum.values<0, interpolate=True)
ax.axhline(0, color='k', lw=0.5)
ax.axvline(REAL_BAN, color='k', ls=':', lw=1.5)
ax.set_ylabel('Cumulative effect\n(μg/m³ · days)', fontsize=11)
ax.set_xlabel('Date', fontsize=11)
ax.set_title('Cumulative PM$_{2.5}$ reduction attributable to the ban (extended)',
             fontsize=12)
ax.grid(alpha=0.3)

plt.tight_layout()
plt.savefig('counterfactual_extended.png', dpi=150, bbox_inches='tight')
print("Saved: counterfactual_extended.png")
print(f"Cumulative effect at end: {cum.iloc[-1]:.0f} μg/m³·days "
      f"({cum.iloc[-1]/365.25:.0f} μg/m³·years)")
