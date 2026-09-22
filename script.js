let products=[];
let cart=JSON.parse(localStorage.getItem("equipPointCart")||"[]");

const money=n=>"R"+Number(n).toLocaleString("en-ZA");
const grid=document.getElementById("productGrid");
const filter=document.getElementById("categoryFilter");
const search=document.getElementById("searchInput");

async function loadCatalog(){
  try{
    const res=await fetch("catalog.json");
    products=await res.json();
  }catch(e){
    products=[];
  }
  render();
  updateCart();
}

function render(){
 const q=(search.value||"").toLowerCase();
 const cat=filter.value;
 const list=products.filter(p=>(cat==="All"||p.cat===cat)&&(!q||`${p.name} ${p.cat}`.toLowerCase().includes(q)));
 grid.innerHTML=list.length?list.map((p,i)=>`
 <article class="product-card">
   <div class="product-image">
     <span class="product-tag">${p.tag}</span>
     <span class="number">${String(i+1).padStart(2,"0")}</span>
   </div>
   <div class="product-info">
     <small>${p.cat}</small>
     <h3>${p.name}</h3>
     <div class="price-row">
       <span class="price">${money(p.price)}</span>
       <button class="add" onclick="addToCart(${p.id})">Add to cart</button>
     </div>
     <a class="details" href="product.html?id=${p.id}">View product</a>
   </div>
 </article>`).join(""):`<p>No products found.</p>`;
}

function addToCart(id){
 const p=products.find(x=>x.id===id);
 if(!p)return;
 const existing=cart.find(x=>x.id===id);
 existing?existing.qty++:cart.push({...p,qty:1});
 saveCart(); openCart();
}
function saveCart(){localStorage.setItem("equipPointCart",JSON.stringify(cart));updateCart()}
function updateCart(){
 document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
 document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`
 <div class="cart-item"><div><strong>${x.name}</strong><small>${x.qty} × ${money(x.price)}</small></div>
 <button onclick="removeItem(${x.id})">REMOVE</button></div>`).join(""):`<p>Your cart is empty.</p>`;
 document.getElementById("cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart()}

function showDetails(id){
 const p=products.find(x=>x.id===id); if(!p)return;
 const modal=document.createElement("div");
 modal.className="modal";
 modal.innerHTML=`<div class="modal-card">
   <button class="modal-close" aria-label="Close">×</button>
   <p class="eyebrow">${p.cat}</p>
   <h2>${p.name}</h2>
   <p class="modal-price">${money(p.price)}</p>
   <p class="modal-copy">Professional-grade supply for construction, industrial and infrastructure applications. Product specifications, stock and delivery options can be confirmed with the EquipPoint team.</p>
   <div class="modal-actions"><button class="btn btn-primary" onclick="addToCart(${p.id});this.closest('.modal').remove()">Add to cart</button><a class="btn btn-outline-dark" href="#contact" onclick="this.closest('.modal').remove()">Request quote</a></div>
 </div>`;
 document.body.appendChild(modal);
 modal.querySelector(".modal-close").onclick=()=>modal.remove();
 modal.onclick=e=>{if(e.target===modal)modal.remove()};
}

function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","false");document.getElementById("backdrop").classList.add("show")}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","true");document.getElementById("backdrop").classList.remove("show")}
document.getElementById("cartBtn").onclick=openCart;
document.getElementById("closeCart").onclick=closeCart;
document.getElementById("backdrop").onclick=closeCart;
document.getElementById("searchBtn").onclick=()=>{document.getElementById("catalog").scrollIntoView();setTimeout(()=>search.focus(),350)};
filter.onchange=render; search.oninput=render;
document.querySelectorAll(".category-card").forEach(b=>b.onclick=()=>{filter.value=b.dataset.category;render();document.getElementById("catalog").scrollIntoView()});
document.getElementById("quoteForm").onsubmit=e=>{e.preventDefault();alert("Thanks — your EquipPoint enquiry has been captured. Connect this form to email/CRM before launch.");e.target.reset()};
document.getElementById("checkoutBtn").onclick=()=>alert("Checkout integration will be connected in the e-commerce phase.");
document.getElementById("year").textContent=new Date().getFullYear();

loadCatalog();
