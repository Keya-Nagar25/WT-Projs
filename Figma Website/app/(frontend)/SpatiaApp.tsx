"use client";

import { useEffect, useRef, useState } from "react";

type Product = {
  name: string;
  detail: string;
  price: string;
  color: string;
  colors?: string[];
  kind: "chair" | "sofa" | "table" | "lamp";
};

const products: Product[] = [
  { name: "Hana Lounge Chair", detail: "Sage · 3 colours", price: "₹18,499", color: "#527d63", colors: ["#527d63", "#d9c4a2", "#3b3b3b"], kind: "chair" },
  { name: "Kumo 3-Seater Sofa", detail: "Sand · 3 colours", price: "₹42,999", color: "#d6c2a5", colors: ["#d6c2a5", "#9aa39c", "#9b654a"], kind: "sofa" },
  { name: "Mori Oak Side Table", detail: "Oak · 3 finishes", price: "₹7,299", color: "#bd824e", colors: ["#bd824e", "#6d4935", "#d7b787"], kind: "table" },
  { name: "Lumo Floor Lamp", detail: "Brass · 3 finishes", price: "₹4,999", color: "#d4a72b", colors: ["#d4a72b", "#252525", "#d8d6d0"], kind: "lamp" },
];

function ProductArt({ product, large = false, rotation = 0, tone }: { product: Product; large?: boolean; rotation?: number; tone?: string }) {
  return (
    <div className={`product-art ${large ? "large" : ""}`} style={{ "--tone": tone ?? product.color, "--rotation": `${rotation}deg` } as React.CSSProperties}>
      {product.kind === "chair" && <><i className="chair-back" /><i className="chair-seat" /><i className="leg l1" /><i className="leg l2" /><i className="arm a1" /><i className="arm a2" /></>}
      {product.kind === "sofa" && <><i className="sofa-back" /><i className="sofa-seat" /><i className="leg l1" /><i className="leg l2" /></>}
      {product.kind === "table" && <><i className="table-top" /><i className="table-leg tl1" /><i className="table-leg tl2" /></>}
      {product.kind === "lamp" && <><i className="lamp-shade" /><i className="lamp-stem" /><i className="lamp-base" /></>}
    </div>
  );
}

type AppUser = { id: string; email: string; name: string };

function Header({ cart, home, action, browse, openCart, user, openAuth, logout }: { cart: number; home: () => void; action: (message: string) => void; browse: () => void; openCart: () => void; user: AppUser | null; openAuth: () => void; logout: () => void }) {
  return <header><button className="logo" onClick={home}>spatia</button><nav><button onClick={browse}>Living</button><button onClick={() => action("Bedroom collection is coming soon.")}>Bedroom</button><button onClick={() => action("Office collection is coming soon.")}>Office</button><button onClick={() => action("Outdoor collection is coming soon.")}>Outdoor</button><button onClick={() => action("Choose an AR-ready product below.")}>AR Studio</button></nav><div className="actions"><button aria-label="Search" onClick={browse}>⌕</button><button aria-label="Cart" onClick={openCart}>Bag <b>{cart}</b></button><button className="sign-in" onClick={user ? logout : openAuth}>{user ? `Sign out · ${user.name}` : "Sign in"}</button></div></header>;
}

export default function App() {
  const [view, setView] = useState<"home" | "category" | "product" | "ar" | "checkout" | "confirmed">("home");
  const [selected, setSelected] = useState(products[0]);
  const [selectedColor, setSelectedColor] = useState(products[0].color);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(2);
  const [toast, setToast] = useState("");
  const [rotation, setRotation] = useState(0);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const dragX = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(response => response.json()).then(data => setUser(data.user)).catch(() => undefined);
  }, []);

  const openProduct = (product: Product) => { setSelected(product); setSelectedColor(product.color); setView("product"); window.scrollTo(0, 0); };
  const home = () => { setView("home"); window.scrollTo(0, 0); };
  const action = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const browse = () => {
    setView("home");
    setCategory("All");
    window.setTimeout(() => document.querySelector(".catalog")?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  const visibleProducts = category === "Chairs" ? products.filter(p => p.kind === "chair") : category === "Sofas" ? products.filter(p => p.kind === "sofa") : category === "Lamps" ? products.filter(p => p.kind === "lamp") : category === "Tables" ? products.filter(p => p.kind === "table") : products;
  const openAr = () => { setView("ar"); window.scrollTo(0, 0); };
  const startRotate = (event: React.PointerEvent<HTMLDivElement>) => {
    dragX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveRotate = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragX.current === null) return;
    const delta = event.clientX - dragX.current;
    setRotation(value => value + delta * 0.8);
    dragX.current = event.clientX;
  };
  const stopRotate = () => { dragX.current = null; };
  const submitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${authMode === "login" ? "login" : "signup"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    setAuthBusy(false);
    if (!response.ok) return setAuthError(data.error ?? "Sign in failed.");
    setUser(data.user);
    setAuthOpen(false);
    action(`Welcome, ${data.user.name}.`);
  };
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    action("You are signed out.");
  };

  return <main>
    <Header cart={cart} home={home} action={action} browse={browse} openCart={() => setView("checkout")} user={user} openAuth={() => setAuthOpen(true)} logout={logout} />
    {toast && <div className="toast" role="status">{toast}</div>}
    {authOpen && <div className="auth-overlay" onMouseDown={() => setAuthOpen(false)}><section className="auth-card" onMouseDown={event => event.stopPropagation()}><button className="auth-close" onClick={() => setAuthOpen(false)}>×</button><span className="eyebrow">SPATIA ACCOUNT</span><h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2><p>{authMode === "login" ? "Sign in to save favourites and track orders." : "Join Spatia for a faster checkout experience."}</p><form onSubmit={submitAuth}>{authMode === "signup" && <label>Name<input name="name" required autoComplete="name" /></label>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required minLength={8} autoComplete={authMode === "login" ? "current-password" : "new-password"} /></label>{authError && <div className="auth-error">{authError}</div>}<button className="primary" disabled={authBusy}>{authBusy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button></form><button className="auth-switch" onClick={() => { setAuthError(""); setAuthMode(authMode === "login" ? "signup" : "login"); }}>{authMode === "login" ? "New to Spatia? Create an account" : "Already have an account? Sign in"}</button></section></div>}
    {view === "home" && <>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">NEW · AR READY</span><h1>Furniture you<br />can try before<br />it arrives.</h1><p>Place any piece in your room with your phone camera, check the size, then buy in one tap.</p><div className="hero-buttons"><button className="primary" onClick={openAr}>Try in your room <span>→</span></button><button className="secondary" onClick={browse}>Browse all</button></div></div>
        <div className="hero-stage"><ProductArt product={products[0]} large /><div className="mobile-hero-copy"><span>NEW · AR READY</span><h1>See it in your<br />space before<br />you buy.</h1><button className="primary" onClick={openAr}>Try in your room</button></div><span className="tag">3D</span><span className="ar-tag">AR</span><div className="scan">▦ <span>Scan to see it<br />in your room</span></div></div>
      </section>
      <section className="catalog">
        <div className="mobile-cats">{["All","Sofas","Chairs","Lamps","Tables","Decor"].map(c => <button className={category === c ? "active" : ""} onClick={() => { setCategory(c); if (c === "Chairs") setView("category"); else if (c === "Decor") action("Decor collection is coming soon."); }} key={c}>{c}</button>)}</div>
        <div className="section-title"><h2>{category === "All" ? "Trending in AR" : category}</h2><button onClick={browse}>See all →</button></div>
        <div className="grid">{visibleProducts.map((product, i) => <button className="card" onClick={() => openProduct(product)} key={product.name}><div className="card-image"><span className="dot" /><ProductArt product={product} /><span className="ar-badge">AR</span></div><h3>{product.name}</h3><p>{product.detail}</p><strong>{product.price}</strong>{i === 0 && <span className="quick">View product</span>}</button>)}</div>
      </section>
    </>}
    {view === "category" && <section className="category-page"><button className="category-back" onClick={home}>←</button><h1>Chairs</h1><p>24 items</p><div className="mobile-cats category-chips">{["All","Lounge","Dining","Office","Outdoor","Sort"].map((c, i) => <button className={i === 1 ? "active" : ""} key={c} onClick={() => action(`${c} filter selected.`)}>{c}</button>)}</div><div className="grid">{[products[0], {...products[0], name:"Aria Armchair", detail:"Terracotta · 3 colours", price:"₹15,999", color:"#b86c50", colors:["#b86c50","#d5b49b","#5c463e"]}, {...products[0], name:"Nori Rocking Chair", detail:"Natural · 3 colours", price:"₹21,499", color:"#b59b70", colors:["#b59b70","#806c53","#e0d2ba"]}, {...products[0], name:"Sol Accent Chair", detail:"Mustard · 3 colours", price:"₹12,999", color:"#c99d32", colors:["#c99d32","#385f74","#8f5261"]}].map(product => <button className="card" onClick={() => openProduct(product)} key={product.name}><div className="card-image"><ProductArt product={product} /><span className="ar-badge">AR</span></div><h3>{product.name}</h3><p>{product.detail}</p><strong>{product.price}</strong></button>)}</div></section>}
    {view === "product" && <section className="product-page">
      <button className="back" onClick={home}>← Back</button>
      <div className="product-visual" onPointerDown={startRotate} onPointerMove={moveRotate} onPointerUp={stopRotate} onPointerCancel={stopRotate} onClick={() => setRotation(value => value + 45)}><ProductArt product={selected} large rotation={rotation} tone={selectedColor} /><span className="rotate">↔ Drag to rotate 360°</span><div className="view-toggle"><button className="active" onClick={(event) => { event.stopPropagation(); action("3D view active — drag the chair to rotate."); }}>3D</button><button onClick={(event) => { event.stopPropagation(); openAr(); }}>AR</button></div></div>
      <div className="product-info"><span className="eyebrow">AR READY</span><h1>{selected.name}</h1><button className="rating" onClick={() => action("4.8 from 326 verified reviews.")}>★ 4.8 <u>(326 reviews)</u></button><div><strong className="price">{selected.price}</strong> <del>₹22,000</del></div><div className="swatches">{(selected.colors ?? [selected.color]).map((color, index) => <button key={color} className={selectedColor === color ? "selected" : ""} style={{ background: color }} aria-label={`Colour ${index + 1}`} onClick={() => { setSelectedColor(color); action(`Colour ${index + 1} selected`); }} />)}</div><p className="dims">⌁ &nbsp; W 78 cm · D 82 cm · H 74 cm</p><p>Curved oak frame with soft bouclé cushions. Fits a 2 × 2 m corner.</p><div className="buy-actions"><button className="secondary" onClick={openAr}>View in AR</button><button className="primary" onClick={() => setView("checkout")}>Buy now · 1 tap</button></div></div>
    </section>}
    {view === "ar" && <section className="ar-view"><div className="ar-top"><button onClick={() => setView("product")}>×</button><span>Move to place · Pinch to resize</span><button onClick={() => action("Move your phone slowly around the room.")}>?</button></div><span className="floor-detected">✓ Floor detected</span><div className="scan-frame"><ProductArt product={selected} large tone={selectedColor} /><span className="size-tag">78 cm</span></div><div className="ar-panel"><div><b>{selected.name}</b><span className="mini-swatches">{(selected.colors ?? [selected.color]).map((color, index) => <button key={color} className={selectedColor === color ? "selected" : ""} style={{ background: color }} aria-label={`Colour ${index + 1}`} onClick={() => setSelectedColor(color)} />)}</span></div><div className="ar-tools"><button onClick={() => setRotation(value => value + 45)}>↻</button><button className="capture" onClick={() => action("AR snapshot captured.")} aria-label="Capture" /><button onClick={() => action("Measurement tool opened.")}>⌁</button></div><button className="primary" onClick={() => setView("checkout")}>Add to cart · {selected.price}</button></div></section>}
    {view === "checkout" && <div className="overlay"><section className="sheet"><button className="close" onClick={() => setView("product")}>×</button><h2>Confirm & pay</h2><div className="order-line"><ProductArt product={selected} /><div><b>{selected.name} · Sage</b><small>Qty 1</small></div><strong>{selected.price}</strong></div>{[["Deliver to","Home · Flat 4B, Shanti Nagar, Pune"],["Pay with","UPI · keya@okbank"],["Delivery","Free · Arrives Thu, 30 Oct"]].map(([a,b]) => <div className="detail" key={a}><small>{a}</small><b>{b}</b><button onClick={() => action(`${a} options opened.`)}>Change</button></div>)}<div className="total"><span>Total</span><b>{selected.price}</b></div><button className="primary pay" onClick={() => { setCart(cart + 1); setView("confirmed"); }}>Pay {selected.price} with 1 tap</button></section></div>}
    {view === "confirmed" && <section className="confirmed"><div className="check">✓</div><h1>Order placed!</h1><p>Your {selected.name} arrives<br /><b>Thu, 30 Oct.</b></p><div className="receipt"><small>Order #SP-48213</small><div><ProductArt product={selected} /><span><b>{selected.name} · Sage</b><small>Paid {selected.price} via UPI</small></span></div></div><button className="primary" onClick={() => action("Order SP-48213 is confirmed and being prepared.")}>Track order</button><button className="secondary" onClick={home}>Back to home</button></section>}
    {!["checkout","ar"].includes(view) && <nav className="bottom-nav"><button onClick={home}>⌂</button><button onClick={() => setView("category")}>⌕</button><button className="nav-ar" onClick={openAr}>◇</button><button onClick={() => action("Saved items opened.")}>♡</button><button onClick={() => user ? action(`Signed in as ${user.email}`) : setAuthOpen(true)}>♙</button></nav>}
  </main>;
}
