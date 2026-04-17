import pandas as pd, numpy as np, warnings
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
df['sin1']=np.sin(2*np.pi*doy/365.25); df['cos1']=np.cos(2*np.pi*doy/365.25)
df = df.dropna()

BAN = pd.Timestamp('2021-07-30')
features = ['pm25_lag1','pm25_lag2','pm25_lag3','Temperature','precipitation_sum',
            'windspead','shortwave_radiation','sin1','cos1']

def fit(train, eval_):
    X = train[features].values; y = train['pm25'].values
    split = int(0.8 * len(train))
    m = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5,
                     subsample=0.8, colsample_bytree=0.8, random_state=42,
                     early_stopping_rounds=20, n_jobs=2)
    m.fit(X[:split], y[:split], eval_set=[(X[split:], y[split:])], verbose=False)
    post_arr = eval_[['Temperature','precipitation_sum','windspead',
                      'shortwave_radiation','sin1','cos1']].values
    obs = eval_['pm25'].values
    cf = np.empty(len(post_arr))
    lag1 = train['pm25'].iloc[-1]; lag2 = train['pm25'].iloc[-2]; lag3 = train['pm25'].iloc[-3]
    fb = np.empty((1,9))
    for i in range(len(post_arr)):
        fb[0,0]=lag1; fb[0,1]=lag2; fb[0,2]=lag3; fb[0,3:]=post_arr[i]
        p = m.predict(fb, validate_features=False)[0]
        cf[i]=p; lag3=lag2; lag2=lag1; lag1=p
    eff = obs - cf
    rng = np.random.default_rng(42)
    n=len(eff); bs=30; nb=n//bs+1
    boot=np.empty(2000)
    for j in range(2000):
        s=rng.integers(0,max(1,n-bs),size=nb)
        sm=np.concatenate([eff[k:k+bs] for k in s])[:n]
        boot[j]=sm.mean()
    return float(eff.mean()), float(np.percentile(boot,2.5)), float(np.percentile(boot,97.5)), len(train), len(eval_)

pre = df.loc[df.index<BAN]; post = df.loc[df.index>=BAN]
covid_s = pd.Timestamp('2020-03-15'); covid_e = pd.Timestamp('2020-12-31')
fire_s = pd.Timestamp('2021-08-09'); fire_e = pd.Timestamp('2021-08-15')
antic_s = pd.Timestamp('2021-03-01')

specs = [
    ("Full data (baseline)", pre, post),
    ("Exclude COVID (train)", pre.loc[(pre.index<covid_s)|(pre.index>covid_e)], post),
    ("Exclude wildfires (eval)", pre, post.loc[(post.index<fire_s)|(post.index>fire_e)]),
    ("Strict (no COVID/fires/anticip)",
     pre.loc[((pre.index<covid_s)|(pre.index>covid_e)) & (pre.index<antic_s)],
     post.loc[(post.index<fire_s)|(post.index>fire_e)]),
]
print("="*72)
print("EXTENDED-PERIOD CONFOUNDER SENSITIVITY")
print("="*72)
for label, tr, ev in specs:
    a, lo, hi, nt, ne = fit(tr, ev)
    print(f"  {label:32s}  n_train={nt:4d} n_eval={ne:4d}  ATE={a:+6.2f}  [{lo:+6.2f}, {hi:+6.2f}]")
