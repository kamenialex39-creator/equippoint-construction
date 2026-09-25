let products=[];
let cart=JSON.parse(localStorage.getItem("equipPointCart")||"[]");
const money=n=>"R"+Number(n||0).toLocaleString("en-ZA");
const params=new URLSearchParams(location.search);const id=Number(params.get("id"));
const cfg=window.EQUIPPOINT_CONFIG||{};
const whatsappNumber=cfg.whatsappNumber||"";
let galleryImages=[];
let galleryIndex=0;

function normalizeProduct(p){
  const images=(p.product_images||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const specs=p.specifications&&typeof p.specifications==="object"&&!Array.isArray(p.specifications)
    ? Object.entries(p.specifications).map(([k,v])=>`${k}: ${v}`)
    : Array.isArray(p.specifications)?p.specifications:[];
  return {
    id:p.id,name:p.name,price:Number(p.price||0),cat:p.category||"Industrial Supply",tag:p.tag||"Supply",
    shortDescription:p.short_description||"",description:p.description||p.short_description||"",
    availability:p.availability||"Enquire for availability",applications:Array.isArray(p.applications)?p.applications:[],
    specs,images:images.map(im=>({src:im.image_url,alt:im.alt_text||p.name}))
  };
}
async function loadFromSupabase(){
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey) throw new Error("Supabase configuration is missing.");
  const endpoint=`${cfg.supabaseUrl}/rest/v1/products?select=*,product_images(id,image_url,alt_text,sort_order)&order=created_at.desc`;
  const res=await fetch(endpoint,{cache:"no-store",headers:{apikey:cfg.supabasePublishableKey,Authorization:`Bearer ${cfg.supabasePublishableKey}`,Accept:"application/json"}});
  if(!res.ok) throw new Error(`Supabase request failed (${res.status}).`);
  const data=await res.json();return Array.isArray(data)?data.map(normalizeProduct):[];
}
async function init(){
  try{products=await loadFromSupabase();}
  catch(e){
    console.warn("Supabase catalog unavailable; using local fallback.",e);
    try{const res=await fetch("catalog.json",{cache:"no-store"});products=(await res.json())||[];}catch(f){products=[];}
  }
  const product=products.find(p=>p.id===id)||products[0];
  if(!product){document.getElementById("productName").textContent="Product not found";return;}
  renderProduct(product);renderRelated(product);updateCart();
}
function fallbackImage(name){return `assets/products/${slug(name)}.svg`;}
function setGalleryImage(index){
  if(!galleryImages.length)return;
  galleryIndex=(index+galleryImages.length)%galleryImages.length;
  const img=document.getElementById("mainProductImage");
  const item=galleryImages[galleryIndex];
  img.src=item.src;img.alt=item.alt||"";
  img.onerror=()=>{if(img.dataset.fallback!="1"){img.dataset.fallback="1";img.src=item.fallback||"";}};
  img.dataset.fallback="0";
  document.querySelectorAll(".gallery-thumb").forEach((el,i)=>el.classList.toggle("active",i===galleryIndex));
}
function renderGallery(p){
  const box=document.getElementById("productGallery");
  const thumbs=document.getElementById("galleryThumbs");
  const prev=document.getElementById("galleryPrev");
  const next=document.getElementById("galleryNext");
  galleryImages=(p.images&&p.images.length?p.images:[{src:fallbackImage(p.name),alt:p.name,fallback:fallbackImage(p.name)}]);
  galleryIndex=0;
  thumbs.innerHTML=galleryImages.map((im,i)=>`<button class="gallery-thumb${i===0?" active":""}" type="button" aria-label="View image ${i+1}"><img src="${im.src}" alt=""></button>`).join("");
  thumbs.querySelectorAll(".gallery-thumb").forEach((btn,i)=>btn.onclick=()=>setGalleryImage(i));
  const multiple=galleryImages.length>1;
  prev.hidden=!multiple;next.hidden=!multiple;thumbs.hidden=!multiple;
  prev.onclick=()=>setGalleryImage(galleryIndex-1);next.onclick=()=>setGalleryImage(galleryIndex+1);
  setGalleryImage(0);
  box.onkeydown=e=>{if(e.key==="ArrowLeft"&&multiple)setGalleryImage(galleryIndex-1);if(e.key==="ArrowRight"&&multiple)setGalleryImage(galleryIndex+1);};
}
function renderProduct(p){
 document.title=`${p.name} | EquipPoint Construction`;
 const canonical=`https://equippoint-construction.vercel.app/product.html?id=${encodeURIComponent(p.id)}`;
 const desc=(p.description||p.shortDescription||`${p.name} from EquipPoint Construction.`).slice(0,500);
 document.getElementById("metaDescription").content=desc;
 const canonicalLink=document.getElementById("canonicalLink"); if(canonicalLink) canonicalLink.href=canonical;
 const ogTitle=document.getElementById("ogTitle"); if(ogTitle) ogTitle.content=`${p.name} | EquipPoint Construction`;
 const ogDescription=document.getElementById("ogDescription"); if(ogDescription) ogDescription.content=desc;
 const ogUrl=document.getElementById("ogUrl"); if(ogUrl) ogUrl.content=canonical;
 document.getElementById("pageTitle").textContent=`${p.name} | EquipPoint Construction`;
 document.getElementById("crumbName").textContent=p.name;
 document.getElementById("productTag").textContent=p.tag||"SUPPLY";
 renderGallery(p);
 document.getElementById("productCategory").textContent=p.cat;
 document.getElementById("productName").textContent=p.name;
 document.getElementById("productPrice").textContent=money(p.price);
 const sd={"@context":"https://schema.org","@type":"Product","name":p.name,"description":desc,"url":canonical,"image":(p.images||[]).map(x=>x.src).filter(Boolean)};
 if(!sd.image.length) sd.image=[`${location.origin}/assets/products/${slug(p.name)}.svg`];
 sd.offers={"@type":"Offer","url":canonical,"priceCurrency":"ZAR","price":Number(p.price||0).toFixed(2),"availability":/out/i.test(p.availability||"")?"https://schema.org/OutOfStock":"https://schema.org/InStock","seller":{"@type":"Organization","name":"EquipPoint Construction"}};
 const rawProduct=products.find(x=>x.id===p.id);
 if(rawProduct?.brand) sd.brand={"@type":"Brand","name":rawProduct.brand};
 if(rawProduct?.mpn) sd.mpn=rawProduct.mpn;
 if(rawProduct?.gtin) sd.gtin13=rawProduct.gtin;
 const sdEl=document.getElementById("productStructuredData"); if(sdEl) sdEl.textContent=JSON.stringify(sd);
 document.getElementById("productDescription").textContent=p.description||p.shortDescription||"";
 document.getElementById("availability").textContent=p.availability||"Enquire for availability";
 document.getElementById("specs").innerHTML=(p.specs||[]).map((s,i)=>`<div class="spec-row"><span>${String(i+1).padStart(2,"0")}</span><strong>${s}</strong></div>`).join("");
 const apps=p.applications||[];document.getElementById("specs").insertAdjacentHTML("beforeend",apps.length?`<div class="product-extra"><small>APPLICATIONS</small><p>${apps.join(" • ")}</p></div>`:"");
 const message=encodeURIComponent(`Hi EquipPoint Construction, I'm interested in the ${p.name} (${money(p.price)}). Please send me availability, delivery and quotation details.`);
 document.getElementById("whatsappLink").href=whatsappNumber?`https://wa.me/${whatsappNumber.replace(/\D/g,"")}?text=${message}`:`https://wa.me/?text=${message}`;
 document.getElementById("addCart").onclick=()=>{const qty=Math.max(1,Number(document.getElementById("quantity").value)||1);addToCart(p.id,qty);openCart();};
 document.getElementById("quoteLink").href=`index.html#contact`;
 document.getElementById("quoteLink").onclick=()=>{addToCart(p.id,Math.max(1,Number(document.getElementById("quantity").value)||1),false);};
}
function slug(name){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function renderRelated(current){const related=products.filter(p=>p.cat===current.cat&&p.id!==current.id).slice(0,4);const fallback=products.filter(p=>p.id!==current.id).slice(0,4);const list=related.length>=4?related:related.concat(fallback.filter(x=>!related.some(r=>r.id===x.id))).slice(0,4);document.getElementById("relatedGrid").innerHTML=list.map(p=>`<article class="related-card"><a href="product.html?id=${p.id}" class="related-image"><span>${p.tag||"Supply"}</span></a><div><small>${p.cat}</small><h3>${p.name}</h3><strong>${money(p.price)}</strong></div><a class="details" href="product.html?id=${p.id}">View product →</a></article>`).join("");}
function addToCart(id,qty=1,open=true){const p=products.find(x=>x.id===id);if(!p)return;const existing=cart.find(x=>x.id===id);existing?existing.qty+=qty:cart.push({...p,qty});saveCart();if(open)openCart();}
function saveCart(){localStorage.setItem("equipPointCart",JSON.stringify(cart));updateCart();}
function updateCart(){document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-item"><div><strong>${x.name}</strong><small>${x.qty} × ${money(x.price)}</small></div><button onclick="removeItem(${x.id})">REMOVE</button></div>`).join(""):`<p>Your enquiry is empty.</p>`;document.getElementById("cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();}
function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","false");document.getElementById("backdrop").classList.add("show");}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","true");document.getElementById("backdrop").classList.remove("show");}
document.getElementById("cartBtn").onclick=openCart;document.getElementById("closeCart").onclick=closeCart;document.getElementById("backdrop").onclick=closeCart;document.getElementById("minus").onclick=()=>{const q=document.getElementById("quantity");q.value=Math.max(1,Number(q.value)-1)};document.getElementById("plus").onclick=()=>{const q=document.getElementById("quantity");q.value=Math.max(1,Number(q.value)+1)};document.getElementById("checkoutBtn").onclick=()=>location.href="index.html#contact";document.getElementById("year").textContent=new Date().getFullYear();init();
