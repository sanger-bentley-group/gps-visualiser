window.onload = function(){
    let overlay = document.querySelector('.modal-overlay');
    let modal = document.querySelector('.modal-wrapper');
    let closeBtn = document.querySelector('#close-btn');
    let map = document.querySelector('#map').contentDocument;

    map.addEventListener('click', showModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    function showModal(e) { 
        if (e.target.classList.contains("landxx")) {
            overlay.classList.remove('modal-hidden');
            modal.classList.remove('modal-hidden');
        }
    }

    function closeModal(e) { 
        overlay.classList.add('modal-hidden');
        modal.classList.add('modal-hidden');
    }


}



