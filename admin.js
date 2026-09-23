const cfg = window.EQUIPPOINT_CONFIG || {};
const { createClient } = window.supabase;
const supabase = createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);

const CATEGORIES = [
  "Construction Equipment","Solar & Batteries","Containers","Water Solutions","Sanitation","Fuel Equipment","Industrial Supply"
];
let allProducts = [];
let currentImages = [];
let pendingFiles = [];

const $ = (id) => document.getElementById(id);
const money = (n) => "R" + Number(n || 0).toLocaleString("en-ZA");

function slugify(value){return String(value||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
function setStatus(text, target="formStatus", good=false){const el=$(target); if(!el)return; el.textContent=text||""; el.style.color=good?"#16794a":"#b42318";}
function show(id){$(id).classList.remove("hidden");}
function hide(id){$(id).classList.add("hidden");}

async function boot(){
  const {data:{session}} = await supabase.auth.getSession();
  if(session) showApp(); else showLogin();
  supabase.auth.onAuthStateChange((_event, session)=> session ? showApp() : showLogin());
}
function showLogin(){show("loginView");hide("appView");}
function showApp(){hide("loginView");show("appView");loadProducts();}

async function loadProducts(){
  const {data,error}=await supabase.from("products").select("*, product_images(id,image_url,alt_text,sort_order)").order("created_at",{ascending:false});
  if(error){setStatus(error.message,"loginStatus");return;}
  allProducts=data||[]; populateCategories(); renderProducts();
}
function populateCategories(){
  $("category").innerHTML=CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
  $("productCategory").innerHTML=`<option value="">All categories</option>`+CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
}
function renderProducts(){
  const q=$("productSearch").value.toLowerCase().trim(), cat=$("productCategory").value;
  const list=allProducts.filter(p=>(!cat||p.category===cat)&&(!q||`${p.name} ${p.category} ${p.brand||""}`.toLowerCase().includes(q)));
  $("productList").innerHTML=list.length?list.map(p=>{
    const img=(p.product_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0]?.image_url;
    return `<div class="product-row"><div class="thumb">${img?`<img src="${img}" alt="">`:""}</div><div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.category||"")} · ${money(p.price)}</p><div class="product-meta">${p.featured?'<span class="pill">Featured</span>':''}<span class="pill">${escapeHtml(p.availability||"Enquire")}</span></div></div><div class="row-actions"><button onclick="editProduct(${p.id})">Edit</button><button onclick="deleteProduct(${p.id})">Delete</button></div></div>`;
  }).join(""):`<div class="empty-panel"><h3>No products yet</h3><p>Add your first product using the button above.</p></div>`;
}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

function resetForm(){
  $("productForm").reset(); $("productId").value=""; $("modalTitle").textContent="Add product"; $("slug").value=""; $("quoteEnabled").checked=true; $("featured").checked=false; currentImages=[]; pendingFiles=[]; renderImages(); setStatus("");
}
function openModal(product=null){
  resetForm();
  if(product){
    $("modalTitle").textContent="Edit product"; $("productId").value=product.id;
    $("name").value=product.name||""; $("slug").value=product.slug||""; $("category").value=product.category||CATEGORIES[0]; $("price").value=product.price??""; $("tag").value=product.tag||""; $("availability").value=product.availability||""; $("minimumOrder").value=product.minimum_order??""; $("brand").value=product.brand||""; $("mpn").value=product.mpn||""; $("gtin").value=product.gtin||""; $("googleProductCategory").value=product.google_product_category||""; $("shortDescription").value=product.short_description||""; $("description").value=product.description||""; $("seoTitle").value=product.seo_title||""; $("seoDescription").value=product.seo_description||""; $("featured").checked=!!product.featured; $("quoteEnabled").checked=product.quote_enabled!==false;
    const specs=product.specifications&&typeof product.specifications==="object"?Object.entries(product.specifications).map(([k,v])=>`${k}: ${v}`).join("\n"):""; $("specifications").value=specs;
    const apps=Array.isArray(product.applications)?product.applications.join("\n"):""; $("applications").value=apps;
    currentImages=(product.product_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)); renderImages();
  }
  show("productModal"); $("productModal").setAttribute("aria-hidden","false");
}
function closeModal(){hide("productModal");$("productModal").setAttribute("aria-hidden","true");}

function parseSpecs(text){const obj={};String(text||"").split("\n").map(x=>x.trim()).filter(Boolean).forEach(line=>{const i=line.indexOf(":");if(i>0)obj[line.slice(0,i).trim()]=line.slice(i+1).trim();});return obj;}
function renderImages(){
  const existing=currentImages.map((im,i)=>`<div class="image-item"><img src="${im.image_url}" alt="${escapeHtml(im.alt_text||"")}"><button type="button" onclick="removeExistingImage(${im.id})">×</button>${i===0?'<span class="primary-badge">PRIMARY</span>':''}</div>`).join("");
  const pending=pendingFiles.map((f,i)=>`<div class="image-item"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" onclick="removePending(${i})">×</button><span class="primary-badge">NEW</span></div>`).join("");
  $("imageList").innerHTML=existing+pending;
}
window.removePending=(i)=>{pendingFiles.splice(i,1);renderImages();};
window.removeExistingImage=async(id)=>{const im=currentImages.find(x=>x.id===id);if(!im)return;setStatus("Removing image...");const {error}=await supabase.from("product_images").delete().eq("id",id);if(error){setStatus(error.message);return;}currentImages=currentImages.filter(x=>x.id!==id);renderImages();setStatus("Image removed.","formStatus",true);};
window.editProduct=(id)=>{const p=allProducts.find(x=>x.id===id);if(p)openModal(p);};
window.deleteProduct=async(id)=>{const p=allProducts.find(x=>x.id===id);if(!p||!confirm(`Delete “${p.name}”?`))return;const {error}=await supabase.from("products").delete().eq("id",id);if(error){alert(error.message);return;}await loadProducts();};

async function saveProduct(e){
  e.preventDefault(); setStatus("Saving product...");
  const id=$("productId").value;
  const name=$("name").value.trim();
  const payload={name,slug:$("slug").value.trim()||slugify(name),category:$("category").value,price:$("price").value?Number($("price").value):null,tag:$("tag").value.trim()||null,short_description:$("shortDescription").value.trim()||null,description:$("description").value.trim()||null,specifications:parseSpecs($("specifications").value),applications:$("applications").value.split("\n").map(x=>x.trim()).filter(Boolean),availability:$("availability").value.trim()||null,minimum_order:$("minimumOrder").value?Number($("minimumOrder").value):null,featured:$("featured").checked,quote_enabled:$("quoteEnabled").checked,brand:$("brand").value.trim()||null,mpn:$("mpn").value.trim()||null,gtin:$("gtin").value.trim()||null,google_product_category:$("googleProductCategory").value.trim()||null,seo_title:$("seoTitle").value.trim()||null,seo_description:$("seoDescription").value.trim()||null,updated_at:new Date().toISOString()};
  let product;
  if(id){const {data,error}=await supabase.from("products").update(payload).eq("id",id).select().single();if(error){setStatus(error.message);return;}product=data;}else{const {data,error}=await supabase.from("products").insert(payload).select().single();if(error){setStatus(error.message);return;}product=data;}
  for(let i=0;i<pendingFiles.length;i++){
    const file=pendingFiles[i];const safe=`${product.id}-${Date.now()}-${slugify(file.name)}`;const path=`${product.id}/${safe}`;
    const up=await supabase.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
    if(up.error){setStatus(up.error.message);return;}
    const {data:urlData}=supabase.storage.from("product-images").getPublicUrl(path);
    const nextOrder=currentImages.length+i;
    const ins=await supabase.from("product_images").insert({product_id:product.id,image_url:urlData.publicUrl,alt_text:product.name,sort_order:nextOrder});
    if(ins.error){setStatus(ins.error.message);return;}
  }
  pendingFiles=[];setStatus("Product saved.","formStatus",true);await loadProducts();setTimeout(closeModal,500);
}

$("loginForm").addEventListener("submit",async e=>{e.preventDefault();setStatus("Signing in...","loginStatus");const {error}=await supabase.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPassword").value});if(error){setStatus(error.message,"loginStatus");return;}setStatus("","loginStatus");});
$("signOutBtn").onclick=()=>supabase.auth.signOut();
$("newProductBtn").onclick=()=>openModal(); $("closeModal").onclick=closeModal; $("cancelModal").onclick=closeModal; $("productForm").addEventListener("submit",saveProduct);
$("imageFiles").addEventListener("change",e=>{pendingFiles.push(...Array.from(e.target.files||[]));e.target.value="";renderImages();});
$("name").addEventListener("input",()=>{if(!$("productId").value&&!$("slug").value)$("slug").value=slugify($("name").value);});
$("productSearch").addEventListener("input",renderProducts);$("productCategory").addEventListener("change",renderProducts);
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".view").forEach(x=>x.classList.remove("active-view"));btn.classList.add("active");$(btn.dataset.view).classList.add("active-view");$("pageTitle").textContent=btn.textContent;}));
boot();
