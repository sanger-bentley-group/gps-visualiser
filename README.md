# GPS Visualiser

Summarisation of the findings in [Global Pneumococcal Sequencing Project](https://www.pneumogen.net/gps/) (GPS) country-specific analysis papers in a visual format.

This summarisation effort is composed of a Python script and a website.

&nbsp;
## Python Script
The Python script `processor.py` in the `data` subdirectory extracts and processes data from the GPS database (not publicised) and export a JSON file `data.json` to be taken up by the website.

The script has one global dictionary and two global lists that can be modified.
- `TABLE_NAMES`: The value of each key can be changed to match the tables in the GPS database.
- `ANTIBIOTICS`: It should contain full names of **FIVE** target antibiotics.
- `COUNTRIES`: It should contain tuples of `("Country Alpha-2 Code", "Value in 'Country' Columns of the Database", "Link to research article")` of the countries that should be included in `data.json`. The tuple requirement is due to the country names not being standardised in the database, and links to papers are not included in the database. If the paper is not yet available, put the "Link to research article" as an empty string `""`.

To generate the `data.json`,  put the database in the same directory as the script and run the following command (change `database.db` to the file name of the database):
```
python processor.py database.db
```

&nbsp;
## Website
The website takes the JSON file `data.json`in the `data` subdirectory and renders the charts in both global and pre-country views on the fly. The website utilises HTML5, JavaScript (vanilla JavaScript with [D3.js](https://d3js.org/) for chart rendering) to run fully on the client-side. This website has a responsive web design using a mixture of CSS Flexbox and Media Query, but is not yet optimised for mobile devices.

&nbsp;
## Requirements & Compatibility
Python script requirements:
- [Python](https://www.python.org/) 3.10
- [Pandas](https://pandas.pydata.org/) 1.4.0

Website tested on:
- Firefox 101
- Chrome 102
- Safari 15

GPS Database requirement:
- v3.3

&nbsp;
## Live Website
The live website is available at https://www.pneumogen.net/gps/gps-visualiser/. It might not be based on the latest code at all time. 

&nbsp;
## Credits
This project uses Open Source components. You can find the source code of their open source projects along with license information below. I acknowledge and am grateful to these developers for their contributions to open source.

[**Country Flags in SVG**](https://flagicons.lipis.dev/)
- Copyright (c) 2013 Panayiotis Lipiridis
- License (MIT): https://github.com/lipis/flag-icons/blob/main/LICENSE

[**D3.js**](https://d3js.org/)
- Copyright 2010-2021 Mike Bostock
- License (ISC): https://github.com/d3/d3/blob/main/LICENSE

[**Pandas**](https://pandas.pydata.org/)
- Copyright (c) 2008-2011, AQR Capital Management, LLC, Lambda Foundry, Inc. and PyData Development Team. All rights reserved.
- Copyright (c) 2011-2022, Open source contributors.
- License (BSD-3-Clause): https://github.com/pandas-dev/pandas/blob/main/LICENSE

[**Sequences Icicle**](https://observablehq.com/@kerryrodden/sequences-icicle)
- Copyright 2020 Kerry Rodden
- License (Apache 2.0): https://observablehq.com/@kerryrodden/sequences-icicle

[**Sequences Sunburst**](https://observablehq.com/@kerryrodden/sequences-sunburst)
- Copyright 2020 Kerry Rodden
- License (Apache 2.0): https://observablehq.com/@kerryrodden/sequences-sunburst

[**SVG World Map JS**](https://github.com/raphaellepuschitz/SVG-World-Map)
- Copyright (c) Raphael Lepuschitz
- License (MIT): https://github.com/raphaellepuschitz/SVG-World-Map/blob/master/LICENSE.md