// marker-preview.js
// Автосмещение превью и тултипа маркеров у краёв экрана

document.addEventListener("mouseover", e => {
  const marker = e.target.closest(".marker");
  if (!marker) return;

  const preview = marker.querySelector(".marker-preview");
  const tooltip = marker.querySelector(".marker-tooltip");
  if (!preview && !tooltip) return;

  const rect = marker.getBoundingClientRect();
  const vw   = window.innerWidth;

  if (preview) {
    const pw    = 300;
    const center = rect.left + rect.width / 2;
    let   left   = center - pw / 2;
    if (left < 8)           left = 8;
    if (left + pw > vw - 8) left = vw - pw - 8;
    const shift = left - center + pw / 2;
    preview.style.left      = `calc(50% + ${shift}px)`;
    preview.style.transform = `translateX(-50%) translateY(0)`;
  }

  if (tooltip) {
    const tw     = 180;
    const center = rect.left + rect.width / 2;
    let   shift  = 0;
    if (center - tw/2 < 8)       shift =  8 - (center - tw/2);
    if (center + tw/2 > vw - 8)  shift = (vw - 8) - (center + tw/2);
    tooltip.style.transform = `translateX(calc(-50% + ${shift}px)) translateY(2px)`;
  }
});

document.addEventListener("mouseout", e => {
  const marker = e.target.closest(".marker");
  if (!marker) return;
  const preview = marker.querySelector(".marker-preview");
  const tooltip = marker.querySelector(".marker-tooltip");
  if (preview) { preview.style.left = ""; preview.style.transform = ""; }
  if (tooltip) { tooltip.style.transform = ""; }
});
