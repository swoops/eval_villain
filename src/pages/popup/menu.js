configList = ["targets", "needles", "blacklist", "functions", "autoOpen", "onOff", "types"];
function updateToggle(on){
  if (typeof(on) !== "boolean"){
    console.error("unexpected message type");
    return;
  }
  let d = document.getElementById("toggle");
  d.checked = on;

  d = document.getElementById("toggle-label");
  d.innerText = "Villain is " + (on ? "ON" : "OFF");
}

function createCheckBox(name, checked, subMenu){
  var d = document;
  var li = d.createElement("li");
  li.className = "toggle";

  // first child of li
  var label = d.createElement("label");
  label.className = "switch";

    // first child of label
    var input = d.createElement("input");
    input.type = "checkbox";
    input.name = subMenu;
    input.value = name;
    input.checked = checked;
    input.id = name;
    label.appendChild(input);

    // second child of label
    let div = d.createElement("div");
    div.className = "slider";
    label.appendChild(div);
  li.appendChild(label);

  // second child of li
  var span = d.createElement("span");
  span.className = "label";
  span.innerText = name;

  li.appendChild(span);
  return li;
}

function populateSubMenus(){
  function writeDOM(res){
    for (let sub of configList){
      if ( ! res[sub] ) {
        console.error("Could not get: " + sub);
      }
      var where = document.getElementById(`${sub}-sub`);

      for (let itr of res[sub]){
        let inpt = createCheckBox(itr.name, itr.enabled, sub);
        where.appendChild(inpt);
      }

      if (res[sub].length == 0){
        let em = document.createElement("em");
        em.innerText = "Nothing Configured"
        em.className = "configure"
        em.onclick = function(){ goToConfig(); }
        where.appendChild(em);
      }
    }
  }

  let result = browser.storage.local.get(configList);
  result.then(
    writeDOM,
    function(err){ console.error("failed to get storrage: " + err) }
  );
}

function updateSubmenu(target){
  var name = target.name;
  function update(res){
    let conf = res[name]
    if ( conf === undefined ){
      console.error("could not get targets for updating");
      return;
    }
    for (let sub of conf){
      if ( sub.name === target.id ){
        sub["enabled"] = target.checked;
      }
    }

    var newInfo = {}
    newInfo[name] = conf;
    return browser.storage.local.set(newInfo);
  }

  let result = browser.storage.local.get(name);
  result.then(update).then(updateBackground).then(updateToggle);
  result.catch(
    function(err){ console.error("failed to get storrage: " + err) }
  );
}

function listener(ev) {
  let node = ev.target.nodeName;
  let id = ev.target.id;
  let name = ev.target.name;

  if (node === "INPUT"){
    if (id === "toggle" ) {                             // on off button
      let pom = toggleBackground();
      pom.then(updateToggle);
      pom.catch(function(){
        console.error("promise failed?");
        updateToggle(false);
      });
      return false;
    }else if (configList.indexOf(name) >= 0){           // submenu checkbox?
      updateSubmenu(ev.target);
      return;
    }else{
      // console.log("got click for id: " + ev.target.id );
      // console.log("got click for name: " + ev.target.name );
      return;
    }
  }

  if ( ["h1-functions", "h1-targets", "h1-enable",  "h1-autoOpen", "h1-onOff", "h1-blacklist",  "h1-needles", "h1-types"].indexOf(id) >= 0 ){
    let sub = id.substr(3);
    let formats = document.getElementById(sub);
    formats.classList.toggle('closed');
    formats.classList.toggle('open');
    return
  }
  if ( id == "h1-config" ){
    goToConfig();
    return;
  }

  // console.log("got click for id: " + ev.target.id );
  // console.log("got click for name: " + ev.target.name );
}
function goToConfig(){
    let confUrl = browser.runtime.getURL("/pages/config/config.html");
    let tab = browser.tabs.create({url:confUrl});
    tab.then(function(){window.close()});
    return;
}


amIOn().then(updateToggle);
document.addEventListener("click", listener);
populateSubMenus();
// vim: set sw=2:ts=2:sts=2:ft=javascript:et
