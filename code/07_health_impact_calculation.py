"""
Health impact of the Algerian leaded petrol ban on PM2.5 in Algiers.

Avoided deaths per year = Pop × baseline_mort × (1 - exp(-β × ΔPM2.5))
"""
import numpy as np
import pandas as pd

POP_CENTRAL = 3_500_000
POP_RANGE = (3_000_000, 4_000_000)
BASELINE_MORT = 5.2 / 1000
BASELINE_MORT_RANGE = (4.8/1000, 5.5/1000)
DELTA_CENTRAL = 10.0
DELTA_RANGE = (8.0, 13.0)

BETA_COHEN = 0.008
BETA_GBD    = 0.0063
BETA_GEMM   = 0.0110

def avoided(pop, mort, delta, beta):
    return pop * mort * (1.0 - np.exp(-beta * delta))

print("="*72)
print("CENTRAL (pop=3.5M, mort=5.2/1000, ΔPM2.5=10 μg/m³)")
print("="*72)
for name, beta in [("Cohen 2017 log-linear", BETA_COHEN),
                   ("GBD 2019 IER approx",    BETA_GBD),
                   ("GEMM / Burnett 2018",    BETA_GEMM)]:
    d = avoided(POP_CENTRAL, BASELINE_MORT, DELTA_CENTRAL, beta)
    pct = 100 * (1 - np.exp(-beta * DELTA_CENTRAL))
    print(f"  {name:28s} β={beta:.4f}  deaths/yr = {d:6.0f}   ({pct:.2f}% mortality reduction)")

print("\n" + "="*72)
print("RANGE (GBD 2019 as primary CRF)")
print("="*72)
d_lo = avoided(POP_RANGE[0], BASELINE_MORT_RANGE[0], DELTA_RANGE[0], BETA_GBD)
d_hi = avoided(POP_RANGE[1], BASELINE_MORT_RANGE[1], DELTA_RANGE[1], BETA_GBD)
d_c  = avoided(POP_CENTRAL,  BASELINE_MORT,          DELTA_CENTRAL, BETA_GBD)
print(f"  Central: {d_c:.0f} avoided deaths/yr")
print(f"  Low:     {d_lo:.0f} (pop=3.0M, Δ=8,  mort=4.8/1000)")
print(f"  High:    {d_hi:.0f} (pop=4.0M, Δ=13, mort=5.5/1000)")

print("\n" + "="*72)
print("FULL SENSITIVITY (central pop & mort, vary delta and CRF)")
print("="*72)
rows = []
for delta in [8, 10, 12]:
    row = {"delta": delta}
    for name, beta in [("Cohen", BETA_COHEN), ("GBD2019", BETA_GBD), ("GEMM", BETA_GEMM)]:
        row[name] = round(avoided(POP_CENTRAL, BASELINE_MORT, delta, beta))
    rows.append(row)
sens = pd.DataFrame(rows)
print(sens.to_string(index=False))
sens.to_csv('health_impact_sensitivity.csv', index=False)

print("\n" + "="*72)
print("CUMULATIVE OVER POST-BAN PERIOD (2.1 years)")
print("="*72)
years = 2.1
print(f"  GBD 2019 central × {years:.1f} years = {d_c*years:.0f} cumulative avoided deaths")
