/* The background.js file composes this with a `config` and the rewriter.js,
 * which contains the rewriter function. So complete source that will run looks like:
 *
 * const config = {"formats": .......}      // config to be used by rewriter
 * const rewriter = function(CONFIG) { .... // Code to be injected into page, with above config
 *
*/

/**
 * Picks random number to verify the inject worked... does not need to be
 * random. It's overkill really.
*/
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
	const inject = `(${func})(${JSON.stringify(info)});`;

	const s = document.createElement('script');
	s.type = "text/javascript";
	s.onload = () => this.remove(); // Keep dom clean
	s.innerHTML = inject; // yeah, it's ironic
	document.documentElement.appendChild(s);

	// If rewriter executes, checkId will be set. Otherwise CSP probably blocked
	if (!s.hasAttribute(checkId)) {
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

// config and rewriter should be put into this by the background script
inject_it(rewriter, config);
