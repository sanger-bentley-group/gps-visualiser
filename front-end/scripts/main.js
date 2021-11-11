window.onload = function(){
    let overlay = document.querySelector('.modal-overlay');
    let modal = document.querySelector('.modal-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#map').contentDocument;

    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    function showModal(e) {
        let target = e.target;
        // #svg2985 means ocean target
        if (target.id != 'svg2985') {
            // different layer numbers for different countries, move target to parentNode until alpha-2 country code is found
            while (target.id.length != 2) {
                target = target.parentNode;
            }

            let country = target.id;
            let countryViewTitle = document.querySelector('#country-view-title')

            // alpha2Country is loaded by HTML as a const in a separated alpha2.js
            countryViewTitle.innerHTML = `<h1>${alpha2Country[country.toUpperCase()]}</h1>`
            overlay.classList.remove('modal-hidden');
            modal.classList.remove('modal-hidden');

            /* 
            Alternative code to load alpha2 using fetch with alpha2.json

            fetch('./data/alpha2.json')
                .then(res => res.json())
                .then(alpha2 => {
                    countryViewTitle.innerHTML = `<h1>${alpha2[country.toUpperCase()]}</h1>`;
                    overlay.classList.remove('modal-hidden');
                    modal.classList.remove('modal-hidden');                
                })
            */
        }
    }

    function closeModal(e) { 
        overlay.classList.add('modal-hidden');
        modal.classList.add('modal-hidden');
    }


}



