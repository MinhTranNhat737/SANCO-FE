import type {Plugin} from 'vite';
import {GAME_KINDS, META, RULE_TEXT, isParty, type GameKind} from '../src/practice-types.ts';
import {gamePage} from '../src/game-links.ts';
import {LESSONS} from '../src/lesson-data.ts';
const home = {
  path:'/', title:'Sân Cờ – Chơi Cờ Tỷ Phú, Cá Ngựa, Cờ Tư Lệnh, Cờ Vua, Cờ Tướng Online Miễn Phí',
  description:'Chơi 16 môn cờ online miễn phí trên Sân Cờ (sanco.games): Cờ Tỷ Phú Việt Nam, Cờ Cá Ngựa, Cờ Tư Lệnh 3D, Cờ Vua, Cờ Tướng, Caro, Cờ Vây, Cờ Gánh. Đấu xếp hạng Elo, tạo phòng riêng mời bạn hoặc luyện tập với Bot.',
  image:'/thumbs/sanco-brand.jpg',
};
const lessonsInfo={path:'/bi-kip',title:'Bí kíp Cờ vua và Cờ tướng | Sân Cờ',description:'Học Cờ vua và Cờ tướng qua 8 chương. Thử khai cuộc, đòn chiến thuật và thế chiếu hết trên bàn cờ có ví dụ từng nước.',image:'/logos/xiangqi.jpg'};
const escapeHtml = (value:string) => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));

export function siteOrigin(value?:string){
  if(!value)return '';
  const url = new URL(value);
  if(url.protocol!=='https:' || url.pathname!=='/' || url.search || url.hash || url.username || url.password){
    throw new Error('SITE_URL must be a public HTTPS origin, without a path, query or fragment.');
  }
  return url.origin;
}

function meta(page:typeof home, origin:string, indexable:boolean){
  const {title,description,image,path}=page;
  const escape=escapeHtml;
  return `<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="${indexable?'index, follow, max-image-preview:large':'noindex, follow'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sân Cờ">
<meta property="og:locale" content="vi_VN">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
${origin?`<link rel="canonical" href="${escape(origin+path)}">
<meta property="og:url" content="${escape(origin+path)}">
<meta property="og:image" content="${escape(origin+image)}">
<meta property="og:image:alt" content="${escape(title)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(origin+image)}">`:''}`;
}

const gameLinks = (kinds:GameKind[]) => `<ul class="public-games">${kinds.map(kind=>`<li><a href="${gamePage(kind)}">${escapeHtml(META[kind].name)}</a></li>`).join('')}</ul>`;
const appLink = (kind:GameKind, ranked=false) => `/?game=${kind}${ranked?'&amp;mode=ranked':''}`;
const homeContent = `<div class="sanco-boot-screen" role="status" aria-live="polite">
  <div class="sanco-boot-card">
    <div class="sanco-boot-emblem-wrap">
      <span class="sanco-boot-ring"></span>
      <img class="sanco-boot-emblem" src="/thumbs/sanco-brand.jpg" width="88" height="88" alt="Sân Cờ" fetchpriority="high">
    </div>
    <strong class="sanco-boot-title">SÂN CỜ</strong>
    <p class="sanco-boot-sub">Đang tải bàn cờ &amp; kết nối máy chủ…</p>
    <div class="sanco-boot-bar"><span></span></div>
  </div>
</div>
<main class="public-page public-seo-fallback">
  <h1>Chơi cờ online trên Sân Cờ</h1>
  <p>${escapeHtml(home.description)}</p>
  <a class="public-cta" href="${appLink('chess')}">Chơi Cờ vua với máy</a>
  <h2>Khám phá các môn cờ</h2>
  ${gameLinks(GAME_KINDS)}
  <p><a href="/bi-kip">Bí kíp Cờ vua và Cờ tướng</a></p>
</main>`;

const lessonContent=`<main class="public-page"><nav><a href="/">Sân Cờ</a></nav><h1>Bí kíp Cờ vua &amp; Cờ tướng</h1>
<p>${escapeHtml(lessonsInfo.description)}</p>
${(['chess','xiangqi'] as const).map(kind=>`<section><h2>${META[kind].name}</h2><ol>${LESSONS[kind].map(lesson=>`<li><h3><a href="/bi-kip?mon=${kind==='chess'?'co-vua':'co-tuong'}&amp;chuong=${lesson.id}">${escapeHtml(lesson.title)}</a></h3><p>${escapeHtml(lesson.summary)} ${escapeHtml(lesson.tip)}</p></li>`).join('')}</ol></section>`).join('')}
</main>`;

function pageShell(head:string, content:string){
  return `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<meta name="theme-color" content="#21180f">
<link rel="icon" href="/thumbs/sanco-brand.jpg" type="image/jpeg">
<link rel="stylesheet" href="/public-pages.css">
${head}</head><body>${content}</body></html>`;
}

function gameContent(kind:GameKind, origin:string){
  const {name, subtitle, short}=META[kind];
  const title=`Chơi ${name} Online Miễn Phí`;
  const description=`${subtitle} Chơi ${name} 2D/3D online miễn phí với bạn bè hoặc đấu Bot AI thông minh, tính điểm xếp hạng Elo trên Sân Cờ (sanco.games). Xem luật chơi chi tiết và vào bàn ngay không cần cài đặt.`;
  const related=GAME_KINDS.filter(other=>other!==kind);
  const path=gamePage(kind);
  const ldJson = origin ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'VideoGame',
        name: `${name} – Sân Cờ`,
        description,
        url: `${origin}${path}`,
        image: `${origin}/thumbs/${kind}.jpg`,
        inLanguage: 'vi-VN',
        applicationCategory: 'Game',
        genre: isParty(kind) ? 'Board Game / Party Game' : 'Strategy Board Game',
        playMode: ['MultiPlayer', 'SinglePlayer'],
        operatingSystem: 'Web Browser',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'VND', availability: 'https://schema.org/InStock' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Sân Cờ', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name, item: `${origin}${path}` }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Cách chơi ${name} trên Sân Cờ như thế nào?`,
            acceptedAnswer: { '@type': 'Answer', text: RULE_TEXT[kind] }
          },
          {
            '@type': 'Question',
            name: `Chơi ${name} trên Sân Cờ có miễn phí và chơi cùng bạn bè được không?`,
            acceptedAnswer: { '@type': 'Answer', text: `Hoàn toàn miễn phí trên trình duyệt máy tính và điện thoại. Bạn có thể đấu với Bot AI ở 3 mức độ khó, đấu xếp hạng Elo hoặc tạo phòng riêng gửi link mời bạn bè (${isParty(kind) ? '2–4' : '2'} người chơi).` }
          }
        ]
      }
    ]
  })}</script>` : '';
  return {
    info:{path,title:`${title} – Đấu Bạn Bè, Bot AI & Luật Chơi | Sân Cờ`,description,image:`/thumbs/${kind}.jpg`},
    ldJson,
    content:`<main class="public-page"><nav aria-label="Điều hướng"><a href="/">Sân Cờ</a> <span aria-hidden="true">›</span> ${escapeHtml(name)}</nav>
<header class="public-hero"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><p class="public-detail">${escapeHtml(short)}</p>
<div class="public-actions"><a class="public-cta" href="${appLink(kind)}">Chơi với máy</a><a class="public-cta secondary" href="${appLink(kind,true)}">Đấu xếp hạng</a><a class="public-cta secondary" href="/?game=${kind}&amp;mode=friends">Chơi với bạn</a></div></div>
<img src="/thumbs/${kind}.jpg" width="384" height="384" alt="${escapeHtml(name)}" fetchpriority="high"></header>
<h2>Luật ${escapeHtml(name)} trên Sân Cờ</h2><p>${escapeHtml(RULE_TEXT[kind])}</p>
${kind==='chess'||kind==='xiangqi'?`<p><a href="/bi-kip?mon=${kind==='chess'?'co-vua':'co-tuong'}">Xem bí kíp và thế ${escapeHtml(name)} minh họa</a></p>`:''}
<h2>Chọn cách chơi</h2><ul class="public-modes"><li><strong>Luyện tập</strong> với bot ở ba độ khó. Có thể bắt đầu bằng phiên khách.</li><li><strong>Đấu xếp hạng</strong> với người chơi cùng thời gian và gần Elo của bạn. Điểm và hạng được tính riêng cho ${escapeHtml(name)}.</li><li><strong>Chơi với bạn</strong> qua liên kết mời trong phòng riêng, hỗ trợ ${isParty(kind)?'2–4':'2'} người. Chủ phòng cần đăng nhập.</li></ul>
${kind==='monopoly'?'<p>Trên điện thoại, xoay ngang khi vào bàn để xem bản đồ và điều khiển.</p>':''}
<h2>Thử thêm một môn cờ</h2>${gameLinks(related)}
</main>`
  };
}

export function publicPages(origin:string, publish:boolean):Plugin{
  const indexable = Boolean(origin && publish);
  const files = new Map<string,{body:string;type:string}>();
  const add=(path:string,body:string,type='text/html; charset=utf-8')=>files.set(path,{body,type});
  for(const kind of GAME_KINDS){
    const game=gameContent(kind, indexable ? origin : '');
    add(`${game.info.path}.html`,pageShell(`${meta(game.info,origin,indexable)}\n${game.ldJson}`,game.content));
  }
  add('/404.html',pageShell(meta({...home,path:'/404',title:'Không tìm thấy trang | Sân Cờ'},'',false),
    '<main class="public-page"><h1>Không tìm thấy trang</h1><p>Đường dẫn này không có trên Sân Cờ.</p><a class="public-cta" href="/">Về trang chủ</a></main>'));
  add('/robots.txt',`User-agent: *\nAllow: /\n${indexable?`Sitemap: ${origin}/sitemap.xml\n`:''}`,'text/plain; charset=utf-8');
  if(indexable){
    const urls=['/','/bi-kip',...GAME_KINDS.map(gamePage)].map(path=>`  <url><loc>${escapeHtml(origin+path)}</loc></url>`);
    add('/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,'application/xml; charset=utf-8');
  }
  return {
    name:'sanco-public-pages',
    transformIndexHtml(html){
      if(html.includes('<!-- public-lessons -->'))return html.replace('<!-- public-head -->',meta(lessonsInfo,origin,indexable)).replace('<!-- public-lessons -->',lessonContent);
      const structuredData = indexable ? `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:'Sân Cờ',url:`${origin}/`})}</script>` : '';
      return html.replace('<!-- public-head -->',`${meta(home,origin,indexable)}\n${structuredData}`).replace('<!-- public-home -->',homeContent);
    },
    generateBundle(){
      for(const [path,file] of files)this.emitFile({type:'asset',fileName:path.slice(1),source:file.body});
    },
    configureServer(server){
      server.middlewares.use((req,res,next)=>{
        const path=new URL(req.url||'/','http://localhost').pathname;
        const file=files.get(path)||files.get(`${path}.html`);
        if(!file&&!path.startsWith('/choi/'))return next();
        const response=file||files.get('/404.html')!;
        res.statusCode=file?200:404;
        res.setHeader('Content-Type',response.type);
        res.end(response.body);
      });
    },
  };
}
