async function updateBackground() {
	return browser.runtime.sendMessage("updated");
}

async function amIOn() {
	return browser.runtime.sendMessage("on?");
}

async function toggleBackground() {
	return browser.runtime.sendMessage("toggle");
}
