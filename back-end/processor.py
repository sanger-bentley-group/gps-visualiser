import sqlite3
import pandas as pd
import os
import json


# Enter target antibiotics in full name in list
ANTIBIOTICS = ['penicillin', 'chloramphenicol', 'erythromycin', 'co-trimoxazole', 'tetracycline']

# As the country names are not standardised in the database, enter target countries in tuples of '("Country Alpha-2 Code", "Value in 'Country' Columns of the Database")' in list
COUNTRIES = [('AR', 'ARGENTINA'), ('BR', 'BRAZIL'), ('IN','INDIA')]


def main():
    # Template of the data.json
    output = {
        'summary': {},
        'global': {},
        'country': {},
        'domainRange': {
            'serotype': {
                'domain': [],   
                'range': []
            },
            'lineage': {
                'domain': [],   
                'range': []
            }
        },
        'antibiotics': ANTIBIOTICS
    }

    # Ensure the script will read and write to the same dir it locates at
    base = os.path.dirname(os.path.abspath(__file__))

    # Read all tables of the database into dataframes
    dp_path = os.path.join(base, 'GPS1_database_v3.db')
    with sqlite3.connect(dp_path) as con:
        df_meta = pd.read_sql_query('SELECT * FROM table1_Metadata_v3', con)
        df_qc = pd.read_sql_query('SELECT * FROM table2_QC_v2', con)
        df_ana = pd.read_sql_query('SELECT * FROM table3_Analysis_v3', con)

    # Getting column names of target antibiotics for df_ana processing
    ana_cols_list = df_ana.columns.tolist()
    antibiotics_cols = []
    for x in ANTIBIOTICS:
        abbr = ''.join(filter(str.isalpha, x))[:3].upper()
        if (col := f'WGS_{abbr}_SIR') in ana_cols_list:
            antibiotics_cols.append(col)
        elif (col := f'WGS_{abbr}_SIR_Meningitis') in ana_cols_list:
            antibiotics_cols.append(col)
        else:
            raise ValueError('One or more of the antibiotics is not found in the database.')
    
    # Only preserving necessary columns in DFs
    meta_cols = ['Public_name', 'Country', 'Submitting_Institution', 'Year_collection', 'VaccinePeriod']
    df_meta.drop(columns=df_meta.columns.difference(meta_cols), inplace=True) 
    qc_cols = ['qc', 'Public_Name']
    df_qc.drop(columns=df_qc.columns.difference(qc_cols), inplace=True)
    ana_cols = (['public_name', 'duplicate', 'Manifest_type', 'children<5yrs', 'GPSC_PoPUNK2', 'GPSC_PoPUNK2__colour', 'In_Silico_serotype', 'In_Silico_serotype__colour'] 
                + antibiotics_cols)
    df_ana.drop(columns=df_ana.columns.difference(ana_cols), inplace=True)
    
    # Unifying the letter-casing of 'Public_name' columns in DFs for merge
    df_qc.rename(columns={'Public_Name': 'Public_name'}, inplace=True)
    df_ana.rename(columns={'public_name': 'Public_name'}, inplace=True)
    
    # Convert all values to string to ensure good merge
    df_meta = df_meta.astype(str)
    df_qc = df_qc.astype(str)
    df_ana = df_ana.astype(str)

    # Merge all DFs into df, discard data points that are not on all 3 tables
    df = pd.merge(df_meta, df_qc, on=['Public_name'])
    df = pd.merge(df, df_ana, on=['Public_name'])

    # Only preserving rows with selected countries
    df = df[df['Country'].isin(c[1] for c in COUNTRIES)]
    # Special case for India, only accept data submitted by KEMPEGOWDA INSTITUTE OF MEDICAL SCIENCES
    df.drop(df[(df['Country'] == 'INDIA') & (df['Submitting_Institution'] != 'KEMPEGOWDA INSTITUTE OF MEDICAL SCIENCES')].index, inplace=True)
    # Only preserving rows with QC that is Pass or PassPlus
    df = df[df['qc'].isin(['Pass', 'PassPlus'])]
    # Only preserving rows with Serotype and GPSC assigned
    df = df[df['In_Silico_serotype'].apply(lambda x: x[0].isnumeric())]
    df = df[df['GPSC_PoPUNK2'].apply(lambda x: x.isnumeric())]

    # Add designated colors for Serotype and GPSC to the output
    serotype_Colours = set(zip(df['In_Silico_serotype'], df['In_Silico_serotype__colour']))
    for serotype, color in serotype_Colours:
        output['domainRange']['serotype']['domain'].append(serotype)
        output['domainRange']['serotype']['range'].append(color)

    GPSC_Colours = set(zip(df['GPSC_PoPUNK2'], df['GPSC_PoPUNK2__colour']))
    for gpsc, color in GPSC_Colours:
        output['domainRange']['lineage']['domain'].append(gpsc)
        output['domainRange']['lineage']['range'].append(color)
    
    # WIP - Extract and prcoess data from DF into the output

    # Export result to data.json that can be uploaded to the web server
    outfile_path = os.path.join(base, 'data.json')
    with open(outfile_path, 'w') as outfile:
        json.dump(output, outfile)


if __name__ == '__main__':
    main()