var rewriter = function(CONFIG) {
	// set of strings to search for
	this.searchSeen = new Set();
	this.search = {
		needle : [],
		winname : [],
		fragment : [],
		query : [],
		cookies : [],
		localStorage : [],
	};

	function invalidArgType(arg, num, argType) {
		let errtitle = "%c[EV] Error: %c%s%c Unexpected argument type for [%d], got %c%s"
		let hl	 = CONFIG.formats.title.highlight;
		let dflt = CONFIG.formats.title.default;
		real.logGroupCollapsed(
			errtitle, dflt,
			hl, name, dflt,
			num,
			hl, argType
		);
		real.logGroup("args:");
		real.dir(arg);
		real.logGroupEnd("args array:");
		real.logGroupCollapsed("trace:");
		real.trace();
		real.logGroupEnd("trace:");
		real.logGroupEnd(errtitle);
	}

	/**
	* Helper function to turn parsable arguments into nice strings
	* @arg {Object|string} arg Argument to be turned into a string
	**/
	function argToString(arg) {
		if (typeof(arg) === "string")
			return arg
		if (typeof(arg) === "object")
			return JSON.stringify(arg)
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
			invalidArgType(args[i], +i, t);
			return t;
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
		let hasInterest = 0;

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

		if (!format.open) func = real.logGroupCollapsed;
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

	function zebraBuild(arr, fmt1, fmt2) {
		let fmt = "%c%s".repeat(arr.length);
		let args = [];
		for (var i=0; i<arr.length; i++) {
			args.push(arguments[1+(i%2)]);
			args.push(arr[i]);
		}
		args.unshift(fmt);
		return args;
	}

	function zebraLog(arr, fmt) {
		real.log(...zebraBuild(arr, fmt.default, fmt.highlight));
	}

	function zebraGroup(arr, fmt) {
		let a = zebraBuild(arr, fmt.default, fmt.highlight);
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
			let ret = [];
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
				let m = needle.exec(str)[0];
				str.split(m).forEach(x=>ret.push(x,m));
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

		function printer(s, arg) {
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

			let end = zebraGroup(title, s.format);
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
				case "localStorage":
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
			zebraLog(ar, s.format);
			real.logGroupEnd(end);
		}

		// update search lists with changing input first
		addChangingSearch();


		let ret = [];
		// do all tests
		for (let field in this.search) {
			for (let test of this.search[field]) {
				for (let arg of argObj.args) {
					if (testit(arg.str, test.search)) {
						ret.push(()=>printer(test,arg));
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
		if (argObj.args.length == 0) return;

		// does this call have an interesting result?
		let format = null;
		let printers = getInterest(argObj);

		if (printers.length > 0) {
			format = CONFIG.formats.interesting;
			if (!format.use) {
				return;
			}
		} else {
			format = CONFIG.formats.title;
			if (!format.use) {
				return;
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
		return ;
	} // end EvalVillainHook

	class evProxy {
		apply(target, thisArg, args) {
			EvalVillainHook(this.evname, args);
			return Reflect.apply(target, thisArg, args);
		}
		construct(target, args, newArg) {
			EvalVillainHook(this.evname, args);
			return Reflect.construct(target, args, args);
		}
	}

	/*
	 * NOTICE:
	 * updates here should maybe be reflected in input validation
	 * file: /pages/config/config.js
	 * function: validateFunctionsPatern
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
			let addit = false;
			addToSearch(true, "winname", {
					name: "window.name",
					search: wn,
					format: form,
				});
		}

		form = CONFIG.formats.fragment;
		if (form.use) {
			addToSearch(true, "fragment", {
				name: "fragment",
				search: location.hash.substring(1),
				format: form,
			});
		}
	}

	function addToSearch(decode, addTo, sObj) {
		if (!decode) {
			sObj.decode = "";
			if (!isNeedleBad(sObj.search)) {
				addIt(addTo, sObj);
			}
			return;
		}

		for (let tup of decodeAll(sObj.search)) {
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
			if (typeof(str) !== "string" || str.length == 0 || this.searchSeen.has(str)) {
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
			const limit = 200;
			let size = this.searchSeen.size;
			if (size == limit-1) {
				let col = CONFIG.formats.interesting;
				real.log(
				  `%c[EV WARNING]%c size limit (${limit}) reached for ${addTo} parameters in ${location.href}`,
					col.highlight, col.default);
			} else if (size >= limit) {
				return false;
			}

			this.searchSeen.add(sObj.search);
			this.search[addTo].push(sObj);
			return true;
		}

		function* decodeAny(any, decoded, fwd) {
			if (Array.isArray(any)) {
				yield* decodeArray(any, decoded, fwd);
			} else if (typeof(any) == "object"){
				yield* decodeObject(any, decoded, fwd);
			} else {
				yield* decodeAll(any, fwd + "= x;\n"+ decoded);
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
				let dec = real.jsonParse(s);
				if (dec) {
					let fwd = `\t{\n\t\tlet _ = ${s};\n\t\t_`;
					yield* decodeAny(dec, `\t\tx = JSON.stringify(_);\n\t}\n${decoded}`, fwd);
					return;
				}
			} catch (_) {};

			// atob
			try {
				let dec = myatob(s);
				if (dec) {
					yield* decodeAll(dec, `\tx = btoa(x);\n${decoded}`);
					return;
				}
			} catch (_) {};

			// string replace
			let dec = s.replaceAll("+", " ");
			if (dec !== s) {
				yield* decodeAll(dec, `\tx = x.replaceAll("+", " ");\n${decoded}`);
			}

			if (!s.includes("%")) {
				return;
			}

			// match all of them
			try {
				let dec = real.decodeURIComponent(s);
				if (dec && dec != s) {
					yield* decodeAll(dec, `\tx = encodeURIComponent(x);\n${decoded}`);
				}
			} catch(_){}

			// match all of them
			try {
				let dec = real.decodeURI(s);
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
				this.search.needle.push({
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
						real.warn("[EV] More then 200 parameters?");
						break;
					}
					addToSearch(true, "query", {
						name: "query",
						param: match[1],
						search: match[2],
						format: formats.query,
					});
				} // while regex loop
			} // if query.length
		}

		// cookies
		if (formats.cookie.use) {
			for (let i of document.cookie.split(/;\s*/)) {
				let s = i.split("=");
				if (s.length >= 2) {
					addToSearch(true, "cookies", {
						name: "cookie",
						param: s[0],
						search: s[1],
						format: formats.cookie,
					});
				} else {
					addToSearch(true, "cookies", {
						name: `cookie`,
						search: s[0],
						format: formats.cookie,
					});
				}
			}
		}

		if (formats.localStore.use){
			let l = localStorage.length;
			for (let i=0; i<l; i++) {
				let name = localStorage.key(i);
				addToSearch(true, "localStorage", {
					name: `localStorage`,
					param: name,
					search: localStorage.getItem(name),
					format: formats.localStore,
				});
			}
		}

		addChangingSearch();
	}

	// grab real functions before hooking
	var real = {
		log : console.log,
		warn : console.warn,
		dir : console.dir,
		jsonParse : JSON.parse,
		logGroup : console.group,
		logGroupEnd : console.groupEnd,
		logGroupCollapsed : console.groupCollapsed,
		trace : console.trace,
		decodeURIComponent : decodeURIComponent,
		decodeURI : decodeURI,
	}
	myatob = atob;
	for (let name of CONFIG["functions"]) {
		applyEvalVillain(name);
	}

	strToRegex(CONFIG.needles);
	strToRegex(CONFIG.blacklist);
	buildSearches(); // must be after needles are turned to regex

	real.log("%c[EV]%c Functions hooked for %c%s%c",
		CONFIG.formats.interesting.highlight,
		CONFIG.formats.interesting.default,
		CONFIG.formats.interesting.highlight,
		document.domain,
		CONFIG.formats.interesting.default
	);
}

/*
 * start content script
 *
 * Everything above is what will be injected
*/
function inject_it(func, info) {
	func = func.toString();
	config = JSON.stringify(info);
	inject = `(${func})(${config});`;
	var s = document.createElement('script');
	s.type = "text/javascript";
	s.onload = function() { this.remove(); }; // Keep dom clean
	s.innerHTML = inject; // yeah, it's ironic
	document.documentElement.appendChild(s);
}

inject_it(rewriter, config);
