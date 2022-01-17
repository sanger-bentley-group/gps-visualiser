import sqlite3
import pandas as pd
import os.path

base = os.path.dirname(os.path.abspath(__file__))
dp_path = os.path.join(base, 'GPS1_database_v3.db')

with sqlite3.connect(dp_path) as con:
    df = pd.read_sql_query('SELECT * FROM table3_Analysis_v3 WHERE duplicate="UNIQUE"', con)
    print(df.describe())