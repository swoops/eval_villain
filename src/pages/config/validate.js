var errors = {
  targets    : [],
  needles    : [],
  blacklist  : [],
  functions  : [],
  formats     : []
};

function validateTable(tblName){
  let erCount = 0;
  let form = document.getElementById(`${tblName}-form`);
  for (let input of form.getElementsByTagName("input")){
    if (input.type === "text"){
      if ( !validate(input) ){
        erCount++;
      }
    }
  }
  if (erCount > 0){
    errors[tblName][0].dom.focus();
    return false;
  }
  return true;
}

function validate(dom, tblName=null){
  // should validate every single possible field
  let v = {
    targets:   {
      name: validateName,
      pattern: validateTargetPatern
    },
    needles:   {
      name: validateName,
      pattern: validateNeedlesPatern
    },
    blacklist:   {
      name: validateName,
      pattern: validateNeedlesPatern
    },
    functions: {
      name: validateName,
      pattern: validateFunctionsPatern
    },
    formats: {
      default: validateColor,
      highlight: validateColor
    }
  }
  if ( ! tblName )
    tblName = dom.closest("form").id.split("-")[0];

  let paramName = dom.name;

  if (! v[tblName] ){
    throw `unknown table '${tblName}'`;
  }

  let res = v[tblName][paramName](dom);

  if (res){
    gotError(dom, tblName, `${paramName}:[${dom.value}]: ${res}` );
    return false;
  }else{
    removeFromErrorArray(dom, tblName);
    return true;
  }
}

function removeFromErrorArray(dom, tblName){
  errors[tblName] = errors[tblName].filter(function(er){
      if ( er.dom === dom ){
        er.msg.remove(); // remove coresponding text
        return false; // remove this one
      }
      return true; // if it is not our element, it stays
  });
}

function gotError(dom, tblName, err){
  // add error text to dom
  let htmlErr = document.createElement("div");
  htmlErr.innerText =  err;
  htmlErr.onclick = function(){dom.focus()};
  document.getElementById(`${tblName}-errors`).appendChild(htmlErr);

  // errors
  removeFromErrorArray(dom, tblName); // remove last error if there
  var obj = {};
  obj.dom = dom;
  obj.msg = htmlErr;
  errors[tblName].push(obj);
}

function strCheck(str){
  if ( typeof(str) !== "string" ){
    return "must be a string";
  }

  if (str.length <= 0){
    return "can't be empty"
  }
  return false;
}

function validateName(dom){
  let name = dom.value;
  let strRet = strCheck(name);
  if ( strRet ) return strRet;

  if ( /^[A-Za-z0-9 _.']+$/.test(name) === false){
    return "can't have special characters ([A-Za-z0-9 _.] allowed)";
  }
}

function validateNeedlesPatern(dom){
  let val = dom.value;
  let strRet = strCheck(val);
  if ( strRet ) return strRet;

  let match = /^\/(.*)\/(i|g|gi|ig)?$/.exec(val);
  if (match){ // regex needle
    let regex = new RegExp(match[1], match[2] === undefined ? "" : match[2]);
    if ( regex ) {
      dom.className = "regex";
      return false;
    } else {
      return "failed to create valid regular expression"
    }
  }
  dom.className = "";
  return false;
}

function validateTargetPatern(dom){
  let target = dom.value;
  let strRet = strCheck(target);
  if (strRet) return strRet;

  if (! /^(https?|wss?|file|ftp|\*):/.test(target)){
    return "must start with (https|http|wss|file|ftp|*)";
  }else if ( ! /^(https?|wss?|file|ftp|\*):\/\//.test(target)){
    return "schema must contain '://'";
  }

	let reTest = /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)\/.*$/;
  if ( !reTest.test(target) ){
    if ( /^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^*/]+|[^*/]+)$/.test(target) ){
      return "must terminate domain by a slash '/'";
    }else if (/^(https?|wss?|file|ftp|\*):\/\/(\*|\*\.[^/]+|[^/]+)\/.*$/){
      return "domain/subdomain can not contain a wildcard within a string";
    }
    // I don't know what they did...
    return `must match ${reTest.toString()}`;
  }

  return false;
}

/*
 * heavily inspired by switcheroo.js, update one, update the other
*/
function validateFunctionsPatern(dom){
  function funcCheck(fnc){
    if ( typeof(fnc) !== "function" ){
      return "must be a function";
    }else if ( /\{\s*\[native code\]\s*\}/.test('' + fnc) ) {
        return false;
    } else{
      return "must be native function";
    }
  }

  let name = dom.value;
  let where = window;
  let leaf = name;
  if (name.length === 0){
    return "can't be empty";
  }

  let setter = /^setter\(([a-zA-Z]+)\)\s*$/.exec(name);
  if ( setter ){
    try{
      var fnc = Object.getOwnPropertyDescriptor(Element.prototype, setter[1]).set;
    } catch(err){
      return "can't find setter";
    }
    if (! fnc ){
      return "can't find setter";
    }else{
      return funcCheck(fnc);
    }
  } else if ( ! /^[a-zA-Z.]+$/.test(name) ){
    if ( /[()]/.test(name) ){
      return "characters ( and ) only used for setters (ie:setter(innerHTML))";
    }else{
      let match = /^[a-zA-Z.]*(.)/.exec(name);
      return `invalid character '${match[1]}'`;
    }
  } else if ( name.indexOf(".") >= 0 ){
    for (let word of name.split(".")){
      if (! where[word]){
        return `could not find ${word}`;
      }
      where = where[word];
    }
    return funcCheck(where);
  }
  // one word, no special chars
  return funcCheck(where[name]);

}

function validateColor(dom){
  var css = dom.value;
  if (css.length == 0){
    dom.value = "color: none";
  }
  return false;
}
// vim: set sw=2:ts=2:sts=2:ft=javascript:et
