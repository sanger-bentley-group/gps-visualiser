// Delay script until all elemenets are loaded to ensure SVG is loaded
window.onload = function(){
    let overlay = document.querySelector('#country-view-overlay');
    let modal = document.querySelector('#country-view-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#world-map').contentDocument;
    let countrySelector = document.querySelector('#country-selector');

    // Add label and class to countires with available data
    // 'countries' is a const from countries.js exported by backend, contains alpha-2 codes of all countries with available data
    countries.forEach(country => {
        let countryGroup = map.querySelector(`#${country}`);

        // Highlight country
        countryGroup.classList.add('country-label');

        // Add label group, enable the label and move it into the label group
        let countryLabel = map.querySelector(`#${country}-label`);
        let labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        labelGroup.setAttribute('id', `${country}-label-group`)
        labelGroup.classList.add('country-label');
        countryLabel.before(labelGroup);
        countryLabel.style.display = 'block'
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
        let flagElement = document.createElement("object")
        flagElement.setAttribute('id', `${country}-flag`)
        flagElement.setAttribute('class', 'flag')
        flagElement.setAttribute('type', 'image/svg+xml')
        flagElement.setAttribute('data', `images/flags/${country}.svg`)
        countrySelector.appendChild(flagElement)
        
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

            // alpha2Country is a const in the alpha2.js
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
        if (target.tagName.toLowerCase() == 'svg') {
            return;
        }

        // Move target to parentNode until it is just below svg (for path) or #labels (for label)
        while (target.parentNode.tagName.toLowerCase() != 'svg' && target.parentNode.id.toLowerCase() != 'labels') {
            target = target.parentNode; 
        }

        return target.id.slice(0, 2);
    }

}



