/* Multi-page frontend for the TUFOS static site. */
const SITE_LANG = window.SITE_LANG || 'zh';
const SITE_BASE = window.SITE_BASE || '/';
const pageName = document.body.dataset.page || 'home';
const sitePath = (path='') => /^https?:\/\//i.test(String(path)) ? String(path) : SITE_BASE + String(path).replace(/^\/+/, '');
const pagePath = (path='') => SITE_LANG === 'en' ? `en/${path}` : path;

function toggleMobile(){
  const menu = document.getElementById('mobileMenu');
  const btn = document.querySelector('.nav-hamburger');
  if(!menu) return;
  const open = menu.classList.toggle('open');
  if(btn) btn.setAttribute('aria-expanded', String(open));
}
function closeMobile(){
  const menu = document.getElementById('mobileMenu');
  const btn = document.querySelector('.nav-hamburger');
  if(menu) menu.classList.remove('open');
  if(btn) btn.setAttribute('aria-expanded', 'false');
}

function openInfoModal(id){
  const modal = document.getElementById(id);
  if(!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeInfoModal(id){
  const modal = document.getElementById(id);
  if(!modal) return;
  modal.classList.remove('open');
  if(!document.querySelector('.modal-overlay.open')) document.body.style.overflow = '';
}
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;

function openJoinPhotoModal(image, caption = ''){
  const imgEl = document.getElementById('join-modal-img');
  const captionEl = document.getElementById('join-modal-caption');
  if(!imgEl) return;
  imgEl.style.backgroundImage = `url('${image}')`;
  imgEl.style.backgroundSize = 'contain';
  imgEl.style.backgroundPosition = 'center';
  imgEl.style.backgroundRepeat = 'no-repeat';
  if(captionEl){
    captionEl.textContent = caption || '';
    captionEl.hidden = !caption;
  }
  openInfoModal('join-photo-modal');
}
function closeJoinPhotoModal(){ closeInfoModal('join-photo-modal'); }
window.closeJoinPhotoModal = closeJoinPhotoModal;

document.addEventListener('click', e=>{
  const btn = e.target.closest('.join-photo-button');
  if(!btn) return;
  openJoinPhotoModal(btn.dataset.joinImage || '', btn.dataset.joinCaption || '');
});

const fetchJson = async (path) => {
  try{
    const res = await fetch(sitePath(path), {cache:'no-store'});
    return res.ok ? await res.json() : null;
  }catch(err){
    return null;
  }
};

function parseDate(str){
  const m = String(str || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if(!m) return 0;
  return Number(m[1])*10000 + Number(m[2])*100 + Number(m[3]);
}
function parseGalleryDate(item){
  const explicit = parseDate(item && item.date);
  if(explicit) return explicit;
  const fileDate = String((item && item.image) || '').match(/(\d{4})(\d{2})(\d{2})/);
  return fileDate ? Number(fileDate[1] + fileDate[2] + fileDate[3]) : 0;
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function field(item, key){
  if(!item) return '';
  if(SITE_LANG === 'en' && item[key + '_en']) return item[key + '_en'];
  return item[key] || '';
}

const UI_DICT = {
  '學會公告':'Society Announcements',
  '活動預告':'Upcoming Events',
  '國際動態':'International News',
  '研究報告':'Research Reports',
  '媒體報導':'Media Coverage',
  '待確認':'Unverified',
  '資料完整':'Complete',
  '部分完整':'Partial',
  '資料不足':'Insufficient'
};
function ui(zh){ return SITE_LANG === 'en' ? (UI_DICT[zh] || zh) : zh; }
function completenessLabel(value){
  if(value === 'complete') return ui('資料完整');
  if(value === 'partial') return ui('部分完整');
  return ui('資料不足');
}

function imageFit(item){
  return item && item.imageFit === 'contain' ? 'contain' : 'cover';
}
function imagePosition(item){
  const allowed = ['center','top','bottom','left','right'];
  return allowed.includes(item && item.imagePosition) ? item.imagePosition : 'center';
}
function phClass(item){
  return item && item.image ? 'ph' : `ph ${item && item.background ? item.background : 'ph-grid'}`;
}
function phStyle(item){
  if(!item || !item.image) return '';
  return `style="background-image:url('${sitePath(item.image)}');background-size:${imageFit(item)};background-position:${imagePosition(item)};background-repeat:no-repeat;"`;
}
function renderCasePhotos(item){
  const photos = [...(item.image ? [{file:item.image,crop:item.imageCrop}] : []), ...(item.photos || [])].filter(photo => photo && (photo.file?.startsWith('/images/uploads/') || /^https:\/\/[^\s]+\.(jpe?g|png|webp|gif)(\?[^\s]*)?$/i.test(photo.file)));
  if(!photos.length) return '';
  return `<section class="case-photos"><h2>${SITE_LANG === 'en' ? 'Submitted sighting photos' : '通報者提供之目擊照片'}</h2>${photos.map(photo=>{
    const crop=photo.crop;
    const cropped=crop && ['x','y','width','height','sourceWidth','sourceHeight'].every(key=>Number.isFinite(crop[key])) && crop.x>=0 && crop.y>=0 && crop.width>0 && crop.height>0 && crop.x+crop.width<=crop.sourceWidth && crop.y+crop.height<=crop.sourceHeight;
    const image=`<img class="case-evidence-image" src="${escapeHtml(sitePath(photo.file))}" alt="${escapeHtml(field(photo,'caption') || field(item,'title'))}" loading="lazy"${cropped ? ` style="width:${crop.sourceWidth/crop.width*100}%;left:${-crop.x/crop.width*100}%;top:${-crop.y/crop.height*100}%;"` : ''}>`;
    return `<figure>${cropped ? `<div class="case-evidence-crop" style="aspect-ratio:${crop.width}/${crop.height};">${image}</div>` : image}${photo.caption ? `<figcaption>${escapeHtml(field(photo,'caption'))}</figcaption>` : ''}</figure>`;
  }).join('')}</section>`;
}
function caseImage(item, extraClass=''){
  if(!item || !item.image) return '';
  const classes = ['ph', extraClass].filter(Boolean).join(' ');
  return `<div class="${classes}" ${phStyle(item)}></div>`;
}

function newsCard(item, index){
  const tagClass = (item.category === '國際動態' || item.category === '媒體報導') ? 'tag-red' : 'tag-blue';
  return `
    <article class="news-card">
      <a href="${pagePath(`news/detail/?item=${index}`)}" aria-label="${escapeHtml(field(item,'title'))}">
        <div class="${phClass(item)}" ${phStyle(item)}><span class="tag ${tagClass}">${escapeHtml(ui(item.category || '學會公告'))}</span></div>
        <div class="news-body">
          <div class="news-date">${escapeHtml(item.date || '')}</div>
          <h3>${escapeHtml(field(item,'title'))}</h3>
          <p>${escapeHtml(field(item,'summary'))}</p>
        </div>
      </a>
    </article>`;
}

function sortedCases(data){
  return [...(data.cases?.items || [])].sort((a,b)=>String(b.caseId || '').localeCompare(String(a.caseId || ''), undefined, {numeric:true}));
}

function caseCard(item, index){
  return `
    <article class="case-card">
      <a href="${pagePath(`cases/detail/?case=${encodeURIComponent(item.caseId || '')}`)}" aria-label="${escapeHtml(field(item,'title'))}">
        ${window.tufosCasePreview(item, caseImage(item))}
        <div class="case-body">
          <div class="case-topline"><span>${escapeHtml(item.caseId || '')}</span></div>
          <h3>${escapeHtml(field(item,'title'))}</h3>
          <p>${escapeHtml(field(item,'summary'))}</p>
          <div class="case-meta"><span>${escapeHtml(item.date || '')}</span><span>${escapeHtml(field(item,'location'))}</span></div>
        </div>
      </a>
    </article>`;
}

function setupStars(){
  const starBox = document.getElementById('hero-stars');
  if(!starBox) return;
  for(let i=0;i<85;i++){
    const star = document.createElement('span');
    const isBright = Math.random() > .84;
    star.className = isBright ? 'star star-bright' : 'star';
    const size = (Math.random()*(isBright ? 3.2 : 2.2) + (isBright ? 1.8 : .8)).toFixed(1);
    star.style.left = (Math.random()*100) + '%';
    star.style.top = (Math.random()*100) + '%';
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.setProperty('--star-size', size + 'px');
    star.style.setProperty('--star-opacity', (Math.random()*.45 + .42).toFixed(2));
    star.style.animationDuration = (Math.random()*2.8 + 1.6).toFixed(2) + 's';
    star.style.animationDelay = (Math.random()*4.2).toFixed(2) + 's';
    starBox.appendChild(star);
  }
}

function setupFade(){
  const fadeObs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:.1});
  document.querySelectorAll('.fade-up').forEach(el=>fadeObs.observe(el));
}

function renderFooter(settings){
  if(!settings) return;
  const footerDesc = document.getElementById('footer-desc');
  const socialFb = document.getElementById('social-fb');
  const socialEmail = document.getElementById('social-email');
  if(footerDesc && field(settings,'footerDescription')) footerDesc.textContent = field(settings,'footerDescription');
  if(socialFb && settings.facebook) socialFb.href = settings.facebook;
  if(socialEmail && settings.email) socialEmail.href = `mailto:${settings.email}`;
}

function renderHero(hero){
  if(!hero) return;
  const heroSection = document.getElementById('hero');
  const tag = document.getElementById('hero-tag');
  const date = document.getElementById('hero-date');
  const title = document.getElementById('hero-title');
  const desc = document.getElementById('hero-desc');
  if(tag) tag.textContent = field(hero,'tag');
  if(date) date.textContent = hero.date || '';
  if(title) title.innerHTML = escapeHtml(field(hero,'title')).replace(/\n/g,'<br>');
  if(desc) desc.textContent = field(hero,'description');
  if(heroSection && hero.image){
    heroSection.className = 'ph';
    heroSection.style.backgroundImage = `url('${sitePath(hero.image)}')`;
    heroSection.style.backgroundSize = 'cover';
    heroSection.style.backgroundPosition = 'center';
    heroSection.style.backgroundRepeat = 'no-repeat';
  }
}

function renderHome(data){
  renderHero(data.hero);
  const newsItems = [...((data.news && data.news.items) || [])].sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  const casesItems = sortedCases(data);
  const newsGrid = document.getElementById('home-news-grid');
  const casesGrid = document.getElementById('home-cases-grid');
  if(newsGrid) newsGrid.innerHTML = newsItems.slice(0,3).map(newsCard).join('');
  if(casesGrid) casesGrid.innerHTML = casesItems.slice(0,4).map(caseCard).join('');
}

function renderAbout(data){
  const about = data.about || {};
  const image = document.getElementById('about-image');
  const heading = document.getElementById('about-heading');
  const p1 = document.getElementById('about-p1');
  const p2 = document.getElementById('about-p2');
  const chairs = document.getElementById('about-chairs');
  if(heading) heading.textContent = field(about,'heading');
  if(p1) p1.textContent = field(about,'paragraph1');
  if(p2) p2.textContent = field(about,'paragraph2');
  if(chairs) chairs.textContent = about.chairHistory || '';
  if(image && about.image){
    image.className = 'ph';
    image.style.backgroundImage = `url('${sitePath(about.image)}')`;
    image.style.backgroundSize = 'cover';
    image.style.backgroundPosition = 'center';
  }
}

function renderNews(data){
  const items = [...((data.news && data.news.items) || [])].sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  const list = document.getElementById('news-page-list');
  if(!list) return;
  list.innerHTML = items.map((item, index)=>newsCard(item, index)).join('');
}

function renderCases(data){
  const items = sortedCases(data);
  const grid = document.getElementById('cases-page-grid');
  if(!grid) return;
  const search = document.getElementById('case-search');
  const locationFilter = document.getElementById('case-location');
  const yearFilter = document.getElementById('case-year');
  const reset = document.getElementById('case-reset');
  const meta = document.getElementById('case-results-meta');
  const unique = values => [...new Set(values.filter(Boolean))].sort();
  unique(items.map(item=>field(item,'location'))).forEach(v=>locationFilter.add(new Option(v,v)));
  unique(items.map(item=>String(item.date || '').slice(0,4))).sort().reverse().forEach(v=>yearFilter.add(new Option(v,v)));

  const render = ()=>{
    const q = (search.value || '').trim().toLowerCase();
    const filtered = items.filter(item=>{
      const haystack = [item.caseId, field(item,'title'), field(item,'location'), field(item,'summary')].join(' ').toLowerCase();
      return (!q || haystack.includes(q))
        && (!locationFilter.value || field(item,'location') === locationFilter.value)
        && (!yearFilter.value || String(item.date || '').startsWith(yearFilter.value));
    });
    grid.innerHTML = filtered.map((item)=>caseCard(item, items.indexOf(item))).join('') || `<p class="case-empty">${SITE_LANG === 'en' ? 'No cases match the current filters.' : '沒有符合篩選條件的案例。'}</p>`;
    if(meta) meta.textContent = SITE_LANG === 'en' ? `${filtered.length} cases` : `共 ${filtered.length} 筆案例`;
  };
  [search,locationFilter,yearFilter].forEach(el=>el.addEventListener(el === search ? 'input' : 'change',render));
  reset.addEventListener('click',()=>{ search.value=''; locationFilter.value=''; yearFilter.value=''; render(); });
  render();
}

function renderNewsDetail(data){
  const items = [...((data.news && data.news.items) || [])].sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  const article = document.getElementById('detail-article');
  if(!article) return;
  const item = pickDetailItem(items);
  if(!item){ renderMissingDetail(article, SITE_LANG === 'en' ? 'This news item was not found.' : '找不到這則消息。'); return; }
  const tagClass = (item.category === '國際動態' || item.category === '媒體報導') ? 'tag-red' : 'tag-blue';
  const title = field(item,'title');
  document.title = `${title} | ${SITE_LANG === 'en' ? 'Taiwan UFOlogy Society' : '台灣飛碟學會'}`;
  setDetailHero(title, item.date || '', title);
  article.innerHTML = `
    <div class="detail-meta-row">
      <span class="tag ${tagClass}">${escapeHtml(ui(item.category || '學會公告'))}</span>
      <span>${escapeHtml(item.date || '')}</span>
    </div>
    <h1>${escapeHtml(title)}</h1>
    <div class="${phClass(item)} detail-image" ${phStyle(item)}></div>
    <p class="detail-summary">${escapeHtml(field(item,'summary'))}</p>`;
}

function caseVideos(item){
  return (Array.isArray(item && item.videos) ? item.videos : []).filter(video =>
    video && window.tufosVideoSource(video.file)
  );
}

function renderCaseVideos(item){
  const videos = caseVideos(item);
  if(!videos.length) return '';
  return `<section class="case-videos" aria-label="${SITE_LANG === 'en' ? 'Case videos' : '案例影片'}">
    ${videos.map((video, index)=>{
      const media = window.tufosVideoSource(video.file);
      const source = escapeHtml(media.url);
      const caption = field(video, 'caption') || `${SITE_LANG === 'en' ? 'Video' : '影片'} ${index + 1}`;
      const player = media.kind === 'embed'
        ? `<iframe src="${escapeHtml(media.embed)}" title="${escapeHtml(caption)}" loading="lazy" allow="fullscreen; picture-in-picture; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
        : media.kind === 'video'
          ? `<video src="${source}" controls playsinline preload="metadata" aria-label="${escapeHtml(caption)}">${SITE_LANG === 'en' ? 'Your browser cannot play this video.' : '您的瀏覽器無法播放此影片。'}</video>`
          : `<p class="case-video-link"><a href="${source}" target="_blank" rel="noopener noreferrer">${SITE_LANG === 'en' ? 'Watch this video on the source website' : '前往來源網站觀看影片'}</a></p>`;
      return `<figure class="case-video">
        <h2>${escapeHtml(caption)}</h2>
        ${player}
      </figure>`;
    }).join('')}
  </section>`;
}

function renderCaseDetail(data){
  const items = sortedCases(data);
  const article = document.getElementById('detail-article');
  if(!article) return;
  const params = new URLSearchParams(location.search);
  const legacyIds = ['008','007','006','005','004','003','002','001'].map(number=>'TUFOS-2026-'+number);
  const caseId = params.get('case') || (params.has('item') ? legacyIds[Number(params.get('item'))] : '');
  const item = caseId ? items.find(entry=>entry.caseId===caseId) : pickDetailItem(items);
  if(!item){ renderMissingDetail(article, SITE_LANG === 'en' ? 'This case was not found.' : '找不到這筆案例。'); return; }
  const title = field(item,'title');
  const subtitle = [item.caseId || '', item.date || '', field(item,'location')].filter(Boolean).join(' / ');
  document.title = `${title} | ${SITE_LANG === 'en' ? 'Taiwan UFOlogy Society' : '台灣飛碟學會'}`;
  setDetailHero(title, subtitle, title);
  article.innerHTML = `
    <div class="detail-meta-row">
      <span>${escapeHtml(item.caseId || '')}</span>
      <span>${escapeHtml(item.date || '')}</span>
      <span>${escapeHtml(field(item,'location'))}</span>
    </div>
    <h1>${escapeHtml(title)}</h1>
    <p class="detail-summary">${escapeHtml(field(item,'summary'))}</p>
    <div class="detail-grid">
      <div class="case-detail-meta"><span>${SITE_LANG === 'en' ? 'Sighting date and time' : '目擊日期與時間'}</span><p>${escapeHtml([item.date,item.time].filter(Boolean).join('　'))}</p></div>
      <div class="case-detail-meta"><span>${SITE_LANG === 'en' ? 'Sighting location' : '目擊地點'}</span><p>${escapeHtml(field(item,'location'))}</p></div>
      <div class="case-detail-meta"><span>${SITE_LANG === 'en' ? 'Witnesses' : '目擊人數'}</span><p>${Number.isInteger(item.witnesses) && item.witnesses > 0 ? item.witnesses : (SITE_LANG === 'en' ? 'Not provided' : '未提供')}</p></div>
      <div class="case-detail-meta"><span>${SITE_LANG === 'en' ? 'Object shape' : '飛行物形狀'}</span><p>${escapeHtml(field(item,'shape') || (SITE_LANG === 'en' ? 'Not provided' : '未提供'))}</p></div>
      <div class="full"><span>${SITE_LANG === 'en' ? 'Observation record' : '觀測紀錄'}</span><p>${escapeHtml(field(item,'observation'))}</p></div>
      <div class="full"><span>${SITE_LANG === 'en' ? 'Investigation notes' : '調查說明'}</span><p>${escapeHtml(field(item,'review'))}</p></div>
    </div>
    ${renderCaseVideos(item)}
    ${renderCasePhotos(item)}`;
}

function setDetailHero(title, subtitle, breadcrumb){
  const heroTitle = document.getElementById('detail-hero-title');
  const heroSubtitle = document.getElementById('detail-hero-subtitle');
  const breadcrumbCurrent = document.getElementById('detail-breadcrumb-current');
  if(heroTitle) heroTitle.textContent = title || '';
  if(heroSubtitle) heroSubtitle.textContent = subtitle || '';
  if(breadcrumbCurrent) breadcrumbCurrent.textContent = breadcrumb || '';
}

function pickDetailItem(items){
  const params = new URLSearchParams(location.search);
  const picked = params.has('item') ? Number(params.get('item')) : NaN;
  return Number.isInteger(picked) ? items[picked] : null;
}

function renderMissingDetail(article, message){
  article.innerHTML = `
    <h1>${escapeHtml(message)}</h1>
    <p class="detail-summary">${SITE_LANG === 'en' ? 'Please return to the list and choose an item again.' : '請返回列表重新選擇內容。'}</p>
    <div class="page-actions"><a href="${SITE_LANG === 'en' ? 'en/' : './'}" class="btn btn-blue">${SITE_LANG === 'en' ? 'Back to Home' : '回到首頁'}</a></div>`;
}

function renderJoin(data){
  const join = data.join || {};
  const track = document.getElementById('join-gallery-track');
  if(track && Array.isArray(join.photos)){
    const photos = join.photos
      .filter(p=>p && p.image)
      .sort((a,b)=>parseGalleryDate(b)-parseGalleryDate(a));
    const slide = (p, duplicate = false)=>{
      const meta = [field(p,'date'), field(p,'caption')].filter(Boolean).map(escapeHtml).join('　');
      return `<figure class="join-slide${duplicate ? ' is-duplicate' : ''}"${duplicate ? ' aria-hidden="true"' : ''}>
        <button type="button" class="join-photo-button" data-join-image="${escapeHtml(sitePath(p.image))}" data-join-caption="${meta}"${duplicate ? ' tabindex="-1"' : ''}>
          <div class="ph join-photo" style="background-image:url('${sitePath(p.image)}');background-size:cover;background-position:center;"></div>
        </button>
        ${meta ? `<figcaption>${meta}</figcaption>` : ''}
      </figure>`;
    };
    track.innerHTML = photos.map(p=>slide(p)).join('') + photos.map(p=>slide(p, true)).join('');
  }
}

function renderLinks(data){
  const items = (data.links && data.links.items) || [];
  const list = document.getElementById('links-page-list');
  if(!list) return;
  list.innerHTML = items.map(item=>`
    <a class="link-row" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener">
      <div class="link-name">${escapeHtml(field(item,'name'))}<span class="arrow">→</span></div>
      <div class="link-desc">${escapeHtml(field(item,'description'))}</div>
    </a>`).join('');
}

function updateFileName(input){
  const nameEl = document.getElementById('attachment-name');
  if(!nameEl) return;
  if(input.files.length === 0) nameEl.textContent = SITE_LANG === 'en' ? 'No file selected' : '未選擇任何檔案';
  else if(input.files.length === 1) nameEl.textContent = input.files[0].name;
  else nameEl.textContent = SITE_LANG === 'en' ? `${input.files.length} files selected` : `已選擇 ${input.files.length} 個檔案`;
}
window.updateFileName = updateFileName;

const reportFieldLabels = {
  date: ['目擊日期', 'Date of Sighting'],
  time: ['目擊時間', 'Time'],
  location: ['目擊地點', 'Location'],
  witnesses: ['目擊人數', 'Number of Witnesses'],
  shape: ['飛行物形狀', 'Shape of Object'],
  description: ['詳細描述', 'Detailed Description'],
  contact: ['聯絡方式', 'Contact'],
  attachment: ['相關照片或影片', 'Related Photos or Video'],
  publicationConsent: ['AI 整理及匿名公開', 'AI editing and anonymous publication']
};
const reportFullFields = new Set(['location', 'description', 'contact', 'attachment', 'publicationConsent']);

function reportText(zh, en){ return SITE_LANG === 'en' ? en : zh; }

function reportAlert(message, type='error'){
  const alertBox = document.getElementById('report-alert');
  if(alertBox){
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    alertBox.style.display = 'block';
    alertBox.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

function clearReportAlert(){
  const alertBox = document.getElementById('report-alert');
  if(alertBox) alertBox.style.display = 'none';
}

function hideReportResult(){
  const form = document.querySelector('.report-form');
  const result = document.getElementById('report-result');
  if(form) form.classList.remove('is-submitted');
  if(result) result.hidden = true;
}

function showReportResult(form){
  const confirm = document.getElementById('report-confirm');
  const result = document.getElementById('report-result');
  form.classList.remove('is-confirming');
  form.classList.add('is-submitted');
  if(confirm) confirm.hidden = true;
  if(result){
    result.hidden = false;
    result.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

function validateReportFiles(form){
  const fileInput = form.querySelector('#attachment-input');
  if(fileInput?.files.length > 10){ reportAlert(reportText('每次最多可附 10 個檔案。', 'Attach up to 10 files per report.')); return false; }
  if(fileInput && fileInput.files){
    for(const file of fileInput.files){
      const video = window.isReportVideo?.(file);
      const maxSize = 100 * 1024 * 1024;
      if(!video){
        if(!/\.(jpe?g|png|webp|gif)$/i.test(file.name)){ reportAlert(reportText('照片請使用 JPG、PNG、WebP 或 GIF。', 'Photos must be JPG, PNG, WebP or GIF.')); return false; }
      }
      if(video && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)){
        reportAlert(reportText('影片請使用 MP4、WebM、MOV 或 M4V 格式。', 'Please use MP4, WebM, MOV or M4V video.'));
        return false;
      }
      if(file.size > maxSize){
        reportAlert(SITE_LANG === 'en'
          ? `File "${file.name}" exceeds the 100MB limit. Please provide a link instead.`
          : `檔案「${file.name}」超過 100MB，請改在描述中提供影片連結。`);
        return false;
      }
    }
  }
  return true;
}

function reportValue(form, name){
  if(name === 'publicationConsent') return form.elements.publicationConsent?.checked
    ? reportText('同意 AI 整理及匿名公開報告與附件', 'Authorized AI editing and anonymous publication of the report and attachments')
    : reportText('僅供私下研究，不自動公開', 'Private research only; no automatic publication');
  if(name === 'attachment'){
    const files = form.querySelector('#attachment-input')?.files || [];
    return files.length ? [...files].map(file=>file.name).join('、') : reportText('未提供', 'Not provided');
  }
  const fieldEl = form.elements[name];
  if(!fieldEl) return '';
  if(fieldEl.tagName === 'SELECT'){
    return fieldEl.selectedOptions[0]?.textContent || reportText('未提供', 'Not provided');
  }
  return String(fieldEl.value || '').trim() || reportText('未提供', 'Not provided');
}

function reviewReport(e){
  e.preventDefault();
  const form = e.target;
  if(!form.reportValidity()) return;
  if(!validateReportFiles(form)) return;
  hideReportResult();
  clearReportAlert();
  const summary = document.getElementById('report-confirm-summary');
  if(summary){
    summary.innerHTML = Object.keys(reportFieldLabels).map(name=>{
      const label = reportFieldLabels[name][SITE_LANG === 'en' ? 1 : 0];
      const fullClass = reportFullFields.has(name) ? ' class="full"' : '';
      return `<div${fullClass}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(reportValue(form, name))}</dd></div>`;
    }).join('');
  }
  const formGrid = form.querySelector('.form-grid');
  const privacy = document.getElementById('report-privacy-block');
  const primary = document.getElementById('report-primary-actions');
  const confirm = document.getElementById('report-confirm');
  form.classList.add('is-confirming');
  if(formGrid) formGrid.hidden = true;
  if(privacy) privacy.hidden = true;
  if(primary) primary.hidden = true;
  if(confirm) confirm.hidden = false;
  window.prepareReportVideo?.();
  confirm?.scrollIntoView({behavior:'smooth', block:'start'});
}
window.reviewReport = reviewReport;

function editReport(){
  const form = document.querySelector('.report-form');
  if(!form) return;
  const formGrid = form.querySelector('.form-grid');
  const privacy = document.getElementById('report-privacy-block');
  const primary = document.getElementById('report-primary-actions');
  const confirm = document.getElementById('report-confirm');
  form.classList.remove('is-confirming', 'is-submitted');
  if(formGrid) formGrid.hidden = false;
  if(privacy) privacy.hidden = false;
  if(primary) primary.hidden = false;
  if(confirm) confirm.hidden = true;
  hideReportResult();
  form.scrollIntoView({behavior:'smooth', block:'start'});
}
window.editReport = editReport;

async function submitReport(e){
  e.preventDefault();
  const btn = e.target;
  const form = btn.closest('form');
  if(!form || !validateReportFiles(form)) return;
  const orig = btn.textContent;
  clearReportAlert();
  btn.disabled = true;
  btn.textContent = SITE_LANG === 'en' ? 'Submitting...' : '送出中...';
  let submission;
  try {
    if(form.elements.reportId && !form.elements.reportId.value) form.elements.reportId.value = crypto.randomUUID();
    submission = new FormData(form);
    await window.attachReportVideo?.(form, submission);
  } catch(error){
    reportAlert(error.message);
    btn.disabled = false;
    btn.textContent = orig;
    return;
  }
  fetch(sitePath(''), {method:'POST', body:submission})
    .then(res=>{
      if(!res.ok) throw new Error('submit failed');
      btn.textContent = SITE_LANG === 'en' ? 'Submitted. Thank you for your report.' : '已提交，感謝您的通報 ✓';
      form.reset();
      const nameEl = document.getElementById('attachment-name');
      if(nameEl) nameEl.textContent = SITE_LANG === 'en' ? 'No file selected' : '未選擇任何檔案';
      showReportResult(form);
    })
    .catch(()=>{
      reportAlert(SITE_LANG === 'en'
        ? 'Submission failed. Please try again later or email us directly.'
        : '提交失敗，請稍後再試或直接以 Email 與我們聯繫。');
    })
    .finally(()=>{
      btn.disabled = false;
      setTimeout(()=>{ btn.textContent = orig; }, 3500);
    });
}
window.submitReport = submitReport;

(async function init(){
  setupStars();
  const data = {};
  [data.hero, data.about, data.news, data.cases, data.join, data.links, data.settings] = await Promise.all([
    fetchJson('content/hero.json'),
    fetchJson('content/about.json'),
    fetchJson('content/news.json'),
    fetchJson('content/cases.json'),
    fetchJson('content/join.json'),
    fetchJson('content/links.json'),
    fetchJson('content/settings.json')
  ]);
  renderFooter(data.settings);
  if(pageName === 'home') renderHome(data);
  if(pageName === 'about') renderAbout(data);
  if(pageName === 'news') renderNews(data);
  if(pageName === 'cases') renderCases(data);
  if(pageName === 'news-detail') renderNewsDetail(data);
  if(pageName === 'case-detail') renderCaseDetail(data);
  if(pageName === 'join') renderJoin(data);
  if(pageName === 'links') renderLinks(data);
  if(pageName === 'contact' && data.settings){
    const emailLinks = document.querySelectorAll('[data-contact-email]');
    emailLinks.forEach(a=>{ a.href = `mailto:${data.settings.email}`; a.textContent = data.settings.email; });
  }
  setupFade();
})();
