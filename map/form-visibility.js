// form-visibility.js

(function(){
  const editForm  = document.getElementById('editForm');
  const saveBtn   = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelEdit');
  
  // Если элементы не найдены - выходим
  if (!editForm || !saveBtn || !cancelBtn) {
    console.warn('form-visibility.js: Не найдены элементы editForm, saveBtn или cancelEdit');
    return;
  }
  
  const obs = new MutationObserver(() => {
    const show = editForm.style.display !== 'none';
    saveBtn.style.display   = show ? '' : 'none';
    cancelBtn.style.display = show ? '' : 'none';
  });
  
  obs.observe(editForm, { attributes: true, attributeFilter: ['style'] });
})();
