// eslint-disable-next-line import/no-unassigned-import
import optionsStorage from './options/options-storage.js';
import browser from 'webextension-polyfill';
import cache from 'webext-storage-cache';

let difficulty;

async function main(details) {
	const options = await optionsStorage.getAll();

	if(options.enabled) {
		const blacklistArray = options.blacklist.split("\n").filter(
			el => el !== ""
		);

		const currentURL = details.url;
		const currentTab = details.tabId;

		const blockEmbedded = options.embedded ? true : details.frameId === 0;

		/**
		 * [
		 * 	{
		 * 		tabId: 1,
		 * 		url: "facebook.com"
		 * 	}
		 * ]
		 */

		const tabCache = await cache.get(currentTab);

			/**
			 * 1. Check if URL matches
			 * 2. Check if URL is not embedded (iFrame)
			 */
			if (urlContains(currentURL, blacklistArray)
				&& blockEmbedded) {
				// Match on blacklist

				// Check if tabCache exists
				if(tabCache === undefined) {
					const newCache = await cache.set(currentTab, currentURL, {
						minutes: parseInt(options.cacheTime)
					});
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

async function unblockSite(tabId) {

	const redirect = await cache.get(tabId);

	await cache.set(tabId, "");

	browser.tabs.update(tabId, {"url": redirect})
}

async function removeTabFromCache(tabId) {
	await cache.delete(tabId);
}

function urlContains(url, keywords){
	var result = false;

	keywords.forEach(n => {
		if(url.includes(n)) {
			result = true;
		}
	})

	return result;
}
// long days = (millis / (60*60*24*1000))

async function showGetStarted(details) {
	const now = new Date(Date.now());
	if(details.reason === "install") {
		await optionsStorage.set({installDate: now.toString()})
		browser.tabs.create(
			{
				active: true,
				url: "https://www.puzzleblocker.com/get-started.html"
			}
		)
	}
}


// Clear the tab from cache once the tab is closed
browser.tabs.onRemoved.addListener(removeTabFromCache)

// Listen to unblocking from redirect.js
browser.runtime.onMessage.addListener(unblockSite);

// Main Loop
browser.webNavigation.onCommitted.addListener(main);

// Show get started upon install
browser.runtime.onInstalled.addListener(showGetStarted);

// Show uninstall url
browser.runtime.setUninstallURL("https://www.puzzleblocker.com/uninstall.html");
