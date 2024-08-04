const configList = ["targets", "needles",  "blacklist", "functions", "globals"];
const normalHeaders = ["enabled", "name", "pattern"];
const formatsHeader = ["default", "highlight"];

function getTableData(tblName) {
	const tbl = document.getElementById(`${tblName}-form`);
	return Array.from(tbl.querySelectorAll(".row:not(:first-child)")).map(row => {
		const obj = {};
		obj.row = row;

		for (const h of normalHeaders) {
			const input = row.querySelector(`input[name='${h}']`);
			if (input.type === "checkbox") {
				obj[h] = input.checked;
			} else {
				obj[h] = input.value;
			}
		}
		return obj;
	})
}

// check entire table for updates that have not been saved
// we get the whole table info from local storage, may as well check it all?
function unsavedTable(tblName) {
	function markSaved(v) {
		const butt = document.getElementById(`save-${tblName}`);
		if (v) {
			butt.disabled = true;
		} else {
			butt.classList.remove("saved");
			butt.disabled = false;
		}
	}

	function compareFormatData(saveData) {
		for ([save, nm, value] of genFormatPairs(tblName, saveData)) {
			const test = typeof(save[nm]) == "number"? Number(value): value;
			if (save[nm] != test) {
				markSaved(false);
				return;
			}
		}
		markSaved(true);
	}

	function compareData(saveData) {
		const tblData = getTableData(tblName);
		const saved = saveData[tblName];
		if (saved.length !== tblData.length) {
			markSaved(false);
			return;
		}

		for (let i=0; i<tblData.length; i++) {
			for (const h of normalHeaders) {
				if (saved[i][h] != tblData[i][h]) {
					markSaved(false);
					return;
				}
			}
		}
		markSaved(true);
		return;
	}

	if (["formats","limits"].includes(tblName)) {
		// limits has name limits but uses storage formats
		browser.storage.local.get("formats")
			.then(compareFormatData);
	} else {
		browser.storage.local.get(tblName)
			.then(compareData);
	}
}

function createField(name, value, disabled=false) {
	const div = document.createElement("div");
	div.className = "cell";
	const input = document.createElement("input");
	input.disabled = disabled;

	input.type = "text";
	input.value = value;
	input.name = name;
	if (!disabled) {
		input.onblur = function(e) {
			validate(e.target);
			unsavedTable(e.target
				.parentElement
				.parentElement
				.parentElement
				.parentElement
				.id.replace("-form", "")
			);
		};
	}

	div.appendChild(input);
	return div;
}

function defAddRow(tblName, ex, focus=false) {
	function addDelete() {
		const delRow = document.createElement("div");
		delRow.className = "row";
		const ecks = document.createElement("ecks");
		ecks.innerText = "\u2297"; // CIRCLED TIMES
		ecks.className = "ecks";
		delRow.appendChild(ecks);
		ecks.onclick = function() {
			// remove inputs from errors, if they exist
			for (const input of row.getElementsByTagName("input")) {
				if (input.type === "text") {
					removeFromErrorArray(input, tblName);
				}
			}
			row.remove();
			delRow.remove();
			unsavedTable(tblName);
		}
		document.getElementById(tblName + "-deletes").appendChild(delRow);
	}

	function createSwitch() {
		const div = document.createElement("div");
		div.className = "cell";
		const label = document.createElement("label");
		label.className = "switch";
		const input = document.createElement("input");
		input.type = "checkbox";
		input.name = "enabled";
		input.checked = ex.enabled;
		input.onclick = () => unsavedTable(tblName);

		const slider = document.createElement("div");
		slider.className = "slider";

		label.appendChild(input);
		label.appendChild(slider);
		div.appendChild(label);
		return div;
	}

	const row = document.createElement("div");
	row.className = "row";
	const cols = [];

	for (const cls of ["col-sm", "col-md", "col-lg"]) {
		const div = document.createElement("div");
		div.className = cls;
		cols.push(div);
	}

	cols[0].appendChild(createSwitch());
	cols[1].appendChild(createField("name", ex.name, tblName == "globals"));
	cols[2].appendChild(createField("pattern", ex.pattern));

	cols.forEach(c => row.appendChild(c));

	document.getElementById(`${tblName}-form`).appendChild(row);
	if (tblName != "globals") {
		addDelete();
	}
	if (focus) {
		row.getElementsByTagName("input")[1].focus();
	}
}


function rowFromName(tbl, rowName) {
	const nodes = tbl.querySelector(`input[name=${rowName}]`)
		?.parentElement
		.parentElement
		.parentElement
		.querySelectorAll("input");
	return nodes? Array.from(nodes): undefined;
}

function *genFormatPairs(tblName, res) {
	const saved = res.formats;
	const tbl = document.getElementById(`${tblName}-form`);
	if (!tbl) {
		throw "Uknown table name";
	}

	for (const save of saved) {
		const cols = rowFromName(tbl, save.name);
		if (cols && cols.shift().name == save.name) {
			for (const val of cols) {
				const {name, value} = val;
				yield [save, name, value];
			}
		}
	}
}

async function formatsSave(tblName) {
	const res = await browser.storage.local.get("formats");

	for ([save, nm, value] of genFormatPairs(tblName, res)) {
		if (typeof(save[nm]) == "number") {
			save[nm] = Number(value);
		} else {
			save[nm] = value;
		}
	}

	browser.storage.local.set(res)
		.then(updateBackground)
		.then(() => unsavedTable(tblName));
}

function getDefElements(form) {
	const all = [];
	let i = 0;
	for (const input of form.elements) {
		if (input.name === "enabled") {
			all.push({"enabled" : input.checked});
		} else if (input.name === "name") {
			all[i]["name"] = input.value;
		} else if (input.name === "pattern") {
			all[i]["pattern"] = input.value;
			i++;
		}
	}
	return all;
}

async function saveTable(tblName) {
	if (!validateTable(tblName)) {
		return;
	}

	const tbl = document.getElementById(`${tblName}-form`);
	const data = {};
	data[tblName] = getDefElements(tbl);

	await browser.storage.local.set(data);
	return updateBackground();
}

function onLoad() {
	function appendDefault(tblName) {
		const example = { "name" : "", "enabled" : true, "pattern" : "" }
		defAddRow(tblName, example, focus=true);
	}

	function writeDOM(res) {
		for (const sub of configList) {
			if (!res[sub]) {
				console.error("Could not get: " + sub);
			}

			for (const itr of res[sub]) {
				defAddRow(sub, itr);
			}
		}
		for (const sub of configList) {
			validateTable(sub);
			unsavedTable(sub); // really should never change anything
		}
	}

	// set onclick events to default buttons
	for (const i of configList) {
		if (i != "globals") {
			document.getElementById(`add-${i}`).onclick = function() {
				appendDefault(i);
				unsavedTable(i);
			}
		}
		document.getElementById(`save-${i}`).onclick = function() {
			saveTable(i)
				.then(() => unsavedTable(i)); // fix formating, should clear
		}
	}

	// TODO await and simplify
	const result = browser.storage.local.get(configList);
	result.then(
		writeDOM,
		err => console.error("failed to get storage: " + err)
	);
	// TODO better DB in future, sipler code
	populateColors();
}

// formats and limits are different table types, so handled seperatly
async function populateColors() {
	// class for each column of input

	function createInptCol(name, value, xl, disabled=false) {
		const col = document.createElement("div");
		// col.className = "col-md";
		col.className = xl? "col-xl" : "col-md";
		const field = createField(name, value, disabled);
		col.appendChild(field);
		return col;
	}

	function createFmtRow(fmt) {
		const row = document.createElement("div");
		row.className = "row";
		row.appendChild(createInptCol(fmt.name, fmt.pretty, false, true));
		row.appendChild(createInptCol("default", fmt.default, false));
		row.appendChild(createInptCol("highlight", fmt.highlight, false));
		return row;
	}

	function createLimitRow(fmt) {
		const row = document.createElement("div");
		row.className = "row";
		row.appendChild(createInptCol(fmt.name, fmt.pretty, true));
		row.appendChild(createInptCol("limit", fmt.limit));
		return row;
	}

	// set save button
	document.getElementById("save-formats").onclick = () => formatsSave("formats");
	document.getElementById("test-formats").onclick = colorTest;
	document.getElementById("save-limits").onclick = () => formatsSave("limits");

	const {formats} = await browser.storage.local.get("formats");
	if (!formats) {
		console.err("could not get color formats from storage");
		return false;
	}

	const fmtTbl = document.getElementById("formats-form");
	const limitTbl = document.getElementById("limits-form");
	formats.forEach(i => {
		if (i.open !== null) {
			fmtTbl.appendChild(createFmtRow(i));
		}

		if (i.limit) {
			limitTbl.appendChild(createLimitRow(i));
		}

	});
}

// Should reflect switcheroo.js printing
function colorTest() {
	browser.storage.local.get("formats").then(x => {
		for (const i of x.formats) {
			console.log("[%s] %cDefault %chighlighted",
				i.name, i.default, i.highlight
			);
		  }
	});
}

async function getConfig() {
	const conf = await browser.runtime.sendMessage("getScriptInfo");
	return conf[0];
}

self.addEventListener('load', onLoad);
