// menu.js  

const menuToggle = document.getElementById('menuToggle');
const menuPanel = document.getElementById('menuPanel');

// НАЖИМАЕМ КНОПКУ - МЕНЮ ОТКРЫВАЕТСЯ/ЗАКРЫВАЕТСЯ
menuToggle.addEventListener('click', () => {
    menuPanel.classList.toggle('open');
    
    // Меняем значок кнопки
    menuToggle.textContent = menuPanel.classList.contains('open') ? '✕' : '☰';
});

// ЗАКРЫВАЕМ МЕНЮ ТОЛЬКО ПО КЛИКУ НА БУРГЕР (или снаружи меню)
document.querySelector('.map-container').addEventListener('click', (e) => {
    // Если клик БЫЛ ВНУТРИ МЕНЮ - не закрываем!
    if (e.target.closest('.menu-panel')) {
        return;
    }
    
    // Если клик на бургер кнопку - переключаем меню
    if (e.target === menuToggle || e.target.closest('.menu-toggle')) {
        return;
    }
    
    // Если клик был СНАРУЖИ меню - закрываем его
    if (menuPanel.classList.contains('open')) {
        menuPanel.classList.remove('open');
        menuToggle.textContent = '☰';
    }
});
