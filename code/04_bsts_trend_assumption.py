"""
Bounded sensitivity: compute the deterministic-trend BSTS variant as an
explicit lower bound on the estimated ATE. This directly addresses the
Position A vs Position B question in the paper.

We refit BSTS with level='deterministic trend' (i.e., a fixed linear trend
continuing forever) and report the resulting ATE as a "lower bound under
the assumption that the pre-ban trend would continue indefinitely". We
then explain in the paper why this assumption is implausible.
"""
import pandas as pd, numpy as np, warnings
import matplotlib.pyplot as plt
from statsmodels.tsa.statespace.structural import UnobservedComponents
warnings.filterwarnings('ignore')

# Load
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
for c in w.columns: df[c] = df[c].interpolate(method='time', limit=3)
df = df.dropna()

BAN = pd.Timestamp('2021-07-30')
doy = df.index.dayofyear.values
df['sin1']=np.sin(2*np.pi*doy/365.25); df['cos1']=np.cos(2*np.pi*doy/365.25)
df['sin2']=np.sin(4*np.pi*doy/365.25); df['cos2']=np.cos(4*np.pi*doy/365.25)
pre = df.loc[df.index<BAN]; post = df.loc[df.index>=BAN]
exog = ['Temperature','precipitation_sum','windspead','shortwave_radiation',
        'sin1','cos1','sin2','cos2']

obs = post['pm25'].values
rng = np.random.default_rng(42)

# Fit all four variants for the full sensitivity table
variants = [
    ('Local level (primary)',    dict(level='local level',        irregular=True)),
    ('Deterministic constant',   dict(level='deterministic constant',  irregular=True)),
    ('Deterministic trend',      dict(level='deterministic trend', irregular=True)),
]

results = []
counterfactuals = {}
for name, kw in variants:
    m = UnobservedComponents(pre['pm25'], exog=pre[exog], **kw).fit(
        disp=False, maxiter=500)
    f = m.get_forecast(steps=len(post), exog=post[exog])
    cf = f.predicted_mean.values
    var = f.var_pred_mean.values
    ate = (obs - cf).mean()
    se = np.sqrt(var)
    boot = []
    for _ in range(2000):
        sim = rng.normal(cf, se)
        boot.append((obs - sim).mean())
    lo, hi = np.percentile(boot, [2.5, 97.5])
    results.append({
        'Variant': name, 'ATE': ate, 'CI_lo': lo, 'CI_hi': hi,
        'AIC': m.aic,
    })
    counterfactuals[name] = pd.Series(cf, index=post.index)
    print(f"{name:28s}: ATE {ate:+6.2f}  [{lo:+6.2f}, {hi:+6.2f}]  AIC={m.aic:.1f}")

results_df = pd.DataFrame(results)
results_df.to_csv('bsts_trend_sensitivity.csv', index=False)

# Figure: show the three counterfactuals side by side
fig, axes = plt.subplots(2, 1, figsize=(13, 9))

ax = axes[0]
obs_smooth = df['pm25'].rolling(14, center=True).mean()
ax.plot(obs_smooth.index, obs_smooth.values, color='steelblue', lw=1.3,
        label='Observed (14-day mean)', alpha=0.85)

colors = {'Local level (primary)':'darkorange',
          'Deterministic constant':'steelblue',
          'Deterministic trend':'purple'}
for name in counterfactuals:
    s = counterfactuals[name].rolling(14, center=True).mean()
    ate = results_df.loc[results_df['Variant']==name,'ATE'].values[0]
    ax.plot(s.index, s.values, '--', color=colors[name], lw=1.8,
            label=f'{name}  (ATE {ate:+.2f})')

ax.axvline(BAN, color='k', ls=':', lw=1.5)
ax.text(BAN, ax.get_ylim()[1]*0.97, '  Ban', va='top', fontsize=9)
ax.set_ylabel('PM$_{2.5}$ (μg/m³)', fontsize=11)
ax.set_title('BSTS trend-assumption sensitivity: three level specifications',
             fontsize=12)
ax.legend(loc='upper right', fontsize=9, framealpha=0.9)
ax.grid(alpha=0.3)

# Bottom: forest plot
ax = axes[1]
variants_list = list(results_df['Variant'])
ates = results_df['ATE'].values
los = results_df['CI_lo'].values
his = results_df['CI_hi'].values
y_pos = np.arange(len(variants_list))
col_list = [colors[v] for v in variants_list]

for i,(a,lo,hi,c) in enumerate(zip(ates,los,his,col_list)):
    ax.errorbar(a, i, xerr=[[a-lo],[hi-a]], fmt='o', color=c, ecolor=c,
                elinewidth=2.5, capsize=6, ms=11)
    ax.text(max(his)+1, i, f'  {a:+.2f}  [{lo:+.2f}, {hi:+.2f}]',
            va='center', fontsize=10, family='monospace')
ax.axvline(0, color='k', lw=0.5)
# Shade the "plausible range" from primary & constant
plausible_lo = min(ates[0], ates[1])
plausible_hi = max(ates[0], ates[1])
ax.axvspan(plausible_lo, plausible_hi, alpha=0.15, color='green',
           label=f'Primary estimate range [{plausible_lo:+.2f}, {plausible_hi:+.2f}]')
# Mark det-trend as "lower bound under strong assumption"
ax.annotate('Lower bound\n(strong assumption\nof perpetual trend)',
            xy=(ates[2], 2), xytext=(ates[2]-5, 2.4),
            fontsize=8, ha='center',
            arrowprops=dict(arrowstyle='->', color='gray', lw=1))
ax.set_yticks(y_pos)
ax.set_yticklabels(variants_list)
ax.invert_yaxis()
ax.set_xlabel('ATE (μg/m³)', fontsize=11)
ax.set_title('BSTS ATE across level specifications', fontsize=12)
ax.set_xlim(min(los)-2, max(his)+14)
ax.legend(loc='lower right', fontsize=9)
ax.grid(axis='x', alpha=0.3)

plt.tight_layout()
plt.savefig('bsts_trend_sensitivity.png', dpi=150, bbox_inches='tight')
print("\nSaved: bsts_trend_sensitivity.png, bsts_trend_sensitivity.csv")
