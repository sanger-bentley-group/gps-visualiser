window.onload = function(){
    let overlay = document.querySelector('.modal-overlay');
    let modal = document.querySelector('.modal-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#map').contentDocument;

    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // world-map.svg structure is different for some countries, therefore needing two checks. != #svg2985 to avoid ocean target
    function showModal(e) {
        let land = false;
        if (e.target.classList.contains("landxx")) {
            land = true;
        } else if (e.target['id'] != 'svg2985' && e.target.parentNode && e.target.parentNode.classList.contains("landxx")) {
            land = true;
        }

        if (land) {
            overlay.classList.remove('modal-hidden');
            modal.classList.remove('modal-hidden');
        }
    }

    function closeModal(e) { 
        overlay.classList.add('modal-hidden');
        modal.classList.add('modal-hidden');
    }


}



