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

            overlay.classList.remove('modal-hidden');
            modal.classList.remove('modal-hidden');
            // temporary output for alpha-2 country code
            console.log(country);
        }
    }

    function closeModal(e) { 
        overlay.classList.add('modal-hidden');
        modal.classList.add('modal-hidden');
    }


}



