// Delay script until all elemenets are loaded to ensure SVG is loaded
window.onload = function(){
    let overlay = document.querySelector('#country-view-overlay');
    let modal = document.querySelector('#country-view-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#world-map').contentDocument;

    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // countries is a const in countries.js; All countries with available data
    // Add label and class to countires with available data
    countries.forEach(country => {
        let countryGroup = map.querySelector(`#${country}`);

        // Add label
        let bbox = countryGroup.getBBox(); 
        let x = Math.floor(bbox.x + bbox.width/2.0); 
        let y = Math.floor(bbox.y + bbox.height/2.0);

        let countryLabel = document.createElementNS("http://www.w3.org/2000/svg", 'text');
        countryLabel.setAttribute('x', x);
        countryLabel.setAttribute('y', y);
        countryLabel.setAttribute("text-anchor", "middle");
        countryLabel.classList.add("country-label");
        countryLabel.textContent = alpha2Country[country.toUpperCase()];
        countryGroup.parentNode.append(countryLabel)

        // Add label background
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
        labelBG.setAttribute("fill-opacity", "0.7");
        labelBG.classList.add("country-label");
        countryLabel.before(labelBG);

        // Highlight countries
        countryGroup.classList.add('data-available');
        let paths = countryGroup.querySelectorAll('path');
        if (paths.length > 0) {
            paths.forEach(p => p.classList.remove('landxx'));
        } else {
            
        }
        
    }) 

    // Show country view modal 
    function showModal(e) {
        let target = e.target;
        // #svg2985 means ocean target
        if (target.id != 'svg2985') {
            // different layer numbers for different countries, move target to parentNode until alpha-2 country code is found
            while (target.id.length != 2) {
                target = target.parentNode;
            }

            let selectedCountry = target.id;

            // Limit response to countries with available data
            if (countries.indexOf(selectedCountry) !== -1) {
                let countryViewTitle = document.querySelector('#country-view-title');

                // alpha2Country is a const in the alpha2.js
                countryViewTitle.innerHTML = `<h1>${alpha2Country[selectedCountry.toUpperCase()]}</h1>`;
                overlay.classList.remove('hidden');
                modal.classList.remove('hidden');
            }

        }
    }

    // Close country view modal
    function closeModal(e) { 
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
    }


}



