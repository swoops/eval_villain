var configList = ["targets", "needles", "blacklist", "functions", "autoOpen", "onOff", "types"];
function updateToggle(on) {
	if (typeof(on) !== "boolean") {
		console.error("unexpected message type");
		return;
	}
	let d = document.getElementById("toggle");
	d.checked = on;

	d = document.getElementById("toggle-label");
	d.innerText = "Villain is " + (on ? "ON" : "OFF");
}

async function update_if_on() {
	const on = await amIOn();
	update_if_on(on);
}

function createCheckBox(name, checked, subMenu) {
	var d = document;
	var li = d.createElement("li");
	li.className = "toggle";

	// first child of li
	var label = d.createElement("label");
	label.className = "switch";

	// first child of label
	var input = d.createElement("input");
	input.type = "checkbox";
	input.name = subMenu;
	input.value = name;
	input.checked = checked;
	input.id = name;
	label.appendChild(input);

	// second child of label
	let div = d.createElement("div");
	div.className = "slider";
	label.appendChild(div);
	li.appendChild(label);

	// second child of li
	var span = d.createElement("span");
	span.className = "label";
	span.innerText = name;

	li.appendChild(span);
	return li;
}

function getSections() {
	let ret =  browser.storage.local.get(["targets", "needles", "blacklist", "functions", "types", "formats"]);
	return ret.then(all => {
		let autoOpen = [];
		let onOff = [];
		for (let k of all.formats) {
			autoOpen.push({
				name: k.pretty,
				pattern: k.name,
				enabled: k.open,
			});
			onOff.push({
				name: k.pretty,
				pattern: k.name,
				enabled: k.use,
			});
		}
		all.autoOpen = autoOpen;
		all.onOff = onOff;
		delete all.formats;
		return all;
	});
}

async function populateSubMenus() {
	const res = await getSections();
	for (let sub of configList) {
		if (!res[sub]) {
			console.error("Could not get: " + sub);
		}

		var where = document.getElementById(`${sub}-sub`);
		for (let itr of res[sub]) {
			if (typeof(itr.enabled) === 'boolean') {
				const inpt = createCheckBox(itr.name, itr.enabled, sub);
				where.appendChild(inpt);
			}
		}

		if (res[sub].length == 0) {
			const em = document.createElement("em");
			em.innerText = "Nothing Configured";
			em.className = "configure";
			em.onclick = () => goToConfig();
			where.appendChild(em);
		}
	}
}

async function updateSubmenu(target) {
	let name = target.name;
	function update(res) {
		var chg = "enabled";
		var ident = "name";

		if (target.name === "autoOpen") {
			chg = "open";
			ident = "pretty";
		} else if (target.name === "onOff") {
			chg = "use";
			ident = "pretty";
		}

		for (let k of res[name]) {
			if (k[ident] === target.id) {
				if (typeof(k[chg]) === 'boolean') {
					k[chg] = target.checked;
				}
				break;
			}
		}

		return browser.storage.local.set(res);
	}

	if (["autoOpen", "onOff"].includes(name)) {
		name = "formats";
	}
	browser.storage.local.get(name)
		.then(update)
		.then(updateBackground)
		.then(update_if_on)
		.catch(err => console.error("failed to get storage: " + err));
}

function listener(ev) {
	let node = ev.target.nodeName;
	let id = ev.target.id;
	let name = ev.target.name;

	if (node === "INPUT") {
		if (id === "toggle") {															// on off button
			toggleBackground()
				.then(update_if_on)
				.catch(err => {
					console.error(`toggle error: ${err}`);
					updateToggle(false);
				});
		} else if (configList.includes(name)) {						// submenu checkbox?
			updateSubmenu(ev.target);
		}
		return
	}

	if (["h1-functions", "h1-targets", "h1-enable",	"h1-autoOpen", "h1-onOff", "h1-blacklist",	"h1-needles", "h1-types"].includes(id)) {
		let sub = id.substr(3);
		let formats = document.getElementById(sub);
		formats.classList.toggle('closed');
		formats.classList.toggle('open');
		return
	}
	if (id == "h1-config" ) {
		goToConfig();
		return;
	}
}

function goToConfig() {
		let confUrl = browser.runtime.getURL("/pages/config/config.html");
		let tab = browser.tabs.create({url:confUrl});
		tab.then(() => window.close());
		return;
}

update_if_on();
document.addEventListener("click", listener);
populateSubMenus();
