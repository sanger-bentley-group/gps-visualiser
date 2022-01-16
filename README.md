# GPS Visualiser - Work in Progress
Summarisation of the findings in [Global Pneumococcal Sequencing Project](https://www.pneumogen.net/gps/) (GPS) country-specific analysis papers in a visual format.

This summarisation effort is composed of a Python script and a website. 

The Python script extracts and analysis data from the GPS database (not publicised) and export a JSON file to be taken up by the website. 

The website takes the JSON file and renders the charts in both global and pre-country views on the fly. The website utilises HTML5, JavaScript (vanilla JavaScript with D3.js for charts rendering). This website has a responsive web design, but it is not yet optimised for mobile devices. 
