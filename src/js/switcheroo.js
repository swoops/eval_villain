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

        let dec = false; 
        try { dec = uDec(needle); } // decodeURI can throw errors at times
        catch { dec = false; }

        if ( dec && dec != needle &&  str.indexOf(dec) >= 0 ){
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
        }else{
          // check for each query param,value
          for (let vars of query.split("&")){
            let needle = vars.split("=")[1];
            if ( needle && needle.length > 0  && needle.length >= 4){

              let dec = false;
              try { dec = uDec(needle); } // decodeURI can throw errors at times
              catch { dec = false; }

              if ( dec && dec != needle &&  str.indexOf(dec) >= 0 ){
                if ( quick ) return true;
                highlightWords("query", str, dec, "[URL Decoded]");
              } else if ( str.indexOf(needle) >= 0 ){
                if ( quick ) return true;
                highlightWords("query", str, needle);
              } // str search for needle|urdecode(needle)
            } // is param needle a reasonable len
          } // vars loop
        } // whole query found?
      } // is there a query?
    }
    return false;
  }

  /* where all the magic happens */
  function EvalVillainHook(name, args){
    var argSt = args[0];
    // TODO: no special exception here, handle mutle args for any function
    if ( name == "Function" ){
      argSt = args[args.length-1];
    }else if ( args.length > 1 ){
      let errtitle = "%c[EV] Error: %c%s%c Expected 1 argument, got %c%d"
      let hl   = CONFIG.formats.title.highlight;
      let dflt = CONFIG.formats.title.default;
      console.groupCollapsed(
        errtitle, dflt,
        hl, name, dflt,
        hl, args.length
      );
      console.dir(args);
      console.groupCollapsed("trace:");
      console.trace();
      console.groupEnd("trace:");
      console.groupEnd(errtitle);
      return;
    }

    if ( typeof( argSt ) !== "string" ){
      let errtitle = "%c[EV] Error: %c%s%c Expected first argument of type string, got %c%s"
      let hl   = CONFIG.formats.title.highlight;
      let dflt = CONFIG.formats.title.default;
      let out = args[0] === null ? null : typeof(args[0]);
      console.groupCollapsed(
        errtitle, dflt,
        hl, name, dflt,
        hl, out
      );
      console.dir(args);
      console.groupCollapsed("trace:");
      console.trace();
      console.groupEnd("trace:");
      console.groupEnd(errtitle);
      return;
    }

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
        clog("%c%s", argFormat.highlight, argSt);
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
      try {
        return FF.prototype.apply.call(
          orig, where, arguments
        );
      }catch (err){
        hookErr(err, arguments, name);
        clog("orig: ", orig);
      }
    }

    if ( name == "Function" ){
      // special case
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

  // hook first
  var uDec = decodeURI;
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
