var configList = ["targets", "needles",  "blacklist", "functions", "globals"];
var normalHeaders = ["enabled", "name", "pattern"]; 
var formatsHeader = ["default", "highlight"];

function getTableData(tblName) {
	let headers = tblName === "formats" ? formatsHeader : normalHeaders;
	let tbl = document.getElementById(`${tblName}-form`);
	let tblData = [];
	for (let row of tbl.querySelectorAll(".row:not(:first-child)")) {
		let obj = {};
		obj.row = row;

		for (let h of headers) {
			let input = row.querySelector(`input[name='${h}']`);
			if (input.type === "checkbox") {
				obj[h] = input.checked;
			} else {
				obj[h] = input.value;
			}
		}
		tblData.push(obj);
	}
	return tblData;
}

// check entire table for updates that have not been saved
// we get the whole table info from local storage, may as well check it all?
function unsavedTable(tblName) {
	function markSaved(v) {
		let butt = document.getElementById(`save-${tblName}`);
		if (v) {
			butt.disabled = true;
		} else {
			butt.classList.remove("saved");
			butt.disabled = false;
		}
	}

	function compareFormatData(saved, tblData) {
		for (let j = 0, i = 0; i < saved.length; i++) {
			const save = saved[i];
			if (saved[i].open === null) {
				// Can't be updated, not in table
				continue;
			}
			const tbl = tblData[j++];
			let name = tbl.row.querySelector("input:disabled").name;
			if (name != save.name) {
				throw "Color table does not align with formats";
			}

			for (let h of formatsHeader) {
				if (tbl[h] != save[h]) {
					markSaved(false);
					return;
				}
			}
		}
		markSaved(true);
	}

	function compareData(saveData) {
		let tblData = getTableData(tblName);
		let saved = saveData[tblName];
		if (tblName == "formats") {
			return compareFormatData(saved, tblData);
		}
		if (saved.length !== tblData.length) {
			markSaved(false);
			return;
		}

		for (let i=0; i<tblData.length; i++) {
			for (let h of normalHeaders) {
				if (saved[i][h] != tblData[i][h]) {
					markSaved(false);
					return;
				}
			}
		}
		markSaved(true);
		return;
	}

	browser.storage.local.get(tblName)
		.then(compareData);
}

function createField(name, value, tblName, disabled=false) {
	let div = document.createElement("div");
	div.className = "cell";
	let input = document.createElement("input");
	input.disabled = disabled;

	input.type = "text";
	input.value = value;
	input.name = name;
	if (!disabled) {
		input.onblur = function(e) {
			validate(e.target);
			unsavedTable(tblName);
		};
	}

	div.appendChild(input);
	return div;
}

function defAddRow(tblName, ex, focus=false) {
	function addDelete() {
		let delRow = document.createElement("div");
		delRow.className = "row";
		let ecks = document.createElement("ecks");
		ecks.innerText = "\u2297"; // CIRCLED TIMES
		ecks.className = "ecks";
		delRow.appendChild(ecks);
		ecks.onclick = function() {
			// remove inputs from errors, if they exist
			for (let input of row.getElementsByTagName("input")) {
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
		let div = document.createElement("div");
		div.className = "cell";
		let label = document.createElement("label");
		label.className = "switch";
		let input = document.createElement("input");
		input.type = "checkbox";
		input.name = "enabled";
		input.checked = ex.enabled;
		input.onclick = () => unsavedTable(tblName);

		let slider = document.createElement("div");
		slider.className = "slider";

		label.appendChild(input);
		label.appendChild(slider);
		div.appendChild(label);
		return div;
	}

	var row = document.createElement("div");
	row.className = "row";
	var cols = [];

	for (let cls of ["col-sm", "col-md", "col-lg"]) {
		let div = document.createElement("div");
		div.className = cls;
		cols.push(div);
	}

	cols[0].appendChild(createSwitch());
	cols[1].appendChild(createField("name", ex.name, tblName, tblName == "globals"));
	cols[2].appendChild(createField("pattern", ex.pattern, tblName));

	for (let c of cols) {
		row.appendChild(c);
	}

	document.getElementById(`${tblName}-form`).appendChild(row);
	if (tblName != "globals") {
		addDelete();
	}
	if (focus) {
		row.getElementsByTagName("input")[1].focus();
	}
}

async function colorSave() {
	const res = await browser.storage.local.get("formats");
	const saved = res.formats;
	const tblData = getTableData("formats");

	for (let j = 0, i = 0; i < saved.length; i++) {
		const save = saved[i];
		if (saved[i].open === null) {
			// Can't be updated, not in table
			continue;
		}
		const tbl = tblData[j++];
		let name = tbl.row.querySelector("input:disabled").name;
		if (name != save.name) {
			throw "Color table does not align with formats";
		}

		for (let h of formatsHeader) {
			save[h] = tbl[h];
		}
	}
	browser.storage.local.set(res)
		.then(updateBackground)
		.then(unsavedTable("formats"));
}

function getDefElements(form) {
	var all = [];
	var i = 0;
	for (var input of form.elements) {
		if (input.name === "enabled") {
			all.push({"enabled" : input.checked});
		} else if (input.name === "name") {
			all[i]["name"] = input.value;
		} else if (input.name === "pattern") {
			all[i]["pattern"] = input.value;
			i++;
		} else {
			console.dir(input);
		}
	}
	return all;
}

function saveTable(tblName) {
	if (!validateTable(tblName)) {
		return;
	}

	var tbl = document.getElementById(`${tblName}-form`);
	var data = {};
	data[tblName] = getDefElements(tbl);

	browser.storage.local.set(data)
		.then(updateBackground);
}

function onLoad() {
	function appendDefault(tblName) {
		var example = { "name" : "", "enabled" : true, "pattern" : "" }
		defAddRow(tblName, example, focus=true);
	}

	function writeDOM(res) {
		for (let sub of configList) {
			if (!res[sub]) {
				console.error("Could not get: " + sub);
			}

			for (let itr of res[sub]) {
				defAddRow(sub, itr);
			}
		}
		for (let sub of configList) {
			validateTable(sub);
			unsavedTable(sub); // really should never change anything
		}
	}

	// set onclick events to default buttons
	for (let i of configList) {
		if (i != "globals") {
			document.getElementById(`add-${i}`).onclick = function() {
				appendDefault(i);
				unsavedTable(i);
			}
		}
		document.getElementById(`save-${i}`).onclick = function() {
			saveTable(i);
			unsavedTable(i); // fix formating, should clear
		}
	}

	let result = browser.storage.local.get(configList);
	result.then(
		writeDOM,
		err => console.error("failed to get storage: " + err)
	);
	populateColors();
}

// this table is different, rather then trying to abstract it, just handle it
// seperatly
function populateColors() {
	// class for each column of input

	function createInptCol(name, value, disabled=false) {
		let col = document.createElement("div");
		col.className = "col-md";
		let field = createField(name, value, "formats", disabled);
		col.appendChild(field);
		return col;
	}

	function createRow(fmt) {
		var row = document.createElement("div");
		row.className = "row";
		row.appendChild(createInptCol(fmt.name, fmt.pretty, true));
		row.appendChild(createInptCol("default", fmt.default));
		row.appendChild(createInptCol("highlight", fmt.highlight));
		return row;
	}

	function writeDOM(res) {
		let formats = res.formats;
		if (!res.formats) {
			console.err("could not get color formats from storage");
			return false;
		}

		let tbl = document.getElementById("formats-form");
		for (let i of formats) {
			if (i.open !== null) {
				tbl.appendChild(createRow(i));
			}
		}
		return true;
	}

	let result = browser.storage.local.get("formats");
	result.then(
		writeDOM,
		function(err) { console.error("failed to get storage: " + err) }
	);
	// set save button
	document.getElementById("save-formats").onclick = colorSave;
	document.getElementById("test-formats").onclick = colorTest;
}

// Should reflect switcheroo.js printing
function colorTest() {
	browser.storage.local.get("formats").then(x => {
		for (let i of x.formats) {
			console.log("[%s] %cDefault %chighlighted",
				i.name, i.default, i.highlight
			);
		  }
	});
}

window.addEventListener('load', onLoad);
