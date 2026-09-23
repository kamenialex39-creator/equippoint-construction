const cfg = window.EQUIPPOINT_CONFIG || {};
const SUPABASE_URL = String(cfg.supabaseUrl || '').replace(/\/$/, '');
const SUPABASE_KEY = cfg.supabasePublishableKey || '';

const CATEGORIES = [
  'Construction Equipment','Solar & Batteries','Containers','Water Solutions','Sanitation','Fuel Equipment','Industrial Supply'
];
let allProducts = [];
let currentImages = [];
let pendingFiles = [];
let authSession = null;

const $ = (id) => document.getElementById(id);
const money = (n) => 'R' + Number(n || 0).toLocaleString('en-ZA');

function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function slugify(value){return String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function setStatus(text, target='formStatus', good=false){const el=$(target);if(!el)return;el.textContent=text||'';el.style.color=good?'#16794a':'#b42318';}
function show(id){$(id).classList.remove('hidden');}
function hide(id){$(id).classList.add('hidden');}

function ensureConfig(){
  if(!SUPABASE_URL || !SUPABASE_KEY){
    setStatus('CMS configuration is missing. Check config.js.','loginStatus');
    return false;
  }
  return true;
}

function saveSession(session){
  authSession=session;
  localStorage.setItem('equipPointAdminSession', JSON.stringify(session));
}
function readSession(){
  try{return JSON.parse(localStorage.getItem('equipPointAdminSession')||'null');}catch{return null;}
}
function clearSession(){authSession=null;localStorage.removeItem('equipPointAdminSession');}

async function authFetch(path, options={}){
  if(!authSession?.access_token) throw new Error('Not signed in.');
  const headers=new Headers(options.headers||{});
  headers.set('apikey',SUPABASE_KEY);
  headers.set('Authorization',`Bearer ${authSession.access_token}`);
  if(options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  let res=await fetch(`${SUPABASE_URL}${path}`, {...options,headers});
  if(res.status===401 && authSession.refresh_token){
    const refreshed=await refreshSession();
    if(refreshed){
      headers.set('Authorization',`Bearer ${authSession.access_token}`);
      res=await fetch(`${SUPABASE_URL}${path}`, {...options,headers});
    }
  }
  return res;
}

async function refreshSession(){
  try{
    const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:authSession.refresh_token})
    });
    if(!res.ok){clearSession();return false;}
    const data=await res.json();
    saveSession({...authSession,...data});
    return true;
  }catch{clearSession();return false;}
}

async function signIn(email,password){
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
    method:'POST',headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error_description||data.msg||data.message||'Invalid login credentials.');
  saveSession(data);
  return data;
}

async function signOut(){
  try{if(authSession?.access_token) await authFetch('/auth/v1/logout',{method:'POST'});}catch{}
  clearSession();showLogin();
}

function boot(){
  if(!ensureConfig()) return;
  authSession=readSession();
  if(authSession?.access_token){showApp();loadProducts();}else showLogin();
}
function showLogin(){show('loginView');hide('appView');}
function showApp(){hide('loginView');show('appView');}

async function loadProducts(){
  try{
    const res=await authFetch('/rest/v1/products?select=*,product_images(id,image_url,alt_text,sort_order)&order=created_at.desc');
    const data=await res.json().catch(()=>[]);
    if(!res.ok) throw new Error(data.message||data.error_description||'Could not load products.');
    allProducts=data||[];populateCategories();renderProducts();
  }catch(error){setStatus(error.message,'loginStatus');showLogin();}
}
function populateCategories(){
  $('category').innerHTML=CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
  $('productCategory').innerHTML=`<option value="">All categories</option>`+CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
}
function renderProducts(){
  const q=$('productSearch').value.toLowerCase().trim(),cat=$('productCategory').value;
  const list=allProducts.filter(p=>(!cat||p.category===cat)&&(!q||`${p.name} ${p.category} ${p.brand||''}`.toLowerCase().includes(q)));
  $('productList').innerHTML=list.length?list.map(p=>{
    const img=(p.product_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0]?.image_url;
    return `<div class="product-row"><div class="thumb">${img?`<img src="${escapeHtml(img)}" alt="">`:''}</div><div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.category||'')} · ${money(p.price)}</p><div class="product-meta">${p.featured?'<span class="pill">Featured</span>':''}<span class="pill">${escapeHtml(p.availability||'Enquire')}</span></div></div><div class="row-actions"><button onclick="editProduct(${p.id})">Edit</button><button onclick="deleteProduct(${p.id})">Delete</button></div></div>`;
  }).join(''):`<div class="empty-panel"><h3>No products yet</h3><p>Add your first product using the button above.</p></div>`;
}

function resetForm(){
  $('productForm').reset();$('productId').value='';$('modalTitle').textContent='Add product';$('slug').value='';$('quoteEnabled').checked=true;$('featured').checked=false;currentImages=[];pendingFiles=[];renderImages();setStatus('');
}
function openModal(product=null){
  resetForm();
  if(product){
    $('modalTitle').textContent='Edit product';$('productId').value=product.id;$('name').value=product.name||'';$('slug').value=product.slug||'';$('category').value=product.category||CATEGORIES[0];$('price').value=product.price??'';$('tag').value=product.tag||'';$('availability').value=product.availability||'';$('minimumOrder').value=product.minimum_order??'';$('brand').value=product.brand||'';$('mpn').value=product.mpn||'';$('gtin').value=product.gtin||'';$('googleProductCategory').value=product.google_product_category||'';$('shortDescription').value=product.short_description||'';$('description').value=product.description||'';$('seoTitle').value=product.seo_title||'';$('seoDescription').value=product.seo_description||'';$('featured').checked=!!product.featured;$('quoteEnabled').checked=product.quote_enabled!==false;
    $('specifications').value=product.specifications&&typeof product.specifications==='object'?Object.entries(product.specifications).map(([k,v])=>`${k}: ${v}`).join('\n'):'';
    $('applications').value=Array.isArray(product.applications)?product.applications.join('\n'):'';
    currentImages=(product.product_images||[]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));renderImages();
  }
  show('productModal');$('productModal').setAttribute('aria-hidden','false');
}
function closeModal(){hide('productModal');$('productModal').setAttribute('aria-hidden','true');}
function parseSpecs(text){const obj={};String(text||'').split('\n').map(x=>x.trim()).filter(Boolean).forEach(line=>{const i=line.indexOf(':');if(i>0)obj[line.slice(0,i).trim()]=line.slice(i+1).trim();});return obj;}
function renderImages(){
  const existing=currentImages.map((im,i)=>`<div class="image-item"><img src="${escapeHtml(im.image_url)}" alt="${escapeHtml(im.alt_text||'')}"><button type="button" onclick="removeExistingImage(${im.id})">×</button>${i===0?'<span class="primary-badge">PRIMARY</span>':''}</div>`).join('');
  const pending=pendingFiles.map((f,i)=>`<div class="image-item"><img src="${URL.createObjectURL(f)}" alt=""><button type="button" onclick="removePending(${i})">×</button><span class="primary-badge">NEW</span></div>`).join('');
  $('imageList').innerHTML=existing+pending;
}
window.removePending=(i)=>{pendingFiles.splice(i,1);renderImages();};
window.removeExistingImage=async(id)=>{const im=currentImages.find(x=>x.id===id);if(!im)return;setStatus('Removing image...');try{const res=await authFetch(`/rest/v1/product_images?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.message||'Could not remove image.');}currentImages=currentImages.filter(x=>x.id!==id);renderImages();setStatus('Image removed.','formStatus',true);}catch(e){setStatus(e.message);}};
window.editProduct=(id)=>{const p=allProducts.find(x=>x.id===id);if(p)openModal(p);};
window.deleteProduct=async(id)=>{const p=allProducts.find(x=>x.id===id);if(!p||!confirm(`Delete “${p.name}”?`))return;try{const res=await authFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});if(!res.ok){const d=await res.json().catch(()=>({}));throw new Error(d.message||'Could not delete product.');}await loadProducts();}catch(e){alert(e.message);}};

async function saveProduct(e){
  e.preventDefault();setStatus('Saving product...');
  try{
    const id=$('productId').value;
    const name=$('name').value.trim();
    const payload={name,slug:$('slug').value.trim()||slugify(name),category:$('category').value,price:$('price').value?Number($('price').value):null,tag:$('tag').value.trim()||null,short_description:$('shortDescription').value.trim()||null,description:$('description').value.trim()||null,specifications:parseSpecs($('specifications').value),applications:$('applications').value.split('\n').map(x=>x.trim()).filter(Boolean),availability:$('availability').value.trim()||null,minimum_order:$('minimumOrder').value?Number($('minimumOrder').value):null,featured:$('featured').checked,quote_enabled:$('quoteEnabled').checked,brand:$('brand').value.trim()||null,mpn:$('mpn').value.trim()||null,gtin:$('gtin').value.trim()||null,google_product_category:$('googleProductCategory').value.trim()||null,seo_title:$('seoTitle').value.trim()||null,seo_description:$('seoDescription').value.trim()||null,updated_at:new Date().toISOString()};
    let product;
    if(id){
      const res=await authFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>[]);if(!res.ok)throw new Error(data.message||'Could not update product.');product=data[0];
    }else{
      const res=await authFetch('/rest/v1/products',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>[]);if(!res.ok)throw new Error(data.message||'Could not create product.');product=data[0];
    }
    for(let i=0;i<pendingFiles.length;i++){
      const file=pendingFiles[i];const safe=`${product.id}-${Date.now()}-${slugify(file.name)||'image'}`;const path=`${product.id}/${safe}`;
      const up=await authFetch(`/storage/v1/object/product-images/${path}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
      if(!up.ok){const d=await up.json().catch(()=>({}));throw new Error(d.message||'Could not upload image.');}
      const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/product-images/${path.split('/').map(encodeURIComponent).join('/')}`;
      const nextOrder=currentImages.length+i;
      const ins=await authFetch('/rest/v1/product_images',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify({product_id:product.id,image_url:publicUrl,alt_text:product.name,sort_order:nextOrder})});
      if(!ins.ok){const d=await ins.json().catch(()=>({}));throw new Error(d.message||'Could not save image record.');}
    }
    pendingFiles=[];setStatus('Product saved.','formStatus',true);await loadProducts();setTimeout(closeModal,500);
  }catch(e){setStatus(e.message);}
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  setStatus('Signing in...','loginStatus');
  try{await signIn($('loginEmail').value.trim(),$('loginPassword').value);setStatus('','loginStatus');showApp();await loadProducts();}
  catch(error){setStatus(error.message,'loginStatus');}
});
$('signOutBtn').addEventListener('click',signOut);
$('newProductBtn').addEventListener('click',()=>openModal());$('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);$('productForm').addEventListener('submit',saveProduct);
$('imageFiles').addEventListener('change',e=>{pendingFiles.push(...Array.from(e.target.files||[]));e.target.value='';renderImages();});
$('name').addEventListener('input',()=>{if(!$('productId').value&&!$('slug').value)$('slug').value=slugify($('name').value);});
$('productSearch').addEventListener('input',renderProducts);$('productCategory').addEventListener('change',renderProducts);
document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active-view'));btn.classList.add('active');$(btn.dataset.view).classList.add('active-view');$('pageTitle').textContent=btn.textContent;}));
boot();
