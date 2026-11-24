(function(){
  window.tufosVideoSource = function(value){
    if(typeof value !== 'string') return null;
    let url;
    try { url = new URL(value.trim()); } catch { return null; }
    if(url.protocol !== 'https:' || url.username || url.password) return null;
    const source = { url: url.href, kind: 'link' };
    const host = url.hostname.toLowerCase();
    let youtubeId;
    if(host === 'youtu.be') youtubeId = url.pathname.split('/')[1];
    if(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)){
      youtubeId = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    }
    if(youtubeId && /^[\w-]{11}$/.test(youtubeId)){
      source.kind = 'embed';
      source.embed = `https://www.youtube-nocookie.com/embed/${youtubeId}`;
    } else if(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)){
      const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
      if(match){
        source.kind = 'embed';
        const hash = url.searchParams.get('h') || match[2];
        source.embed = `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${encodeURIComponent(hash)}` : ''}`;
      }
    } else if(/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)){
      source.kind = 'video';
    }
    return source;
  };
})();
(function(){
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  window.tufosCasePreview = function(item, fallback=''){
    const media = (item.videos || []).map(video=>window.tufosVideoSource(video?.file)).find(source=>source && source.kind !== 'link');
    if(!media) return fallback;
    if(media.kind === 'video') return `<div class="case-preview"><video data-case-preview="video" data-src="${escape(media.url)}" muted loop playsinline preload="none" tabindex="-1" aria-hidden="true"></video></div>`;
    const embed = new URL(media.embed);
    if(embed.hostname.endsWith('youtube-nocookie.com')){
      const id = embed.pathname.split('/').pop();
      for(const [key,value] of Object.entries({autoplay:1,mute:1,controls:0,loop:1,playlist:id,start:0,end:3,playsinline:1,disablekb:1,rel:0})) embed.searchParams.set(key,value);
    }else{
      for(const [key,value] of Object.entries({autoplay:1,muted:1,loop:1,background:1,controls:0,api:1})) embed.searchParams.set(key,value);
    }
    return `<div class="case-preview"><iframe data-case-preview="embed" data-src="${escape(embed.href)}" title="${escape(item.title || 'Video preview')}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" tabindex="-1" aria-hidden="true"></iframe></div>`;
  };
  if(typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const tracked = new Set();
  const visible = new WeakSet();
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const play = element => {
    if(element.tagName === 'VIDEO'){
      element.muted = true;
      element.play()?.catch(()=>{});
    }
  };
  const activate = (element, shown) => {
    if(!element.isConnected) return;
    if(shown) visible.add(element); else visible.delete(element);
    if(element.tagName === 'VIDEO'){
      if(shown && !document.hidden){
        if(!element.getAttribute('src')) element.src = element.dataset.src;
        if(!reduced?.matches) play(element);
      }else element.pause();
    }else if(shown && !document.hidden && !reduced?.matches){
      if(!element.getAttribute('src')) element.src = element.dataset.src;
    }else element.removeAttribute('src');
  };
  const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries=>{
    for(const entry of entries) activate(entry.target,entry.isIntersecting);
  },{threshold:0.1}) : null;
  const scan = () => {
    for(const element of tracked) if(!element.isConnected){ observer?.unobserve(element); tracked.delete(element); }
    document.querySelectorAll('[data-case-preview]').forEach(element=>{
      if(tracked.has(element)) return;
      tracked.add(element);
      if(element.tagName === 'VIDEO'){
        element.addEventListener('timeupdate',()=>{ if(element.currentTime >= 3) element.currentTime = 0; });
        element.addEventListener('ended',()=>{ element.currentTime = 0; if(visible.has(element)&&!document.hidden&&!reduced?.matches)play(element); });
      }
      if(observer) observer.observe(element); else activate(element,true);
    });
  };
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{ for(const element of tracked) activate(element,visible.has(element)); });
  window.addEventListener('message',event=>{
    if(event.origin !== 'https://player.vimeo.com') return;
    const frame = [...tracked].find(element=>element.tagName === 'IFRAME' && element.contentWindow === event.source);
    if(!frame) return;
    let data; try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
    if(data?.event === 'ready') frame.contentWindow.postMessage({method:'addEventListener',value:'timeupdate'},event.origin);
    if(data?.event === 'timeupdate' && data.data?.seconds >= 3) frame.contentWindow.postMessage({method:'setCurrentTime',value:0},event.origin);
  });
  scan();
})();
