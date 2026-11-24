(function(){
  let widget;
  let configuration;
  const uploaded = new WeakMap();
  const text = (zh, en) => window.SITE_LANG === 'en' ? en : zh;
  window.isReportVideo = file => !!file && (/^video\//.test(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name));

  window.prepareReportVideo = async function(){
    const files = [...(document.getElementById('attachment-input')?.files || [])];
    const container = document.getElementById('report-video-verification');
    if(!container) return;
    container.hidden = !files.length;
    if(container.hidden) return;
    try {
      if(!configuration){
        const response = await fetch('/api/report-video-upload');
        if(!response.ok) throw new Error();
        configuration = await response.json();
      }
      if(!window.turnstile){
        await new Promise((resolve, reject) => {
          window.reportTurnstileReady = resolve;
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=reportTurnstileReady&render=explicit';
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      if(widget === undefined) widget = window.turnstile.render('#report-video-challenge', { sitekey: configuration.siteKey, action: 'report-video' });
      else window.turnstile.reset(widget);
    } catch {
      document.getElementById('report-video-status').textContent = text('附件驗證暫時無法載入。請重試，或移除附件並在描述中提供附件連結。', 'Attachment verification is unavailable. Retry, or remove the attachment and provide a file link in the description.');
    }
  };

  window.attachReportVideo = async function(form, data){
    data.delete('cf-turnstile-response');
    const files = [...(document.getElementById('attachment-input')?.files || [])];
    data.delete('attachment');
    for(let i=1; i<=10; i++) data.delete('attachment' + i);
    if(!files.length) return;
    const pending = files.filter(file => !uploaded.has(file));
    if(pending.length){
      const token = widget !== undefined && window.turnstile?.getResponse(widget);
      if(!token) throw new Error(text('請先完成附件上傳驗證。', 'Please complete attachment upload verification.'));
      const response = await fetch('/api/report-video-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: pending.map(file => ({name:file.name, size:file.size})), token, consent: form.elements.privacyConsent.checked, honeypot: form.elements['bot-field'].value })
      });
      const batch = await response.json();
      if(!response.ok){
        window.turnstile.reset(widget);
        throw new Error(text('附件上傳驗證失敗，請重新驗證後再試。', 'Attachment verification failed. Please verify and retry.'));
      }
      const status = document.getElementById('report-video-status');
      for(let index=0; index<pending.length; index++){
      const file = pending[index];
      const result = batch.files[index];
      status.textContent = text('附件上傳中，請勿關閉頁面…', 'Uploading attachments. Please keep this page open…');
      try {
        await new Promise((resolve, reject) => {
          const request = new XMLHttpRequest();
          request.open('PUT', result.uploadUrl);
          request.setRequestHeader('Content-Type', result.contentType);
          request.setRequestHeader('Cache-Control', 'private, no-store');
          request.timeout = 15 * 60 * 1000;
          request.upload.onprogress = progress => {
            if(progress.lengthComputable) status.textContent = text('附件上傳 ', 'Attachment upload ') + (files.indexOf(file)+1) + '/' + files.length + ': ' + Math.round(progress.loaded / progress.total * 100) + '%';
          };
          request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error());
          request.onerror = request.ontimeout = () => reject(new Error());
          request.send(file);
        });
      } catch {
        window.turnstile.reset(widget);
        throw new Error(text('附件上傳失敗，請重新驗證後再試。', 'Attachment upload failed. Please verify and retry.'));
      }
      uploaded.set(file, result);
      }
    }
    for(const [prefix, group] of [['reportVideo',files.filter(window.isReportVideo)],['reportPhoto',files.filter(file=>!window.isReportVideo(file))]]){
      data.set(prefix + 'Url', group.map(file => uploaded.get(file).url).join('\n'));
      data.set(prefix + 'Key', group.map(file => uploaded.get(file).key).join('\n'));
      data.set(prefix + 'Name', group.map(file => file.name).join('\n'));
    }
  };
})();
