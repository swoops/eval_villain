var unreg = null;
var debug = false;

// default config stuff
var defaultConfig = {
	"functions" : [
		{
			"name" : "Eval",
			"enabled" : true,
			"pattern" : "eval"
		},
		{
			"name" : "innerHTML",
			"enabled" : true,
			"pattern" : "setter(innerHTML)"
		},
		{
			"name" : "outerHTML",
			"enabled" : true,
			"pattern" : "setter(outerHTML)"
		},
		{
			"name" : "doc write",
			"enabled" : true,
			"pattern" : "document.write"
		},
		{
			"name" : "doc writeln",
			"enabled" : true,
			"pattern" : "document.writeln"
		}
	],
	"blacklist" : [
		{
			"name" : "Small Stuff",
			"enabled" : true,
			"pattern" : "/^\\s*\\S{0,3}\\s*$/"
		},
		{
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
		},
		{
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
	// TODO: combine with formats?
	"autoOpen" : [ // user can only toggle enabled value for this object
		{
				"name": "Normal Results",
				"pattern": "title",
				"enabled": false
		}, {
				"name": "Interesting Results",
				"pattern": "interesting",
				"enabled": true
		}, {
				"name": "Args Dsipaly",
				"pattern": "args",
				"enabled": false
		}, {
				"name": "Needle Search",
				"pattern": "needle",
				"enabled": true
		}, {
				"name": "Query Search",
				"pattern": "query",
				"enabled": true
		}, {
				"name": "Fragment Search",
				"pattern": "fragment",
				"enabled": true
		}, {
				"name": "window.name Search",
				"pattern": "winname",
				"enabled": true
		}, {
				"name": "Stack Display",
				"pattern": "stack",
				"enabled": false
		}
	],
	"onOff" : [ // user can only toggle enabled value for this object
		{
				"name": "Normal Results",
				"pattern": "title",
				"enabled": true
		}, {
				"name": "Intresting Results",
				"pattern": "interesting",
				"enabled": true
		}, {
				"name": "Args Dsipaly",
				"pattern": "args",
				"enabled": true
		}, {
				"name": "Needle Search",
				"pattern": "needle",
				"enabled": true
		}, {
				"name": "Query Search",
				"pattern": "query",
				"enabled": true
		}, {
				"name": "Fragment Search",
				"pattern": "fragment",
				"enabled": true
		}, {
				"name": "window.name Search",
				"pattern": "winname",
				"enabled": true
		}, {
				"name": "Stack Display",
				"pattern": "stack",
				"enabled": true
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
	"formats": {
		"title" : {
			"pretty"		: "Normal Results",
			"use"				: true,
			"open"			: false,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"interesting" : {
			"pretty"		: "Interesting Results",
			"use"				: true, // TODO: think: always true? cause inverse needle search? that is strange logic...
			"open"			: false,
			"default"		: "color: red",
			"highlight" : "color: #088"
		},
		"args" : {
			"pretty"		: "Args Display",
			"use"				: true,
			"open"			: true,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"needle" : {
			"pretty"		: "Needles Search",
			"use"				: true,
			"open"			: true,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"query" : {
			"pretty"		: "Query Search",
			"use"				: true,
			"open"			: false,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"winname" : {
			"pretty"		: "window.name Search",
			"use"				: true,
			"open"			: true,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"fragment" : {
			"pretty"		: "Fragment Search",
			"use"				: true,
			"open"			: true,
			"default"		: "color: none",
			"highlight" : "color: #088"
		},
		"stack" : {
			"pretty"		: "Stack Display",
			"use"				: true,
			"open"			: true,
			"default"		: "color: none",
			"highlight" : "color: #088"
		}
	}
}

function debugLog() {
	if (!debug) return;
	console.log(...arguments);
}

function checkStorage() {
	function saveIfNot(result) {
		function updateIt(what, from) {
			let k = {};
			k[what] = from[what];
			return browser.storage.local.set(k)
				.then(x => debugLog(`[EV DEBUG] Updated: ${what}`));
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
					updateIt(iter, defaultConfig);
					return;
				}
			}
			for (let elm of defNames) {
				updateIt(iter, defaultConfig);
			}
		}

		for (let iter in defaultConfig) {
			if (result[iter] === undefined) {
				updateIt(iter, defaultConfig);
			} else if (["autoOpen", "onOff", "types"].includes(iter)) {
				objarrayFix(iter);
			} else if (iter === "formats") {
				let updated = result[iter];
				let curFormat = new Set(Object.keys(updated));
				let defFormat = new Set(Object.keys(defaultConfig[iter]));
				if (Object.keys(updated).length !== curFormat.size)
					throw(`Current config has has duplicates in ${iter}`);
				if (Object.keys(defaultConfig[iter]).length !== defFormat.size)
					throw(`Default config has has duplicates in ${iter}`);

				let doupdate = false;
				for (let elm of curFormat) {
					if (!defFormat.delete(elm)) {
						doupdate = true;
						debugLog(`[EV DEBUG] Current ${iter} has extra value ${elm}, removing`);
						delete updated[elm];
					}
				}

				for (let elm of defFormat) {
					debugLog(`[EV DEBUG] Current ${iter} is missing ${elm}, adding`);
					updated[elm] = defaultConfig[iter][elm];
						doupdate = true;
				}
				if (doupdate) {
					updateIt(iter, updated);
				}
			}
		}
	}


	let allStorage = Object.keys(defaultConfig);
	var res = browser.storage.local.get(allStorage);
	res.then(
		saveIfNot,
		function(err) {console.error("failed to access local stroage: %s", err)}
	);
}

// the following are default, they will be replaced by what is in the browser
// cache
async function register() {
	return new Promise(function(res, fail) {
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
			res(true);
		}

		function doReg(result) {
			for (let i of allStorage) {
				if (result[i] === undefined) {
					console.error("Could not get %s to register content script", i);
					removeScript();
					res(false);
					return;
				}
			}

			var match = [];

			// target stuff
			for (let targ of result.targets) {
				if (targ.enabled) {
					if (
						/^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^|)}>#]+|[^|)}>#]+)\/.*$/.test(targ.pattern)
					) {
						match.push(targ.pattern);
					}else{
						console.error(
							"Error on Target %s: %s must match: %s",
							targ.name,
							targ.pattern,
							/^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^|)}>#]+|[^|)}>#]+)\/.*$/
						);
						res(false);
						return;
					}
				}
			}

			let config = {};
			config.formats = result.formats;

			for (let what of ["needles", "blacklist", "functions"]) {
				let tmp = [];
				for (let i of result[what]) {
					if (i.enabled) {
						tmp.push(i.pattern);
					}
				}
				config[what] = tmp;
			}

			// autoOpen
			for (let i of result.autoOpen) {
				if (config.formats[i.pattern]) {
					config.formats[i.pattern].open = i.enabled
				}else{
					console.warn("uknown autoOpen pattern: %s, name: %s", i.pattern, i.name);
				}
			}

			// onOff values
			for (let i of result.onOff) {
				if (config.formats[i.pattern]) {
					config.formats[i.pattern].use = i.enabled
				}else{
					console.warn("uknown onOff pattern: %s, name: %s", i.pattern, i.name);
				}
			}

			// types list of enabled types
			config.types = [];
			for (let i of result.types)
				if (i.enabled)
					config.types.push(i.patern);


			if (config.functions.length === 0) {
				removeScript();
				res(false);
				return;
			}

			// no targets enabled means do all
			if (match.length === 0) match.push("<all_urls>");
			debugLog("[EV DEBUG] matches: %s", match);

			// firefox >=59, not supported in chrome...
			try{
				browser.contentScripts.register({
					matches: match,
					js: [
						{code: "config = " + JSON.stringify(config)},
						{file: "/js/switcheroo.js"}
					],
					runAt: "document_start",
					allFrames : true
				}).then(
					worked,
					function(err) {
						// TODO: alert user better then this
						unreg = null;
						console.error("failed to register content script: " + err)
						return false;
					}
				);
			}catch (err) {
				console.error("Failed to load script: %s", err);
				removeScript();
				res(false);
				return;
			}
		}

		let allStorage = Object.keys(defaultConfig);
		var result = browser.storage.local.get(allStorage);
		result.then(
			doReg,
			function(err) {
				console.error("failed to get storrage: " + err)
				return false;
			}
		);
	});
}

function removeScript(icon=true) {
	if (unreg) unreg.unregister();
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
	}else{
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
	}else if (request === "toggle") {
		return toggleEV();
	}else if (request === "updated") {
		if (unreg) {
			return register();
		}else{
			return new Promise(function(g,b) {g(false)});
		}
	}else{
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
