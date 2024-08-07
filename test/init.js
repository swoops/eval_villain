// ensure we have parameters to play with
{
	let jsdata = btoa(JSON.stringify(
		  {
			 "firstProperty" : "firstPropans", 
			 "secondArray" : [ "firstinarray", "secondinarray" ], 
			 "bool" : true, 
			 "small" : "a"
		  }
	));
	
	let gotourl = `?one=1&json=${jsdata}&param_zxcv=zxcv&encoded=%27%20%2b%20%3c&bool=true`
	let frag = "fragment_value";
	let url = new URL(location.href);
	if (url.search != gotourl || url.hash != frag) {
		url.search = gotourl;
		url.hash = frag;
		location.href = url;
	}
}

const cl = console.log;
const ct = console.trace;
const cg = console.group;
const cgc = console.groupCollapsed;
const cge = console.groupEnd;

const allCalls = [];
function addToCalls() {
	allCalls.push(arguments);
}

// replace native functions we use for testing
console.log = addToCalls;
console.group = addToCalls;
console.groupCollapsed = addToCalls;

// empty these to be less ugly
console.trace = () => {};
document.write = () => {};
document.writeln = () => {};
console.groupEnd = () => {};


function fail(x) {
	console.error(`[%cXX%c] ${x}`, "color:red", "color:None");
}

function argsToPrintable(args) {
	const ret = [];
	for (const i in args) {
		ret.push(args[i]);
	}
	return JSON.stringify(ret, null, 2);
}

function printNextArgs() {
	cl(argsToPrintable(allCalls[0]));
}

/**
 * Tests each `args` against each `test`
*/
function argsIs(args, test) {
	if (args.length != test.length) {
		return {off: [`arg.length ${args.length} != ${test.length} test.length`], expect: test, got: args};
	}
	let c = 0;
	const off = []
	for (const i of args) {
		if (i !== test[c]) {
			off.push(`arg[${c}] '${i}' !== '${test[c]}'`)
		}
		c++;
	}
	if (off.length > 0) {
		return {expect: test, got: args, off: off};
	}
	return true;
}

/**
 * Pops msg from `allCalls` and checks if it matches `test`
*/
function chckNArg(test, msg) {
	const why = argsIs(allCalls.shift(), test);
	if (why === true) {
		cgc(`[%c**%c] ${msg}`, "color:green", "color:None");
		cl(...test);
		cge();
	} else {
		fail(msg);
		const erinfo = "Error Info:";
		cg(erinfo)
		for (const i of why.off) {
			cl(i);
		}

		const got = "got: ";
		cg(got);
		cl(argsToPrintable(why.got));
		cl(...why.got);
		cge();

		const exp = "expected: "
		cg(exp);
		cl("expected: ", JSON.stringify(why.expect, null, 2));
		cl(...why.expect);
		cge(exp);
		cge(erinfo)
	};
}

function checkStackBanner(msg) {
	chckNArg(["%cstack: ","color:None"], `${msg} stack banner`);
}
function checkArg(msg, value) {
	const type = typeof(value);
	chckNArg(["%carg(%s):",colNone, type], `${msg} arg test`);
	chckNArg(["%c%s", colGreen, value], `${msg} Interesting args`);
}

function testInterset(msg, name, reason, needle, line, decoded) {
	const value = line.join("");
	chckNArg(["%c[EV] %c%s%c %s", colRed, colGreen, name, colRed, location.href], `${msg} Interesting Banner`);
	checkArg(msg, value);

	const ban = decoded
		? ['%c%s%c%s%c%s%c%s', colNone, `${reason}: `,
			colGreen, needle, colNone, " found", colGreen, " [Decoded]"]
		: ["%c%s%c%s%c%s", colNone,`${reason}: `, colGreen, needle, colNone, " found"];

	chckNArg(ban, `${msg} Interesting highlight`);
	if (decoded) {
		chckNArg(["Encoder function:"], `${msg} Encoder Highlight`);
		const encoder = allCalls.shift();
		if (encoder.length != 1) {
			fail("Encoder not a single arg");
		cl(JSON.stringify(encoder, null, 2));
		} else {
			cl("TODO: Check if encoder makes sense:");
			cl(encoder[0]);
		}
		new Function
	}

	const test = ["%c%s".repeat(line.length)];
	const colors = [colGreen, colNone];
	let ci = line.length % 2;
	for (const f of line) {
		test.push(colors[ci]);
		test.push(f);
		ci = (ci+1)%2;
	}
	chckNArg(test, `${msg} Interesting highlight`);
	checkStackBanner(msg);
	if (allCalls.length != 0) {
		fail ("msg: extra args left over")
		while (allCalls.length > 0) {
			printNextArgs();
			allCalls.shift();
		}
	}
}

function pushHistoryParam(key, value, clear=true) {
	const url = new URL(location.href);
	if (clear) {
		Array.from(url.searchParams.keys() ).forEach(x => url.searchParams.delete(x)); 
	}
	url.searchParams.set(key, value);
	history.pushState({}, null, url);
}

function testNormal(msg, name, value) {
	chckNArg(["%c[EV] %c%s%c %s", colNone, colGreen, name, colNone, location.href], `${msg} Normal Banner`);
	checkArg(msg, value);
	checkStackBanner(msg);
	if (allCalls.length != 0) {
		fail ("msg: extra args left over")
		while (allCalls.length > 0) {
			printNextArgs();
			allCalls.shift();
		}
	}
}


const colNone = "color:None";
const colGreen = "color:#088"
const colRed = "color:red"
var config =  {
	"formats" : {
		"title" : {
			"pretty" : "Normal Results",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"interesting" : {
			"pretty" : "Interesting Results",
			"use" : true,
			"open" : true,
			"default" : colRed,
			"highlight" : colGreen
		},
		"args" : {
			"pretty" : "Args Display",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"needle" : {
			"pretty" : "Needles Search",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"query" : {
			"pretty" : "Query Search",
			"use" : true,
			"limit": 32,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"fragment" : {
			"pretty" : "Fragment Search",
			"use" : true,
			"limit": 32,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"winname" : {
			"pretty" : "window.name Search",
			"use" : true,
			"limit": 32,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"path": {
			"pretty": "Path Search",
			"use": false,
			"limit": 32,
			"open": true,
			"default": "color: none",
			"highlight": "color: #088"
		},
		"referrer": {
			"pretty": "Referrer Search",
			"use": false,
			"limit": 32,
			"open": true,
			"default": "color: none",
			"highlight": "color: #088"
		},
		"cookie" : {
			"pretty"	: "Cookie Search",
			"use"		: true,
			"limit": 32,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: colGreen"
		},
		"localStore" : {
			"pretty"	: "localStorage",
			"limit": 32,
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		},
		"userSource" : {
			"pretty" : "User Source",
			"use" : true,
			"limit" : 32,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"stack" : {
			"pretty" : "Stack Display",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},
		"logReroute": {
			"pretty": "Log Reroute",
			"use": true,
			"open": null,
			"default": "N/A",
			"highlight": "N/A"
		}
	},
	"needles" : ["asdf"],
	"blacklist" : [
		"/^\\s*\\S{0,3}\\s*$/",
		"/^s*(?:true|false)s*$/gi"
	],
	"functions" : [
		"eval",
		"set(Element.innerHTML)",
		"set(Element.outerHTML)",
		"document.write",
		"document.writeln"
	],
	"types" : ["string"],
};

