var rewriter = function(CONFIG) {
	// set of strings to search for
	const searchSeen = new Set();
	const search = {
		userSource : [],
		needle : [],
		winname : [],
		fragment : [],
		query : [],
		cookie : [],
		localStore : [],
	};

	/**
	* Helper function to turn parsable arguments into nice strings
	* @arg {Object|string} arg Argument to be turned into a string
	**/
	function argToString(arg) {
		if (typeof(arg) === "string")
			return arg
		if (typeof(arg) === "object")
			return real.JSON.stringify(arg)
		return arg.toString();
	}

	/**
	* Returns the type of an argument. Returns null if the argument should be
	* skipped.
	* @arg arg Argument to have it's type checked
	*/
	function typeCheck(arg) {
		let knownTypes = [
			"function", "string", "number", "object", "undefined", "boolean",
			"symbol"
		];
		let t = typeof(arg);

		// sanity
		if (!knownTypes.includes(t)) {
			throw `Unexpect argument type ${t} for ${arg}`;
		}

		// configured to not check
		if (!CONFIG.types.includes(t)) {
			return null;
		}

		return t;
	}

	/**
	* Turn all arguments into strings and change record original type
	*
	* @args {Object} args `arugments` object of hooked function
	*/
	function getArgs(args) {
		let ret = [];
		for (let i in args) {
			if (!args.hasOwnProperty(i)) continue;
			let t = typeCheck(args[i]);
			if (t === null) continue;
			let str = argToString(args[i]);

			ret.push({
				"type": t,
				"str" : str,
				"num" : +i,
			});
		}
		return {
			"args" : ret,
			"len" : args.length,
		};
	}

	function printTitle(name, format, num) {
		let titleGrp = "%c[EV] %c%s%c %s"
		let func = real.logGroup;
		var values = [
			format.default, format.highlight, name, format.default, location.href
		];

		if (!format.open) {
			func = real.logGroupCollapsed;
		}
		if (num >1) {
			// add arg number in format
			titleGrp = "%c[EV] %c%s[%d]%c %s"
			values.splice(3,0,num);
		}
		func(titleGrp, ...values)
		return titleGrp;
	}

	/**
	* Print all the arguments to the hooked funciton
	*
	* @argObj {Array} args array of arguments
	**/
	function printArgs(argObj) {
		let argFormat = CONFIG.formats.args;
		if (!argFormat.use) return;
		let func = argFormat.open ? real.logGroup : real.logGroupCollapsed;

		if (argObj.len === 1	&& argObj.args.length == 1) {
			let arg = argObj.args[0];
			let argTitle ="%carg(%s):";
			let data = [
				argFormat.default,
				arg.type,
			];
			func(argTitle, ...data);
			real.log("%c%s", argFormat.highlight, arg.str);
			real.logGroupEnd(argTitle);
			return
		}

		let argTitle = "%carg[%d/%d](%s): "
		let total = argObj.len;
		for (let i of argObj.args) {
			func(argTitle, argFormat.default, i.num+1, total, i.type);
			real.log("%c%s", argFormat.highlight, i.str);
			real.logGroupEnd(argTitle);
		}
	}

	function zebraBuild(arr, fmts) { // fmt2 is used via arguments
		let fmt = "%c%s".repeat(arr.length);
		let args = [];
		for (var i=0; i<arr.length; i++) {
			args.push(fmts[i % 2]);
			args.push(arr[i]);
		}
		args.unshift(fmt);
		return args;
	}

	function zebraLog(arr, fmt) {
		real.log(...zebraBuild(arr, [fmt.default, fmt.highlight]));
	}

	function zebraGroup(arr, fmt) {
		let a = zebraBuild(arr, [fmt.default, fmt.highlight]);
		if (fmt.open) {
			real.logGroup(...a);
		} else {
			real.logGroupCollapsed(...a);
		}
		return a[0];
	}

	/**
	* Check interest and get printers for each interesting result
	*
	* @argObj {Array} args array of arguments
	**/
	function getInterest(argObj) {
		function hlSlice(str, needle) {
			const ret = [];
			if (typeof(needle) === "string") {
				str.split(needle).forEach((x,index,arr)=> {
					ret.push(x)
					if (index != arr.length-1) {
						ret.push(needle)
					}
				});
			} else if (needle.global == false) {
				// not global regex, so just split into two on first
				needle.lastIndex = 0;
				const m = needle.exec(str)[0];
				const l = str.split(m);
				ret.push(l[0], m, l[1]);
			} else {
				let holder = str;
				let match = null;
				needle.lastIndex = 0;
				let prevLast = 0;

				while ((match = needle.exec(str)) != null) {
					let m = match[0];
					ret.push(holder.substr(0, holder.indexOf(m)));
					ret.push(m);
					holder = holder.substr(holder.indexOf(m)+m.length);
					if (prevLast >= needle.lastIndex) {
						real.warn("[EV] Attempting to highlight matches for this regex will cause infinite loop, stopping")
						break;
					}
					prevLast = needle.lastIndex;
				}
				ret.push(holder);
			}
			return ret;
		}

		function testit(str, needle) {
			if (typeof(needle) === "string") {
				if (str.includes(needle)) {
					return true;
				}
			} else if (needle.test(str)) {
				return true;
			}
			return false;
		}

		function printer(s, arg, fmt) {
			let word = s.search;
			let dots = "";
			if (word.length > 80) {
				dots = "..."
				word = s.search.substr(0, 77);
			}
			let title = [
				s.param ? `${s.name}[${s.param}]:` : `${s.name}:`,
				word
			];
			if (argObj.len > 1) {
				title.push(`${dots} found (arg:`, arg.num, ")");
			} else {
				title.push(`${dots} found`);
			}
			if (s.decode) {
				title.push(" [Decoded]");
			}

			let end = zebraGroup(title, fmt);
			if (dots) {
				let d = "Entire needle:"
				real.logGroupCollapsed(d);
				real.log(s.search);
				real.logGroupEnd(d);
			}
			if (s.decode) {
				let d = "Encoder function:";
				real.logGroupCollapsed(d);
				let add = "\t";
				let pmtwo = false;
				switch (s.name) {
				case "localStore":
					if (!s.param) break;
					add += `if (y) localStorage.setItem("${s.param}", x);\n\t`;
					pmtwo = true;
					break;
				case "query":
					if (!s.param) break;
					add +=  `let _ = new URL(window.location.href);\n\t`
					add += `// next line might need some changes\n\t`;
					add += `_.searchParams.set('${s.param}', decodeURIComponent(x));\n\t`;
					add += `x = {href: _.href, param: x};\n\t`;
					add += `if (y) window.location = x.href;\n\t`
					pmtwo = true;
					break;
				case "window.name":
					add +=  `if (y) window.name = x;\n\t`
					pmtwo = true;
					break;
				}

				real.log(`encoder = ${pmtwo ? "(x, y)" : "x"} => {\n${s.decode}${add}return x;\n}//`);
				real.logGroupEnd(d);
			}
			let ar = hlSlice(arg.str, s.search);
			zebraLog(ar, fmt);
			real.logGroupEnd(end);
		}

		// update search lists with changing input first
		addChangingSearch();

		let ret = [];
		// do all tests
		for (let field in search) {
			for (let test of search[field]) {
				const fmt = CONFIG.formats[field];
				for (let arg of argObj.args) {
					if (testit(arg.str, test.search)) {
						ret.push(()=>printer(test, arg, fmt));
					}
				}
			}
		}
		return ret;
	}

	/**
	* Parse all arguments for function `name` and pretty print them in the console
	* @name {string} name Name of function that is being hooked
	* @args {Array}	args array of arguments
	**/
	function EvalVillainHook(name, args) {
		let argObj = getArgs(args);
		if (argObj.args.length == 0) {
			return true;
		}

		// does this call have an interesting result?
		let format = null;
		let printers = getInterest(argObj);

		if (printers.length > 0) {
			format = CONFIG.formats.interesting;
			if (!format.use) {
				return false;
			}
		} else {
			format = CONFIG.formats.title;
			if (!format.use) {
				return false;
			}
		}

		let titleGrp = printTitle(name, format, argObj.len);
		printArgs(argObj);

		// print all intereresting reuslts
		printers.forEach(x=>x());

		// stack display
		// don't put this into a function, it will be one more thing on the call
		// stack
		let stackFormat = CONFIG.formats.stack;
		if (stackFormat.use) {
			let stackTitle = "%cstack: "
			if (stackFormat.open) {
				real.logGroup(stackTitle, stackFormat.default);
			} else {
				real.logGroupCollapsed(stackTitle, stackFormat.default);
			}
			real.trace();
			real.logGroupEnd(stackTitle);
		}
		real.logGroupEnd(titleGrp);
		return false;
	} // end EvalVillainHook

	class evProxy {
		apply(target, thisArg, args) {
			EvalVillainHook(this.evname, args);
			return Reflect.apply(...arguments);
		}
		construct(target, args, newArg) {
			EvalVillainHook(this.evname, args);
			return Reflect.construct(...arguments);
		}
	}

	/*
	 * NOTICE:
	 * updates here should maybe be reflected in input validation
	 * file: /pages/config/config.js
	 * function: validateFunctionsPattern
	*/
	function applyEvalVillain(evname) {
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

		function hookErr(err, args, evname) {
			real.warn("[EV] (%s) hook encountered an error: %s", evname, err.message);
			real.dir(args);
		}
		var ownprop = /^(set|value)\(([a-zA-Z.]+)\)\s*$/.exec(evname);
		let ep = new evProxy;
		ep.evname = evname
		if (ownprop) {
			let prop = ownprop[1];
			let f = getFunc(ownprop[2]);
			let orig = Object.getOwnPropertyDescriptor(f.where.prototype, f.leaf)[prop];
			Object.defineProperty(f.where.prototype, f.leaf, {[prop] : new Proxy(orig, ep)});
		} else if (!/^[a-zA-Z.]+$/.test(evname)) {
			real.log("[EV] name: %s invalid, not hooking", evname);
		} else {
			let f = getFunc(evname);
			f.where[f.leaf] = new Proxy(f.where[f.leaf], ep);
		}
	}

	function strToRegex(obj) {
		for (let i=0; i<obj.length; i++) {
			let match = /^\/(.*)\/(i|g|gi|ig)?$/.exec(obj[i]);
			if (match) {
				try {
					obj[i] = new RegExp(match[1], match[2] === undefined ? "" : match[2]);
				} catch (err) {
					real.warn("[EV] Creating regex %s error: %s", obj[i].name, err.message);
				}
			}
		}
	}

	function addChangingSearch() {
		// window.name
		var form = CONFIG.formats.winname;
		let wn = window.name;
		if (form.use) {
			addToSearch("winname", {
					name: "window.name",
					search: wn,
				});
		}

		form = CONFIG.formats.fragment;
		if (form.use) {
			addToSearch("fragment", {
				search: location.hash.substring(1),
			});
		}
	}

	function addToSearch(addTo, sObj) {
		if (!sObj.name) {
			sObj.name = addTo;
		}
		for (let tup of decodeFirst(sObj.search)) {
			if (!addIt(addTo, {
				name: sObj.name,
				param: sObj.param,
				search: tup[0],
				format: sObj.format,
				decode: tup[1],
			})) {
				break;
			}
		}

		function isNeedleBad(str) {
			if (typeof(str) !== "string" || str.length == 0 || searchSeen.has(str)) {
				return true;
			}
			for (let needle of CONFIG.blacklist) {
				if (typeof(needle) === "string") {
					if (needle.length > 0 && str.indexOf(needle) >= 0) {
						return true;
					}
				} else { // regex
					needle.lastIndex = 0;
					if (needle.test(str)) {
						return true;
					}
				}
			}
			return false;
		}

		function addIt(addTo, sObj) {
			const limit = 500;
			let size = searchSeen.size;
			const seenlist = search[addTo];
			if (size >= limit) {
				if (!["needle", "fragment", "query"].includes(addTo) && seenlist.length > 0) {
					// we can remove last item and cycle
					const last = seenlist.shift();
					searchSeen.delete(last.search);
				} else {
					const col = CONFIG.formats.interesting;
					real.log(
					  `%c[EV WARNING]%c size limit (${limit}) reached for ${addTo} parameters in ${location.href}`,
						col.highlight, col.default);
					return false;
				}
			}

			searchSeen.add(sObj.search);
			seenlist.push(sObj);
			return true;
		}

		function* decodeFirst(s) {
			// TODO: Sets...
			if (typeof(s) === 'string') {
				yield *decodeAll(s);
			} else if (typeof(s) === "object") {
				const fwd = `\t{\n\t\tlet _ = ${JSON.stringify(s)};\n\t\t_`;
				yield* decodeAny(s, `\t\tx = _\n\t}\n`, fwd);
			}
		}

		function* decodeAny(any, decoded, fwd) {
			if (Array.isArray(any)) {
				yield* decodeArray(any, decoded, fwd);
			} else if (typeof(any) == "object"){
				yield* decodeObject(any, decoded, fwd);
			} else {
				yield* decodeAll(any, fwd + "= x;\n" + decoded);
			}
		}

		function* decodeArray(a, decoded, fwd) {
			for (let i in a) {
				yield* decodeAny(a[i], decoded, fwd+`[${i}]`);
			}
		}

		function* decodeObject(o, decoded, fwd) {
			for (let prop in o) {
				yield* decodeAny(o[prop], decoded, fwd+`[${JSON.stringify(prop)}]`);
			}
		}
		/**
		* Generate all possible decodings for string
		* @s {string}	args array of arguments
		* @decoded {string} string representing deocoding method
		*
		**/
		function* decodeAll(s, decoded="") {
			if (isNeedleBad (s)) {
				return;
			}
			yield [s, decoded];

			// JSON
			try {
				const dec = real.JSON.parse(s);
				if (dec) {
					const fwd = `\t{\n\t\tlet _ = ${s};\n\t\t_`;
					yield* decodeAny(dec, `\t\tx = JSON.stringify(_);\n\t}\n${decoded}`, fwd);
					return;
				}
			} catch (_) {};

			// atob
			try {
				const dec = myatob(s);
				if (dec) {
					yield* decodeAll(dec, `\tx = btoa(x);\n${decoded}`);
					return;
				}
			} catch (_) {};

			// string replace
			const dec = s.replaceAll("+", " ");
			if (dec !== s) {
				yield* decodeAll(dec, `\tx = x.replaceAll("+", " ");\n${decoded}`);
			}

			if (!s.includes("%")) {
				return;
			}

			// match all of them
			try {
				const dec = real.decodeURIComponent(s);
				if (dec && dec != s) {
					yield* decodeAll(dec, `\tx = encodeURIComponent(x);\n${decoded}`);
				}
			} catch(_){}

			// match all of them
			try {
				const dec = real.decodeURI(s);
				if (dec && dec != s) {
					yield* decodeAll(dec, `\tx = encodeURIComponent(x);\n${decoded}`);
				}
			} catch(_){}
		}
	}

	function buildSearches() {
		var formats = CONFIG["formats"];

		// needles
		if (formats.needle.use) {
			for (let needle of CONFIG["needles"]) {
				search.needle.push({
					name:"needle",
					search: needle,
					format: CONFIG.formats["needle"],
					decode: "",
				});
			}
		}

		// query string
		if (formats.query.use) {
			// entire query
			let query = window.location.search;
			if (query.length > 1) {
				let re = /[&\?]([^=]*)=([^&]*)/g;
				let loop = 0;
				let match = false;
				while (match = re.exec(query)) {
					if (loop++ > 200) {
						real.warn("[EV] More then 200 URL parameters?");
						break;
					}
					addToSearch("query", {
						param: match[1],
						search: match[2],
					});
				} // while regex loop
			} // if query.length
		}

		// cookies
		if (formats.cookie.use) {
			for (let i of document.cookie.split(/;\s*/)) {
				let s = i.split("=");
				if (s.length >= 2) {
					addToSearch("cookie", {
						param: s[0],
						search: s[1],
					});
				} else {
					addToSearch("cookie", {
						name: `cookie`,
						search: s[0],
					});
				}
			}
		}

		if (formats.localStore.use){
			let l = localStorage.length;
			for (let i=0; i<l; i++) {
				let name = localStorage.key(i);
				addToSearch("localStore", {
					param: name,
					search: localStorage.getItem(name),
				});
			}
		}

		addChangingSearch();
	}

	// prove we loaded
	document.currentScript.setAttribute(CONFIG.checkId, true);
	delete CONFIG["checkId"];

	// grab real functions before hooking
	var real = {
		log : console.log,
		debug : console.debug,
		warn : console.warn,
		dir : console.dir,
		logGroup : console.group,
		logGroupEnd : console.groupEnd,
		logGroupCollapsed : console.groupCollapsed,
		trace : console.trace,
		JSON : JSON,
		decodeURIComponent : decodeURIComponent,
		decodeURI : decodeURI,
	}
	myatob = atob;
	for (let name of CONFIG["functions"]) {
		applyEvalVillain(name);
	}

	// turns console.log into console.info
	if (CONFIG.formats.logReroute.use) {
		console.log = console.info;
	}

	if (CONFIG.sinker) {
		window[CONFIG.sinker] = EvalVillainHook;
		delete CONFIG.sinker;
	}

	if (CONFIG.sourcer) {
		const fmt = CONFIG.formats.userSource;
		if (fmt.use) {
			const srcer = CONFIG.sourcer;
			window[srcer] = (n, v, debug=false) => {
				if (debug) {
					const o = typeof(v) === 'string'? v: real.JSON.stringify(v);
					real.debug(`[EV] ${document.location.origin} EVSinker '${n}' added: ${o}`);
				}
				addToSearch("userSource", {
						name: `${srcer}[${n}]`,
						search: v,
					});
				return false;
			}
			delete CONFIG.sourcer;
		}
	}

	strToRegex(CONFIG.needles);
	strToRegex(CONFIG.blacklist);
	buildSearches(); // must be after needles are turned to regex

	real.log("%c[EV]%c Functions hooked for %c%s%c",
		CONFIG.formats.interesting.highlight,
		CONFIG.formats.interesting.default,
		CONFIG.formats.interesting.highlight,
		document.location.origin,
		CONFIG.formats.interesting.default
	);
}

function makeid() {
	let ret = '';
	const alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let i = Math.random() * 16 + 8;
	while (i < 32) {
		ret += alph.charAt(Math.floor(Math.random() * alph.length));
		i += 1;
	}
	return ret;
}

/*
 * start content script
 *
 * Everything above is what will be injected
*/
function inject_it(func, info) {
	const checkId = `data-${makeid()}`; // document gets a head.div with id checkId on success

	func = func.toString();
	info["checkId"] = checkId;
	inject = `(${func})(${JSON.stringify(info)});`;

	var s = document.createElement('script');
	s.type = "text/javascript";
	s.onload = () => this.remove(); // Keep dom clean
	s.innerHTML = inject; // yeah, it's ironic
	document.documentElement.appendChild(s);

	if (!(checkId in s.attributes)) {
		console.log("%c[ERROR]%c EV failed to load on %c%s%c",
			config.formats.interesting.default,
			config.formats.interesting.highlight,
			config.formats.interesting.default,
			document.location.href,
			config.formats.interesting.highlight
		);
		s.remove();
	}
}

inject_it(rewriter, config);
