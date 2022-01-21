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

var cl = console.log;
var ct = console.trace;
var cg = console.group;
var cgc = console.groupCollapsed;
var cge = console.groupEnd;

var allCalls = [];
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
	let ret = [];
	for (let i in args) {
		ret.push(args[i]);
	}
	return JSON.stringify(ret);
}

function printNextArgs() {
	cl(argsToPrintable(allCalls[0]));
}

function argsIs(args, test) {
	if (args.length != test.length) {
		return {off: [`arg.length ${args.length} != ${test.length} test.length`], expect: test, got: args};
	}
	let c = 0;
	let off = []
	for (let i of args) {
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

function chckNArg(test, msg) {
	let why = argsIs(allCalls.shift(), test);
	if (why === true) {
		cgc(`[%c**%c] ${msg}`, "color:green", "color:None");
		cl(...test);
		cge();
	} else {
		fail(msg);
		cg("error info")
		for (let i of why.off) {
			cl(i);
		}
		cl("got: ", argsToPrintable(why.got));
		cl(...why.got);
		cl("expected: ", JSON.stringify(why.expect));
		cl(...why.expect);
		cge("error info")
	};
}

function checkStackBanner(msg) {
	chckNArg(["%cstack: ","color:None"], `${msg} stack banner`);
}
function checkArg(msg, value) {
	let type = typeof(value);
	chckNArg(["%carg(%s):",colNone, type], `${msg} arg test`);
	chckNArg(["%c%s", colGreen, value], `${msg} Interesting args`);
}

function testInterset(msg, name, reason, needle, line, decoded) {
	let value = line.join("");
	chckNArg(["%c[EV] %c%s%c %s", colRed, colGreen, name, colRed, location.href], `${msg} Interesting Banner`);
	checkArg(msg, value);

	var ban = null;
	if (decoded) {
		ban =['%c%s%c%s%c%s%c%s%c%s', colNone, `${reason}: `,
			colGreen, needle, colNone, " found", colGreen, " derived by: ", colNone, decoded];
	} else {
		ban = ["%c%s%c%s%c%s", colNone,`${reason}: `, colGreen, needle, colNone, " found"];
	}

	chckNArg(ban, `${msg} Interesting highlight`);

	let test = ["%c%s".repeat(line.length)];
	let colors = [colGreen, colNone];
	let ci = line.length % 2;
	for (let f of line) {
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


var colNone = "color:None";
var colGreen = "color:#088"
var colRed = "color:red"
var config =  {
	"formats" : {
		"title" : {
			"pretty" : "Normal Results",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		}, "interesting" : {
			"pretty" : "Interesting Results",
			"use" : true,
			"open" : true,
			"default" : colRed,
			"highlight" : colGreen
		}, "args" : {
			"pretty" : "Args Display",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		},"needle" : {
			"pretty" : "Needles Search",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		}, "query" : {
			"pretty" : "Query Search",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		}, "fragment" : {
			"pretty" : "Fragment Search",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		}, "winname" : {
			"pretty" : "window.name Search",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen
		}, "cookie" : {
			"pretty"	: "Cookie Search",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: colGreen"
		}, "localStore" : {
			"pretty"	: "localStorage",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		}, "stack" : {
			"pretty" : "Stack Display",
			"use" : true,
			"open" : true,
			"default" : colNone,
			"highlight" : colGreen}
	},
	"needles" : ["asdf"],
	"blacklist" : [
		"/^\\s*\\S{0,3}\\s*$/",
		"/^s*(?:true|false)s*$/gi"
	],
	"functions" : ["eval","setter(innerHTML)","setter(outerHTML)","document.write","document.writeln"],
	"types" : ["string"],
};
