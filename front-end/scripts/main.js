// 'summary.json' is exported by backend, provide summary for all countries with available data
// 'alpha2.json' provides conversion from alpha-2 code to country name

// Delay main function until the world-map.svg is loaded
const mapObject = document.querySelector('#world-map');
mapObject.onload = main();

async function main() {
    const map = mapObject.contentDocument;
    const summary = await (await fetch('data/summary.json')).json();
    const alpha2 = await (await fetch('data/alpha2.json')).json();

    const overlay = document.querySelector('#country-view-overlay');
    const modal = document.querySelector('#country-view-wrapper');
    const closeBtn = document.querySelector('#close-btn');
    const countrySelector = document.querySelector('#country-selector');

    // Initialise array to save state of country selection 
    const countries = Object.keys(summary).sort();
    let countrySelection = countries;


    // Add label and class to countires with available data
    countrySelection.forEach(country => {
        let countryGroup = map.querySelector(`#${country}`);

        // Highlight country
        countryGroup.classList.add('country-label');

        // Add label group, enable the label and move it into the label group
        let countryLabel = map.querySelector(`#${country}-label`);
        let labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        labelGroup.id = `${country}-label-group`;
        labelGroup.classList.add('country-label');
        countryLabel.before(labelGroup);
        countryLabel.style.display = 'block';
        labelGroup.append(countryLabel);

        // Add label background and move it into the label group
        textbbox = countryLabel.getBBox();
        let labelBG = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        let padding = 20;
        labelBG.setAttribute("x", textbbox.x - padding / 2);
        labelBG.setAttribute("y", textbbox.y - padding / 2);
        labelBG.setAttribute("rx", 10);
        labelBG.setAttribute("ry", 10);
        labelBG.setAttribute("width", textbbox.width + padding);
        labelBG.setAttribute("height", textbbox.height + padding);
        labelBG.setAttribute("fill", "white");
        labelBG.classList.add('country-label-bg');
        countryLabel.before(labelBG);

        // Fill country-selector with flags based on countries.js
        // Flags from https://flagicons.lipis.dev/
        let flagElement = document.createElement('object');
        flagElement.id = `${country}-flag`;
        flagElement.classList.add('flag');
        flagElement.type = 'image/svg+xml';
        flagElement.data = `images/flags/${country}.svg`;

        let flagName = document.createTextNode(`${country}`);

        let flagDiv = document.createElement('div');
        flagDiv.setAttribute('tooltip', `${alpha2[country]}`); // Custom attribute for tooltip support
        flagDiv.appendChild(flagElement);
        flagDiv.appendChild(flagName);

        let flagLabel = document.createElement('label');
        flagLabel.classList.add('flag-group');
        flagLabel.setAttribute('for', `${country.toLowerCase()}-cb`);
        flagLabel.append(flagDiv);

        let flagInput = document.createElement('input');
        flagInput.type = 'checkbox';
        flagInput.classList.add('flag-cb');
        flagInput.checked = true;
        flagInput.id = `${country.toLowerCase()}-cb`;
        flagInput.name = `${country.toLowerCase()}-cb`;
        flagInput.value = `${country}`;
        
        let cbDiv = document.createElement('div');
        cbDiv.appendChild(flagInput);
        cbDiv.appendChild(flagLabel);

        countrySelector.appendChild(cbDiv);

        // addEventListener to update countrySelection when checked/unchecked
        flagInput.addEventListener('change', (e) => {
            if (e.target.checked) {
                countrySelection.push(e.target.value);
                countrySelection.sort();
            } else {
                countrySelection = countrySelection.filter(item => item !== e.target.value);
            }

            updateCountrySelection();
        });

        // addEventListener to highlight country in map when hovering its flag
        cbDiv.addEventListener('mouseover', hoverFlag);
        cbDiv.addEventListener('mouseout', unhoverFlag);
    });


    // Functions for hovering flag to highlight country in map
    function hoverFlag(e) {
        let selectedCountry = e.target.childNodes[0].id.slice(0, 2).toUpperCase();
        map.querySelector(`#${selectedCountry}`).classList.add('country-label-active')
        map.querySelector(`#${selectedCountry}-label-group`).classList.add('country-label-active');
        map.querySelector(`#${selectedCountry}-label-group`).firstChild.classList.add('country-label-bg-active');
    }

    function unhoverFlag(e) {
        let selectedCountry = e.target.childNodes[0].id.slice(0, 2).toUpperCase();
        map.querySelector(`#${selectedCountry}`).classList.remove('country-label-active')
        map.querySelector(`#${selectedCountry}-label-group`).classList.remove('country-label-active');
        map.querySelector(`#${selectedCountry}-label-group`).firstChild.classList.remove('country-label-bg-active');
    }


    // addEventListener for select all and deselect all buttons
    document.querySelector('#sidebar-select-all').addEventListener('click', () => {
        countrySelection = countries;
        
        let flagCBs = document.querySelectorAll('.flag-cb');
        flagCBs.forEach(flagCB => {
            flagCB.checked = true;
        });

        updateCountrySelection();
    });

    document.querySelector('#sidebar-deselect-all').addEventListener('click', () => {
        countrySelection = [];

        let flagCBs = document.querySelectorAll('.flag-cb');
        flagCBs.forEach(flagCB => {
            flagCB.checked = false;
        });

        updateCountrySelection();
    });


    // Draw the icicle charts for both disease and carriage type for all countires with available data 
    // function icicle in icicle.js
    icicle(countries)

    // Update global view charts based on current countrySelection
    // TMP code only, WIP
    // updateCountrySelection();

    function updateCountrySelection() {
        if (countrySelection.length !== 0) {
            document.querySelector('#tmp-aside-country').innerHTML = countrySelection;
        } else {
            document.querySelector('#tmp-aside-country').innerHTML = 'NONE';
        }
        
    }


    // addEventListener to global view type selector
    // Update global view charts based on current type selector
    // TMP code only, WIP
    document.querySelectorAll('input[name="aside-type"]').forEach(input => {
        input.addEventListener('change', (e) => {
            document.querySelector('#tmp-aside-type').innerHTML = e.target.value;
        });
    });
    
    
    // Show and close country view modal 
    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    function showModal(e) {
        let selectedCountry = getCountry(e.target);

        // Limit response to countries with available data
        if (countries.indexOf(selectedCountry) !== -1) {
            let countryViewTitle = document.querySelector('#country-view-title');
            countryViewTitle.innerHTML = `<h1>${alpha2[selectedCountry]}</h1>`;
            overlay.classList.remove('removed');
            modal.classList.remove('removed');
        }
    }

    function closeModal() { 
        overlay.classList.add('removed');
        modal.classList.add('removed');
    }


    // addEventListener to country view age and type selectors
    // Update country view charts based on current selectors
    // TMP code only, WIP
    document.querySelectorAll('input[name="country-view-age"]').forEach(input => {
        input.addEventListener('change', (e) => {
            document.querySelectorAll('.tmp-modal-age').forEach(output => {
                output.innerHTML = e.target.value;
            });
        });
    });

    document.querySelectorAll('input[name="country-view-type"]').forEach(input => {
        input.addEventListener('change', (e) => {
            document.querySelectorAll('.tmp-modal-type').forEach(output => {
                output.innerHTML = e.target.value;
            });
        });
    });


    // addEventListener to country view data selector
    // Change div visibility charts based on current selector
    // TMP code only, WIP
    document.querySelectorAll('input[name="country-view-data"]').forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.value === 'serotype') {
                document.querySelector('#country-view-serotype').classList.remove('removed')
                document.querySelector('#country-view-antibiotic').classList.add('removed')
                document.querySelector('#country-view-type-toggle').classList.remove('hidden')
            } else if (e.target.value === 'antibiotic') {
                document.querySelector('#country-view-serotype').classList.add('removed')
                document.querySelector('#country-view-antibiotic').classList.remove('removed')
                document.querySelector('#country-view-type-toggle').classList.add('hidden')
            }
        });
    });


    // Sync the animation between path and label
    map.addEventListener('mouseover', hoverLink);
    map.addEventListener('mouseout', unhoverLink);

    function hoverLink(e) {
        let selectedCountry = getCountry(e.target);

        if (countries.indexOf(selectedCountry) !== -1) {
            map.querySelector(`#${selectedCountry}`).classList.add('country-label-active');
            map.querySelector(`#${selectedCountry}-label-group`).classList.add('country-label-active');
            map.querySelector(`#${selectedCountry}-label-group`).firstChild.classList.add('country-label-bg-active');
        }
            
    }

    function unhoverLink(e) {
        let selectedCountry = getCountry(e.target);

        if (countries.indexOf(selectedCountry) !== -1) {
            map.querySelector(`#${selectedCountry}`).classList.remove('country-label-active');
            map.querySelector(`#${selectedCountry}-label-group`).classList.remove('country-label-active');
            map.querySelector(`#${selectedCountry}-label-group`).firstChild.classList.remove('country-label-bg-active');
        }
            
    }


    // Helper function, get country from event target
    function getCountry(target) {
        if (target.tagName.toLowerCase() === 'svg') {
            return;
        }

        // Move target to parentNode until it is just below svg (for path) or #labels (for label)
        while (target.parentNode.tagName.toLowerCase() !== 'svg' && target.parentNode.id.toLowerCase() !== 'labels') {
            target = target.parentNode; 
        }

        return target.id.slice(0, 2);
    }

}
