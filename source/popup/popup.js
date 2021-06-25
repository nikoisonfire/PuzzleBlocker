import browser from "webextension-polyfill";

document.getElementById("optionsBtn").addEventListener("click", () => {
	return browser.runtime.openOptionsPage();
})
document.getElementById("feedbackBtn").addEventListener("click", () => {
	return browser.tabs.create({
		active: true,
		url: "https://www.puzzleblocker.com/feedback.html"
	});
})
// what
