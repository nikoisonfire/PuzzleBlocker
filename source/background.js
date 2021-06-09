// eslint-disable-next-line import/no-unassigned-import
import optionsStorage from './options-storage.js';
import browser from 'webextension-polyfill';
import cache from 'webext-storage-cache';

let currentBlocked = "";
let currentTab;

async function main(details) {

	const options = await optionsStorage.getAll();

	if(options.enabled) {
		const blacklistArray = options.blacklist.split("\n");
		console.log(
			blacklistArray
		);

		const currentURL = details.url;
		const currentTab = details.tabId;

		/**
		 * [
		 * 	{
		 * 		tabId: 1,
		 * 		url: "facebook.com"
		 * 	}
		 * ]
		 */

		const tabCache = await cache.get(currentTab);
		console.log("cache:", tabCache)

			/**
			 * 1. Check if URL matches
			 * 2. Check if URL is not embedded (iFrame)
			 */
			if (urlContains(currentURL, blacklistArray)
				&& details.frameId === 0) {
				// Match on blacklist

				// Check if tabCache exists
				if(tabCache === undefined) {
					const newCache = await cache.set(currentTab, currentURL, {
						minutes: 30
					});
					console.log("Set in cache:", newCache)
				}
				else if (tabCache === "") {
					return;
				}
				browser.tabs.update(currentTab, {"url": "./redirect.html"})
			}
			else {
				// No match on blacklist, don't do anything

			}
	}
}

async function unblockSite(tabId, sender, sendResponse) {
	console.log("tabId: ", tabId);

	const redirect = await cache.get(tabId);

	await cache.set(tabId, "");

	browser.tabs.update(tabId, {"url": redirect})
}

async function isUnblocked() {
	const options = await optionsStorage.getAll();


}

async function removeTabFromCache(tabId) {
	await cache.delete(tabId);
}

function findURLinCache(cacheArray, url) {
	return cacheArray.length === 0 ? false : cacheArray.filter(obj => obj.url === url).length > 0;

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


browser.tabs.onRemoved.addListener(removeTabFromCache)

browser.runtime.onMessage.addListener(unblockSite);

browser.webNavigation.onCommitted.addListener(main);
