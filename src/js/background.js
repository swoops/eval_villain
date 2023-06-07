var unreg = null;
var debug = false;

// default config stuff
var defaultConfig = {
	"functions" : [
		{
			"name" : "eval",
			"enabled" : true,
			"pattern" : "eval"
		}, {
			"name" : "Function",
			"enabled" : true,
			"pattern" : "Function"
		}, {
			"name" : "innerHTML",
			"enabled" : true,
			"pattern" : "set(Element.innerHTML)"
		}, {
			"name" : "outerHTML",
			"enabled" : true,
			"pattern" : "set(Element.outerHTML)"
		}, {
			"name" : "createContextualFragment",
			"enabled" : true,
			"pattern" : "value(Range.createContextualFragment)"
		}, {
			"name" : "document.write",
			"enabled" : true,
			"pattern" : "document.write"
		}, {
			"name" : "document.writeln",
			"enabled" : true,
			"pattern" : "document.writeln"
		}, {
			"name" : "setTimeout",
			"enabled" : true,
			"pattern" : "setTimeout"
		}, {
			"name" : "setInterval",
			"enabled" : true,
			"pattern" : "setInterval"
		}, {
			"name" : "URLSearchParams.get",
			"enabled" : false,
			"pattern" : "value(URLSearchParams.get)"
		}, {
			"name" : "decodeURI",
			"enabled" : false,
			"pattern" : "decodeURI"
		}, {
			"name" : "decodeURIComponent",
			"enabled" : false,
			"pattern" : "decodeURIComponent"
		}
	],
	"blacklist" : [
		{
			"name" : "Small Stuff",
			"enabled" : true,
			"pattern" : "/^\\s*\\S{0,3}\\s*$/"
		}, {
			"name" : "Boolean",
			"enabled" : true,
			"pattern" : "/^\\s*(?:true|false)\\s*$/gi"
		}
	],
	"needles" : [
		{
			"name" : "asdf",
			"enabled" : true,
			"pattern" : "asdf"
		}, {
			"name" : "Regex Example",
			"enabled" : false,
			"pattern" :"/[aeiou]/gi"
		}
	],
	"targets" : [
		{
			"name" : "Example Filter",
			"enabled" : false,
			"pattern" :"*://example.com/*"
		}
	],
	"types" : [
		{
			"name": "string",
			"pattern": "string",
			"enabled": true
		}, {
			"name": "object",
			"pattern": "object",
			"enabled": false
		}, {
			"name": "function",
			"pattern": "function",
			"enabled": false
		}, {
			"name": "number",
			"pattern": "number",
			"enabled": false
		}, {
			"name": "boolean",
			"pattern": "boolean",
			"enabled": false
		}, {
			"name": "undefined",
			"pattern": "undefined",
			"enabled": false
		}, {
			"name": "symbol",
			"pattern": "symbol",
			"enabled": false
		}
	],
	"globals" : [
		{
			"name" : "sinker",
			"enabled" : false,
			"pattern" : "evSinker"
		}, {
			"name" : "sourcer",
			"enabled" : false,
			"pattern" : "evSourcer"
		}
	],
	"formats": [
		{
			"name"		: "title",
			"pretty"	: "Normal Results",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight"	: "color: #088"
		}, {
			"name"		: "interesting",
			"pretty"	: "Interesting Results",
			"use"		: true,
			"open"		: true,
			"default"	: "color: red",
			"highlight" : "color: #088"
		}, {
			"name"		: "args",
			"pretty"	: "Args Display",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "needle",
			"pretty"	: "Needles Search",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "query",
			"pretty"	: "Query Search",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "fragment",
			"pretty"	: "Fragment Search",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "winname",
			"pretty"	: "window.name Search",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "cookie",
			"pretty"	: "Cookie Search",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		}, {
			"name"		: "localStore",
			"pretty"	: "localStorage",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		}, {
			"name"		: "userSource",
			"pretty"	: "User Sources",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color:#147599"
		}, {
			"name"		: "stack",
			"pretty"	: "Stack Display",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "logReroute",
			"pretty"	: "Log Reroute",
			"use"		: true,
			"open"		: null,
			"default"	: "N/A",
			"highlight" : "N/A"
		}
	]
}

function getAllConf() {
	return browser.storage.local.get(Object.keys(defaultConfig)).catch(console.error);
}

function debugLog() {
	if (!debug) return;
	console.log(...arguments);
}

async function checkStorage() {
	function saveIfNot(result) {
		function updateIt(what) {
			let k = {};
			k[what] = defaultConfig[what];
			return browser.storage.local.set(k)
				.then(() => console.log(`updated ${what}`));
		}

		for (let iter in defaultConfig) {
			if (result[iter] === undefined) {
				updateIt(iter); // DNE, add it
			} else if (iter === "formats") {
				if (!Array.isArray(result.formats)) {
					updateIt(iter, defaultConfig);
					continue;
				}
				// if defaultConfig has changed since install, we update
				let names = [];
				result.formats.forEach(x => names.push(x.name));
				for (let def of defaultConfig.formats) {
					if (names.includes(def)) {
						defaultConfig.formats = res.formats[names.indexOf(def)];
					}
				}
				updateIt(iter);
			}
		}
	}
	return getAllConf().then(saveIfNot);
}

// the following are default, they will be replaced by what is in the browser
// cache
async function register() {
	let trycnt = 0;
	if (unreg != null) {
		// content script is registered already, so remove it first don't worry
		// about the icon though, if we fail something else will change it to off
		removeScript(false);
	}

	function worked(x) {
		unreg = x;
		browser.browserAction.setTitle({title : "EvalVillain: ON"});
		browser.browserAction.setIcon({path : "/icons/on_48.png"});
		debugLog("[EV_DEBUG] %cInjection Script registered", "color:#088;")
		return new Promise(res => res());
	}

	function fixStorage() {
		if (trycnt++ > 2) {
			trycnt = 0;
			throw "Failed to get storage for content script";
		}
		return checkStorage()
			.then(() => getAllConf())
			.then(doReg);
	}

	function doReg(result) {
		for (let i of Object.keys(defaultConfig)) {
			if (result[i] === undefined || !Array.isArray(result[i])) {
				return fixStorage();
			}
		}

		let config = {};
		config.formats = {};
		for (let i of result.formats) {
			let tmp = Object.assign({}, i);
			config.formats[tmp.name] = tmp;
			delete tmp.name;
		}

		// globals
		for (let i of result.globals) {
			if (i.enabled) {
				config[i.name] = i.pattern;
			}
		}

		for (let what of ["needles", "blacklist", "functions", "types"]) {
			const tmp = [];
			for (let i of result[what]) {
				if (i.enabled) {
					tmp.push(i.pattern);
				}
			}
			config[what] = tmp;
		}

		if (config.functions.length === 0) {
			removeScript();
			res(false);
			return;
		}

		// target stuff {
		var match = [];
		let targRegex = /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^|)}>#]+|[^|)}>#]+)\/.*$/;
		for (let i of result.targets) {
			if (i.enabled) {
				if (targRegex.test(i.pattern)) {
					match.push(i.pattern);
				} else {
					console.error(
						"Error on Target %s: %s must match: %s",
						i.name, i.pattern, targRegex
					);
					res(false);
					return;
				}
			}
		}

		// no targets enabled means do all
		if (match.length === 0) {
			match.push("<all_urls>");
		}
		debugLog("[EV DEBUG] matches: %s", match);

		// firefox >=59, not supported in chrome...
		return browser.contentScripts.register({
			matches: match,
			js: [
				{code: "config = " + JSON.stringify(config)},
				{file: "/js/switcheroo.js"}
			],
			runAt: "document_start",
			allFrames : true
		});
	}

	return getAllConf()
		.then(doReg)
		.then(worked);
}

function removeScript(icon=true) {
	if (unreg) {
		unreg.unregister();
	}
	unreg = null;

	if (icon) {
		// turn of UI
		browser.browserAction.setTitle({title : "EvalVillain: OFF"});
		browser.browserAction.setIcon({ path : "/icons/off_48.png"});
	}
}

function toggleEV() {
	if (unreg) {
		removeScript();
		return new Promise(function(g) {g(false)});
	} else {
		return register();
	}
}

browser.commands.onCommand.addListener(function(command) {
	if (command == "toggle") toggleEV();
});

function handleMessage(request, sender, sendResponse) {
	if (request === "on?") {
		return new Promise(function(g) {
			g(unreg ? true : false);
		});
	} else if (request === "toggle") {
		return toggleEV();
	} else if (request === "updated") {
		if (unreg) {
			return register();
		} else {
			return new Promise(function(g) {g(false)});
		}
	} else {
		console.err("unknown msg: " + request);
	}
}

function handleInstalled(details) {
	debug = details.temporary;
	debugLog("[EV DEBUG] installed with debugging");
	checkStorage();
}

browser.runtime.onMessage.addListener(handleMessage);
browser.runtime.onInstalled.addListener(handleInstalled);
