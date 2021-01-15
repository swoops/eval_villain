function listener(ev) {
	let id = ev.target.id;
	if (id == "config" ) {
		let confUrl = browser.runtime.getURL("/pages/config/config.html");
		browser.tabs.create({url:confUrl});
		return;
	}
}
document.addEventListener("click", listener);
