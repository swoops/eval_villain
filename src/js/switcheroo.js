var rewriter = function(CONFIG){
  function blacklistCheck(str){
    for (let needle of CONFIG.blacklist){
      if ( needle.test ){ // regex
        needle.lastIndex = 0;
        if ( needle.test(str) ) return true;
      }else if ( needle.length > 0 ){
        if ( str.indexOf(needle) >= 0 ) return true;
      }
    }
    return false;
  }
  function highlightSearch(str, quick){
    /*
     * quickly check to see how interesting this input is so the title can be
     * formated nicely
    */
    function highlightWords(sName, str, word, alt=false){
      var defColor = formats[sName].default;
      var hiColor  = formats[sName].highlight;
      var titleStr = "%c%s %c%s%c found";
      let titleArgs = [ defColor, sName, hiColor, word, defColor ];
      if ( alt ){
        titleStr += " -> %c" + alt;
        titleArgs.push(hiColor);
      }

      if ( formats[sName].open )
        console.group(titleStr, ...titleArgs);
      else
        console.groupCollapsed(titleStr, ...titleArgs);

      let others = [];
      let matches = [];
      if ( !word.test ){
        // normal substring search
        others = str.split(word);
        for (let i=0; i<others.length-1; i++){
          matches.push(word);
        }
      }else if (word.global == false){
        // not global regex, so just split into two on first
        let m = word.exec(str)[0];
        matches.push(m);
        others.push(str.substr(0, str.indexOf(m)));
        others.push(str.substr(str.indexOf(m)+m.length));
      }else{
        let holder = str;
        let match = null;
        word.lastIndex = 0;
        let prevLast = 0;

        while ((match = word.exec(str)) != null){
          let m = match[0];
          matches.push(m);
          others.push(holder.substr(0, holder.indexOf(m)));
          holder = holder.substr(holder.indexOf(m)+m.length);
          if ( prevLast >= word.lastIndex ) {
            console.warn("[EV] Attempting to highlight matches for this regex will cause infinite loop, stopping")
            break;
          }
          prevLast = word.lastIndex;
        }
        others.push(holder);
      }

      // pharrow it all to goether
      let fmt = "%c%s".repeat(others.length*2-1);
      let args = [];
      let i=0;
      for (; i<matches.length; i++){
        args.push(defColor);
        args.push(others[i]);
        args.push(hiColor);
        args.push(matches[i]);
      }
      args.push(defColor);
      args.push(others[i++]);
      clog(fmt, ...args);

      console.groupEnd(titleStr);
    } // end highlightWords

    function decodeCheck(needle, str){
      let arr = [];
      let dec = false;
      let re = /\+/g;
      let needleP = re.test(needle) ? needle.replace(re, ' ') : false;
      try {
        dec = uDec(needle);
        arr.push(dec);
        if ( needleP ) arr.push(uDec(needleP));
      } catch(_) {}
      try {
        dec = uDecC(needle);
        arr.push(dec);
        if ( needleP ) arr.push(uDecC(needleP));
      } catch(_) {}

      for (let i of arr){
        if (str.indexOf(i) >= 0){
          return i;
        }
      }
      return false;
    }

    var formats = CONFIG["formats"];

    // needle search
    if ( formats.needle.use ){
      for (let needle of CONFIG["needles"]){

        // regex
        if ( needle.test && needle.test(str)){
          // make sure each call works, thanks js and thanks:
          // https://stackoverflow.com/questions/2630418/javascript-regex-returning-true-then-false-then-true-etc
          needle.lastIndex=0;
          if ( quick ) return true;
          highlightWords("needle", str, needle);
        }

        if ( str.indexOf(needle) >= 0){
          if ( quick ) return true;
          highlightWords("needle", str, needle);
        }
      }
    }

    // url fragment search
    if ( formats.fragment.use ){
      let needle = location.hash.substring(1);
      if ( needle.length > 0  && needle.length >= 4 ){
        let dec =  decodeCheck(needle, str) ;
        if (dec){
          if ( quick ) return true;
          highlightWords("fragment", str, dec, "[URL Decoded]");
        }else if ( str.indexOf(needle) >= 0 ){
          if ( quick ) return true;
          highlightWords("fragment", str, needle);
        }
      }// length check
    }

    // url param search
    if ( formats.query.use ){
      // entire query
      let query = window.location.search.substring(1);
      if ( query.length > 0){
        if ( str.indexOf(query) >= 0){
          // entire query is in input
          if (quick) return true;
          highlightWords("query", str, query);
        }else{ // check for each query param
          let re = /[&\?](?:[^=]*)=([^&]*)/g;
          let loop = 0;
          let match = false;
          let prev = [];
          while (match = re.exec(query)){
            if (loop++ > 200) {
              console.warn("[EV] Loop larger then expected");
              break;
            }
            let needle = match[1];
            if ( !needle || needle.length <= 0 || prev.includes(needle)) continue;
            prev.push(needle);
            let dec = decodeCheck(needle, str);
            if (dec){
              if ( quick ) return true;
              highlightWords("query", str, dec, "[URL Decoded]");
            } else if ( str.indexOf(needle) >= 0 ){
              if ( quick ) return true;
              highlightWords("query", str, needle);
            } // str search for needle|urdecode(needle)
          } // loop over query params
        } // whole query found?
      } // is there a query?
    }
    return false;
  }

  function invalidArgType(args, num){
    let errtitle = "%c[EV] Error: %c%s%c Unexpected argument type, got %c%s"
    let hl   = CONFIG.formats.title.highlight;
    let dflt = CONFIG.formats.title.default;
    let out = args[num] === null ? null : typeof(argSt);
    console.groupCollapsed(
      errtitle, dflt,
      hl, name, dflt,
      hl, out
    );
    console.groupCollapsed("args array:");
    console.dir(args);
    console.groupEnd("args array:");
    console.groupCollapsed("trace:");
    console.trace();
    console.groupEnd("trace:");
    console.groupEnd(errtitle);
  }

  /**
  * Helper function to turn parsable arguments into nice strings
  * @param {Object|string} arg Argument to be turned into a string
  **/
  function argToString(arg){
    if ( typeof(arg) === "string" )
      return arg
    if (typeof(arg) === "object" )
      return JSON.stringify(arg)
    return "";
  }

  /**
  * Parse all arguments in args array and return an object containg only valid
  * argument indexes. Return has a .normal and .interest arrays.
  *
  * @param {Object}  args `arguments` object of hooked function
  **/
  function validateArgs(args){
    let ret = {
      normal: [],
      interest: []
    }
    for (let i in args){
      if (! ["string", "object"].includes(typeof(args[i]))){
        invalidArgType(args, i);
        continue;
      }
      let str = argToString(args[i]);
      if ( blacklistCheck(str) ){
        // blacklist match, don't parse
      }else if ( highlightSearch(str, true) ){
        ret.normal.push(+i);
        ret.interest.push(+i);
      }else{
        ret.normal.push(+i);
      }
    }
    return ret;
  }

  function printTitle(name, format, num){
    let titleGrp = "%c[EV] %c%s%c %s"
    let func = console.group;
    var values = [
      format.default, format.highlight, name, format.default, location.href
    ];

    if ( ! format.open ) func = console.groupCollapsed;
    if ( num >1 ){
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
  * @param {Array} args array of arguments
  * @param {Array} inedexes indexes of args that should be printed
  **/
  function printArgs(args, indexes) {
    let argFormat = CONFIG.formats.args;
    if ( ! argFormat.use ) return;
    if ( indexes.length <= 0 ) return;
    let func = argFormat.open ? console.group : console.groupCollapsed;

    if ( args.length === 1 ){
      let argTitle ="%carg:";
      func(argTitle, argFormat.default);
      clog("%c%s", argFormat.highlight, argToString(args[0]));
      console.groupEnd(argTitle);
      return
    }

    let argTitle = "%carg[%d/%d]: "
    for (let i of indexes){
      func(argTitle, argFormat.default, i+1, args.length);
      clog("%c%s", argFormat.highlight, argToString(args[i]));
      console.groupEnd(argTitle);
    }
  }

  /**
  * Print all the interesting arguments
  *
  * @param {Array} args array of arguments
  * @param {Array} inedexes indexes of arg array that are interesting
  **/
  function printInteresting(args, indexes) {
    for ( let i of indexes ){
      highlightSearch(argToString(args[i]), false);
    }
  }

  /**
  * Parse all arguments for function `name` and pretty print them in the console
  * @param {string} name Name of function that is being hooked
  * @param {Array}  args array of arguments
  **/
  function EvalVillainHook(name, args){
    let argObj = validateArgs(args);

    // does this call have an interesting result?
    let format = null;
    if ( argObj.interest.length === 0 ){
      format = CONFIG.formats.title;
      if ( !format.use ) return;
      if ( argObj.normal.length === 0 ) return;
    }else{
      format = CONFIG.formats.interesting;
      if ( !format.use ) return;
    }

    let titleGrp = printTitle(name, format, args.length);
    printArgs(args, argObj.normal);
    printInteresting(args, argObj.interest);

    // stack display
    // don't put this into a function, it will be one more thing on the call
    // stack
    {
      let stackFormat = CONFIG.formats.stack;
      if ( stackFormat.use ){
        let stackTitle = "%cstack: "
        if ( stackFormat.open )
          console.group(stackTitle, stackFormat.default);
        else
          console.groupCollapsed(stackTitle, stackFormat.default);

        console.trace();
        console.groupEnd(stackTitle);
      }
    }
    console.groupEnd(titleGrp);
    return ;
  } // end EvalVillainHook

  /*
   * NOTICE:
   * updates here should maybe be reflected in input validation
   * file: /pages/config/config.js
   * function: validateFunctionsPatern
  */
  function applyEvalVillain(name){
    function hookErr(err, args, name){
      console.warn("[EV] (%s) hook encountered an error: %s", name, err.message);
      console.dir(args);
    }
    var where = window;
    var leaf = name;
    var setter = /^setter\(([a-zA-Z]+)\)\s*$/.exec(name);
    if ( setter ){
      let orig = Object.getOwnPropertyDescriptor(Element.prototype, setter[1]).set;
      Object.defineProperty(Element.prototype, setter[1], {
        set: function(value) {
          try {
            EvalVillainHook(setter[1], arguments);
          } catch (err){
            hookErr(err, arguments, name);
          }
          return orig.call(this, value);
        }
      });
      return;

    } else if ( ! /^[a-zA-Z.]+$/.test(name) ){
      clog("[EV] name: %s invalid, not hooking", name);
    } else if ( name.indexOf(".") >= 0 ){
      let groups = name.split(".");
      let i = 0; // outside for loop for a reason
      for (i=0; i<groups.length-1; i++){
        where = where[groups[i]];
      }
      leaf = groups[i];
    }

    var orig = where[leaf];
    where[leaf] = function() {
      try {
        EvalVillainHook(name, arguments);
      } catch (err){
        hookErr(err, arguments, name);
      }
      return FF.prototype.apply.call(
        orig, where, arguments
      );
    }

    if ( name == "Function" ){
      // special case
      console.warn(
        "[EV] Hooking function 'Function'\n",
        " This is a bad idea!\n",
        " It can break unexpected things (Function.prototype for example).\n",
        " I won't stop you, just expect trouble."
      );
      where[leaf].prototype.bind = FF.prototype.bind;
      where[leaf].prototype.bind.apply = FF.prototype.bind.apply;
    }
  }

  function strToRegex(obj){
    for (let i=0; i<obj.length; i++) {
      let match = /^\/(.*)\/(i|g|gi|ig)?$/.exec(obj[i]);
      if (match){
        try {
          obj[i] = new RegExp(match[1], match[2] === undefined ? "" : match[2]);
        } catch (err){
          console.warn("[EV] Creating regex %s error: %s", obj[i].name, err.message);
        }
      }
    }
  }

  // grab before hooking
  var uDec  = decodeURI;
  var uDecC = decodeURIComponent;
  var clog = console.log;
  var FF = Function;
  for (let name of CONFIG["functions"]) {
    applyEvalVillain(name);
  }

  strToRegex(CONFIG.needles);
  strToRegex(CONFIG.blacklist);

  clog("%c[EV]%c Functions hooked for %c%s%c",
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
function inject_it(func, info){
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
// vim: set sw=2:ts=2:sts=2:ft=javascript:et
