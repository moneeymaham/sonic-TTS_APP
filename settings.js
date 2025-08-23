// settings.js

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider-select');
  const apiKeyInput = document.getElementById('api-key-input');
  const settingsForm = document.getElementById('settings-form');
  const saveStatus = document.getElementById('save-status');

  // Load saved settings
  const savedProvider = localStorage.getItem('model-provider') || 'gemini';
  const savedApiKey = localStorage.getItem('api-key') || '';
  providerSelect.value = savedProvider;
  apiKeyInput.value = savedApiKey;

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('model-provider', providerSelect.value);
    localStorage.setItem('api-key', apiKeyInput.value.trim());
    saveStatus.textContent = 'Settings saved!';
    saveStatus.className = 'text-green-600';
    setTimeout(() => { saveStatus.textContent = ''; }, 2000);
  });
});
