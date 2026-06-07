const menuToggle = document.getElementById('menuToggle');
const menuPanel = document.getElementById('menuPanel');

menuToggle.addEventListener('click', () => {
    menuPanel.classList.toggle('open');
    menuToggle.textContent = menuPanel.classList.contains('open') ? '✕' : '☰';
});

document.querySelector('.map-container').addEventListener('click', (e) => {
    if (e.target !== menuToggle && menuPanel.classList.contains('open')) {
        menuPanel.classList.remove('open');
        menuToggle.textContent = '☰';
    }
});
