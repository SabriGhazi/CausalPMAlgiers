"""Regenerate the confounder sensitivity forest plot with extended numbers."""
import matplotlib.pyplot as plt
import numpy as np

specs = [
    ("Full data (baseline)",         -11.68, -14.36,  -9.14),
    ("Exclude COVID (training)",     -13.93, -16.65, -11.52),
    ("Exclude wildfires (eval)",     -11.90, -14.50,  -9.37),
    ("Strict (no COVID/fires/anticipation)", -13.65, -16.15, -11.17),
]

fig, ax = plt.subplots(figsize=(10, 4))
y = np.arange(len(specs))
for i, (label, ate, lo, hi) in enumerate(specs):
    ax.errorbar(ate, i, xerr=[[ate-lo], [hi-ate]], fmt='o',
                color='darkred', ecolor='steelblue',
                elinewidth=2.5, capsize=6, ms=11)
    ax.text(hi + 0.3, i, f'  {ate:+.2f}  [{lo:+.2f}, {hi:+.2f}]',
            va='center', fontsize=10, family='monospace')

ax.axvline(0, color='k', lw=0.5)
ax.set_yticks(y)
ax.set_yticklabels([s[0] for s in specs])
ax.invert_yaxis()
ax.set_xlabel('Average Treatment Effect (μg/m³)', fontsize=11)
ax.set_title('Confounder sensitivity: ATE across exclusion specifications (extended dataset)',
             fontsize=12)
ates = [s[1] for s in specs]
los = [s[2] for s in specs]
his = [s[3] for s in specs]
ax.set_xlim(min(los) - 1, max(his) + 8)
ax.grid(axis='x', alpha=0.3)
plt.tight_layout()
plt.savefig('sensitivity_forest.png', dpi=150, bbox_inches='tight')
print("Saved: sensitivity_forest.png")
print(f"Spread: {max(ates)-min(ates):.2f} μg/m³")
