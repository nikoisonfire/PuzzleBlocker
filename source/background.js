// eslint-disable-next-line import/no-unassigned-import
import optionsStorage from './options-storage.js';
import browser from 'webextension-polyfill';

let currentBlocked = "";
let currentTab;

async function main(details) {

	const options = await optionsStorage.getAll();

	if(options.enabled) {
		const blacklistArray = options.blacklist.split("\n");
		console.log(
			blacklistArray
		);

		if(urlContains(details.url, blacklistArray) && details.url !== currentBlocked) {

			currentBlocked = details.url;
			currentTab = details.tabId;
			browser.tabs.update(currentTab, {"url": "./redirect.html"})

		}
	}
}

async function unblockSite(request, sender, sendResponse) {
	const options = await optionsStorage.getAll();

	console.log("cb:"+currentBlocked);

	browser.tabs.update(currentTab, {"url": currentBlocked})
}

async function isUnblocked() {
	const options = await optionsStorage.getAll();

}

function urlContains(url, keywords){
	var result = false;
	console.log("Checking url: "+url)

	keywords.forEach(n => {
		console.log("Keyword: "+n+" - match: "+url.includes(n))
		if(url.includes(n)) {
			result = true;
		}
	})

	return result;
}

browser.runtime.onMessage.addListener(unblockSite);

browser.webNavigation.onCommitted.addListener(main);
