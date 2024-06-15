// default config stuff
const defaultConfig = {
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
			"name"		: "path",
			"pretty"	: "Path Search",
			"use"		: false,
			"open"		: true,
			"default"	: "color: none",
			"highlight" : "color: #088"
		}, {
			"name"		: "referrer",
			"pretty"	: "Referrer Search",
			"use"		: false,
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

async function getAllConfValidated() {
	let dbconf = await getAllConf();
	for (let i = 0; i < 2; i++) { // retry loop
		let success = true;
		for (const i of Object.keys(defaultConfig)) {
			if (dbconf[i] === undefined || !Array.isArray(dbconf[i])) {
				await checkStorage();
				dbconf = await getAllConf();
				success = false;
			}
		}
		if (success) {
			return dbconf;
		}
	}
	return null;
}

function debugLog() {
	if (!this.debug) return;
	console.log(...arguments);
}

async function checkStorage() {
	const dbconf = await getAllConf();

	function updateIt(what) {
		const k = {};
		k[what] = defaultConfig[what];
		return browser.storage.local.set(k)
			.then(() => console.log(`updated ${what}`));
	}

	for (const iter in defaultConfig) {
		if (dbconf[iter] === undefined) {
			updateIt(iter); // DNE, add it
		} else if (iter === "formats") {
			if (!Array.isArray(dbconf.formats)) {
				updateIt(iter);
				continue;
			}
			// if defaultConfig has changed since install, we update
			const currentNames = dbconf.formats.map(x => x.name);
			const defNames = defaultConfig.formats.map(x => x.name);
			if (!arraysEqual(currentNames, defNames)) {
				updateIt(iter);
			}
		}
	}
}

function arraysEqual(a, b) {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

async function getConfigForRegister() {
	const dbconf = await getAllConfValidated();
		// .then(worked);

	const config = {};
	config.formats = {};
	for (const i of dbconf.formats) {
		const tmp = Object.assign({}, i);
		config.formats[tmp.name] = tmp;
		delete tmp.name;
	}

	// globals
	for (const i of dbconf.globals) {
		if (i.enabled) {
			config[i.name] = i.pattern;
		}
	}

	for (const what of ["needles", "blacklist", "functions", "types"]) {
		config[what] = config[what] = dbconf[what]
			.filter(x => x.enabled)
			.map(x => x.pattern);
	}

	// target stuff {
	const match = [];
	const targRegex = /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^|)}>#]+|[^|)}>#]+)\/.*$/;
	for (const i of dbconf.targets) {
		if (i.enabled) {
			if (targRegex.test(i.pattern)) {
				match.push(i.pattern);
			} else {
				throw `Error on Target ${i.name}: ${i.pattern} must match: ${targRegex}`;
			}
		}
	}

	// no targets enabled means do all
	if (match.length === 0) {
		match.push("<all_urls>");
	}
	debugLog("[EV DEBUG] matches: %s", match);
	return [config, match];
}


/**
* Registers the content script with the current config
**/
async function register() {
	if (this.unreg != null) {
		// content script is registered already, so remove it first don't worry
		// about the icon though, if we fail something else will change it to off
		removeScript(false);
	}
	const [config, match] = await getConfigForRegister();

	// anything to register?
	if (config.functions.length === 0) {
		removeScript();
		res(false);
		return;
	}

	const code = `config = ${JSON.stringify(config)};`;


	// firefox >=59, not supported in chrome...
	this.unreg = await browser.contentScripts.register({
		matches: match,
		js: [
			{code: code}, 					// contains configuration for rewriter
			{file: "/js/rewriter.js"},		// Has actual code that gets injected into the page
			{file: "/js/switcheroo.js"}		// cause the injection
		],
		runAt: "document_start",
		allFrames: true
	});

	browser.browserAction.setTitle({title: "EvalVillain: ON"});
	browser.browserAction.setIcon({path: "/icons/on_48.png"});
	debugLog("[EV_DEBUG] %cInjection Script registered", "color:#088;")
	return true;
}

function removeScript(icon=true) {
	if (this.unreg) {
		this.unreg.unregister();
	}
	this.unreg = null;

	if (icon) {
		// turn of UI
		browser.browserAction.setTitle({title: "EvalVillain: OFF"});
		browser.browserAction.setIcon({ path: "/icons/off_48.png"});
	}
}

function toggleEV() {
	if (this.unreg) {
		removeScript();
		return new Promise(res => res());
	} else {
		return register();
	}
}

browser.commands.onCommand.addListener(function(command) {
	if (command == "toggle") toggleEV();
});

function handleMessage(request, _sender, _sendResponse) {
	if (request === "on?") {
		return new Promise(res => res(this.unreg ? true: false));
	} else if (request === "toggle") {
		return toggleEV();
	} else if (request === "updated") {
		if (this.unreg) {
			return register();
		} else {
			return new Promise(res => res(false));
		}
	} else if (request === "getScriptInfo") {
		return getConfigForRegister();
	} else {
		const er = `unkown msg: ${request}`;
		console.error(er);
	}
}

function handleInstalled(details) {
	this.debug = details.temporary;
	debugLog("[EV DEBUG] installed with debugging");
	checkStorage();
	if (this.debug) {
		register();
	}
}

browser.runtime.onMessage.addListener(handleMessage);
browser.runtime.onInstalled.addListener(handleInstalled);
