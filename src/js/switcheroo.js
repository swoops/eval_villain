var rewriter = function(CONFIG){
  function blacklistCheck(str){
    for (let needle of CONFIG.blacklist){
      if ( needle.test ){ // regex
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
    function highlightWords(sName, str, word){
      var defColor = formats[sName].default;
      var hiColor  = formats[sName].highlight;
      var titleStr = "%c%s %c%s%c found";

      if ( formats[sName].open )
        console.group(titleStr, defColor, sName, hiColor, word, defColor);
      else
        console.groupCollapsed(titleStr, defColor, sName, hiColor, word, defColor);

      let regex = null;
      if ( typeof(word) !== "string" ){
        regex = str.match(word);
      }

      let ar = [];

      // split works on all occurances of regex even if global flag is false
      // we make our own split here in that case
      if ( regex && !word.global ){
        let w = regex[0];
        ar.push(str.substr(0, str.indexOf(w)));
        ar.push(str.substr(str.indexOf(w) + w.length));
      }else{
        ar = str.split(word);
      }

      let tot = ( ar.length*2 ) - 1;
      let fmt = "%c%s".repeat(tot);

      let args = [];
      for (let i=0; i<tot; i++ ){
        if ( i%2 == 0){
          args.push(defColor);
          args.push(ar[i/2]);
        }else{
          args.push(hiColor);
          if (regex){
            args.push(regex[( i-1 )/2])
          }else{
            args.push(word);
          }
        }
      }
      console.log(fmt, ...args);

      console.groupEnd(titleStr);
    } // end highlightWords

    var formats = CONFIG["formats"];

    // needle search
    if ( formats.needle.use ){
      for (let needle of CONFIG["needles"]){
        if (
          (needle.test && needle.test(str)) || // regex test
          (!needle.test && needle.length > 0 && str.indexOf(needle) >= 0 )
        ){
          if ( quick ) return true;
          highlightWords("needle", str, needle);
        }
      }
    }

    // url fragment search
    if ( formats.fragment.use ){
      let needle = location.hash.substring(1);
      if ( needle.length > 0  && str.indexOf(needle) >= 0){
        if ( quick ) return true;
        highlightWords("fragment", str, needle);
      }
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
        }else{
          // check for each query param,value
          for (let vars of query.split("&")){
            for (let needle of vars.split("=")){
              if ( needle.length > 0  && needle.length >= 4 && str.indexOf(needle) >= 0){
                if ( quick ) return true;
                highlightWords("query", str, needle);
              }
            } // needle loop
          } // vars loop
        } // whole query found?
      } // is there a query?
    }
    return false;
  }

  /* where all the magic happens */
  function EvalVillainHook(name, args){
    if ( args.length > 1 ){
      console.group("[EV] Error:");
      console.warn("[EV] %s Expected 1 argument, got %d", name, args.length);
      console.dir(args);
      console.groupEnd("[EV] Error:");
      return;
    }else if ( typeof( args[0] ) !== "string" ){
      console.group("[EV] Error:");
      console.warn("[EV] %s Expected first argument to be string, got %s", name, typeof(args[1]));
      console.dir(args);
      console.groupEnd("[EV] Error:");
      return;
    }

    var argSt = args[0];
    if ( blacklistCheck(argSt) ) return;
    var interest = highlightSearch(argSt, true);
    var format = null;


    if ( interest ) // set formating to interesting or title
      format = CONFIG.formats.interesting;
    else
      format = CONFIG.formats.title;

    // not interesting, and we don't care about uninsteresting
    if ( !interest && !format.use ) return;

    // inverse search? is this reasonable?
    if ( interest && !format.use ) return;

    // title display group
    var titleGrp = "%c[EV] %c%s%c %s"
    if ( format.open ){
      console.group(
        titleGrp, format.default, format.highlight, name, format.default,
        location.href
      );
    }else{
      console.groupCollapsed(
        titleGrp, format.default, format.highlight, name, format.default,
        location.href
      );
    }

    // arg display
    {
      let argFormat = CONFIG.formats.args;
      if ( argFormat.use ){
        let argTitle = "%carg: "
        if ( argFormat.open )
          console.group(argTitle, argFormat.default);
        else
          console.groupCollapsed(argTitle, argFormat.default);
        console.log("%c%s", argFormat.highlight, argSt);
        console.groupEnd(argTitle);
      }
    }

    // do the interest printing
    if ( interest ) highlightSearch(argSt, false);

    // stack display
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
      console.log("[EV] name: %s invalid, not hooking", name);
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
      return Function.prototype.apply.call(
        orig, where, arguments
      );
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

  // hook first
  for (let name of CONFIG["functions"]) {
    applyEvalVillain(name);
  }

  strToRegex(CONFIG.needles);
  strToRegex(CONFIG.blacklist);


  console.log("%c[EV]%c Functions hooked for %c%s%c", 
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
