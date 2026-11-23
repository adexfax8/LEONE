const products=[
{id:1,name:"Everyday Smartphone",category:"Phones",price:285000,emoji:"📱",tag:"POPULAR"},
{id:2,name:"Performance Laptop",category:"Laptops",price:850000,emoji:"💻",tag:"WORK & STUDY"},
{id:3,name:"Wireless Earbuds",category:"Accessories",price:65000,emoji:"🎧",tag:"BESTSELLER"},
{id:4,name:"Smart Watch",category:"Accessories",price:95000,emoji:"⌚",tag:"JUST IN"},
{id:5,name:"Gaming Console",category:"Gaming",price:720000,emoji:"🎮",tag:"GAMING"},
{id:6,name:"Bluetooth Speaker",category:"Accessories",price:48000,emoji:"🔊",tag:"GREAT VALUE"},
{id:7,name:"Premium Smartphone",category:"Phones",price:620000,emoji:"📲",tag:"FEATURED"},
{id:8,name:"Wireless Gamepad",category:"Gaming",price:58000,emoji:"🕹️",tag:"GAMING"}
];
let cart=JSON.parse(localStorage.getItem("leoneCart")||"[]"),activeCategory="All";
const money=n=>"₦"+n.toLocaleString("en-NG");
const grid=document.getElementById("productGrid");
function renderProducts(){const q=document.getElementById("searchInput").value.toLowerCase();const shown=products.filter(p=>(activeCategory==="All"||p.category===activeCategory)&&(p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)));grid.innerHTML=shown.length?shown.map(p=>`<article class="product-card"><div class="product-art"><span class="product-tag">${p.tag}</span><span class="product-emoji">${p.emoji}</span></div><div class="product-info"><span class="product-category">${p.category}</span><h3>${p.name}</h3><div class="product-bottom"><span class="product-price">${money(p.price)}</span><button class="add-btn" aria-label="Add ${p.name} to cart" onclick="addToCart(${p.id})">+</button></div></div></article>`).join(""):'<p class="muted">No matching products. Try another search.</p>';}
function saveCart(){localStorage.setItem("leoneCart",JSON.stringify(cart));renderCart();}
function addToCart(id){const item=cart.find(x=>x.id===id);item?item.qty++:cart.push({id,qty:1});saveCart();openCart();toast("Added to your bag");}
function changeQty(id,delta){const item=cart.find(x=>x.id===id);if(!item)return;item.qty+=delta;if(item.qty<=0)cart=cart.filter(x=>x.id!==id);saveCart();}
function renderCart(){const count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0);document.getElementById("cartCount").textContent=count;document.getElementById("drawerCount").textContent=`(${count})`;document.getElementById("cartTotal").textContent=money(total);document.getElementById("cartItems").innerHTML=cart.length?cart.map(x=>{const p=products.find(p=>p.id===x.id);return `<div class="cart-line"><div class="cart-thumb">${p.emoji}</div><div><h4>${p.name}</h4><small>${money(p.price)} each</small><div class="qty-controls"><button onclick="changeQty(${p.id},-1)">−</button><small>${x.qty}</small><button onclick="changeQty(${p.id},1)">+</button></div></div><span class="line-price">${money(p.price*x.qty)}</span></div>`}).join(""):'<div class="empty-cart">Your bag is waiting for something good.</div>';}
function openCart(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("cartBackdrop").classList.add("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","false");}
function closeCart(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("cartBackdrop").classList.remove("open");document.getElementById("cartDrawer").setAttribute("aria-hidden","true");}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1900);}
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeCategory=b.dataset.category;renderProducts();}));
document.getElementById("searchInput").addEventListener("input",renderProducts);
document.querySelector(".cart-open").addEventListener("click",openCart);document.getElementById("cartClose").addEventListener("click",closeCart);document.getElementById("cartBackdrop").addEventListener("click",closeCart);
document.getElementById("checkoutBtn").addEventListener("click",()=>{if(!cart.length){toast("Add a product to your bag first");return;}const lines=cart.map(x=>{const p=products.find(p=>p.id===x.id);return `• ${p.name} x${x.qty} — ${money(p.price*x.qty)}`;});const total=cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.qty,0);const msg=`Hello LEONE! I would like to place an order:%0A${encodeURIComponent(lines.join("\n"))}%0A%0AEstimated total: ${encodeURIComponent(money(total))}%0APlease confirm availability, final price and delivery/pickup options.`;window.open(`https://wa.me/2348089750406?text=${msg}`,"_blank","noopener");});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("mainNav").classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>document.getElementById("mainNav").classList.remove("open")));
document.getElementById("year").textContent=new Date().getFullYear();renderProducts();renderCart();