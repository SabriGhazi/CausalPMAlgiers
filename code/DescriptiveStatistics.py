import pandas as pd
pm = pd.read_csv('C:\\AirAlgiersBanPostBan\\ghazi_pm25_replication_package\\ghazi_pm25_package\\data\\algiers-08-05-2025.csv')
pm.columns = [c.strip() for c in pm.columns]
pm['date'] = pd.to_datetime(pm['date'])
pm = pm.sort_values('date').set_index('date')
BAN = pd.Timestamp('2021-07-30')
pre_ban_df=pm[pm.index<BAN]
post_ban_df=pm[pm.index>=BAN]
print(pre_ban_df.describe())
print(post_ban_df.describe())