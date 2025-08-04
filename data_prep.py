import pandas as pd

zip_uhii = pd.read_csv('data/zip_UHII.csv')
cbsa = pd.read_csv('data/CBSA_Map.csv', skiprows=2, encoding='latin1')
zip_data = pd.read_csv('data/uszips.csv')  
zip_data.rename(columns={'zip': 'ZIP'}, inplace=True)

print(cbsa.columns)

cbsa_subset = cbsa[['CBSA Code', 'CBSA Title']].drop_duplicates()
cbsa_subset.rename(columns={'CBSA Code': 'MSA', 'CBSA Title': 'MSA_Name'}, inplace=True)

zip_uhii = zip_uhii.dropna(subset=['MSA'])
cbsa_subset = cbsa_subset.dropna(subset=['MSA'])

zip_uhii['MSA'] = zip_uhii['MSA'].astype(int)
cbsa_subset['MSA'] = cbsa_subset['MSA'].astype(int)

merged = pd.merge(zip_uhii, cbsa_subset, on='MSA', how='left')
merged = pd.merge(merged, zip_data[['ZIP', 'city', 'state_id', 'state_name', 'population', 'density']], on='ZIP', how='inner')
merged.rename(columns={'UHII.Wght': 'UHII'}, inplace=True)

final_df = merged[['ZIP', 'city', 'state_id', 'state_name', 'population', 'density', 'MSA_Name', 'UHII']]
final_df.to_csv('clean_uhii_by_zip.csv', index=False)

print("Cleaned UHII CSV with city and state added created: clean_uhii_by_zip.csv")
