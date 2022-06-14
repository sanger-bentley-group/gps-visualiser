# This script takes the GPS1 database and process the data into data.json for the use of gps-visualiser front-end. 
# The global variables 'TABLE_NAMES', 'ANTIBIOTICS', 'COUNTRIES' can be changed.

import sqlite3
import pandas as pd
import os
import json
import sys


# Enter the current table names in the database as value under the relevant key
TABLE_NAMES = {
    'meta': 'table1_Metadata_v3',
    'qc': 'table2_QC_v3', 
    'analysis': 'table3_analysis_v3'
    }

# Enter five target antibiotics in full name in list
ANTIBIOTICS = ['penicillin', 'chloramphenicol', 'erythromycin', 'co-trimoxazole', 'tetracycline']

# As the country names are not standardised in the database and links to papers are not available in the database, 
# Enter target countries in tuples of '("Country Alpha-2 Code", "Value in 'Country' Columns of the Database", "Link to research article")' in list
# If the paper is not yet available, put the "Link to research article" as an empty string
COUNTRIES = [
        ('AR', 'ARGENTINA', 'https://www.microbiologyresearch.org/content/journal/mgen/10.1099/mgen.0.000636'), 
        ('BR', 'BRAZIL', 'https://www.microbiologyresearch.org/content/journal/mgen/10.1099/mgen.0.000635'), 
        ('IN', 'INDIA', 'https://www.microbiologyresearch.org/content/journal/mgen/10.1099/mgen.0.000645'), 
        ('ZA', 'SOUTH AFRICA', 'https://www.microbiologyresearch.org/content/journal/mgen/10.1099/mgen.0.000746'),
        ('NP', 'NEPAL', 'https://www.sciencedirect.com/science/article/pii/S2666524722000660'),
        ('GM', 'THE GAMBIA', ''),
        ('US', 'USA', ''),
        ('MW', 'MALAWI', ''),
        ('IL', 'ISRAEL', ''),
        ('PE', 'PERU', ''),
        ('PL', 'POLAND', ''),
        ('MZ', 'MOZAMBIQUE', ''),
        ('KH', 'CAMBODIA', ''),
        ('PG', 'PAPUA NEW GUINEA', '')
    ]

# Comment out the below line for debugging
sys.tracebacklimit = 0

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
    if len(sys.argv) != 2:
        raise Exception('Invalid command. Use the following format: python processor.py database.db')
    dp_path = os.path.join(base, sys.argv[1])
    if not os.path.isfile(dp_path):
        raise OSError('File does not exist.')

    df = get_df(dp_path)
    build_output(df, output)

    # Export result to data.json that can be uploaded to the web server
    outfile_path = os.path.join(base, 'data.json')
    with open(outfile_path, 'w') as outfile:
        json.dump(output, outfile, indent=4)

    print(f'data.json has been created at {base}.')


# Get a single dataframe that is ready for data processing
def get_df(dp_path):
    dfs = read_db(dp_path)
    update_antibiotic_columns(dfs)
    columns_filter(dfs)
    quality_filter(dfs)

    df = dfs_merge(dfs)
    region_as_country(df)
    row_selection(df)
    india_specific_filter(df)
    VaccinePeriod_cleanup(df)
    antibiotic_cleanup(df)
    return df


# Read all tables of the database into dataframes, throw excpetion if any of the tables is not found
# Values are readed as string to ensure good processing and merge
def read_db(dp_path):
    try:
        dfs = []
        with sqlite3.connect(dp_path) as con:
            for table_name in TABLE_NAMES.values():
                dfs.append(pd.read_sql_query(f'SELECT * FROM {table_name}', con).astype(str))
    except pd.io.sql.DatabaseError:
        raise Exception('Incorrect or incompatible database is used.') from None
    return dfs


# Updating column names of target antibiotics for easier processing
def update_antibiotic_columns(dfs):
    df_ana = dfs[2]
    ana_cols_list = df_ana.columns.tolist()
    for antibiotic in ANTIBIOTICS:
        abbr = ''.join(filter(str.isalpha, antibiotic))[:3].upper()
        if (col := f'WGS_{abbr}_SIR') in ana_cols_list:
            pass
        elif (col := f'WGS_{abbr}_SIR_Meningitis') in ana_cols_list:
            pass
        else:
            raise ValueError('One or more of the antibiotics is not found in the database.')
        df_ana.rename(columns = {col: antibiotic}, inplace = True)


# Only preserving necessary columns in DFs 
def columns_filter(dfs):
    meta_cols = ['Public_name', 'Country', 'Region', 'Submitting_Institution', 'Year_collection', 'VaccinePeriod']
    qc_cols = ['Lane_id', 'QC']
    ana_cols = (['Lane_id', 'Public_name', 'Duplicate', 'Manifest_type', 'Children<5yrs', 'GPSC_PoPUNK2', 'GPSC_PoPUNK2__colour', 'In_Silico_serotype', 'In_Silico_serotype__colour', 'Published(Y/N)'] 
            + ANTIBIOTICS)

    for df, cols in zip(dfs, (meta_cols, qc_cols, ana_cols)):
        df.drop(columns=df.columns.difference(cols), inplace=True) 


# Only preserving rows with QC that is Pass or PassPlus in qc
# Only preserving rows with Duplicate that is UNIQUE in analysis
def quality_filter(dfs):
    df_qc, df_ana = dfs[1], dfs[2]
    df_qc.drop(df_qc[~df_qc['QC'].isin(['Pass', 'PassPlus'])].index, inplace = True)
    df_ana.drop(df_ana[df_ana['Duplicate'] != 'UNIQUE'].index, inplace = True)


# Merge all DFs into df, discard data points that are not on all 3 tables
def dfs_merge(dfs):
    df_meta, df_qc, df_ana = dfs
    df = pd.merge(df_qc, df_ana, on=['Lane_id'])
    df = pd.merge(df_meta, df, on=['Public_name'])
    return df


# Special case for Hong Kong, moving Hong Kong from Region to Country for individual processing
def region_as_country(df):
    df.loc[df['Region'] == 'HONG KONG', 'Country'] = 'HONG KONG'


# Only preserving rows with: 
#   selected countries; Manifest_type that is IPD or Carriage; serotype assigned
#   GPSC assigned; valid VaccinePeriod; valid Children<5yrs value; published data
def row_selection(df):
    df.drop(df[~df['Country'].isin(c[1] for c in COUNTRIES)].index, inplace = True)
    df.drop(df[~df['Manifest_type'].isin(('IPD', 'Carriage'))].index, inplace = True)
    df.drop(df[~df['In_Silico_serotype'].apply(lambda x: x[0].isnumeric())].index, inplace = True)
    df.drop(df[~df['GPSC_PoPUNK2'].apply(lambda x: x[0].isnumeric())].index, inplace = True)
    df.drop(df[df['VaccinePeriod'] == '_'].index, inplace=True)
    df.drop(df[~df['Children<5yrs'].isin(('Y', 'N'))].index, inplace=True)
    df.drop(df[df['Published(Y/N)'] != 'Y'].index, inplace=True)


# Special case for India, only accept data submitted by KEMPEGOWDA INSTITUTE OF MEDICAL SCIENCES
def india_specific_filter(df):
    df.drop(df[(df['Country'] == 'INDIA') & (df['Submitting_Institution'] != 'KEMPEGOWDA INSTITUTE OF MEDICAL SCIENCES')].index, inplace=True)


# Removing -?yr from postPCV in VaccinePeriod
def VaccinePeriod_cleanup(df):
    df['VaccinePeriod'] = df['VaccinePeriod'].apply(lambda x: x.split('-')[0])


# For antibiotics resistance, consider:
#   I - Intermediate resistant / R - resistant as positive, ie: 1;
#   S - susceptible / FLAG - considered as susceptible as negative, ie: 0.
# Sanity check to only keep 1 and 0
def antibiotic_cleanup(df):
    for antibiotic in ANTIBIOTICS:
        df[antibiotic].replace({
            'I': 1,
            'R': 1,
            'S': 0,
            'FLAG': 0
        }, inplace=True)
        df.drop(df[~df[antibiotic].isin([0, 1])].index, inplace = True)
        df[antibiotic] = df[antibiotic].astype(int)


# Build the output dict
def build_output(df, output):
    get_colors(df, output)
   
    # Add information of each country
    for countryA2, countryDB, countryLink in COUNTRIES:
        # Create new DF holding information of this country only
        dfCountry = df[df['Country'] == countryDB]
        if dfCountry.empty:
            raise Exception(f'Country name "{countryDB}" is not found in the database or has no valid data. Check spelling and casing of your input, and the completeness of data of that country.')
        
        build_scaffold(output, countryA2, countryLink)
        periodsOutput = get_periods(output, dfCountry, countryA2)
        ageGroups = get_ageGroups(output, dfCountry, countryA2)

        # Go thru both disease and carriage for all views
        for Manifesttype, JSONtype in ((['IPD', 'Carriage'], 'all'), (['IPD'], 'disease'), (['Carriage'], 'carriage')): 
            get_global_data(output, dfCountry, countryA2, Manifesttype, JSONtype, periodsOutput)
            # Go thru all age groups and periods for Country View:
            for ageGroup, lessThanFive in ageGroups:
                get_country_data(output, dfCountry, countryA2, Manifesttype, JSONtype, ageGroup, lessThanFive, periodsOutput)

        get_antibiotic_data(output, dfCountry, countryA2, ageGroups)

# Add designated colors for Serotype and GPSC to the output
def get_colors(df, output):
    serotype_Colours = set(zip(df['In_Silico_serotype'], df['In_Silico_serotype__colour']))
    for serotype, color in sorted(serotype_Colours):
        output['domainRange']['serotype']['domain'].append(serotype)
        output['domainRange']['serotype']['range'].append(color)
    GPSC_Colours = set(zip(df['GPSC_PoPUNK2'], df['GPSC_PoPUNK2__colour']))
    for gpsc, color in sorted(GPSC_Colours):
        output['domainRange']['lineage']['domain'].append(gpsc)
        output['domainRange']['lineage']['range'].append(color)


# Build scaffold for a country to hold its data in the output
def build_scaffold(output, countryA2, countryLink):
    output['summary'][countryA2] = {'periods': [], 'ageGroups': [False, False], 'link': countryLink}
    output['global'][countryA2] = {'all': [], 'carriage': [], 'disease': []}
    output['country'][countryA2] = {'all': {}, 'carriage': {}, 'disease': {}, 'resistance': {}}


# Fill in periods in Country Summary and return periodsOutput
def get_periods(output, dfCountry, countryA2):
    periods = dfCountry['VaccinePeriod'].unique()
    periodsOutput = []
    if len(periods) == 1 and periods[0] == 'PrePCV': # If only contains PrePCV period, mark as No Vaccination
        yearMin = dfCountry["Year_collection"].min()
        yearMax = dfCountry["Year_collection"].max()
        yearRange = yearMin if yearMin == yearMax else f'{yearMin} - {yearMax}'
        periodsOutput.append([yearRange, 'No Vaccination', 'PrePCV'])
    else: # Otherwise mark all vaccination periods
        for p in periods:
            yearMin = dfCountry[dfCountry["VaccinePeriod"] == p]["Year_collection"].min()
            yearMax = dfCountry[dfCountry["VaccinePeriod"] == p]["Year_collection"].max()
            yearRange = yearMin if yearMin == yearMax else f'{yearMin} - {yearMax}'
            pText = p.split('PCV')
            pText = f'{pText[0].capitalize()}-PCV{pText[1]}'
            periodsOutput.append([yearRange, pText, p])
        periodsOutput.sort(key=lambda x: int(x[0][:4])) # Sort the periods by their starting year
    output['summary'][countryA2]['periods'] = periodsOutput
    return periodsOutput


# Fill in ageGroups in Country Summary and return ageGroups
def get_ageGroups(output, dfCountry, countryA2):
    ages = dfCountry['Children<5yrs'].unique()
    ageGroups = []
    if 'Y' in ages:
        output['summary'][countryA2]['ageGroups'][0] = True
        ageGroups.append((0, 'Y'))
    if 'N' in ages: 
        output['summary'][countryA2]['ageGroups'][1] = True
        ageGroups.append((1, 'N'))
    return ageGroups


# Fill in data for Global View
def get_global_data(output, dfCountry, countryA2, Manifesttype, JSONtype, periodsOutput):
    dfCountryType = dfCountry[(dfCountry['Manifest_type'].isin(Manifesttype)) & (dfCountry['VaccinePeriod'] == periodsOutput[-1][2])].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
    dfCountryType['group'] = dfCountryType['In_Silico_serotype'] + '-' + dfCountryType['GPSC_PoPUNK2']
    dfCountryType = dfCountryType[['group', 'size']]
    output['global'][countryA2][JSONtype] = dfCountryType.values.tolist()


# Fill in data for Lineage by Serotype in Country View
def get_country_data(output, dfCountry, countryA2, Manifesttype, JSONtype, ageGroup, lessThanFive, periodsOutput):
    output['country'][countryA2][JSONtype][f'age{ageGroup}'] = {}
    for i, p in enumerate(periodsOutput):
        dfCountryType = dfCountry[(dfCountry['Manifest_type'].isin(Manifesttype)) & (dfCountry['VaccinePeriod'] == p[2]) & (dfCountry['Children<5yrs'] == lessThanFive)].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
        dfCountryType['group'] = dfCountryType['In_Silico_serotype'] + '-' + dfCountryType['GPSC_PoPUNK2']
        dfCountryType = dfCountryType[['group', 'size']]
        output['country'][countryA2][JSONtype][f'age{ageGroup}'][f'period{i}'] = dfCountryType.values.tolist()


# Fill in Antibiotic Resistance data
def get_antibiotic_data(output, dfCountry, countryA2, ageGroups):
    dfCountryAntibiotics = dfCountry[ANTIBIOTICS + ['Children<5yrs', 'GPSC_PoPUNK2']]
    for ageGroup, lessThanFive in ageGroups:
        output['country'][countryA2]['resistance'][f'age{ageGroup}'] = {}

        # Get resistance sample sum and count of all samples in each lineage
        dfCountryResist = dfCountryAntibiotics[(dfCountryAntibiotics['Children<5yrs'] == lessThanFive)].groupby(['GPSC_PoPUNK2']).sum()
        dfCountryTotal = dfCountryAntibiotics[(dfCountryAntibiotics['Children<5yrs'] == lessThanFive)].groupby(['GPSC_PoPUNK2']).count()[ANTIBIOTICS]

        # Calculate the percentage and correct the order of columns
        dfCountryResistPer = dfCountryResist.div(dfCountryTotal, fill_value=0).mul(100).round(2)
        dfCountryResistPer = dfCountryResistPer[ANTIBIOTICS]

        # Fill in data for Antibiotic Resistance in Country View
        for i, values in zip(dfCountryResistPer.index.values.tolist(), dfCountryResistPer.values.tolist()):
            output['country'][countryA2]['resistance'][f'age{ageGroup}'][i] = values



if __name__ == '__main__':
    main()