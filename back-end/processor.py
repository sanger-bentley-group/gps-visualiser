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
    vaccine_period_cleanup(df)
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
    df_analysis = dfs[2]
    analysis_cols_list = df_analysis.columns.tolist()
    for antibiotic in ANTIBIOTICS:
        abbr = ''.join(filter(str.isalpha, antibiotic))[:3].upper()
        if (col := f'WGS_{abbr}_SIR') in analysis_cols_list:
            pass
        elif (col := f'WGS_{abbr}_SIR_Meningitis') in analysis_cols_list:
            pass
        else:
            raise ValueError('One or more of the antibiotics is not found in the database.')
        df_analysis.rename(columns = {col: antibiotic}, inplace = True)


# Only preserving necessary columns in DFs 
def columns_filter(dfs):
    meta_cols = ['Public_name', 'Country', 'Region', 'Submitting_Institution', 'Year_collection', 'VaccinePeriod']
    qc_cols = ['Lane_id', 'QC']
    analysis_cols = (['Lane_id', 'Public_name', 'Duplicate', 'Manifest_type', 'Children<5yrs', 'GPSC_PoPUNK2', 'GPSC_PoPUNK2__colour', 'In_Silico_serotype', 'In_Silico_serotype__colour', 'Published(Y/N)'] 
            + ANTIBIOTICS)

    for df, cols in zip(dfs, (meta_cols, qc_cols, analysis_cols)):
        df.drop(columns=df.columns.difference(cols), inplace=True) 


# Only preserving rows with QC that is Pass or PassPlus in qc
# Only preserving rows with Duplicate that is UNIQUE in analysis
def quality_filter(dfs):
    df_qc, df_analysis = dfs[1], dfs[2]
    df_qc.drop(df_qc[~df_qc['QC'].isin(['Pass', 'PassPlus'])].index, inplace = True)
    df_analysis.drop(df_analysis[df_analysis['Duplicate'] != 'UNIQUE'].index, inplace = True)


# Merge all DFs into df, discard data points that are not on all 3 tables
def dfs_merge(dfs):
    df_meta, df_qc, df_analysis = dfs
    df = pd.merge(df_qc, df_analysis, on=['Lane_id'])
    df = pd.merge(df_meta, df, on=['Public_name'])
    return df


# Special case for Hong Kong, moving Hong Kong from Region to Country for individual processing
def region_as_country(df):
    df.loc[df['Region'] == 'HONG KONG', 'Country'] = 'HONG KONG'


# Only preserving rows fit all conditions: 
#   in selected countries; 
#   Manifest_type is in IPD or Carriage; 
#   has serotype assigned
#   has GPSC assigned; 
#   has valid VaccinePeriod; 
#   has valid Children<5yrs value; 
#   is published data
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
def vaccine_period_cleanup(df):
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
    for country_alpha2_code, country_db_name, country_paper_url in COUNTRIES:
        # Create new DF holding information of this country only
        df_country = df[df['Country'] == country_db_name]
        if df_country.empty:
            raise Exception(f'Country name "{country_db_name}" is not found in the database or has no valid data. Check spelling and casing of your input, and the completeness of data of that country.')
        
        build_scaffold(output, country_alpha2_code, country_paper_url)
        periods_output = get_periods(output, df_country, country_alpha2_code)
        age_groups = get_age_groups(output, df_country, country_alpha2_code)

        # Go thru both disease and carriage for all views
        for manifest_type_db, manifest_type_json in ((['IPD', 'Carriage'], 'all'), (['IPD'], 'disease'), (['Carriage'], 'carriage')): 
            get_global_data(output, df_country, country_alpha2_code, manifest_type_db, manifest_type_json, periods_output)
            # Go thru all age groups and periods for Country View:
            for age_group in age_groups:
                get_country_data(output, df_country, country_alpha2_code, manifest_type_db, manifest_type_json, age_group, periods_output)

        get_antibiotic_data(output, df_country, country_alpha2_code, age_groups)


# Add designated colors for Serotype and GPSC to the output
def get_colors(df, output):
    serotype_colours = set(zip(df['In_Silico_serotype'], df['In_Silico_serotype__colour']))
    for serotype, color in sorted(serotype_colours):
        output['domainRange']['serotype']['domain'].append(serotype)
        output['domainRange']['serotype']['range'].append(color)
    gpsc_colours = set(zip(df['GPSC_PoPUNK2'], df['GPSC_PoPUNK2__colour']))
    for gpsc, color in sorted(gpsc_colours):
        output['domainRange']['lineage']['domain'].append(gpsc)
        output['domainRange']['lineage']['range'].append(color)


# Build scaffold for a country to hold its data in the output
def build_scaffold(output, country_alpha2_code, country_paper_url):
    output['summary'][country_alpha2_code] = {'periods': [], 'ageGroups': [False, False], 'link': country_paper_url}
    output['global'][country_alpha2_code] = {'all': [], 'carriage': [], 'disease': []}
    output['country'][country_alpha2_code] = {'all': {}, 'carriage': {}, 'disease': {}, 'resistance': {}}


# Fill in periods in Country Summary and return periods_output
def get_periods(output, df_country, country_alpha2_code):
    periods = df_country['VaccinePeriod'].unique()
    periods_output = []
    if len(periods) == 1 and periods[0] == 'PrePCV': # If only contains PrePCV period, mark as No Vaccination
        year_min = df_country["Year_collection"].min()
        year_max = df_country["Year_collection"].max()
        year_range = year_min if year_min == year_max else f'{year_min} - {year_max}'
        periods_output.append([year_range, 'No Vaccination', 'PrePCV'])
    else: # Otherwise mark all vaccination periods
        for p in periods:
            year_min = df_country[df_country["VaccinePeriod"] == p]["Year_collection"].min()
            year_max = df_country[df_country["VaccinePeriod"] == p]["Year_collection"].max()
            year_range = year_min if year_min == year_max else f'{year_min} - {year_max}'
            period_name = p.split('PCV')
            period_name = f'{period_name[0].capitalize()}-PCV{period_name[1]}'
            periods_output.append([year_range, period_name, p])
        periods_output.sort(key=lambda x: int(x[0][:4])) # Sort the periods by their starting year
    output['summary'][country_alpha2_code]['periods'] = periods_output
    return periods_output


# Fill in age_groups in Country Summary and return age_groups
# 0 in age_groups means presence of samples from less than five years old; 1 in age_groups means presence of samples from five years old or older
def get_age_groups(output, df_country, country_alpha2_code):
    ages = df_country['Children<5yrs'].unique()
    age_groups = []
    if 'Y' in ages:
        output['summary'][country_alpha2_code]['ageGroups'][0] = True
        age_groups.append(0)
    if 'N' in ages: 
        output['summary'][country_alpha2_code]['ageGroups'][1] = True
        age_groups.append(1)
    return age_groups


# Fill in data for Global View
def get_global_data(output, df_country, country_alpha2_code, manifest_type_db, manifest_type_json, periods_output):
    df_country_type = df_country[(df_country['Manifest_type'].isin(manifest_type_db)) & (df_country['VaccinePeriod'] == periods_output[-1][2])].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
    df_country_type['group'] = df_country_type['In_Silico_serotype'] + '-' + df_country_type['GPSC_PoPUNK2']
    df_country_type = df_country_type[['group', 'size']]
    output['global'][country_alpha2_code][manifest_type_json] = df_country_type.values.tolist()


# Fill in data for Lineage by Serotype in Country View
def get_country_data(output, df_country, country_alpha2_code, manifest_type_db, manifest_type_json, age_group, periods_output):
    output['country'][country_alpha2_code][manifest_type_json][f'age{age_group}'] = {}
    less_than_five = is_less_than_five(age_group)

    for i, p in enumerate(periods_output):
        df_country_type = df_country[(df_country['Manifest_type'].isin(manifest_type_db)) & (df_country['VaccinePeriod'] == p[2]) & (df_country['Children<5yrs'] == less_than_five)].groupby(['In_Silico_serotype', 'GPSC_PoPUNK2']).size().reset_index(name='size')
        df_country_type['group'] = df_country_type['In_Silico_serotype'] + '-' + df_country_type['GPSC_PoPUNK2']
        df_country_type = df_country_type[['group', 'size']]
        output['country'][country_alpha2_code][manifest_type_json][f'age{age_group}'][f'period{i}'] = df_country_type.values.tolist()


# Fill in Antibiotic Resistance data
def get_antibiotic_data(output, df_country, country_alpha2_code, age_groups):
    df_country_antibiotics = df_country[ANTIBIOTICS + ['Children<5yrs', 'GPSC_PoPUNK2']]
    for age_group in age_groups:
        output['country'][country_alpha2_code]['resistance'][f'age{age_group}'] = {}
        less_than_five = is_less_than_five(age_group)

        # Get resistance sample sum and count of all samples in each lineage
        df_country_antibiotics_each = df_country_antibiotics[(df_country_antibiotics['Children<5yrs'] == less_than_five)].groupby(['GPSC_PoPUNK2']).sum()
        df_country_antibiotics_total = df_country_antibiotics[(df_country_antibiotics['Children<5yrs'] == less_than_five)].groupby(['GPSC_PoPUNK2']).count()[ANTIBIOTICS]

        # Calculate the percentage and correct the order of columns
        df_country_antibiotics_percentage = df_country_antibiotics_each.div(df_country_antibiotics_total, fill_value=0).mul(100).round(2)
        df_country_antibiotics_percentage = df_country_antibiotics_percentage[ANTIBIOTICS]

        # Fill in data for Antibiotic Resistance in Country View
        for i, values in zip(df_country_antibiotics_percentage.index.values.tolist(), df_country_antibiotics_percentage.values.tolist()):
            output['country'][country_alpha2_code]['resistance'][f'age{age_group}'][i] = values


def is_less_than_five(age_group):
    return 'Y' if age_group == 0 else 'N'


if __name__ == '__main__':
    main()