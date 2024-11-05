const errors = {
	targets: [],
	needles: [],
	blacklist: [],
	functions: [],
	globals: [],
	formats: [],
	limits: []
};

// used by config.js
function validateTable(tblName) {
	let erCount = 0;
	let form = document.getElementById(`${tblName}-form`);
	for (let input of form.getElementsByTagName("input")) {
		if (input.type === "text") {
			if (!validate(input)) {
				erCount++;
			}
		}
	}
	let names = new Set();
	for (let name of form.querySelectorAll("input[name=name]")) {
		if (names.has(name.value)) {
			gotError(name, tblName, `Duplicate name "${name.value}"`);
			erCount++;
		} else {
			names.add(name.value);
		}
	}

	if (erCount > 0) {
		errors[tblName][0].dom.focus();
		return false;
	}
	return true;
}

function validate(dom, tblName=null) {
	// should validate every single possible field
	let v = {
		targets: {
			name: validateName,
			pattern: validateTargetPattern
		},
		needles: {
			name: validateName,
			pattern: validateNeedlesPattern
		},
		blacklist: {
			name: validateName,
			pattern: validateNeedlesPattern
		},
		functions: {
			name: validateName,
			pattern: validateFunctionsPattern
		},
		globals: {
			name: () => false,
			pattern: validateName
		},
		formats: {
			default: validateColor,
			highlight: validateColor
		},
		limits: {
			limit: validateNumber
		}
	}
	if (!tblName)
		tblName = dom.closest("form").id.split("-")[0];

	const paramName = dom.name;

	if (!v[tblName]) {
		throw `unknown table '${tblName}'`;
	}

	const res = v[tblName][paramName](dom);

	if (res) {
		gotError(dom, tblName, `${paramName}:[${dom.value}]: ${res}`);
		return false;
	} else {
		removeFromErrorArray(dom, tblName);
		return true;
	}
}

function removeFromErrorArray(dom, tblName) {
	errors[tblName] = errors[tblName].filter(function(er) {
			if (er.dom === dom) {
				er.msg.remove(); // remove coresponding text
				return false; // remove this one
			}
			return true; // if it is not our element, it stays
	});
}

function gotError(dom, tblName, err) {
	// add error text to dom
	let htmlErr = document.createElement("div");
	htmlErr.innerText =  err;
	htmlErr.onclick = function() {dom.focus()};
	document.getElementById(`${tblName}-errors`).appendChild(htmlErr);

	// errors
	removeFromErrorArray(dom, tblName); // remove last error if there
	var obj = {};
	obj.dom = dom;
	obj.msg = htmlErr;
	errors[tblName].push(obj);
}

function strCheck(str) {
	if (typeof(str) !== "string") {
		return "must be a string";
	}

	if (str.length <= 0) {
		return "can't be empty"
	}
	return false;
}

function validateNumber(dom) {
	const {value} = dom;
	if (/^\d+$/.test(value)) {
		if (Number(value) <= 0) {
			return "Limit must be greater then 0";
		}
		return false;
	}
	return "Limit must be a number";

}

function validateName(dom) {
	let name = dom.value;
	let strRet = strCheck(name);
	if (strRet) return strRet;

	if (/^[A-Za-z0-9 _.']+$/.test(name) === false) {
		return "can't have special characters ([A-Za-z0-9 _.] allowed)";
	}
}

function validateNeedlesPattern(dom) {
	let val = dom.value;
	let strRet = strCheck(val);
	if (strRet) return strRet;

	let match = /^\/(.*)\/(i|g|gi|ig)?$/.exec(val);
	if (match) { // regex needle
		let regex = new RegExp(match[1], match[2] === undefined ? "" : match[2]);
		if (regex) {
			dom.className = "regex";
			return false;
		} else {
			return "failed to create valid regular expression"
		}
	}
	dom.className = "";
	return false;
}

function validateTargetPattern(dom) {
	let target = dom.value;
	let strRet = strCheck(target);
	if (strRet) return strRet;

	if (!/^(https?|wss?|file|ftp|\*):/.test(target)) {
		return "must start with (https|http|wss|file|ftp|*)";
	}else if (!/^(https?|wss?|file|ftp|\*):\/\//.test(target)) {
		return "schema must contain '://'";
	}

	let reTest = /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$/;
	if (!reTest.test(target)) {
		if (/^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)$/.test(target)) {
			return "must terminate domain by a slash '/'";
		}else if (/^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^/]+|[^/]+)\/.*$/) {
			return "domain/subdomain can not contain a wildcard within a string";
		}
		// I don't know what they did...
		return `must match ${reTest.toString()}`;
	}

	return false;
}

/*
 * heavily inspired by switcheroo.js, update one, update the other
*/
function validateFunctionsPattern(dom) {
	function getFunc(n) {
		let ret = {}
		ret.where = window;
		let groups = n.split(".");
		let i = 0; // outside for loop for a reason
		for (i=0; i<groups.length-1; i++) {
			ret.where = ret.where[groups[i]];
			if (!ret.where) {
				return null;
			}
		}
		ret.leaf = groups[i];
		return ret ? ret : null;
	}

	function funcCheck(fnc) {
		if (typeof(fnc) !== "function") {
			return "must be a function";
		}else if (/\{\s*\[native code\]\s*\}/.test('' + fnc)) {
				return false;
		} else{
			return "must be native function";
		}
	}

	let evname = dom.value;
	if (evname.length === 0) {
		return "can't be empty";
	}

	var ownprop = /^(set|value)\(([a-zA-Z.]+)\)\s*$/.exec(evname);
	if (ownprop) {
		let prop = ownprop[1];
		let f = getFunc(ownprop[2]);
		if (!f) {
			return "Can't find in window";
		}
		try{
			var orig = Object.getOwnPropertyDescriptor(f.where.prototype, f.leaf)[prop];
		} catch(err) {
			console.error(`Err parsing ${evname}: ${err}`);
			return `Object.getOwnPropertyDescriptor().${prop} error`;
		}
		if (!orig) {
			return `Object.getOwnPropertyDescriptor().${prop} not found`;
		}else{
			return funcCheck(orig);
		}
	} else if (!/^[a-zA-Z.]+$/.test(evname)) {
		if (/[()]/.test(evname)) {
			return "characters `(` and `)` only used for setters (ie:setter(innerHTML))";
		}else{
			let match = /^[a-zA-Z.]*(.)/.exec(name);
			return `invalid character '${match[1]}'`;
		}
	} else {
		let f = getFunc(evname);
		if (f) {
			return funcCheck(f.where[f.leaf]);
		} else {
			return "Can't find in window";
		}
	}
}

function validateColor(dom) {
	const css = dom.value;
	if (css.length == 0) {
		dom.value = "color: none";
	}
	return false;
}
