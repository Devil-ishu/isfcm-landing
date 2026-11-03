/* Shared helpers for the Voice Audit ad funnel.
   Everything the buyer types is kept on this device (localStorage), so a buyer
   who closes the tab can return to any step and continue where they left off. */
(function(){
  // ---- settings: change these in one place ----
  var CFG={
    price:1999,
    product:'Executive Voice Audit',
    // WhatsApp number that receives the 2-minute recordings (digits only, with 91).
    // Swap to the new WhatsApp Business number once it is set up.
    wa:'919464151610',
    // Cal.id event: free event (payment happens on our page first), 30 min, next 72 hours only
    cal:'https://cal.id/gaurang-misra/voice-audit'
  };

  var KEY='audit_ctx';
  var q=new URLSearchParams(location.search);
  var ctx={}; try{ ctx=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(ctx)); }catch(e){} }

  // Ad parameters travel with the buyer to the Razorpay order and the sheet
  ctx.utm=ctx.utm||{};
  q.forEach(function(v,k){ if(/^utm_/.test(k)||k==='fbclid') ctx.utm[k]=String(v).slice(0,200); });
  if(q.get('v')) ctx.v=q.get('v');
  save();

  function track(n,p,o){ try{ fbq('track',n,p||{},o||{}); }catch(e){} }
  function custom(n,p){ try{ fbq('trackCustom',n,p||{}); }catch(e){} }
  function ga(n,p){ try{ gtag('event',n,p||{}); }catch(e){} }

  window.Audit={
    cfg:CFG, ctx:ctx,
    set:function(k,v){ ctx[k]=v; save(); },
    track:track, custom:custom, ga:ga,
    go:function(path){ location.href=path; },
    // One row per stage in the sheet: applied → paid → booked → recording_sent.
    // Never blocks the buyer: if the sheet is down, they still move on.
    log:function(stage,extra){
      var b={form:'audit',stage:stage,name:ctx.name||'',phone:ctx.phone||'',email:ctx.email||'',
        role:ctx.role||'',room:ctx.room||'',pid:ctx.pid||'',booking:ctx.start||'',
        utm_source:ctx.utm.utm_source||'',utm_campaign:ctx.utm.utm_campaign||'',utm_content:ctx.utm.utm_content||'',variant:ctx.v||''};
      if(extra) for(var k in extra) b[k]=extra[k];
      try{
        return fetch('/api/enquiry',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b),keepalive:true})
          .then(function(r){ return r.ok; }).catch(function(){ return false; });
      }catch(e){ return Promise.resolve(false); }
    },
    // WhatsApp link with the message already typed
    wa:function(text){ return 'https://wa.me/'+CFG.wa+'?text='+encodeURIComponent(text); },
    // Hide a media block if its file isn't uploaded yet, so the page never shows a broken player
    hideIfMissing:function(el,url){
      if(!el) return;
      fetch(url,{method:'HEAD'}).then(function(r){ if(!r.ok) el.classList.add('hide'); }).catch(function(){ el.classList.add('hide'); });
    },
    first:function(){ return (ctx.name||'').trim().split(/\s+/)[0]||''; }
  };
})();
