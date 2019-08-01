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

  function highlightSearch(str, quick, argNum){
    /*
     * quickly check to see how interesting this input is so the title can be
     * formatted nicely
    */
    function highlightWords(sName, str, word, alt=false){
      var defColor = formats[sName].default;
      var hiColor  = formats[sName].highlight;
      var titleStr = "%c%s: %c%s%c found";
      let titleArgs = [
        defColor, sName,
        hiColor, word, defColor,
      ];

      if ( typeof(argNum) == 'number' ) {
          titleStr += " (arg:%c%d%c)";
          titleArgs.push(hiColor, argNum, defColor);
      }
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

      // pharaoh it all to together
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
      let re = /\+/g;
      let needleP = re.test(needle) ? needle.replace(re, ' ') : false;

      if ( str.indexOf(needleP) >= 0 ) return needleP;

      for (let func of [uDec, uDecC]){ // decodeURI, decodeURIComponent
        try {
          let dec = func(needle);
          if ( dec == needle ) continue; // no difference, so skip
          if (str.indexOf(dec) >= 0) return dec;
          if ( needleP ){
            let dec = func(needleP);
            if (str.indexOf(dec) >= 0)
              return dec;
          }
        }catch(_){ }
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

    // query search
    if ( formats.query.use ){
      // entire query
      let query = window.location.search;
      if ( query.length > 1){
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
            if ( !needle || needle.length <= 3 || prev.includes(needle)) continue;
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
    let errtitle = "%c[EV] Error: %c%s%c Unexpected argument type for [%d], got %c%s"
    let hl   = CONFIG.formats.title.highlight;
    let dflt = CONFIG.formats.title.default;
    if ( args[num]  === null ) out = null;
    let out = args[num] === null ? null : typeof(args[num]);
    console.groupCollapsed(
      errtitle, dflt,
      hl, name, dflt,
      num,
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
    return arg.toString();
  }

  /**
  * Turn all arguments into strings and change record original type
  *
  * @param {Object} args `arugments` object of hooked function
  */
  function getArgs(args){
    let ret = [];
    let hasInterest = 0;
    for (let i in args){
      let t = typeof(args[i]);
      let interest = false;
      let str = argToString(args[i]);

      if ( blacklistCheck(str) )
        continue; // don't care
      if ( highlightSearch(str, true) ) {
        interest = true;
        hasInterest += 1;
      }
      ret.push({
        "type": t,
        "interest": interest,
        "str" : str,
        "num" : +i,
      });
    }
    return {
      "hasInterest": hasInterest,
      "args" : ret,
      "len" : args.length,
    };
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
  function printArgs(argObj) {
    let argFormat = CONFIG.formats.args;
    if ( ! argFormat.use ) return;
    let func = argFormat.open ? console.group : console.groupCollapsed;

    if ( argObj.len === 1  && argObj.args.length == 1){
      let arg = argObj.args[0];
      let argTitle ="%carg(%s):";
      let data = [
        argFormat.default,
        arg.type,
      ];
      func(argTitle, ...data);
      clog("%c%s", argFormat.highlight, arg.str);
      console.groupEnd(argTitle);
      return
    }

    let argTitle = "%carg[%d/%d](%s): "
    let total = argObj.len;
    for (let i of argObj.args){
      func(argTitle, argFormat.default, i.num+1, total, i.type);
      clog("%c%s", argFormat.highlight, i.str);
      console.groupEnd(argTitle);
    }
  }

  /**
  * Print all the interesting arguments
  *
  * @param {Array} args array of arguments
  * @param {Array} inedexes indexes of arg array that are interesting
  **/
  function printInteresting(argObj) {
    if ( ! argObj.hasInterest ) return;
    if ( argObj.len == 1 ){
        highlightSearch(argObj.args[0].str, false);
        return;
    }
    for ( let i of argObj.args )
      if ( i.interest )
        highlightSearch(i.str, false, i.num);
  }

  /**
  * Parse all arguments for function `name` and pretty print them in the console
  * @param {string} name Name of function that is being hooked
  * @param {Array}  args array of arguments
  **/
  function EvalVillainHook(name, args){
    let argObj = getArgs(args);

    // does this call have an interesting result?
    let format = null;
    if ( argObj.hasInterest ){
      format = CONFIG.formats.interesting;
      if ( !format.use ) return;
    }else{
      format = CONFIG.formats.title;
      if ( !format.use ) return;
      if ( argObj.args.length == 0 ) return;
    }

    let titleGrp = printTitle(name, format, argObj.len);
    printArgs(argObj);
    printInteresting(argObj);

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

  class evProxy {
    apply(target, thisArg, args){
      EvalVillainHook(this.name, args);
      return Reflect.apply(target, thisArg, args);
    }
  }

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

    let ep = new evProxy;
    ep.name = name;
    where[leaf] = new Proxy(where[leaf], ep);
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
