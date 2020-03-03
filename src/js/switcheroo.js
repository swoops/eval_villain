var rewriter = function(CONFIG){
  this.search = [];
  function blacklistCheck(str){
    for (let needle of CONFIG.blacklist){
      if ( typeof(needle) === "string" ){
        if ( needle.length > 0 &&  str.indexOf(needle) >= 0 )
          return true;
      } else { // regex
        needle.lastIndex = 0;
        if ( needle.test(str) ) return true;
      }
    }
    return false;
  }

  function invalidArgType(arg, num, argType){
    let errtitle = "%c[EV] Error: %c%s%c Unexpected argument type for [%d], got %c%s"
    let hl   = CONFIG.formats.title.highlight;
    let dflt = CONFIG.formats.title.default;
    console.groupCollapsed(
      errtitle, dflt,
      hl, name, dflt,
      num,
      hl, argType
    );
    console.group("args:");
    console.dir(arg);
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
  * Returns the type of an argument. Returns null if the argument should be
  * skipped.
  * @param arg Argument to have it's type checked
  */
  function typeCheck(arg){
    let knownTypes = [
      "function", "string", "number", "object", "undefined", "boolean",
      "symbol"
    ];
    let t = typeof(arg);

    // sanity
    if ( ! knownTypes.includes(t) ){
      invalidArgType(args[i], +i, t);
      return t;
    }

    // configured to not check
    if (! CONFIG.types.includes(t)){
      return null;
    }

    return t;
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
      let t = typeCheck(args[i]);
      if (t === null) continue;
      let str = argToString(args[i]);

      if ( blacklistCheck(str) )
        continue; // don't care

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
  function zebraBuild(arr, fmt1, fmt2){
    let fmt = "%c%s".repeat(arr.length);
    let args = [];
    for (var i=0; i<arr.length; i++){
      args.push(arguments[1+(i%2)]);
      args.push(arr[i]);
    }
    args.unshift(fmt);
    return args;
  }

  function zebraLog(arr, fmt1, fmt2){
    clog(...zebraBuild(arr,fmt1,fmt2));
  }

  function zebraGroup(arr, fmt1, fmt2, open){
    let a = zebraBuild(arr,fmt1,fmt2);
    let f = open ? console.group : console.groupCollapsed;
    f(...a);
    return a[0];
  }

  /**
  * Check interest and get printers for each interesting result
  *
  * @param {Array} args array of arguments
  * @param {Array} inedexes indexes of arg array that are interesting
  **/
  function getInterest(argObj) {
    let ret = [];
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
    } // end highlightWords

    function hlSlice(str, needle){
      let ret = [];
      if ( typeof(needle) === "string" ){
        str.split(needle).forEach((x,index,arr)=> {
          ret.push(x)
          if (index != arr.length-1) ret.push(needle)
        });
      }else if (needle.global == false){
        // not global regex, so just split into two on first
        needle.lastIndex = 0;
        let m = needle.exec(str)[0];
        str.split(m).forEach(x=>ret.push(x,m));
      }else{
        let holder = str;
        let match = null;
        needle.lastIndex = 0;
        let prevLast = 0;

        while ((match = needle.exec(str)) != null){
          let m = match[0];
          ret.push(holder.substr(0, holder.indexOf(m)));
          ret.push(m);
          holder = holder.substr(holder.indexOf(m)+m.length);
          if ( prevLast >= needle.lastIndex ) {
            console.warn("[EV] Attempting to highlight matches for this regex will cause infinite loop, stopping")
            break;
          }
          prevLast = needle.lastIndex;
        }
        ret.push(holder);
      }
      return ret;
    }

    function testit(str, needle){
      if ( typeof(needle) === "string" ){
        if ( str.includes(needle) ){
          return true;
        }
      }else{
        if ( needle.test(str) ){
          return true;
        }
      }
      return false;
    }

    function printer(s, arg){
      let title = [s.name+": ", s.search];
      if ( argObj.len > 1 )
        title.push(" found (arg:", arg.num, ")");
      else
        title.push(" found");

      if ( s.decode )
        title.push("", " -> ", "[URL Decoded]");

      let end = zebraGroup(
        title,
        s.format.default, s.format.highlight,
        s.format.open
      );
      let ar = hlSlice(arg.str, s.search);
      zebraLog(ar, s.format.default, s.format.highlight);
      console.groupEnd(end);
    }

    // values that change without redirect
    let latestTest = getChangingSearch();
    for ( let arg of argObj.args ){
      for ( let s of this.search ){
        for (let test of latestTest){
          if (test.name === s.name && test.search === s.search ){
            latestTest.delete(test);
          }
        }
        if ( ! testit(arg.str, s.search) ) continue;
        ret.push(()=>printer(s,arg));
      }
    }

    // search for new things
    for (let test of latestTest){
      this.search.push(test);
      for (let arg of argObj.args){
        if ( ! testit(arg.str, test.search) ) continue;
        ret.push(()=>printer(test,arg));
      }
    }
    return ret;
  }

  /**
  * Parse all arguments for function `name` and pretty print them in the console
  * @param {string} name Name of function that is being hooked
  * @param {Array}  args array of arguments
  **/
  function EvalVillainHook(name, args){
    let argObj = getArgs(args);
    if ( argObj.args.length == 0 ) return;

    // does this call have an interesting result?
    let format = null;
    let printers = getInterest(argObj);

    if ( printers.length > 0 ){
      format = CONFIG.formats.interesting;
      if ( !format.use ) return;
    }else{
      format = CONFIG.formats.title;
      if ( !format.use ) return;
    }

    let titleGrp = printTitle(name, format, argObj.len);
    printArgs(argObj);

    // print all intereresting reuslts
    printers.forEach(x=>x());

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

  function getChangingSearch() {
    // these elements can change without a redirect. So we will check the
    // original value (pageload) and the current value (at function call)
    let ret = new Set();
    var form = CONFIG.formats.winname;
    if ( form.use && typeof(window.name) === "string" && window.name.length > 3 ) {
      ret.add({
        name:   "window.name",
        search: window.name,
        format: form,
        decode: false,
      });
    }
    form = CONFIG.formats.fragment;
    if ( form.use ){
      let needle = location.hash.substring(1);
      if ( needle.length > 3 ){
        ret.add({
          name:   "fragment",
          search: needle,
          format: form,
          decode: false,
        });
        for (let n of getDecoded(needle)){
          ret.add({
            name:   "fragment",
            search: n,
            format: form,
            decode: true,
          });
        }
      }
    }
    return ret;
  }

  function getDecoded(needle){
    // returns array of strings of various "decodings"
    let ret = [];
    let re = /\+/g;
    let needleP = re.test(needle) ? needle.replace(re, ' ') : false;
    for (let func of [decodeURI, decodeURIComponent]){
      try {
        let dec = func(needle);
        if ( dec == needle ) continue; // no difference, so skip
        if ( ret.includes(dec) ) continue;
        ret.push(dec);
        if ( needleP ){
          let dec = func(needleP);
          if ( dec == needleP ) continue;
          if ( ret.includes(dec) ) continue;
          ret.push(dec);
        }
      }catch(_){ }
    }
    return ret;
  }

  function buildSearches(){
    var formats = CONFIG["formats"];

    // needles
    if ( formats.needle.use ){
      for (let needle of CONFIG["needles"]){
        this.search.push({
          name:"needle",
          search: needle,
          format: CONFIG.formats["needle"],
          decode: false,
        });
      }
    }

    // query string
    if ( formats.query.use ){
      // entire query
      let query = window.location.search;
      if ( query.length > 1){
        let re = /[&\?]([^=]*)=([^&]*)/g;
        let loop = 0;
        let match = false;
        let prev = [];
        while (match = re.exec(query)){
          if (loop++ > 200) {
            console.warn("[EV] More then 200 parameters?");
            break;
          }
          let param = match[1];
          let needle = match[2];
          if ( needle.length < 4 ) continue;
          this.search.push({
            name:   `query[${param}]`,
            search: needle,
            format: CONFIG.formats["query"],
            decode: false,
          });
          for (let n of getDecoded(needle)){
            this.search.push({
              name:   `query[${param}]`,
              search: n,
              format: CONFIG.formats["query"],
              decode: true,
            });
          } // END decoded for loop
        } // while regex loop
      } // if query.length
    }

    for (let s of getChangingSearch()){
      this.search.push(s);
    }
  }

  // grab before hooking
  var clog = console.log;
  var FF = Function;
  for (let name of CONFIG["functions"]) {
    applyEvalVillain(name);
  }

  strToRegex(CONFIG.needles);
  strToRegex(CONFIG.blacklist);
  buildSearches(); // must be after needles are turned to regex

  clog("%c[EV]%c Functions hooked for %c%s%c",
    CONFIG.formats.interesting.highlight,
    CONFIG.formats.interesting.default,
    CONFIG.formats.interesting.highlight,
    document.domain,
    CONFIG.formats.interesting.default
  );

  // building list of search stuff
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
