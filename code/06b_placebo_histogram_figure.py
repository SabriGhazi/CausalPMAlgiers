"""Build histogram and final analysis from the 36 placebo + real ATE."""
import pandas as pd, numpy as np, pickle
import matplotlib.pyplot as plt

res = pd.read_csv('../data/placebo40_results.csv')
res['cutoff'] = pd.to_datetime(res['cutoff'])
print(f"Placebo fits loaded: {len(res)}")

# Real ban results from the earlier successful Part 1
REAL_ATE = -11.68
REAL_CI = (-14.36, -9.14)
REAL_BAN = pd.Timestamp('2021-07-30')

ates = res['ate'].values
print(f"\nReal ATE:                   {REAL_ATE:+.2f}  CI [{REAL_CI[0]:+.2f}, {REAL_CI[1]:+.2f}]")
print(f"Placebo n:                  {len(ates)}")
print(f"Placebo mean:               {ates.mean():+.2f}")
print(f"Placebo std:                {ates.std():.2f}")
print(f"Placebo median:             {np.median(ates):+.2f}")
print(f"Placebo min:                {ates.min():+.2f}")
print(f"Placebo max:                {ates.max():+.2f}")
print(f"Placebo 5th pctl:           {np.percentile(ates, 5):+.2f}")
print(f"Placebo 95th pctl:          {np.percentile(ates, 95):+.2f}")

n_extreme = (ates <= REAL_ATE).sum()
p_emp = n_extreme / len(ates)
z = (REAL_ATE - ates.mean()) / ates.std()
print(f"\nPlacebos at least as extreme: {n_extreme}/{len(ates)}")
print(f"Empirical one-tailed p:       {p_emp:.4f}")
print(f"z-score:                      {z:+.2f}")

# Sanity check: also report two-sided "outside" rate
n_outside = (np.abs(ates - ates.mean()) >= np.abs(REAL_ATE - ates.mean())).sum()
p_two = n_outside / len(ates)
print(f"Two-tailed empirical p:       {p_two:.4f}")

# === Histogram figure ===
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ax = axes[0]
n, bins, patches = ax.hist(ates, bins=15, color='steelblue', alpha=0.78,
                            edgecolor='black', label=f'Placebo distribution (N={len(ates)})')
ax.axvline(REAL_ATE, color='darkred', lw=3,
           label=f'Real ban: {REAL_ATE:+.2f} μg/m³')
ax.axvline(ates.mean(), color='gray', ls='--', lw=1.5,
           label=f'Placebo mean: {ates.mean():+.2f}')
ax.axvline(np.percentile(ates, 5), color='orange', ls=':', lw=1.5,
           label=f'5th percentile: {np.percentile(ates, 5):+.2f}')
ax.set_xlabel('Estimated ATE (μg/m³)', fontsize=11)
ax.set_ylabel('Number of placebo fits', fontsize=11)
ax.set_title(f'Randomized placebo test: histogram of {len(ates)} fake-cutoff ATEs vs real ban\n'
             f'Empirical one-tailed p = {p_emp:.3f},  z-score = {z:+.2f}',
             fontsize=11)
ax.legend(loc='upper left', fontsize=9)
ax.grid(axis='y', alpha=0.3)

ax = axes[1]
ax.scatter(res['cutoff'], res['ate'], s=35, alpha=0.7, color='steelblue',
           label='Placebo cutoffs')
ax.scatter([REAL_BAN], [REAL_ATE], s=200, color='darkred', marker='*',
           edgecolor='black', linewidth=1.5, zorder=5,
           label=f'Real ban (2021-07-30): {REAL_ATE:+.2f}')
ax.axhline(0, color='gray', lw=0.5)
ax.axhline(REAL_ATE, color='darkred', ls=':', lw=1, alpha=0.5)
ax.set_xlabel('Cutoff date', fontsize=11)
ax.set_ylabel('Estimated ATE (μg/m³)', fontsize=11)
ax.set_title('Placebo ATE estimates by fake cutoff date', fontsize=11)
ax.legend(loc='upper left', fontsize=9)
ax.grid(alpha=0.3)

plt.tight_layout()
plt.savefig('placebo40_histogram.png', dpi=150, bbox_inches='tight')
print("\nSaved: placebo40_histogram.png")

res.to_csv('placebo40_results.csv', index=False)
print("Saved: placebo40_results.csv")

with open('extended_results.pkl', 'wb') as f:
    pickle.dump({
        'real_ate': REAL_ATE, 'real_ci': REAL_CI,
        'placebo_ates': ates, 'p_empirical': p_emp,
        'z_score': z, 'n_placebo': len(ates),
        'placebo_mean': float(ates.mean()),
        'placebo_std': float(ates.std()),
        'placebo_min': float(ates.min()),
        'placebo_max': float(ates.max()),
    }, f)
print("Saved: extended_results.pkl")
