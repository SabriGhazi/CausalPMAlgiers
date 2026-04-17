"""Re-run BSTS and ARIMAX on the extended (Open-Meteo full period) data."""
import pandas as pd, numpy as np, warnings
warnings.filterwarnings('ignore')
from statsmodels.tsa.statespace.structural import UnobservedComponents
from statsmodels.tsa.statespace.sarimax import SARIMAX

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
doy = df.index.dayofyear.values
df['sin1']=np.sin(2*np.pi*doy/365.25); df['cos1']=np.cos(2*np.pi*doy/365.25)
df['sin2']=np.sin(4*np.pi*doy/365.25); df['cos2']=np.cos(4*np.pi*doy/365.25)

BAN = pd.Timestamp('2021-07-30')
exog = ['Temperature','precipitation_sum','windspead','shortwave_radiation',
        'sin1','cos1','sin2','cos2']
pre = df.loc[df.index<BAN]; post = df.loc[df.index>=BAN]
print(f"pre={len(pre)} post={len(post)}")

# --- BSTS local level + reg ---
print("Fitting BSTS local-level...", flush=True)
m_bsts = UnobservedComponents(pre['pm25'], exog=pre[exog],
                              level='local level', irregular=True).fit(disp=False, maxiter=500)
f = m_bsts.get_forecast(steps=len(post), exog=post[exog])
cf = f.predicted_mean.values; var = f.var_pred_mean.values
ate_bsts = (post['pm25'].values - cf).mean()
rng = np.random.default_rng(42)
boot = []
for _ in range(2000):
    sim = rng.normal(cf, np.sqrt(var))
    boot.append((post['pm25'].values - sim).mean())
lo, hi = np.percentile(boot, [2.5, 97.5])
print(f"BSTS local-level (extended): ATE = {ate_bsts:+.2f}  CI [{lo:+.2f}, {hi:+.2f}]")
bsts_ate, bsts_lo, bsts_hi = ate_bsts, lo, hi

# --- BSTS deterministic constant ---
print("Fitting BSTS deterministic constant...", flush=True)
m_bsts2 = UnobservedComponents(pre['pm25'], exog=pre[exog],
                               level='deterministic constant', irregular=True).fit(disp=False, maxiter=500)
f2 = m_bsts2.get_forecast(steps=len(post), exog=post[exog])
cf2 = f2.predicted_mean.values; var2 = f2.var_pred_mean.values
ate_bsts2 = (post['pm25'].values - cf2).mean()
boot2 = []
for _ in range(2000):
    sim = rng.normal(cf2, np.sqrt(var2))
    boot2.append((post['pm25'].values - sim).mean())
lo2, hi2 = np.percentile(boot2, [2.5, 97.5])
print(f"BSTS det-constant (extended): ATE = {ate_bsts2:+.2f}  CI [{lo2:+.2f}, {hi2:+.2f}]")

# --- ARIMAX(2,0,2) ---
print("Fitting ARIMAX(2,0,2)...", flush=True)
m_arimax = SARIMAX(pre['pm25'], exog=pre[exog], order=(2,0,2),
                   enforce_stationarity=False, enforce_invertibility=False
                   ).fit(disp=False, maxiter=200)
f3 = m_arimax.get_forecast(steps=len(post), exog=post[exog])
cf3 = f3.predicted_mean.values; var3 = f3.var_pred_mean.values
ate_arimax = (post['pm25'].values - cf3).mean()
boot3 = []
for _ in range(2000):
    sim = rng.normal(cf3, np.sqrt(var3))
    boot3.append((post['pm25'].values - sim).mean())
lo3, hi3 = np.percentile(boot3, [2.5, 97.5])
print(f"ARIMAX(2,0,2) (extended): ATE = {ate_arimax:+.2f}  CI [{lo3:+.2f}, {hi3:+.2f}]")

print()
print("="*65)
print("UPDATED TRIANGULATION (extended dataset, Apr 2019 - Mar 2025)")
print("="*65)
print(f"  XGBoost recursive   : -11.68  [-14.36, -9.14]  (from earlier)")
print(f"  BSTS local-level    : {bsts_ate:+.2f}  [{bsts_lo:+.2f}, {bsts_hi:+.2f}]")
print(f"  BSTS det-constant   : {ate_bsts2:+.2f}  [{lo2:+.2f}, {hi2:+.2f}]")
print(f"  ARIMAX(2,0,2)       : {ate_arimax:+.2f}  [{lo3:+.2f}, {hi3:+.2f}]")
