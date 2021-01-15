var configList = ["targets", "needles",  "blacklist", "functions"];

// check entire table for updates that have not been saved
// we get the whole table info from local storage, may as well check it all?
function unsavedTable(tblName) {
	let headers = ["enabled", "name", "pattern"];
	if (tblName === "formats") {
		headers = ["default", "highlight"];
	}

	let tbl = document.getElementById(`${tblName}-form`);
	function getTableData() {
		let promise = new Promise(function(res,fail) {
			let tblData = [];
			for (let row of tbl.querySelectorAll(".row:not(:first-child)")) {
				let obj = {};
				obj.row = row;

				for (let h of headers) {
					let input = row.querySelector(`input[name='${h}']`);
					if (input.type === "checkbox") {
						obj[h] = input.checked;
					}else{
						obj[h] = input.value;
					}
				}
				tblData.push(obj);
			}
			res(tblData);
		});

		return promise;
	}

	function markSaved() {
		let butt = document.getElementById(`save-${tblName}`);
		butt.disabled = true;
	}

	function markUnsaved() {
		let butt = document.getElementById(`save-${tblName}`);
		butt.classList.remove("saved");
		butt.disabled = false;
	}

	function compareFormatData(saveData, tblData) {
		for (let row of tblData) {
			let name = row.row.querySelector("input:disabled").name;
			for (let h of headers) {
				if (row[h] !== saveData[name][h]) {
					markUnsaved();
					return;
				}
			}
		}
		markSaved();
	}

	function compareData(args) {
		let saveData = args[0][tblName];
		let tblData = args[1];
		if (tblName == "formats") {
			return compareFormatData(saveData, tblData);
		}
		let unsaved = false;

		if (saveData.length !== tblData.length) {
			markUnsaved();
			return;
		}

		for (let i=0; i<tblData.length; i++) {
			for (let h of headers) {
				if (saveData[i][h] != tblData[i][h]) {
					markUnsaved();
					return;
				}
			}
		}
		markSaved();
		return;
	}

	function allErr(err) {
		console.error("failed to check table save state: %s", err);
	}

	/* getTableData().then(allErr, allErr); */
	let all = Promise.all([browser.storage.local.get(tblName), getTableData()]);
	all.then(compareData);
	all.catch(allErr);
}

function createField(name, value, tblName) {
	let div = document.createElement("div");
	div.className = "cell";
	let input = document.createElement("input");
	input.type = "text";
	input.value = value;
	input.name = name;
	input.onblur = function(e) {
		validate(e.target);
		unsavedTable(tblName);
	}; // in validate.js

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

		document.getElementById(tblName + "-deletes").appendChild(delRow);
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
		input.onclick = function() {unsavedTable(tblName)};

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
	cols[1].appendChild(createField("name",		 ex.name, tblName));
	cols[2].appendChild(createField("pattern", ex.pattern, tblName));

	for (let c of cols) {
		row.appendChild(c);
	}

	document.getElementById(`${tblName}-form`).appendChild(row);
	addDelete();
	if (focus) {
		row.getElementsByTagName("input")[1].focus();
	}
}

function getDefElements(form) {
	var all = [];
	var i = 0;
	for (var input of form.elements) {
		if (input.name === "enabled") {
			all.push({"enabled" : input.checked});
		}else if (input.name === "name") {
			all[i]["name"] = input.value;
		}else if (input.name === "pattern") {
			all[i]["pattern"] = input.value;
			i++;
		}else{
			console.dir(input);
		}
	}
	return all;
}

function colorSave() {
	// slightly different then other tables, so set it appart
	function saveErr(err) {
		console.error("Error saving colors: %s", err);
	}

	function saveIt(res) {
		if (!res.formats) {
			saveErr("formats not returned");
			return false;
		}
		let colors = getColorInfo();
		let formats = res.formats;
		for (let i in colors) {
			formats[i].default = colors[i].default;
			formats[i].highlight = colors[i].highlight;
		}
		let storeIt = browser.storage.local.set({"formats" : formats });
		storeIt.then(updateBackground).then(unsavedTable("formats"));
		storeIt.catch(saveErr);
	}

	let result = browser.storage.local.get("formats");
	result.then(saveIt);
	result.catch(saveErr);

}

function saveTable(tblName) {
	if (!validateTable(tblName)) {
		return;
	}

	function saveErr(err) {
		console.error("Error saving table %s", err);
	}
	var tbl = document.getElementById(`${tblName}-form`);
	var data = {};
	data[tblName] = getDefElements(tbl);

	let storeIt  = browser.storage.local.set(data);
	storeIt.then(updateBackground);
	storeIt.catch(saveErr);
}

function onLoad() {
	function appendDefault(tblName) {
		var example = { "name" : "", "enabled" : true, "pattern" : "" }
		defAddRow(tblName, example, true);
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
		document.getElementById(`add-${i}`).onclick = function() {
			appendDefault(i);
			unsavedTable(i);
		}
		document.getElementById(`save-${i}`).onclick = function() {
			saveTable(i);
			unsavedTable(i); // fix formating, should clear
		}
	}

	let fin = []
	let result = browser.storage.local.get(configList);
	result.then(
		writeDOM,
		function(err) { console.error("failed to get storrage: " + err) }
	);
	populateColors();

	// only after the tables have been populated can you acuratly scroll to the
	// section you want
}

// this table is different, rather then trying to abstract it, just handle it
// seperatly
function populateColors() {
	// class for each column of input

	function createInptCol(name, value, disabled=false) {
		let col = document.createElement("div");
		col.className = "col-md";
		let field = createField(name, value, "formats");
		field.querySelector("input").disabled = disabled;
		col.appendChild(field);
		return col;
	}

	function createRow(fmt, name) {
		var row = document.createElement("div");
		row.className = "row";
		row.appendChild(createInptCol(name, fmt.pretty, true));
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
		let names = ["title", "interesting", "args", "needle", "query", "fragment", "winname", "stack"];

		for (let name of names) {
			if (!formats[name]) {
				console.warn("could not find '%s' in formats", name);
				continue;
			}
			tbl.appendChild(createRow(formats[name], name));
		}

		return true;
	}

	let result = browser.storage.local.get("formats");
	result.then(
		writeDOM,
		function(err) { console.error("failed to get storrage: " + err) }
	);
	// set save button
	document.getElementById("save-formats").onclick = colorSave;
	document.getElementById("test-formats").onclick = colorTest;
}

// gets it from the table, not from the local storage
function getColorInfo() {
	var colors = {};
	function rowToData(row) {
		let fmt = {};
		let name = row.querySelector("input:disabled").name;
		fmt.default = row.querySelector("input[name='default']").value;
		fmt.highlight = row.querySelector("input[name='highlight']").value;
		colors[name] = fmt;
	}
	var tbl = document.getElementById("formats-form");
	let rows = tbl.querySelectorAll(".row:not(:first-child)"); // skip first title row

	for (let row of rows) {
		rowToData(row);
	}
	return colors;
}

// Should reflect switcheroo.js printing
function colorTest() {
	var colors = getColorInfo();
	let argStr = "Argument string (needle, query, fragment, winname)";

	function testArgs() {
		let format = colors.args;
		let argTitle = "%carg: "
		console.group(argTitle, format.default);
		console.log("%c%s", format.highlight, argStr);
		console.groupEnd(argTitle);
	}
	function hlSearch(sName) {
		let defColor = colors[sName].default;
		let hiColor  = colors[sName].highlight;
		let titleStr = "%c%s %c%s%c found";

		console.group(titleStr, defColor, sName, hiColor, sName, defColor);
		let loc = argStr.indexOf(sName);
		let start = argStr.substr(0, loc);
		let end = argStr.substr(loc+sName.length);

		console.log("%c%s%c%s%c%s",
			defColor, start,
			hiColor, sName,
			defColor, end
		);
		console.groupEnd(titleStr);
	}
	function testStack() {
		let stackFormat = colors.stack;
		let stackTitle = "%cstack: "
		console.group(stackTitle, stackFormat.default);
		console.trace();
		console.groupEnd(stackTitle);
	}


	for (let c of ["interesting", "title"]	) {
		// title string
		let title = "%c[EV] %c%s%c %s"
		let format = colors[c];
		console.group(
			title, format.default, format.highlight, "eval", format.default,
			location.href
		);
		if (c == "title") {
			testArgs();
			for (let t of ["needle", "query", "fragment", "winname"]) {
				hlSearch(t);
			}
			testStack();
		}
		console.groupEnd(title);
	}

}

window.addEventListener('load', onLoad);
