// Keypad only builds the expression text; the actual calculation happens in Django.
const display = document.getElementById('display');

document.querySelectorAll('.keys button[type="button"]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (btn.dataset.action === 'clear') {
      display.value = '';
    } else if (btn.dataset.action === 'back') {
      display.value = display.value.slice(0, -1);
    } else {
      display.value += btn.dataset.key;
    }
    display.focus();
  });
});

// Clicking a history item puts its result back on the display
document.querySelectorAll('.history li').forEach(function (item) {
  item.addEventListener('click', function () {
    display.value = item.dataset.result;
    display.focus();
  });
});

// Escape clears the display (Enter already submits the form)
display.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') display.value = '';
});
