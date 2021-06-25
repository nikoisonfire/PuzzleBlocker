// Don't forget to import this wherever you use it
import browser from 'webextension-polyfill';
import optionsStorage from './options-storage.js';

optionsStorage.syncForm(document.querySelector('#options-form'));

// Reset to default on button click
document.getElementById("resetButton").addEventListener("click", () => {
	optionsStorage.setAll(optionsStorage.defaults).then(() => location.reload())
});
