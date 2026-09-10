document.addEventListener('DOMContentLoaded', async () => {
  const { createClient } = window.supabase;
  const supabase = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const pages=[...document.querySelectorAll('.page')], tabs=[...document.querySelectorAll('.top-tab')];
  function show(id){
    if(!document.getElementById(id)) id='home';
    pages.forEach(p=>p.classList.toggle('active',p.id===id));
    tabs.forEach(t=>t.classList.toggle('active',t.dataset.open===id));
    history.replaceState(null,'','#'+id);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-open]').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    show(el.dataset.open);
  }));
  const initialHash=location.hash.slice(1);
  show(initialHash && document.getElementById(initialHash) ? initialHash : 'home');
  const modal=document.getElementById('authModal'), form=document.getElementById('authForm');
  let authMode='login';
  function updateAuthMode(){
    const reg=authMode==='register'; document.getElementById('authTitle').textContent=reg?'РЕГИСТРАЦИЯ':'ВХОД';
    document.getElementById('authHint').textContent=reg?'Создай аккаунт ReduxCoreX.':'Войди по юзернейму и паролю.';
    document.getElementById('emailLabel').hidden=!reg; document.getElementById('email').required=reg;
    document.getElementById('nameLabel').hidden=!reg; document.getElementById('name').required=reg;
    document.getElementById('username').required=true;
    document.getElementById('authSubmit').textContent=reg?'СОЗДАТЬ АККАУНТ':'ВОЙТИ'; document.getElementById('switchAuth').textContent=reg?'Уже есть аккаунт? Войти':'Нет аккаунта? Регистрация';
  }

  function openAuth(mode='login'){
    authMode=mode;
    updateAuthMode();
    document.getElementById('authMessage').textContent='';
    form.reset();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    setTimeout(()=>document.getElementById(authMode==='register'?'name':'username').focus(),50);
  }
  function closeAuth(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    form.reset();
    document.getElementById('authMessage').textContent='';
  }
  document.getElementById('openLogin').onclick=()=>openAuth('login'); document.getElementById('openRegister').onclick=()=>openAuth('register'); document.getElementById('closeAuth').onclick=closeAuth;
  document.getElementById('switchAuth').onclick=()=>{authMode=authMode==='login'?'register':'login';updateAuthMode();};
  modal.addEventListener('click',e=>{if(e.target===modal)closeAuth();});

  async function ensureProfile(user){
    const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();
    if(!data){
      const username=user.user_metadata?.username || user.email?.split('@')[0] || 'user';
      const display_name=user.user_metadata?.display_name || username;
      await supabase.from('profiles').insert({id:user.id,username,display_name});
      return {username,display_name};
    }
    return data;
  }
  function avatarFallback(name){ return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" rx="80" fill="#120811"/><text x="50%" y="57%" text-anchor="middle" fill="#ff2857" font-size="64" font-family="Arial">${(name||'?')[0].toUpperCase()}</text></svg>`); }

  const loggedOut=document.getElementById('loggedOut'), loggedIn=document.getElementById('loggedIn'), accountText=document.getElementById('accountText'), topAvatar=document.getElementById('topAvatar');
  const adminBadge=document.getElementById('adminBadge');
  let topAdminBadge=document.getElementById('topAdminBadge');
  const profileName=document.getElementById('profileName'), profileDisplayName=document.getElementById('profileDisplayName'), profileUsername=document.getElementById('profileUsername'), profileEmail=document.getElementById('profileEmail'), profileAvatar=document.getElementById('profileAvatar'), historyBox=document.getElementById('history');
  const emailToggle=document.getElementById('emailToggle'), usernameToggle=document.getElementById('usernameToggle');

  async function refreshUser(user){
    if(adminBadge) adminBadge.hidden=true;
    if(topAdminBadge) topAdminBadge.hidden=true;
    if(!user){ loggedOut.hidden=false; loggedIn.hidden=true; accountText.textContent='ONLINE'; topAvatar.hidden=true; return; }
    const profile=await ensureProfile(user); const name=profile.display_name || profile.username || user.user_metadata?.display_name || user.user_metadata?.username || 'User';
    loggedOut.hidden=true; loggedIn.hidden=false; accountText.textContent=name.toUpperCase(); profileName.textContent=name; profileDisplayName.textContent=name; profileUsername.textContent=profile.username || ''; profileUsername.classList.add('private-value'); profileUsername.classList.remove('private-visible'); profileEmail.textContent=user.email || ''; profileEmail.classList.add('email-blurred'); profileEmail.classList.remove('email-visible'); emailToggle.textContent='ПОКАЗАТЬ'; usernameToggle.textContent='ПОКАЗАТЬ'; updateAdminBadge(profile.username);
    const avatar=profile.avatar_url || user.user_metadata?.avatar_url || avatarFallback(name); profileAvatar.src=avatar; topAvatar.src=avatar; topAvatar.hidden=false;
    await loadHistory(user.id);
  }
  async function loadHistory(userId){
    const {data,error}=await supabase.from('download_history').select('item_name,category,downloaded_at').eq('user_id',userId).order('downloaded_at',{ascending:false});
    if(error){historyBox.innerHTML='<div class="empty-history">Не удалось загрузить историю.</div>';return;}

    const categories=[
      {key:'REDUX',title:'REDUX',number:'01'},
      {key:'GUN PACK',title:'GUN PACK',number:'02'},
      {key:'BODY ARMOR',title:'BODY ARMOR',number:'03'}
    ];
    const groups={};
    categories.forEach(c=>groups[c.key]={});
    (data||[]).forEach(row=>{
      const category=groups[row.category] ? row.category : 'REDUX';
      const item=row.item_name || 'Без названия';
      if(!groups[category][item]) groups[category][item]={count:0,last:row.downloaded_at};
      groups[category][item].count++;
      if(new Date(row.downloaded_at)>new Date(groups[category][item].last)) groups[category][item].last=row.downloaded_at;
    });

    historyBox.innerHTML='<div class="download-categories">'+categories.map(c=>{
      const items=Object.entries(groups[c.key]);
      return `<section class="download-category"><div class="category-title"><span>${c.number} / ${escapeHtml(c.title)}</span><strong>${items.length ? items.length+' '+(items.length===1?'мод':'мода/модов') : 'ПУСТО'}</strong></div>`+
        (items.length ? items.map(([item,info])=>`<div class="history-row"><div><span>${escapeHtml(c.title)}</span><strong>${escapeHtml(item)}</strong><small>Скачано: <b>${info.count}</b> ${info.count===1?'раз':'раза'}</small></div><time>Последний раз: ${new Date(info.last).toLocaleString('ru-RU')}</time></div>`).join('') : '<div class="empty-category">Пока ничего не скачано.</div>')+
      '</section>';
    }).join('')+'</div>';
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  const nicknameInput=document.getElementById('nicknameInput');
  const saveNickname=document.getElementById('saveNickname');
  const nicknameMessage=document.getElementById('nicknameMessage');

  function updateAdminBadge(name){
    const isAdmin=String(name||'').trim().toLowerCase()==='administrator';
    if(adminBadge) adminBadge.hidden=!isAdmin;
    if(isAdmin){
      if(!topAdminBadge){
        topAdminBadge=document.createElement('span');
        topAdminBadge.className='admin-badge top-admin-badge';
        topAdminBadge.id='topAdminBadge';
        topAdminBadge.textContent='ADMIN';
        const accountChip=document.getElementById('accountChip');
        if(accountChip) accountChip.insertBefore(topAdminBadge,topAvatar);
      }
      topAdminBadge.hidden=false;
    }else if(topAdminBadge){
      topAdminBadge.hidden=true;
    }
  }

  emailToggle.onclick=()=>{
    const visible=profileEmail.classList.toggle('email-visible');
    profileEmail.classList.toggle('email-blurred',!visible);
    emailToggle.textContent=visible?'СКРЫТЬ':'ПОКАЗАТЬ';
  };

  usernameToggle.onclick=()=>{
    const visible=profileUsername.classList.toggle('private-visible');
    profileUsername.classList.toggle('private-value',!visible);
    usernameToggle.textContent=visible?'СКРЫТЬ':'ПОКАЗАТЬ';
  };

  saveNickname.onclick=async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return;
    const display_name=nicknameInput.value.trim();
    nicknameMessage.textContent='';
    if(display_name.length<2){nicknameMessage.textContent='Имя должно содержать минимум 2 символа.';return;}
    const {error}=await supabase.from('profiles').update({display_name}).eq('id',user.id);
    if(error){nicknameMessage.textContent='Не удалось изменить никнейм: '+error.message;return;}
    nicknameMessage.textContent='Имя изменено.';
    nicknameInput.value='';
    await refreshUser(user);
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const password=document.getElementById('password').value;
    const msg=document.getElementById('authMessage'); msg.textContent='';
    const reg=authMode==='register'; let result;
    if(reg){
      const email=document.getElementById('email').value.trim();
      const display_name=document.getElementById('name').value.trim();
      const username=document.getElementById('username').value.trim();
      if(display_name.length<2){msg.textContent='Имя должно содержать минимум 2 символа.';return;}
      if(username.length<3){msg.textContent='Юзернейм должен содержать минимум 3 символа.';return;}
      if(!/^[a-zA-Z0-9_.-]+$/.test(username)){msg.textContent='Юзернейм: только латинские буквы, цифры, _, . и -.';return;}
      const {data:emailByUsername,error:lookupError}=await supabase.rpc('get_email_by_username',{login_username:username});
      if(lookupError){msg.textContent='Не удалось проверить юзернейм. Выполни новый SQL из архива в Supabase.';return;}
      if(emailByUsername){msg.textContent='Этот юзернейм уже занят.';return;}
      result=await supabase.auth.signUp({email,password,options:{data:{username,display_name}}});
    } else {
      const username=document.getElementById('username').value.trim();
      if(username.length<3){msg.textContent='Введи юзернейм.';return;}
      const {data:loginEmail,error:lookupError}=await supabase.rpc('get_email_by_username',{login_username:username});
      if(lookupError){msg.textContent='Не удалось найти юзернейм. Выполни новый SQL из архива в Supabase.';return;}
      if(!loginEmail){msg.textContent='Неправильный юзернейм или пароль.';return;}
      result=await supabase.auth.signInWithPassword({email:loginEmail,password});
    }
    if(result.error){
      const m=result.error.message.toLowerCase();
      if(reg && (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))){msg.textContent='Аккаунт с этой почтой уже существует.';}
      else if(!reg && (m.includes('invalid login credentials') || m.includes('invalid credentials'))){msg.textContent='Неправильный юзернейм или пароль.';}
      else msg.textContent=result.error.message;
      return;
    }
    if(reg && !result.data.session){
      msg.textContent='Регистрация создана, но Supabase всё ещё требует подтверждение email. Отключи Email Confirmations в Authentication → Providers → Email.';
      return;
    }
    closeAuth(); await refreshUser(result.data.user); show('profile');
  });

  document.getElementById('signOut').onclick=async()=>{await supabase.auth.signOut();show('home');await refreshUser(null);};
  document.getElementById('avatarInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0]; if(!file)return; const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    if(file.size>4*1024*1024){alert('Аватар должен быть меньше 4 МБ.');return;}
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'; const path=`${user.id}/avatar.${ext}`;
    const {error:upErr}=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});
    if(upErr){alert('Не удалось загрузить аватар: '+upErr.message);return;}
    const {data:urlData}=supabase.storage.from('avatars').getPublicUrl(path); const url=urlData.publicUrl+'?v='+Date.now();
    const {error:dbErr}=await supabase.from('profiles').update({avatar_url:url}).eq('id',user.id); if(dbErr){alert('Аватар загружен, но профиль не обновился: '+dbErr.message);return;}
    await refreshUser(user);
  });

  document.querySelectorAll('.auth-download').forEach(link=>link.addEventListener('click',async e=>{
    e.preventDefault();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){openAuth('login');return;}
    const category=link.dataset.category,item=link.dataset.item;
    const {error}=await supabase.from('download_history').insert({user_id:user.id,item_name:item,category});
    if(error) console.warn('History error:',error.message);
    window.open(link.href, link.target || '_blank', 'noopener');
  }));

  supabase.auth.onAuthStateChange(async (_event,session)=>{
    await refreshUser(session?.user||null);
  });
  const {data:{session}}=await supabase.auth.getSession();
  await refreshUser(session?.user||null);
});
