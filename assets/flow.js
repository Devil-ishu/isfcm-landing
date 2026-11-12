/* Shared helpers for the post-payment flow.
   The payment ids travel in the URL and are also kept on this device, so
   a buyer who closes the tab can come back to /book and continue. */
(function(){
  var KEY='diag_ctx';
  var q=new URLSearchParams(location.search);
  var ctx={}; try{ ctx=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){}
  var pid=q.get('pid')||q.get('razorpay_payment_id');
  if(pid&&pid!==ctx.pid){ ctx={pid:pid}; }           // a new payment starts a fresh flow
  if(q.get('oid')) ctx.oid=q.get('oid');
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(ctx)); }catch(e){} }
  save();

  window.Flow={
    ctx:ctx,
    set:function(k,v){ ctx[k]=v; save(); },
    // Link to the next step, carrying the payment ids
    url:function(path){
      var p=new URLSearchParams(); if(ctx.pid) p.set('pid',ctx.pid); if(ctx.oid) p.set('oid',ctx.oid);
      var s=p.toString(); return path+(s?'?'+s:'');
    },
    go:function(path){ location.href=Flow.url(path); },
    track:function(n,p,o){ try{ fbq('track',n,p||{},o||{}); }catch(e){} },
    custom:function(n,p){ try{ fbq('trackCustom',n,p||{}); }catch(e){} },
    ga:function(n,p){ try{ gtag('event',n,p||{}); }catch(e){} },
    // Payment details (amount, email, phone) — fetched once, then cached for the next pages
    payment:function(){
      if(ctx.pay) return Promise.resolve(ctx.pay);
      if(!ctx.pid) return Promise.resolve(null);
      return fetch('/api/payment?pid='+encodeURIComponent(ctx.pid)+(ctx.oid?'&oid='+encodeURIComponent(ctx.oid):''))
        .then(function(r){ return r.json(); })
        .then(function(p){ if(p&&p.ok){ Flow.set('pay',{amount:p.amount,email:p.email,contact:p.contact}); return ctx.pay; } return null; })
        .catch(function(){ return null; });
    }
  };
})();

/* Microsoft Clarity: same project as the voice funnel, tagged so the two funnels can be told apart */
(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z9ggylo1v1");
try{ clarity('set','funnel','diagnosis'); clarity('set','step',location.pathname.replace(/^\/go\//,'').replace(/\/$/,'')||'landing'); }catch(e){}
