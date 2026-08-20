import { API_BASE } from '../../config';
import allImage from '../../assets/marketing_ss_3.png';
import itemImage from '../../assets/marketing_ss_1.png';
import characterImage from '../../assets/marketing_ss_2.png';
import campaignImage from '../../assets/marketing_ss_4.png'
import giftImage from '../../assets/marketing_ss_5.png'

const LOGIN_URL = `${API_BASE}/api/auth/login`;

export function LandingPage() {
  return (
    <div className="lp">
      <Hero />
      <Intro />
      <Features />
      <Roadmap />
      <FooterCta />
      <style>{styles}</style>
    </div>
  );
}

/* Hero — centered, with three fanned rarity item cards                */
const HERO_CARDS = [
  {
    rarity: 'unc',
    name: 'Wardencloak',
    meta: 'Armour \u00b7 Uncommon',
    stat1: ['Armour', '+1 AC'],
    stat2: ['Properties', 'Cold Resistance'],
    flavour: 'A cloak woven in snow and ice to resist and camouflage the environment of the north'
  },
  {
    rarity: 'leg',
    name: 'Emberfang',
    meta: 'Weapon \u00b7 Legendary',
    stat1: ['Damage', '2d6 + 3 fire'],
    stat2: ['Properties', 'Finesse, Light'],
    flavour: 'Made from the scales of a once fearsome red dragon with its heat still radiating the blade as if it still breaths'
  },
  {
    rarity: 'rare',
    name: 'Wayward Compass',
    meta: 'Wondrous \u00b7 Rare',
    stat1: ['Range', 'Unlimited'],
    stat2: ['Properties', 'Requires Attunement'],
    flavour: "An old worn compass no matter the direction it never points north but always leads to something"
  },
] as const;

function Hero() {
  return (
    <header className="lp-hero" style={{
        backgroundImage: `
          radial-gradient(1200px 520px at 50% -8%, rgba(196,118,31,0.16), transparent 60%),
          linear-gradient(rgba(23,23,27,0.82), rgba(23,23,27,0.92)),
          url(${allImage})
        `
      }}>
      <nav className="lp-nav">
        <span className="lp-nav__brand">Bag of Homebrew</span>
        <a className="lp-nav__login" href={LOGIN_URL}>Sign in</a>
      </nav>

      <div className="lp-hero__inner">
        <p className="lp-eyebrow">TTRPG toolkit</p>
        <h1 className="lp-hero__title">
          Every item.<br />Every character.<br />Every campaign.
        </h1>
        <p className="lp-hero__sub">
          An inventory and campaign manager for tabletop games — built for
          homebrew, works with any system.
        </p>
        <div className="lp-hero__actions">
          <a className="lp-btn lp-btn--primary" href={LOGIN_URL}>Open your bag</a>
          <a className="lp-btn lp-btn--ghost" href="#features">See what's inside</a>
        </div>
        <p className="lp-hero__free">Free to start · Sign in with Google</p>

        <div className="lp-cards" aria-hidden="true">
          {HERO_CARDS.map((c) => (
            <div className="lp-card" key={c.name}>
              <div className={`lp-card__img lp-card__img--${c.rarity}`}>
                <div className="lp-card__shine" />
                <p className="lp-card__flavour">{c.flavour}</p>
              </div>
              <div className="lp-card__block">
                <h3 className={`lp-card__name lp-card__name--${c.rarity}`}>{c.name}</h3>
                <p className="lp-card__meta">{c.meta}</p>
                <div className={`lp-card__rule lp-card__rule--${c.rarity}`} />
                <p className="lp-card__stat"><strong>{c.stat1[0]}</strong> {c.stat1[1]}</p>
                <p className="lp-card__stat"><strong>{c.stat2[0]}</strong> {c.stat2[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-tear" />
    </header>
  );
}

/* Intro — lead line + diagonal cascading banners                      */

function Intro() {
  return (
    <section className="lp-intro">
      <p className="lp-intro__lead">
        Keep your gear, characters, and whole party in one place — whether you're
        a player tracking a pack of loot or a GM running the table.
      </p>
      <div className="lp-banners">
        <span className="lp-banner lp-banner--players">
          <span className="lp-banner__shine" />
          For players
        </span>
        <span className="lp-banner lp-banner--gm">
          <span className="lp-banner__shine" />
          For game masters
        </span>
        <span className="lp-banner lp-banner--system">
          <span className="lp-banner__shine" />
          For any system
        </span>
      </div>
    </section>
  );
}

/* Features — alternating rows with decorative dividers                */

const FEATURES = [
  {
    kicker: 'Inventory',
    title: 'A home for every item',
    body:
      'Build items with rarity, categories, images, and rich descriptions. Homebrew a cursed trinket or catalogue a whole hoard — every piece looks the part in its own framed slot.',
    screenshot: itemImage
  },
  {
    kicker: 'Characters',
    title: 'Sheets that keep up',
    body:
      'Equipment slots, health, armour, and coin — all tracked and always current. Drag gear into place, adjust on the fly, and never lose the thread mid-session.',
    screenshot: characterImage
  },
  {
    kicker: 'Campaigns',
    title: 'Run the whole table',
    body:
      'Host a campaign, invite your party with a code, and share a common vault. See everyone\u2019s character at a glance and hand out loot as the story turns.',
    screenshot: campaignImage
  },
  {
    kicker: 'Trading',
    title: 'Pass it across the table',
    body:
      'Gift items player to player, send loot from the vault, or return spoils to the pile. Every hand-off waits for the other side to accept — no arguments, no lost gold.',
    screenshot: giftImage
  },
];

function Features() {
  return (
    <section className="lp-features" id="features">
      {FEATURES.map((f, i) => (
        <div key={f.kicker}>
          <div className={`lp-feature ${i % 2 === 1 ? 'lp-feature--flip' : ''}`}>
            <div className="lp-feature__text">
              <p className="lp-feature__kicker">{f.kicker}</p>
              <h2 className="lp-feature__title">{f.title}</h2>
              <p className="lp-feature__body">{f.body}</p>
            </div>
            <div className="lp-feature__shot">
              <img className="lp-shot" src={f.screenshot} alt={f.kicker} />
            </div>
          </div>
          {i < FEATURES.length - 1 && (
            <div className="lp-div" aria-hidden="true"><span>{'\u2726'}</span></div>
          )}
        </div>
      ))}
    </section>
  );
}

/* Roadmap                                                             */

const ROADMAP = [
  { heading: 'Available now', state: 'now', items: ['Item inventory', 'Character sheets', 'Campaign mode', 'Shared vault', 'Player trading'] },
  { heading: 'Coming soon', state: 'soon', items: ['Spellbook', 'Abilities', 'Live campaign updates', 'Journal', 'Dice Roller'] },
  { heading: 'On the map', state: 'later', items: ['Content library', 'Import / export', 'Initiative tracker', 'More systems'] },
];

function Roadmap() {
  return (
    <section className="lp-roadmap">
      <div className="lp-roadmap__head">
        <p className="lp-eyebrow">Roadmap</p>
        <h2 className="lp-roadmap__title">Still being written</h2>
        <p className="lp-roadmap__sub">
          Bag of Homebrew is growing. Here's what's in hand and what's on the way.
        </p>
      </div>
      <div className="lp-roadmap__cols">
        {ROADMAP.map((col) => (
          <div className={`lp-rm lp-rm--${col.state}`} key={col.heading}>
            <h3>{col.heading}</h3>
            <ul>{col.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Footer CTA                                                          */

function FooterCta() {
  return (
    <footer className="lp-footer">
      <h2 className="lp-footer__title">Your bag is waiting.</h2>
      <a className="lp-btn lp-btn--primary lp-btn--lg" href={LOGIN_URL}>Open your bag</a>
      <p className="lp-footer__note">Free to start · Sign in with Google</p>
      <p className="lp-footer__brand">Bag of Homebrew</p>
    </footer>
  );
}


/* Styles                                                             */

const styles = `
.lp {
  --ink:#17171B; --panel:#232327; --border:#37373D;
  --amber:#C4761F; --amber-soft:#E0954A; --text:#E8E4DB; --muted:#8C897F;
  --parch:#FBF1DC; --parch-edge:#E8D9B5; --stat-red:#7A2E12;
  --fd:'Cinzel',Georgia,serif; --fb:'Inter',system-ui,sans-serif; --fs:'Spectral',Georgia,serif;
  color:var(--text); font-family:var(--fb); -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.lp * { box-sizing:border-box; }

.lp-eyebrow { text-transform:uppercase; letter-spacing:.28em; font-size:12px; font-weight:600; color:var(--amber); margin:0 0 18px; }

.lp-btn { display:inline-block; font-weight:600; font-size:15px; text-decoration:none; padding:14px 28px; border-radius:10px; transition:transform .15s, background .15s, box-shadow .15s; cursor:pointer; }
.lp-btn--primary { background:var(--amber); color:#1A1206; box-shadow:0 6px 24px rgba(196,118,31,.35); }
.lp-btn--primary:hover { transform:translateY(-2px); background:var(--amber-soft); box-shadow:0 10px 30px rgba(196,118,31,.45); }
.lp-btn--ghost { background:transparent; color:var(--text); border:1px solid var(--border); }
.lp-btn--ghost:hover { border-color:var(--amber); color:var(--amber-soft); }
.lp-btn--lg { padding:18px 40px; font-size:17px; }

/* hero */
.lp-hero { position:relative; background:radial-gradient(1200px 520px at 50% -8%, rgba(196,118,31,.16), transparent 60%), var(--ink); padding-bottom:130px; background-position: center top; background-size: contain; background-repeat: no-repeat;}
.lp-nav { max-width:1160px; margin:0 auto; padding:26px 32px; display:flex; align-items:center; justify-content:space-between; }
.lp-nav__brand { font-family:var(--fd); font-weight:700; font-size:20px; color:var(--text); }
.lp-nav__login { color:var(--muted); text-decoration:none; font-size:14px; font-weight:500; }
.lp-nav__login:hover { color:var(--text); }
.lp-hero__inner { max-width:900px; margin:0 auto; padding:40px 32px 0; text-align:center; display:flex; flex-direction:column; align-items:center; }
.lp-hero__title { font-family:var(--fd); font-weight:800; font-size:clamp(38px,5.6vw,66px); line-height:1.05; margin:0 0 26px; letter-spacing:.01em; }
.lp-hero__sub { font-size:clamp(16px,1.6vw,19px); line-height:1.6; color:var(--muted); max-width:520px; margin:0 auto 34px; }
.lp-hero__actions { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
.lp-hero__free { margin:20px 0 0; font-size:13px; color:var(--muted); }

/* fanned cards */
.lp-cards { display:flex; justify-content:center; align-items:flex-start; gap:26px; margin-top:64px; }
.lp-card { width:250px; background:var(--parch); border-radius:14px; overflow:hidden; box-shadow:0 26px 60px rgba(0,0,0,.5); border:1px solid var(--parch-edge); }
.lp-card:nth-child(1) { transform:rotate(-4deg) translateY(14px); }
.lp-card:nth-child(2) { transform:translateY(-8px) scale(1.05); z-index:2; }
.lp-card:nth-child(3) { transform:rotate(4deg) translateY(14px); }
.lp-card__img { position:relative; height:50px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.lp-card__img--leg { background:linear-gradient(135deg,#3a2416,#6b3f1c 55%,#b9752e); }
.lp-card__img--rare { background:linear-gradient(135deg,#152238,#1f3d63 55%,#3f79c0); }
.lp-card__img--unc { background:linear-gradient(135deg,#16281a,#1f4a2b 55%,#3f9d5c); }
.lp-card__shine { position:absolute; top:0; left:-60%; width:60%; height:100%; background:linear-gradient(100deg, transparent, rgba(255,240,205,.5), transparent); transform:skewX(-18deg); animation:lp-shine 5s ease-in-out infinite; }
.lp-card:nth-child(2) .lp-card__shine { animation-delay:.6s; }
.lp-card:nth-child(3) .lp-card__shine { animation-delay:1.2s; }
@keyframes lp-shine { 0% { left:-60%; } 55%,100% { left:130%; } }
.lp-card__glyph { font-size:54px; filter:drop-shadow(0 3px 6px rgba(0,0,0,.5)); }
.lp-card__block { padding:16px 18px 20px; color:#2a2118; }
.lp-card__name { font-family:var(--fd); font-size:18px; margin:0 0 3px; }
.lp-card__name--leg { color:#7A2E12; } .lp-card__name--rare { color:#1f4f8f; } .lp-card__name--unc { color:#2f6b3d; }
.lp-card__meta { font-family:var(--fs); font-style:italic; color:#7c6a4a; font-size:12px; margin:0 0 10px; }
.lp-card__rule { height:2px; opacity:.7; margin:0 0 11px; }
.lp-card__rule--leg { background:#7A2E12; } .lp-card__rule--rare { background:#1f4f8f; } .lp-card__rule--unc { background:#2f6b3d; }
.lp-card__stat { font-family:var(--fs); font-size:13px; margin:0 0 5px; color:#33291c; }
.lp-card__stat strong { color:#5a4a2c; }
.lp-card__flavour {
  font-family: var(--fs);
  font-style: italic;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(255, 248, 232, 0.92);
  text-align: center;
  padding: 14px 16px;
  margin: 0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* torn divide */
.lp-tear { position:absolute; left:0; right:0; bottom:-1px; height:44px; background:var(--parch);
  clip-path:polygon(0 55%,4% 42%,8% 58%,13% 40%,18% 56%,23% 44%,29% 60%,34% 46%,40% 58%,46% 44%,52% 58%,58% 42%,64% 58%,70% 46%,76% 60%,82% 44%,88% 58%,93% 42%,97% 56%,100% 46%,100% 100%,0 100%); }

/* intro + diagonal banners */
.lp-intro { position:relative; background:var(--parch); color:#2a2118; text-align:center; padding:56px 32px 26px;
  background-image:radial-gradient(700px 300px at 50% 40%, rgba(196,118,31,.10), transparent 70%); }
.lp-intro__lead { font-family:var(--fs); font-size:clamp(20px,2.6vw,30px); line-height:1.5; max-width:780px; margin:0 auto 56px; color:#33291c; }
.lp-banners {
  display: flex;
  justify-content: center;
  gap: 28px;              /* space between them */
  flex-wrap: wrap;
}
.lp-banner {
  position: relative;
  overflow: hidden;        /* clips the shine sweep */
  width: 200px;
  text-align: center;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  padding: 16px 0;
  border-radius: 8px;
  letter-spacing: .02em;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .22);
  text-shadow: 0 1px 2px rgba(0, 0, 0, .3);
  font-family: var(--fs);
}
.lp-banner--players { background: linear-gradient(135deg, #C4761F, #E0954A); }
.lp-banner--gm      { background: linear-gradient(135deg, #7A2E12, #a9421d); }
.lp-banner--system  { background: linear-gradient(135deg, #2f6b3d, #3f9d5c); }

/* shine sweep — same idea as the item cards */
.lp-banner__shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 60%;
  height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255, 240, 205, .55), transparent);
  transform: skewX(-18deg);
  animation: lp-shine 5s ease-in-out infinite;
}
.lp-banner--gm .lp-banner__shine { animation-delay: .6s; }
.lp-banner--system .lp-banner__shine { animation-delay: 1.2s; }

/* features — spiced parchment */
.lp-features { position:relative; background:var(--parch); padding:20px 32px 90px;
  background-image:
    radial-gradient(600px 400px at 100% 0, rgba(196,118,31,.08), transparent 60%),
    radial-gradient(600px 400px at 0 100%, rgba(122,46,18,.06), transparent 60%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E"); }
.lp-feature { max-width:1080px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center; padding:54px 0; align-content: center;justify-content: center;}
.lp-feature--flip .lp-feature__text { order:2; }
.lp-feature__kicker { text-transform:uppercase; letter-spacing:.22em; font-size:12px; font-weight:700; color:var(--amber); margin:0 0 14px; }
.lp-feature__title { font-family:var(--fd); font-size:clamp(26px,3.4vw,40px); color:#241c12; margin:0 0 18px; line-height:1.1; }
.lp-feature__body { font-size:17px; line-height:1.65; color:#4a4030; max-width:440px; }
.lp-feature__text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.lp-shot {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 14px;
  border: 1px solid var(--parch-edge);
  box-shadow: 0 14px 34px rgba(122, 46, 18, .14);
  display: block;
  background-position: center top; background-size: contain; background-repeat: no-repeat;
}
.lp-div { display:flex; align-items:center; justify-content:center; max-width:1080px; margin:0 auto; gap:16px; color:var(--stat-red); opacity:.45; }
.lp-div::before, .lp-div::after { content:''; height:1px; width:120px; background:linear-gradient(90deg, transparent, var(--stat-red)); }
.lp-div::after { transform:scaleX(-1); }
.lp-div span { font-size:16px; }

/* roadmap */
.lp-roadmap { background:var(--ink); padding:96px 32px; }
.lp-roadmap__head { max-width:780px; margin:0 auto 56px; text-align:center; }
.lp-roadmap__title { font-family:var(--fd); font-size:clamp(30px,4vw,46px); margin:0 0 16px; }
.lp-roadmap__sub { color:var(--muted); font-size:17px; margin:0; }
.lp-roadmap__cols { max-width:1000px; margin:0 auto; display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
.lp-rm { background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:26px 24px; }
.lp-rm h3 { font-family:var(--fd); font-size:18px; margin:0 0 18px; padding-bottom:14px; border-bottom:1px solid var(--border); }
.lp-rm--now h3 { color:var(--amber); } .lp-rm--soon h3 { color:#8FBF8F; } .lp-rm--later h3 { color:var(--muted); }
.lp-rm ul { list-style:none; margin:0; padding:0; }
.lp-rm li { font-size:15px; color:var(--text); padding:9px 0 9px 24px; position:relative; }
.lp-rm--now li::before { content:'✓'; position:absolute; left:0; color:var(--amber); font-weight:700; }
.lp-rm--soon li::before { content:'◷'; position:absolute; left:0; color:#8FBF8F; }
.lp-rm--later li { color:var(--muted); }
.lp-rm--later li::before { content:'○'; position:absolute; left:0; color:var(--muted); }

/* footer */
.lp-footer { background:radial-gradient(900px 400px at 50% 120%, rgba(196,118,31,.18), transparent 60%), var(--ink); text-align:center; padding:100px 32px 70px; border-top:1px solid var(--border); }
.lp-footer__title { font-family:var(--fd); font-size:clamp(30px,4.4vw,52px); margin:0 0 32px; }
.lp-footer__note { color:var(--muted); font-size:13px; margin:18px 0 0; }
.lp-footer__brand { font-family:var(--fd); color:var(--muted); font-size:15px; margin:56px 0 0; }

/* responsive */
@media (max-width:860px) {
  .lp-cards { flex-wrap:wrap; gap:16px; }
  .lp-card { width:220px; }
  .lp-card:nth-child(1),.lp-card:nth-child(2),.lp-card:nth-child(3) { transform:none; }
  .lp-banners { height:210px; max-width:340px; }
  .lp-banner--1 { left:0; } .lp-banner--2 { left:15%; } .lp-banner--3 { left:30%; }
  .lp-feature { grid-template-columns:1fr; gap:28px; padding:40px 0; }
  .lp-feature--flip .lp-feature__text { order:0; }
  .lp-roadmap__cols { grid-template-columns:1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-card__shine { animation:none; display:none; }
  .lp-btn:hover { transform:none; }
}
`;
