import sqlite3
import pandas as pd
import os
import json
import sys


# Enter five target antibiotics in full name in list
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

    # Check file name is provided and the file exists
    sys.tracebacklimit = 0
    if len(sys.argv) != 2:
        raise Exception('Invalid command. Use the following format: python processor.py database.db')
    dp_path = os.path.join(base, sys.argv[1])
    if not os.path.isfile(dp_path):
        raise OSError('File does not exist.')

    # Read all tables of the database into dataframes, throw excpetion if any of the tables is not found
    try:
        with sqlite3.connect(dp_path) as con:
            df_meta = pd.read_sql_query('SELECT * FROM table1_Metadata_v3', con)
            df_qc = pd.read_sql_query('SELECT * FROM table2_QC_v2', con)
            df_ana = pd.read_sql_query('SELECT * FROM table3_Analysis_v3', con)
    except pd.io.sql.DatabaseError:
        raise Exception('Incorrect or incompatible database is used.') from None

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
    # Only preserving rows with duplicate that is UNIQUE
    df = df[df['duplicate'] == 'UNIQUE']
    # Only preserving rows with QC that is Pass or PassPlus
    df = df[df['qc'].isin(['Pass', 'PassPlus'])]
    # Only preserving rows with Manifest_type that is IPD or Carriage
    df = df[df['Manifest_type'].isin(['IPD', 'Carriage'])]
    # Only preserving rows with Serotype and GPSC assigned
    df = df[df['In_Silico_serotype'].apply(lambda x: x[0].isnumeric())]
    df = df[df['GPSC_PoPUNK2'].apply(lambda x: x.isnumeric())]

    # Removing -?yr from postPCV in VaccinePeriod
    df['VaccinePeriod'] = df['VaccinePeriod'].apply(lambda x: x.split('-')[0])

    # For antibiotics resistance, consider I - Intermediate resistant / R - resistant as positive; S - susceptible / FLAG - considered as susceptible as negative
    df[antibiotics_cols] = df[antibiotics_cols].replace(['I', 'R'], 1)
    df[antibiotics_cols] = df[antibiotics_cols].replace(['S', 'FLAG'], 0)

    # Add designated colors for Serotype and GPSC to the output
    serotype_Colours = set(zip(df['In_Silico_serotype'], df['In_Silico_serotype__colour']))
    for serotype, color in sorted(serotype_Colours):
        output['domainRange']['serotype']['domain'].append(serotype)
        output['domainRange']['serotype']['range'].append(color)
    GPSC_Colours = set(zip(df['GPSC_PoPUNK2'], df['GPSC_PoPUNK2__colour']))
    for gpsc, color in sorted(GPSC_Colours):
        output['domainRange']['lineage']['domain'].append(gpsc)
        output['domainRange']['lineage']['range'].append(color)
    
    # Add information of each country
    for countryA2, countryDB in COUNTRIES:
        # Create new DF holding information of this country only
        dfCountry = df[df['Country'] == countryDB]
        output['summary'][countryA2] = {'periods': [], 'ageGroups': [False, False]}
        output['global'][countryA2] = {'carriage': [], 'disease': []}
        output['country'][countryA2] = {'carriage': {}, 'disease': {}, 'resistance': {}}
 
        # Fill in periods in Country Summary
        periods = dfCountry['VaccinePeriod'].unique()
        if len(periods) == 1 and periods[0] == 'PrePCV': # If only contains PrePCV period, mark as No Vaccination 
            output['summary'][countryA2]['periods'].append([f'{dfCountry["Year_collection"].min()} - {dfCountry["Year_collection"].max()}', 'No Vaccination'])
        else: # Otherwise mark all vaccination periods
            periodsOutput = []
            for p in periods:
                yearMin = dfCountry[dfCountry["VaccinePeriod"] == p]["Year_collection"].min()
                yearMax = dfCountry[dfCountry["VaccinePeriod"] == p]["Year_collection"].max()
                pText = p.split('PCV')
                pText = f'{pText[0].capitalize()}-PCV{pText[1]}'
                # State the year range if it is > 1 year, otherwise just the single year
                if yearMin == yearMax: # 
                    periodsOutput.append([yearMin, pText])
                else:
                    periodsOutput.append([f'{yearMin} - {yearMax}', pText])
            periodsOutput.sort(key=lambda x: int(x[0][:4])) # Sort the periods by their starting year
            output['summary'][countryA2]['periods'] = periodsOutput

        # Fill in ageGroups in Country Summary
        ages = dfCountry['children<5yrs'].unique()
        ageGroups = []
        if 'Y' in ages:
            output['summary'][countryA2]['ageGroups'][0] = True
            ageGroups.append((0, 'Y'))
        if 'N' in ages: 
            output['summary'][countryA2]['ageGroups'][1] = True
            ageGroups.append((1, 'N'))

        # Go thru both disease and carriage for all views
        for Manifesttype, JSONtype in (('IPD', 'disease'), ('Carriage', 'carriage')):
            # Fill in data for Global View
            dfCountryType = dfCountry[dfCountry['Manifest_type'] == Manifesttype].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
            dfCountryType['group'] = dfCountryType['In_Silico_serotype'] + '-' + dfCountryType['GPSC_PoPUNK2']
            dfCountryType = dfCountryType[['group', 'size']]
            output['global'][countryA2][JSONtype] = dfCountryType.values.tolist()

            # Go thru all age groups and periods for Country View:
            for ageGroup, lessThanFive in ageGroups:
                output['country'][countryA2][JSONtype][f'age{ageGroup}'] = {}

                # Fill in data for Lineage by Serotype in Country View
                for i, p in enumerate(periods):
                    dfCountryType = dfCountry[(dfCountry['Manifest_type'] == Manifesttype) & (dfCountry['VaccinePeriod'] == p) & (dfCountry['children<5yrs'] == lessThanFive)].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
                    dfCountryType['group'] = dfCountryType['In_Silico_serotype'] + '-' + dfCountryType['GPSC_PoPUNK2']
                    dfCountryType = dfCountryType[['group', 'size']]
                    output['country'][countryA2][JSONtype][f'age{ageGroup}'][f'period{i}'] = dfCountryType.values.tolist()

        # Process Antibiotic Resistance data
        dfCountryAntibiotics = dfCountry[antibiotics_cols + ['children<5yrs', 'GPSC_PoPUNK2']]
        for ageGroup, lessThanFive in ageGroups:
            output['country'][countryA2]['resistance'][f'age{ageGroup}'] = {}

            # Get resistance sample sum and count of all samples in each lineage
            dfCountryResist = dfCountryAntibiotics[(dfCountryAntibiotics['children<5yrs'] == lessThanFive)].groupby(['GPSC_PoPUNK2']).sum()
            dfCountryTotal = dfCountryAntibiotics[(dfCountryAntibiotics['children<5yrs'] == lessThanFive)].groupby(['GPSC_PoPUNK2']).count()[antibiotics_cols]

            # Calculate the percentage and correct the order of columns
            dfCountryResistPer = dfCountryResist.div(dfCountryTotal, fill_value=0).mul(100).round(2)
            dfCountryResistPer = dfCountryResistPer[antibiotics_cols]

            # Fill in data for Antibiotic Resistance in Country View
            for i, values in zip(dfCountryResistPer.index.values.tolist(), dfCountryResistPer.values.tolist()):
                output['country'][countryA2]['resistance'][f'age{ageGroup}'][i] = values

    # Export result to data.json that can be uploaded to the web server
    outfile_path = os.path.join(base, 'data.json')
    with open(outfile_path, 'w') as outfile:
        json.dump(output, outfile, indent=4)


if __name__ == '__main__':
    main()