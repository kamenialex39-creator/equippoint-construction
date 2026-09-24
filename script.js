let products=[];
let cart=JSON.parse(localStorage.getItem("equipPointCart")||"[]");
const money=n=>"R"+Number(n||0).toLocaleString("en-ZA");
const grid=document.getElementById("productGrid");
const filter=document.getElementById("categoryFilter");
const search=document.getElementById("searchInput");
const cfg=window.EQUIPPOINT_CONFIG||{};
const whatsappNumber=cfg.whatsappNumber||"";

function normalizeProduct(p){
  const images=(p.product_images||[]).slice().sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  const primary=images[0];
  const specs=p.specifications&&typeof p.specifications==="object"&&!Array.isArray(p.specifications)
    ? Object.entries(p.specifications).map(([k,v])=>`${k}: ${v}`)
    : Array.isArray(p.specifications)?p.specifications:[];
  return {
    id:p.id,name:p.name,price:Number(p.price||0),cat:p.category||"Industrial Supply",tag:p.tag||"Supply",
    shortDescription:p.short_description||"",description:p.description||p.short_description||"",
    availability:p.availability||"Enquire for availability",minimumOrder:p.minimum_order||null,
    featured:!!p.featured,quoteEnabled:p.quote_enabled!==false,brand:p.brand||"",mpn:p.mpn||"",gtin:p.gtin||"",
    googleProductCategory:p.google_product_category||"",seoTitle:p.seo_title||"",seoDescription:p.seo_description||"",
    applications:Array.isArray(p.applications)?p.applications:[],specs,image:primary?{src:primary.image_url,alt:primary.alt_text||p.name}:null
  };
}

async function loadFromSupabase(){
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey) throw new Error("Supabase configuration is missing.");
  const endpoint=`${cfg.supabaseUrl}/rest/v1/products?select=*,product_images(id,image_url,alt_text,sort_order)&order=created_at.desc`;
  const res=await fetch(endpoint,{cache:"no-store",headers:{apikey:cfg.supabasePublishableKey,Authorization:`Bearer ${cfg.supabasePublishableKey}`,Accept:"application/json"}});
  if(!res.ok) throw new Error(`Supabase request failed (${res.status}).`);
  const data=await res.json();
  return Array.isArray(data)?data.map(normalizeProduct):[];
}

async function loadCatalog(){
  try{products=await loadFromSupabase();}
  catch(e){
    console.warn("Supabase catalog unavailable; using local fallback.",e);
    try{const res=await fetch("catalog.json",{cache:"no-store"});products=(await res.json())||[];}
    catch(f){products=[];}
  }
  render();updateCart();prepareQuoteFromCart();
}
function safeImg(src){return src||"assets/products/product-placeholder.svg";}
function render(){
 const q=(search.value||"").toLowerCase().trim(); const cat=filter.value;
 const list=products.filter(p=>(cat==="All"||p.cat===cat)&&(!q||`${p.name} ${p.cat} ${p.description||""} ${(p.applications||[]).join(" ")}`.toLowerCase().includes(q)));
 grid.innerHTML=list.length?list.map((p,i)=>`<article class="product-card"><div class="product-image"><img src="${safeImg(p.image&&p.image.src)}" alt="${p.image?.alt||p.name}" onerror="this.onerror=null;this.src='assets/products/${slug(p.name)}.svg'"><span class="product-tag">${p.tag||"Supply"}</span><span class="number">${String(i+1).padStart(2,"0")}</span></div><div class="product-info"><small>${p.cat}</small><h3>${p.name}</h3><p class="card-copy">${p.shortDescription||p.description||""}</p><div class="price-row"><span class="price">${money(p.price)}</span><button class="add" onclick="addToCart(${p.id})">Add to enquiry</button></div><a class="details" href="product.html?id=${p.id}">View product →</a></div></article>`).join(""):`<p>No products found.</p>`;
}
function slug(name){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function addToCart(id,qty=1){const p=products.find(x=>x.id===id);if(!p)return;const existing=cart.find(x=>x.id===id);existing?existing.qty+=qty:cart.push({...p,qty});saveCart();openCart();prepareQuoteFromCart();}
function saveCart(){localStorage.setItem("equipPointCart",JSON.stringify(cart));updateCart();}
function updateCart(){document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-item"><div><strong>${x.name}</strong><small>${x.qty} × ${money(x.price)}</small></div><button onclick="removeItem(${x.id})">REMOVE</button></div>`).join(""):`<p>Your enquiry is empty.</p>`;document.getElementById("cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();prepareQuoteFromCart();}
function enquiryText(){return cart.length?cart.map(x=>`• ${x.name} × ${x.qty} — ${money(x.price*x.qty)}`).join("\n"):"No products selected yet.";}
function prepareQuoteFromCart(){const field=document.getElementById("requestField");if(!field)return;const current=field.value.trim();if(!current||current===window.__lastEnquiryText){field.value=enquiryText();window.__lastEnquiryText=field.value;}}
function buildMessage(data){return `Hi EquipPoint Construction,\n\nI'd like to request a quotation.\n\n${data.request}\n\nCustomer: ${data.name}${data.company?`\nCompany: ${data.company}`:""}${data.contact?`\nContact: ${data.contact}`:""}${data.location?`\nDelivery location: ${data.location}`:""}\n\nPlease confirm availability, lead time, delivery and pricing. Thank you.`;}
function sendWhatsApp(message){const encoded=encodeURIComponent(message);if(whatsappNumber){const clean=whatsappNumber.replace(/\D/g,"");window.open(`https://wa.me/${clean}?text=${encoded}`,"_blank");return true;}try{navigator.clipboard.writeText(message);}catch(e){}return false;}
function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","false");document.getElementById("backdrop").classList.add("show");}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","true");document.getElementById("backdrop").classList.remove("show");}
document.getElementById("cartBtn").onclick=openCart;document.getElementById("closeCart").onclick=closeCart;document.getElementById("backdrop").onclick=closeCart;
document.getElementById("searchBtn").onclick=()=>{document.getElementById("catalog").scrollIntoView({behavior:"smooth"});setTimeout(()=>search.focus(),350)};
filter.onchange=render;search.oninput=render;document.querySelectorAll(".category-card").forEach(b=>b.onclick=()=>{filter.value=b.dataset.category;render();document.getElementById("catalog").scrollIntoView({behavior:"smooth"})});
document.getElementById("checkoutBtn").onclick=()=>{closeCart();document.getElementById("contact").scrollIntoView({behavior:"smooth"});prepareQuoteFromCart();setTimeout(()=>document.getElementById("requestField").focus(),500);};
document.getElementById("quoteForm").onsubmit=e=>{e.preventDefault();const f=e.target;const data={name:f.name.value.trim(),company:f.company.value.trim(),contact:f.contact.value.trim(),location:f.location.value.trim(),request:f.request.value.trim()};const message=buildMessage(data);const sent=sendWhatsApp(message);const status=document.getElementById("formStatus");status.textContent=sent?"WhatsApp opened with your enquiry ready to send.":"Your enquiry message was copied. Add the EquipPoint WhatsApp number in config.js to open the chat directly.";localStorage.setItem("equipPointLastEnquiry",JSON.stringify({...data,message,products:cart,createdAt:new Date().toISOString()}));if(sent)f.reset();};
document.getElementById("year").textContent=new Date().getFullYear();
loadCatalog();
