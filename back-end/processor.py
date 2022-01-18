import sqlite3
import pandas as pd
import os
import json


# Enter target antibiotics in full name in list
ANTIBIOTICS = ["penicillin", "chloramphenicol", "erythromycin", "co-trimoxazole", "tetracycline"]

# As the country names are not standardised in the database, enter target countries in tuples of '("Country Alpha-2 code", "value in 'Country' columns of the database")' in list
COUNTRIES = [('AR', 'ARGENTINA'), ('BR', 'BRAZIL'), ('IN','INDIA')]


def main():
    # Template of the data.json
    output = {
        "summary": {},
        "global": {},
        "country": {},
        "domainRange": {
            "serotype": {
                "domain": [],   
                "range": []
            },
            "lineage": {
                "domain": [],   
                "range": []
            }
        },
        "antibiotics": ANTIBIOTICS
    }

    # Ensure the script will read and write to the same dir it locates at
    base = os.path.dirname(os.path.abspath(__file__))

    # Read all tables of the database into dataframes
    dp_path = os.path.join(base, 'GPS1_database_v3.db')
    with sqlite3.connect(dp_path) as con:
        df_meta = pd.read_sql_query('SELECT * FROM table1_Metadata_v3', con)
        df_qc = pd.read_sql_query('SELECT * FROM table2_QC_v2', con)
        df_ana = pd.read_sql_query('SELECT * FROM table3_Analysis_v3', con)


    # Export result to data.json that can be uploaded to the web server
    outfile_path = dp_path = os.path.join(base, 'data.json')
    with open(outfile_path, 'w') as outfile:
        json.dump(output, outfile)


if __name__ == "__main__":
    main()