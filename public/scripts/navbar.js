// public/scripts/navbar.js

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const closeMenuBtn = document.getElementById('closeMenu');
    const sideMenu = document.getElementById('mySideMenu');

    if (menuToggle && sideMenu && closeMenuBtn) {
        menuToggle.addEventListener('click', () => {
            sideMenu.style.width = '250px'; // Open the sidebar
        });

        closeMenuBtn.addEventListener('click', () => {
            sideMenu.style.width = '0'; // Close the sidebar
        });

        // Close menu if a link inside it is clicked (optional, but good UX)
        sideMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sideMenu.style.width = '0';
            });
        });
    }
});