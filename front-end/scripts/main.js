// 'countries' is a const from countries.js exported by backend, contains alpha-2 codes of all countries with available data
// 'alpha2Country' is a const in the alpha2.js, provides conversion from alpha-2 code to country name
// 'countryAlpha2' is a generated const in the alpha2.js based on alpha2Country, provides conversion from country name to alpha-2 code

// Delay script until all elemenets are loaded to ensure SVG is loaded
window.onload = function(){
    let overlay = document.querySelector('#country-view-overlay');
    let modal = document.querySelector('#country-view-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#world-map').contentDocument;
    let countrySelector = document.querySelector('#country-selector');


    // Initialise array to save state of country selection 
    let countrySelection = countries.sort();


    // Add label and class to countires with available data
    countries.forEach(country => {
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
        flagDiv.setAttribute('tooltip', `${alpha2Country[country]}`); // Custom arrtibute for tooltip support
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

            // Tmp code for testing
            document.querySelector('#tmp-output').innerHTML = countrySelection;
        })

        // addEventListener to highlight country in map when hovering its flag
        cbDiv.addEventListener('mouseover', hoverFlag);
        cbDiv.addEventListener('mouseout', unhoverFlag);
    }) 


    // Functions for hovering flag to highlight country in map
    function hoverFlag(e) {
        let selectedCountry = e.target.childNodes[0].id.slice(0, 2);
        map.querySelector(`#${selectedCountry}`).classList.add('country-label-active')
        map.querySelector(`#${selectedCountry}-label-group`).classList.add('country-label-active');
        map.querySelector(`#${selectedCountry}-label-group`).firstChild.classList.add('country-label-bg-active');
    }

    function unhoverFlag(e) {
        let selectedCountry = e.target.childNodes[0].id.slice(0, 2);
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
        })

        // Tmp code for testing
        document.querySelector('#tmp-output').innerHTML = countrySelection;
    })

    document.querySelector('#sidebar-deselect-all').addEventListener('click', () => {
        countrySelection = [];

        let flagCBs = document.querySelectorAll('.flag-cb');
        flagCBs.forEach(flagCB => {
            flagCB.checked = false;
        })

        // Tmp code for testing
        document.querySelector('#tmp-output').innerHTML = countrySelection;
    })

    
    // Show and close country view modal 
    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    function showModal(e) {
        let selectedCountry = getCountry(e.target);

        // Limit response to countries with available data
        if (countries.indexOf(selectedCountry) !== -1) {
            let countryViewTitle = document.querySelector('#country-view-title');
            countryViewTitle.innerHTML = `<h1>${alpha2Country[selectedCountry]}</h1>`;
            overlay.classList.remove('hidden');
            modal.classList.remove('hidden');
        }
    }

    function closeModal() { 
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }


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
