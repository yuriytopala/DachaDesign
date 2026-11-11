/* DachaDesign: GA4 loads only after visitors accept analytics cookies. */
(function(){
  "use strict";
  var ID="G-9Z9D4Q6FWQ", KEY="dachadesign-analytics-consent-v1";
  var choice=null, loaded=false, banner=null, googleTagReady=false, pendingPurchase=null;
  var labels={
    uk:["Аналітичні cookie","Лише з вашої згоди ми використовуємо Google Analytics для статистики відвідувань і покращення сайту. Без згоди аналітика не завантажується.","Дозволити","Відхилити","Політика конфіденційності"],
    ru:["Аналитические cookie","Только с вашего согласия мы используем Google Analytics для статистики посещений и улучшения сайта. Без согласия аналитика не загружается.","Разрешить","Отклонить","Политика конфиденциальности"],
    en:["Analytics cookies","We only use Google Analytics to measure visits and improve the website with your consent. Analytics is not loaded without consent.","Allow","Decline","Privacy policy"]
  };
  function state(allowed){return {analytics_storage:allowed?"granted":"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"};}
  function locale(){
    var lang=document.documentElement.lang||"uk";
    try{lang=localStorage.getItem("dachadesign-language")||lang;}catch(e){}
    lang=String(lang).slice(0,2).toLowerCase();
    return labels[lang]?lang:"uk";
  }
  function saved(){try{var v=localStorage.getItem(KEY);return v==="yes"||v==="no"?v:null;}catch(e){return null;}}
  function forgetCookies(){
    var items=document.cookie?document.cookie.split(";"):[];
    for(var i=0;i<items.length;i++){
      var name=items[i].split("=")[0].trim();
      if(!/^_ga(?:_|$)/.test(name))continue;
      var tail="=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
      document.cookie=name+tail;
      document.cookie=name+tail+"; domain="+location.hostname;
      document.cookie=name+tail+"; domain=."+location.hostname;
    }
  }
  function start(){
    window["ga-disable-"+ID]=false;
    if(loaded){window.gtag("consent","update",state(true));sendPurchaseIfReady();return;}
    loaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    window.gtag("consent","default",state(false));
    window.gtag("consent","update",state(true));
    window.gtag("js",new Date());
    var ref="";
    try{if(document.referrer){var u=new URL(document.referrer);ref=u.origin+u.pathname;}}catch(e){}
    window.gtag("config",ID,{page_location:location.origin+location.pathname,page_referrer:ref,send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false});
    var script=document.createElement("script");
    script.async=true;
    script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(ID);
    script.onload=function(){googleTagReady=true;sendPurchaseIfReady();};
    script.onerror=function(){googleTagReady=false;};
    document.head.appendChild(script);
  }
  function stop(){
    window["ga-disable-"+ID]=true;
    if(typeof window.gtag==="function")window.gtag("consent","update",state(false));
    forgetCookies();
  }

  // Purchase data comes only from the paid=true response from the payment Worker.
  // It is held in memory until analytics consent is granted and the tag is ready.
  function validatePurchase(event){
    if(!event || typeof event!=="object")return false;
    if(typeof event.transactionId!=="string" ||
       !/^DD-[a-f0-9-]{36}$/i.test(event.transactionId))return false;
    if(typeof event.projectId!=="string" ||
       !/^DD-[BGHKNST][0-9]{2}$/.test(event.projectId))return false;
    if(typeof event.itemName!=="string" || event.itemName.length>120 ||
       typeof event.value!=="number" || !isFinite(event.value) ||
       event.value<=0 || event.value>100000)return false;
    return true;
  }
  function sendPurchaseIfReady(){
    if(choice!=="yes" || !googleTagReady || !pendingPurchase ||
       typeof window.gtag!=="function")return;
    var event=pendingPurchase;
    pendingPurchase=null;
    var key="dachadesign-analytics-purchase-v1:"+event.transactionId;
    // Local idempotency plus GA4 transaction_id deduplication. We never
    // store the buyer's name/contact, access token, or bank details here.
    try{
      if(localStorage.getItem(key)==="sent")return;
      localStorage.setItem(key,"sent");
    }catch(error){return;}
    window.gtag("event","purchase",{
      send_to:ID,
      transaction_id:event.transactionId,
      currency:"UAH",
      value:event.value,
      items:[{
        item_id:event.projectId,
        item_name:event.itemName,
        price:event.value,
        quantity:1
      }]
    });
  }
  window.DachaDesignTrackPurchase=function(event){
    if(!validatePurchase(event))return;
    pendingPurchase={
      transactionId:event.transactionId,
      projectId:event.projectId,
      itemName:event.itemName,
      value:event.value
    };
    sendPurchaseIfReady();
  };
  function setChoice(v){
    choice=v;
    try{localStorage.setItem(KEY,v);}catch(e){}
    if(v==="yes")start();else{pendingPurchase=null;stop();}
    if(banner){banner.remove();banner=null;}
  }
  function show(){
    if(banner)banner.remove();
    var t=labels[locale()];
    if(!document.getElementById("dd-analytics-consent-css")){
      var style=document.createElement("style");
      style.id="dd-analytics-consent-css";
      style.textContent=".dd-analytics-panel{position:fixed;z-index:2147483646;left:12px;bottom:12px;right:12px;max-width:600px;background:#fff;color:#253b2a;border:1px solid #cbd8cc;border-radius:14px;box-shadow:0 10px 35px #0003;padding:18px 20px;font:14px/1.5 Arial,sans-serif;text-align:left}.dd-analytics-panel h2{font:700 18px Arial,sans-serif;margin:0 0 8px;color:#23402b}.dd-analytics-panel p{margin:0 0 12px;color:#3b4a40;font:14px/1.5 Arial,sans-serif}.dd-analytics-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dd-analytics-actions button{padding:10px 14px;border-radius:8px;border:1px solid #376944;background:#376944;color:#fff;font:700 14px Arial,sans-serif;cursor:pointer}.dd-analytics-actions button.dd-no{background:#fff;color:#376944}.dd-analytics-actions a{color:#376944;text-decoration:underline;font:13px Arial,sans-serif}@media(max-width:500px){.dd-analytics-panel{left:8px;right:8px;bottom:8px;padding:14px}}";
      document.head.appendChild(style);
    }
    banner=document.createElement("section");
    banner.className="dd-analytics-panel";
    banner.setAttribute("role","region");
    banner.setAttribute("aria-label",t[0]);
    var h=document.createElement("h2");h.textContent=t[0];
    var p=document.createElement("p");p.textContent=t[1];
    var actions=document.createElement("div");actions.className="dd-analytics-actions";
    var yes=document.createElement("button");yes.type="button";yes.textContent=t[2];yes.addEventListener("click",function(){setChoice("yes");});
    var no=document.createElement("button");no.type="button";no.className="dd-no";no.textContent=t[3];no.addEventListener("click",function(){setChoice("no");});
    var link=document.createElement("a");link.href="privacy.html#analytics-choices";link.textContent=t[4];
    actions.appendChild(yes);actions.appendChild(no);actions.appendChild(link);
    banner.appendChild(h);banner.appendChild(p);banner.appendChild(actions);
    document.body.appendChild(banner);
  }
  function init(){
    if(window.DachaDesignPendingPurchase){
      window.DachaDesignTrackPurchase(window.DachaDesignPendingPurchase);
      delete window.DachaDesignPendingPurchase;
    }
    choice=saved();
    if(choice==="yes")start();
    if(!choice||location.hash==="#analytics-choices")show();
    window.addEventListener("hashchange",function(){if(location.hash==="#analytics-choices")show();});
    window.DachaDesignAnalyticsPreferences=show;
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
