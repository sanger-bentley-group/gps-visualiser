# GPS Visualiser

Summarisation of the findings in [Global Pneumococcal Sequencing Project](https://www.pneumogen.net/gps/) (GPS) country-specific analysis papers in a visual format.

This summarisation effort is composed of a back-end Python script and a front-end website.

&nbsp;
## Back-end Python Script
The Python script `processor.py` extracts and processes data from the GPS database (not publicised) and export a JSON file `data.json` to be taken up by the front-end website.

The script has two global lists that can be modified.
- `ANTIBIOTICS`: It should contain full names of **FIVE** target antibiotics.
- `COUNTRIES`: It should contain tuples of `("Country Alpha-2 Code", "Value in 'Country' Columns of the Database")` of the countries  that should be included in `data.json`. The tuple requirement is due to the country names not being standardised in the database.

To generate the `data.json`,  put the database in the same directory/folder as the script and run the following command (change `database.db` to the file name of the database):
```
python processor.py database.db
```


&nbsp;
## Front-end Website
The website takes the JSON file `data.json` and renders the charts in both global and pre-country views on the fly. The website utilises HTML5, JavaScript (vanilla JavaScript with D3.js for chart rendering) to run fully on the client-side. This website has a responsive web design using a mixture of CSS Flexbox and Media Query, but is not yet optimised for mobile devices.

&nbsp;
## Requirements & Compatibility
Back-end Python script requirements:
- Python 3.10
- Pandas 1.4.0

Front-end website tested on:
- Firefox 96
- Chrome 97
