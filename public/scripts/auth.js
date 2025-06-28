// Toggle password visibility
const pwInput = document.getElementById('password');
const toggle = document.getElementById('togglePass');
toggle.addEventListener('click', () => {
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  toggle.textContent = pwInput.type === 'password' ? 'Show' : 'Hide';
});

// Caps Lock alert
const capsAlert = document.getElementById('capsAlert');
pwInput.addEventListener('keydown', e => {
  if (e.getModifierState && e.getModifierState('CapsLock')) capsAlert.hidden = false;
});
pwInput.addEventListener('keyup', e => {
  if (!e.getModifierState || !e.getModifierState('CapsLock')) capsAlert.hidden = true;
});
