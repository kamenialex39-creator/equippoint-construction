let products=[];
let cart=JSON.parse(localStorage.getItem("equipPointCart")||"[]");

const money=n=>"R"+Number(n).toLocaleString("en-ZA");
const params=new URLSearchParams(location.search);
const id=Number(params.get("id"));

async function init(){
  try{
    const res=await fetch("catalog.json");
    products=await res.json();
  }catch(e){ products=[]; }

  const product=products.find(p=>p.id===id) || products[0];
  if(!product){ document.getElementById("productName").textContent="Product not found"; return; }
  renderProduct(product);
  renderRelated(product);
  updateCart();
}

function renderProduct(p){
  document.title=`${p.name} | EquipPoint Construction`;
  document.getElementById("metaDescription").content=`${p.name} — ${p.cat}. View product details, pricing and enquiry options from EquipPoint Construction.`;
  document.getElementById("pageTitle").textContent=`${p.name} | EquipPoint Construction`;
  document.getElementById("crumbName").textContent=p.name;
  document.getElementById("productTag").textContent=p.tag;
  document.getElementById("visualCode").textContent=String(p.id).padStart(2,"0");
  document.getElementById("visualCategory").textContent=p.cat.toUpperCase();
  const imageBox=document.querySelector(".product-visual");
  if(imageBox && p.image){ imageBox.style.backgroundImage=`linear-gradient(135deg,rgba(20,20,20,.18),rgba(20,20,20,.58)), url("${p.image.src.replace(".jpg",".svg")}")`; imageBox.style.backgroundSize="cover"; imageBox.style.backgroundPosition="center"; }
  document.getElementById("productCategory").textContent=p.cat;
  document.getElementById("productName").textContent=p.name;
  document.getElementById("productPrice").textContent=money(p.price);
  document.getElementById("productDescription").textContent=p.description;
  document.getElementById("availability").textContent=p.availability || "Enquire for availability";
  document.getElementById("specs").innerHTML=(p.specs||[]).map((s,i)=>`<div class="spec-row"><span>${String(i+1).padStart(2,"0")}</span><strong>${s}</strong></div>`).join("");

  const message=encodeURIComponent(`Hi EquipPoint Construction, I'm interested in the ${p.name} (${money(p.price)}). Please send me availability and delivery details.`);
  document.getElementById("whatsappLink").href=`https://wa.me/?text=${message}`;

  document.getElementById("addCart").onclick=()=>{
    const qty=Math.max(1,Number(document.getElementById("quantity").value)||1);
    for(let i=0;i<qty;i++) addToCart(p.id);
    openCart();
  };

  document.getElementById("quoteLink").href=`index.html#contact`;
}

function renderRelated(current){
  const related=products.filter(p=>p.cat===current.cat && p.id!==current.id).slice(0,4);
  const fallback=products.filter(p=>p.id!==current.id).slice(0,4);
  const list=related.length>=4?related:related.concat(fallback.filter(x=>!related.some(r=>r.id===x.id))).slice(0,4);
  document.getElementById("relatedGrid").innerHTML=list.map(p=>`
    <article class="related-card">
      <a href="product.html?id=${p.id}" class="related-image">
        <span>${p.tag}</span><b>${String(p.id).padStart(2,"0")}</b>
      </a>
      <div><small>${p.cat}</small><h3>${p.name}</h3><strong>${money(p.price)}</strong></div>
      <a class="details" href="product.html?id=${p.id}">View product →</a>
    </article>`).join("");
}

function addToCart(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const existing=cart.find(x=>x.id===id);
  existing?existing.qty++:cart.push({...p,qty:1});
  saveCart();
}
function saveCart(){localStorage.setItem("equipPointCart",JSON.stringify(cart));updateCart();}
function updateCart(){
  document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>`
    <div class="cart-item"><div><strong>${x.name}</strong><small>${x.qty} × ${money(x.price)}</small></div>
    <button onclick="removeItem(${x.id})">REMOVE</button></div>`).join(""):`<p>Your cart is empty.</p>`;
  document.getElementById("cartTotal").textContent=money(cart.reduce((s,x)=>s+x.price*x.qty,0));
}
function removeItem(id){cart=cart.filter(x=>x.id!==id);saveCart();}
function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","false");document.getElementById("backdrop").classList.add("show");}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","true");document.getElementById("backdrop").classList.remove("show");}

document.getElementById("cartBtn").onclick=openCart;
document.getElementById("closeCart").onclick=closeCart;
document.getElementById("backdrop").onclick=closeCart;
document.getElementById("minus").onclick=()=>{const q=document.getElementById("quantity");q.value=Math.max(1,Number(q.value)-1)};
document.getElementById("plus").onclick=()=>{const q=document.getElementById("quantity");q.value=Math.max(1,Number(q.value)+1)};
document.getElementById("checkoutBtn").onclick=()=>location.href="index.html#contact";
document.getElementById("year").textContent=new Date().getFullYear();

init();
