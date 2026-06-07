// menu.js

const menuToggle = document.getElementById('menuToggle');
const menuPanel = document.getElementById('menuPanel');

// НАЖИМАЕМ КНОПКУ - МЕНЮ ОТКРЫВАЕТСЯ/ЗАКРЫВАЕТСЯ
menuToggle.addEventListener('click', () => {
    menuPanel.classList.toggle('open');
    
    // Меняем значок кнопки
    menuToggle.textContent = menuPanel.classList.contains('open') ? '✕' : '☰';
});

// ЗАКРЫВАЕМ МЕНЮ ЕСЛИ НАЖАЛИ НА КАРТУ
document.querySelector('.map-container').addEventListener('click', (e) => {
    if (e.target !== menuToggle && menuPanel.classList.contains('open')) {
        menuPanel.classList.remove('open');
        menuToggle.textContent = '☰';
    }
});
