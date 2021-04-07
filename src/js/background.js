var unreg = null;
var debug = false;

// default config stuff
var defaultConfig = {
	"functions" : [
		{
			"name" : "Eval",
			"enabled" : true,
			"pattern" : "eval"
		}, {
			"name" : "innerHTML",
			"enabled" : true,
			"pattern" : "setter(innerHTML)"
		}, {
			"name" : "outerHTML",
			"enabled" : true,
			"pattern" : "setter(outerHTML)"
		}, {
			"name" : "doc write",
			"enabled" : true,
			"pattern" : "document.write"
		}, {
			"name" : "doc writeln",
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
			"name" : "Boolian",
			"enabled" : true,
			"pattern" : "/^\s*(?:true|false)\s*$/gi"
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
			"patern": "string",
			"enabled": true
		}, {
			"name": "object",
			"patern": "object",
			"enabled": false
		}, {
			"name": "function",
			"patern": "function",
			"enabled": false
		}, {
			"name": "number",
			"patern": "number",
			"enabled": false
		}, {
			"name": "boolean",
			"patern": "boolean",
			"enabled": false
		}, {
			"name": "undefined",
			"patern": "undefined",
			"enabled": false
		}, {
			"name": "symbol",
			"patern": "symbol",
			"enabled": false
		}
	],
	"formats": [
		{
			"name"		: "title",
			"pretty"	: "Normal Results",
			"use"		: false,
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
			"use"		: false,
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
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		}, {
			"name"		: "localStore",
			"pretty"	: "localStorrage",
			"use"		: true,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: yellow"
		}, {
			"name"		: "stack",
			"pretty"	: "Stack Display",
			"use"		: true,
			"open"		: false,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}
	]
}

function debugLog() {
	if (!debug) return;
	console.log(...arguments);
}

function checkStorage() {
	function saveIfNot(result) {
		function updateIt(what) {
			let k = {};
			k[what] = defaultConfig[what];
			return browser.storage.local.set(k)
				.then(() => console.log(`updated ${what}`));
		}

		function objarrayFix(iter) {
			let modified = false;
			let name = "name";
			let curNames = new Set();
			let defNames = new Set();
			result[iter].forEach(x=>curNames.add(x[name]));
			defaultConfig[iter].forEach(x=>defNames.add(x[name]));

			if (result[iter].length !== curNames.size)
				throw(`Current config has has duplicates in ${iter}`);
			if (defaultConfig[iter].length !== defNames.size)
				throw(`Default config has has duplicates in ${iter}`);

			for (let elm of curNames) {
				if (!defNames.delete(elm)) {
					updateIt(iter);
					return;
				}
			}
			for (let elm of defNames) {
				updateIt(iter);
			}
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
				let k = 0;
				for (let def of defaultConfig.formats) {
					if (names.includes(def)) {
						defaultConfig.formats = res.formats[names.indexOf(def)];
					}
				}
				updateIt(iter);
			}
		}
	}

	let allStorage = Object.keys(defaultConfig);

	// XXX no longer used, remove in newer version
	browser.storage.local.remove("autoOpen").then(x=>console.log("removed autoOpen"));
	browser.storage.local.remove("onOff").then(x=>console.log("removed onOff"));

	return browser.storage.local.get(allStorage)
		.then(saveIfNot);
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
		debugLog("[EV_DEBUG] %cInjection Script regsitered", "color:#088;")
		return new Promise(res => res());
	}

	function fixStorage() {
		if (trycnt++ > 2) {
			trycnt = 0;
			throw "Failed to get storrage for content script";
		}
		return checkStorage()
			.then(() => browser.storage.local.get(allStorage))
			.then(doReg);
	}

	function doReg(result) {
		for (let i of allStorage) {
			if (result[i] === undefined || !Array.isArray(result[i])) {
				return fixStorage();
			}
		}

		var match = [];
		let config = {};
		config.formats = {};
		for (let i of result.formats) {
			let tmp = Object.assign({}, i);
			config.formats[tmp.name] = tmp;
			delete tmp.name;
		}

		// types list of enabled types
		config.types = [];
		for (let i of result.types) {
			if (i.enabled) {
				config.types.push(i.patern);
			}
		}

		for (let what of ["needles", "blacklist", "functions"]) {
			let tmp = [];
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

	let allStorage = Object.keys(defaultConfig);
	return browser.storage.local.get(allStorage)
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
		return new Promise(function(g,b) {g(false)});
	} else {
		return register();
	}
}

browser.commands.onCommand.addListener(function(command) {
	if (command == "toggle") toggleEV();
});

function handleMessage(request, sender, sendResponse) {
	if (request === "on?") {
		return new Promise(function(good, bad) {
			good(unreg ? true : false);
		});
	} else if (request === "toggle") {
		return toggleEV();
	} else if (request === "updated") {
		if (unreg) {
			return register();
		} else {
			return new Promise(function(g,b) {g(false)});
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
