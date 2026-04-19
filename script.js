// ===== JobFlow - Free Global Job Search =====
const CATEGORIES=[
{name:'Software Dev',icon:'💻',query:'software developer',gradient:'linear-gradient(135deg,#667eea,#764ba2)'},
{name:'Data Science',icon:'📊',query:'data science',gradient:'linear-gradient(135deg,#f093fb,#f5576c)'},
{name:'Design',icon:'🎨',query:'design',gradient:'linear-gradient(135deg,#4facfe,#00f2fe)'},
{name:'Marketing',icon:'📢',query:'marketing',gradient:'linear-gradient(135deg,#43e97b,#38f9d7)'},
{name:'Hospitality',icon:'🏨',query:'hospitality',gradient:'linear-gradient(135deg,#f6d365,#fda085)'},
{name:'Nursing',icon:'👩‍⚕️',query:'nurse',gradient:'linear-gradient(135deg,#fbc2eb,#a6c1ee)'},
{name:'Cybersecurity',icon:'🔒',query:'cybersecurity',gradient:'linear-gradient(135deg,#0c3483,#a2b6df)'},
{name:'AI & Machine Learning',icon:'🤖',query:'machine learning',gradient:'linear-gradient(135deg,#8360c3,#2ebf91)'},
{name:'Finance',icon:'💰',query:'finance',gradient:'linear-gradient(135deg,#a18cd1,#fbc2eb)'},
{name:'Accounting',icon:'📋',query:'accounting',gradient:'linear-gradient(135deg,#ffecd2,#fcb69f)'},
{name:'Sales',icon:'🤝',query:'sales',gradient:'linear-gradient(135deg,#fa709a,#fee140)'},
{name:'Healthcare',icon:'🏥',query:'healthcare',gradient:'linear-gradient(135deg,#ff9a9e,#fecfef)'},
{name:'Education',icon:'📚',query:'teacher',gradient:'linear-gradient(135deg,#a1c4fd,#c2e9fb)'},
{name:'Writing & Content',icon:'✍️',query:'content writer',gradient:'linear-gradient(135deg,#d4fc79,#96e6a1)'},
{name:'Customer Support',icon:'🎧',query:'customer support',gradient:'linear-gradient(135deg,#84fab0,#8fd3f4)'},
{name:'HR & Recruiting',icon:'👥',query:'human resources',gradient:'linear-gradient(135deg,#f6d365,#fda085)'},
{name:'DevOps & Cloud',icon:'⚙️',query:'devops',gradient:'linear-gradient(135deg,#89f7fe,#66a6ff)'},
{name:'Project Management',icon:'📌',query:'project manager',gradient:'linear-gradient(135deg,#c471f5,#fa71cd)'},
{name:'Logistics',icon:'🚚',query:'logistics',gradient:'linear-gradient(135deg,#48c6ef,#6f86d6)'},
{name:'Legal',icon:'⚖️',query:'legal',gradient:'linear-gradient(135deg,#feada6,#f5efef)'},
{name:'Construction',icon:'🏗️',query:'construction',gradient:'linear-gradient(135deg,#e8cbc0,#636fa4)'},
{name:'Real Estate',icon:'🏠',query:'real estate',gradient:'linear-gradient(135deg,#c1dfc4,#deecdd)'},
{name:'Engineering',icon:'🔧',query:'engineer',gradient:'linear-gradient(135deg,#fbc2eb,#a6c1ee)'},
{name:'Remote Jobs',icon:'🌍',query:'remote',gradient:'linear-gradient(135deg,#667eea,#764ba2)'},
];
const GRADS=['linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#a18cd1,#fbc2eb)'];
let allJobs=[],displayedJobs=[],currentPage=0,savedJobs=JSON.parse(localStorage.getItem('jf_saved')||'[]'),searchHistory=JSON.parse(localStorage.getItem('jf_history')||'[]');
const PER_PAGE=12;let currentQuery='',currentLocation='',refreshTimer=null,lastFetchTime=null;
const $=id=>document.getElementById(id);

document.addEventListener('DOMContentLoaded',()=>{
  // Load theme
  const t=localStorage.getItem('jf_theme')||'dark';
  document.documentElement.dataset.theme=t;
  renderCategories();fetchAllJobs();setupEvents();setupScroll();updateSavedBadge();
  // Auto-refresh every 5 min
  refreshTimer=setInterval(()=>{checkForNewJobs()},300000);
  // Track visit
  trackAnalytics('visit');
});

// ===== ANALYTICS (localStorage) =====
function trackAnalytics(type,data=''){
  const stats=JSON.parse(localStorage.getItem('jf_analytics')||'{"visits":0,"searches":0,"applies":0,"saves":0,"history":[]}');
  if(type==='visit')stats.visits++;
  if(type==='search'){stats.searches++;stats.history.unshift({q:data,t:Date.now()});stats.history=stats.history.slice(0,50)}
  if(type==='apply')stats.applies++;
  if(type==='save')stats.saves++;
  localStorage.setItem('jf_analytics',JSON.stringify(stats));
}

// ===== FETCH FROM MULTIPLE GLOBAL APIs =====
async function fetchAllJobs(){
  $('loading-container').style.display='block';
  $('jobs-grid').innerHTML='';
  try{
    const[r1,r2]=await Promise.allSettled([fetchRemotive(),fetchArbeitnow()]);
    let jobs=[];
    if(r1.status==='fulfilled')jobs.push(...r1.value);
    if(r2.status==='fulfilled')jobs.push(...r2.value);
    jobs.sort(()=>Math.random()-0.5);
    allJobs=jobs;lastFetchTime=new Date();
    const co=new Set(jobs.map(j=>j.company)).size;
    $('stat-jobs').textContent=jobs.length.toLocaleString()+'+';
    $('stat-companies').textContent=co.toLocaleString()+'+';
    // Populate category filter
    const cats=[...new Set(jobs.map(j=>j.category))].sort();
    $('filter-category').innerHTML='<option value="">All Categories</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
    applyFilters();
  }catch(e){console.error(e);$('loading-container').style.display='none';$('empty-state').style.display='block'}
}

async function fetchRemotive(){
  const r=await fetch('https://remotive.com/api/remote-jobs?limit=200');
  const d=await r.json();
  return(d.jobs||[]).map(j=>({id:'r-'+j.id,title:j.title,company:j.company_name,location:j.candidate_required_location||'Worldwide',type:normType(j.job_type),typeLabel:j.job_type||'Full Time',category:j.category||'Other',description:j.description||'',excerpt:strip(j.description||'').slice(0,180),url:j.url,date:j.publication_date,salary:j.salary||'',tags:(j.tags||[]).slice(0,5),source:'Remotive',logo:j.company_logo||''}));
}

async function fetchArbeitnow(){
  const r=await fetch('https://www.arbeitnow.com/api/job-board-api');
  const d=await r.json();
  return(d.data||[]).map(j=>({id:'a-'+j.slug,title:j.title,company:j.company_name,location:j.location||(j.remote?'Remote / Worldwide':'On-site'),type:j.remote?'full_time':'full_time',typeLabel:j.remote?'Remote':'Full Time',category:mapCat(j.tags),description:j.description||'',excerpt:strip(j.description||'').slice(0,180),url:j.url,date:j.created_at?new Date(j.created_at*1000).toISOString():new Date().toISOString(),salary:'',tags:(j.tags||[]).slice(0,5),source:'Arbeitnow',logo:''}));
}

function normType(t){if(!t)return'full_time';const s=t.toLowerCase();if(s.includes('full'))return'full_time';if(s.includes('part'))return'part_time';if(s.includes('contract'))return'contract';if(s.includes('freelance'))return'freelance';if(s.includes('intern'))return'internship';return'full_time'}
function mapCat(tags){if(!tags||!tags.length)return'Other';const t=tags.join(' ').toLowerCase();if(t.match(/software|engineer|developer|frontend|backend/))return'Software Development';if(t.match(/data|machine|analytics/))return'Data Science';if(t.match(/design|ux|ui/))return'Design';if(t.match(/marketing/))return'Marketing';if(t.match(/sales/))return'Sales';if(t.match(/finance|accounting/))return'Finance';if(t.match(/health|medical/))return'Healthcare';if(t.match(/education|teaching/))return'Education';if(t.match(/writing|content/))return'Writing';if(t.match(/support|customer/))return'Customer Support';if(t.match(/hr|recruit/))return'HR';if(t.match(/devops|cloud|infra/))return'DevOps';return'Other'}
function strip(h){const d=document.createElement('div');d.innerHTML=h;return d.textContent||''}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

// ===== AUTO REFRESH =====
async function checkForNewJobs(){
  try{
    const r=await fetch('https://remotive.com/api/remote-jobs?limit=5');
    const d=await r.json();
    const newIds=(d.jobs||[]).map(j=>'r-'+j.id);
    const existIds=new Set(allJobs.map(j=>j.id));
    const hasNew=newIds.some(id=>!existIds.has(id));
    if(hasNew){
      const banner=document.createElement('div');
      banner.className='refresh-banner';
      banner.innerHTML='🔄 New jobs available — click to refresh';
      banner.onclick=()=>{banner.remove();fetchAllJobs();toast('Jobs refreshed!','success')};
      document.body.appendChild(banner);
      setTimeout(()=>banner.remove(),15000);
    }
  }catch(e){}
}

// ===== RENDER =====
function renderCategories(){
  $('categories-grid').innerHTML=CATEGORIES.map(c=>`<div class="category-card" style="--cat-gradient:${c.gradient}" data-query="${c.query}" tabindex="0"><div class="cat-icon">${c.icon}</div><div class="cat-name">${c.name}</div><div class="cat-count">Browse jobs</div></div>`).join('');
  $('categories-grid').querySelectorAll('.category-card').forEach(c=>c.onclick=()=>{$('search-input').value=c.dataset.query;$('location-input').value='';performSearch();$('jobs').scrollIntoView({behavior:'smooth'})});
}

function applyFilters(){
  let jobs=[...allJobs];const q=currentQuery.toLowerCase(),loc=currentLocation.toLowerCase(),type=$('filter-type').value,cat=$('filter-category').value;
  if(q)jobs=jobs.filter(j=>j.title.toLowerCase().includes(q)||j.company.toLowerCase().includes(q)||j.category.toLowerCase().includes(q)||j.tags.some(t=>t.toLowerCase().includes(q)));
  if(loc)jobs=jobs.filter(j=>j.location.toLowerCase().includes(loc));
  if(type)jobs=jobs.filter(j=>j.type===type);
  if(cat)jobs=jobs.filter(j=>j.category.toLowerCase().includes(cat.toLowerCase()));
  if($('filter-sort').value==='date')jobs.sort((a,b)=>new Date(b.date)-new Date(a.date));
  displayedJobs=jobs;currentPage=0;renderJobs(true);
  if(q||loc){$('search-info').style.display='flex';$('search-info-text').textContent=`${jobs.length} results`+(q?` for "${currentQuery}"`:'')+( loc?` in "${currentLocation}"`:'');}
  else $('search-info').style.display='none';
}

function renderJobs(reset){
  $('loading-container').style.display='none';
  if(!displayedJobs.length){$('jobs-grid').innerHTML='';$('empty-state').style.display='block';$('load-more-container').style.display='none';return}
  $('empty-state').style.display='none';
  const s=currentPage*PER_PAGE,e=s+PER_PAGE,page=displayedJobs.slice(s,e);
  const html=page.map((j,i)=>{
    const idx=s+i,g=GRADS[idx%GRADS.length],init=j.company.charAt(0).toUpperCase(),isSaved=savedJobs.some(s=>s.id===j.id);
    return`<div class="job-card" data-index="${idx}" style="animation:fadeInUp .4s ease ${i*.04}s both">
      <button class="bookmark-btn${isSaved?' saved':''}" data-id="${j.id}" onclick="event.stopPropagation();toggleSave(${idx})" title="Save job">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isSaved?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      </button>
      <div class="job-card-header">
        ${j.logo?`<img src="${j.logo}" alt="" class="company-avatar" style="object-fit:contain;background:#fff;padding:4px" onerror="this.outerHTML='<div class=\\'company-avatar\\' style=\\'background:${g}\\'>${init}</div>'">`:`<div class="company-avatar" style="background:${g}">${init}</div>`}
        <div class="job-card-info"><div class="job-card-title" title="${esc(j.title)}">${esc(j.title)}</div><div class="job-card-company">${esc(j.company)}</div></div>
      </div>
      <div class="job-card-meta">
        <span class="job-meta-tag type-tag">${fmtType(j.type)}</span>
        <span class="job-meta-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(j.location.length>28?j.location.slice(0,28)+'…':j.location)}</span>
        ${j.salary?`<span class="job-meta-tag">💰 ${esc(j.salary)}</span>`:''}
      </div>
      <div class="job-card-excerpt">${esc(j.excerpt)}</div>
      <div class="job-card-footer">
        <span class="job-card-date">${fmtDate(j.date)} • ${j.source}</span>
        <div class="job-card-actions">
          <button class="btn-view" onclick="event.stopPropagation();openModal(${idx})">Details</button>
          <a href="${j.url}" target="_blank" rel="noopener" class="btn-apply" onclick="event.stopPropagation();trackAnalytics('apply')">Apply</a>
        </div>
      </div>
    </div>`}).join('');
  if(reset)$('jobs-grid').innerHTML=html;else $('jobs-grid').insertAdjacentHTML('beforeend',html);
  
  // Add LinkedIn / Indeed deep integration
  if(reset && currentQuery) {
    const lnkQuery = encodeURIComponent(currentQuery);
    const lnkLoc = encodeURIComponent(currentLocation || 'Worldwide');
    const externalHtml = `
      <div class="job-card" style="background: var(--card); border: 2px dashed var(--accent-1); text-align: center; padding: 32px; animation: fadeInUp .4s ease both;">
        <h3 style="margin-bottom: 12px; font-size: 1.2rem;">Can't find what you're looking for?</h3>
        <p style="color: var(--text-muted); margin-bottom: 20px; font-size: 0.9rem;">Search external global networks for <strong>"${currentQuery}"</strong></p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="https://www.linkedin.com/jobs/search/?keywords=${lnkQuery}&location=${lnkLoc}" target="_blank" rel="noopener" class="btn" style="background: #0077b5; color: white; border: none;">
            Search on LinkedIn <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:8px"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="https://www.indeed.com/jobs?q=${lnkQuery}&l=${lnkLoc}" target="_blank" rel="noopener" class="btn" style="background: #2164f4; color: white; border: none;">
            Search on Indeed
          </a>
        </div>
      </div>
    `;
    $('jobs-grid').insertAdjacentHTML('beforeend', externalHtml);
  }

  $('load-more-container').style.display=(currentPage+1)*PER_PAGE<displayedJobs.length?'block':'none';
}

// ===== MODAL =====
function openModal(idx){
  const j=displayedJobs[idx];if(!j)return;
  const g=GRADS[idx%GRADS.length],init=j.company.charAt(0).toUpperCase(),isSaved=savedJobs.some(s=>s.id===j.id);
  $('modal-body').innerHTML=`
    <div class="modal-company-header">
      ${j.logo?`<img src="${j.logo}" alt="" class="modal-avatar" style="object-fit:contain;background:#fff;padding:6px;border-radius:14px" onerror="this.outerHTML='<div class=\\'modal-avatar\\' style=\\'background:${g}\\'>${init}</div>'">`:`<div class="modal-avatar" style="background:${g}">${init}</div>`}
      <div><div class="modal-title">${esc(j.title)}</div><div class="modal-company-name">${esc(j.company)} • ${esc(j.location)}</div></div>
    </div>
    <div class="modal-tags">
      <span class="modal-tag highlight">${fmtType(j.type)}</span><span class="modal-tag">${esc(j.category)}</span>
      ${j.salary?`<span class="modal-tag">💰 ${esc(j.salary)}</span>`:''}<span class="modal-tag">${j.source}</span>
      ${j.tags.map(t=>`<span class="modal-tag">${esc(t)}</span>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px">
      <button class="btn-sm" onclick="toggleSave(${idx});openModal(${idx})">${isSaved?'🔖 Saved':'🔖 Save Job'}</button>
      <button class="btn-sm" onclick="shareJob(${idx})">📤 Share</button>
    </div>
    <div class="modal-section"><h3>Job Description</h3><div style="font-size:.9rem;color:var(--text-secondary);line-height:1.8">${j.description||'<p>Click "Apply Now" to view the full listing on the company site.</p>'}</div></div>
    <a href="${j.url}" target="_blank" rel="noopener" class="modal-apply-btn" onclick="trackAnalytics('apply')">Apply Now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg></a>`;
  $('job-modal-overlay').classList.add('active');document.body.style.overflow='hidden';
}
function closeModal(){$('job-modal-overlay').classList.remove('active');document.body.style.overflow=''}

// ===== SAVE JOBS =====
function toggleSave(idx){
  const j=displayedJobs[idx];if(!j)return;
  const i=savedJobs.findIndex(s=>s.id===j.id);
  if(i>=0){savedJobs.splice(i,1);toast('Job removed from saved','info')}
  else{savedJobs.push({id:j.id,title:j.title,company:j.company,url:j.url,location:j.location,date:j.date});toast('Job saved! 🔖','success');trackAnalytics('save')}
  localStorage.setItem('jf_saved',JSON.stringify(savedJobs));
  updateSavedBadge();renderSavedDrawer();
  // Update bookmark btn
  const btn=document.querySelector(`.bookmark-btn[data-id="${j.id}"]`);
  if(btn){const saved=savedJobs.some(s=>s.id===j.id);btn.classList.toggle('saved',saved);btn.querySelector('svg').setAttribute('fill',saved?'currentColor':'none')}
}
function updateSavedBadge(){const b=$('saved-badge');b.textContent=savedJobs.length;b.dataset.count=savedJobs.length;$('saved-count-label').textContent=`(${savedJobs.length})`}
function renderSavedDrawer(){
  const list=$('saved-jobs-list');
  if(!savedJobs.length){list.innerHTML='<div class="saved-empty"><p>No saved jobs yet. Click the bookmark icon on any job!</p></div>';return}
  list.innerHTML=savedJobs.map((j,i)=>`<div class="saved-job-item"><div class="saved-job-info"><strong>${esc(j.title)}</strong><span>${esc(j.company)} • ${esc(j.location)}</span></div><a href="${j.url}" target="_blank" class="btn-sm" onclick="trackAnalytics('apply')" style="text-decoration:none">Apply</a><button class="saved-job-remove" onclick="savedJobs.splice(${i},1);localStorage.setItem('jf_saved',JSON.stringify(savedJobs));updateSavedBadge();renderSavedDrawer();toast('Removed','info')">✕</button></div>`).join('');
}
function exportSavedCSV(){
  if(!savedJobs.length){toast('No saved jobs to export','warning');return}
  const csv='Title,Company,Location,URL\n'+savedJobs.map(j=>`"${j.title}","${j.company}","${j.location}","${j.url}"`).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='jobflow_saved_jobs.csv';a.click();toast('CSV exported! 📄','success');
}

// ===== SHARE =====
function shareJob(idx){
  const j=displayedJobs[idx];if(!j)return;
  if(navigator.share)navigator.share({title:j.title+' at '+j.company,url:j.url});
  else{navigator.clipboard.writeText(j.url);toast('Link copied to clipboard! 📋','success')}
}

// ===== SEARCH =====
function performSearch(){
  currentQuery=$('search-input').value.trim();currentLocation=$('location-input').value.trim();
  if(currentQuery){addToHistory(currentQuery);trackAnalytics('search',currentQuery)}
  applyFilters();$('search-suggestions').classList.remove('active');
}
function addToHistory(q){searchHistory=searchHistory.filter(h=>h!==q);searchHistory.unshift(q);searchHistory=searchHistory.slice(0,10);localStorage.setItem('jf_history',JSON.stringify(searchHistory))}

// ===== TOAST =====
function toast(msg,type='info'){
  const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=msg;
  $('toast-container').appendChild(t);setTimeout(()=>t.remove(),3000);
}

// ===== EVENTS =====
function setupEvents(){
  $('search-btn').onclick=performSearch;
  $('search-input').onkeydown=e=>{if(e.key==='Enter')performSearch()};
  $('location-input').onkeydown=e=>{if(e.key==='Enter')performSearch()};
  // Search suggestions
  $('search-input').oninput=e=>{
    const v=e.target.value.toLowerCase(),sg=$('search-suggestions');
    if(v.length<2){sg.classList.remove('active');return}
    const matches=[...new Set(allJobs.map(j=>j.title).filter(t=>t.toLowerCase().includes(v)))].slice(0,6);
    const hist=searchHistory.filter(h=>h.toLowerCase().includes(v)).slice(0,3);
    let html=hist.map(h=>`<div class="suggestion-item" data-val="${esc(h)}"><span class="sug-icon">🕐</span>${esc(h)}</div>`).join('');
    html+=matches.map(m=>`<div class="suggestion-item" data-val="${esc(m)}"><span class="sug-icon">💼</span>${esc(m)}</div>`).join('');
    if(html){sg.innerHTML=html;sg.classList.add('active');sg.querySelectorAll('.suggestion-item').forEach(s=>s.onclick=()=>{$('search-input').value=s.dataset.val;performSearch()})}
    else sg.classList.remove('active');
  };
  document.addEventListener('click',e=>{if(!e.target.closest('.search-field'))$('search-suggestions').classList.remove('active')});
  // Tags
  document.querySelectorAll('.search-tag').forEach(t=>t.onclick=()=>{$('search-input').value=t.dataset.query;$('location-input').value='';performSearch();$('jobs').scrollIntoView({behavior:'smooth'})});
  // Filters
  $('filter-type').onchange=applyFilters;$('filter-category').onchange=applyFilters;$('filter-sort').onchange=applyFilters;
  $('filter-reset').onclick=()=>{$('filter-type').value='';$('filter-category').value='';$('filter-sort').value='date';applyFilters()};
  $('clear-search').onclick=()=>{$('search-input').value='';$('location-input').value='';currentQuery='';currentLocation='';applyFilters()};
  $('reset-all-btn').onclick=()=>{$('search-input').value='';$('location-input').value='';currentQuery='';currentLocation='';$('filter-type').value='';$('filter-category').value='';$('filter-sort').value='date';applyFilters()};
  $('load-more-btn').onclick=()=>{currentPage++;renderJobs(false)};
  // Modal
  $('modal-close').onclick=closeModal;$('job-modal-overlay').onclick=e=>{if(e.target===$('job-modal-overlay'))closeModal()};
  $('jobs-grid').onclick=e=>{const c=e.target.closest('.job-card');if(c&&!e.target.closest('.btn-view')&&!e.target.closest('.btn-apply')&&!e.target.closest('.bookmark-btn'))openModal(parseInt(c.dataset.index))};
  // Theme
  $('theme-toggle').onclick=()=>{const cur=document.documentElement.dataset.theme;const nxt=cur==='dark'?'light':'dark';document.documentElement.dataset.theme=nxt;localStorage.setItem('jf_theme',nxt);toast(`${nxt==='dark'?'🌙 Dark':'☀️ Light'} mode`,'info')};
  // Saved drawer
  $('saved-jobs-toggle').onclick=()=>{renderSavedDrawer();$('saved-drawer-overlay').classList.add('active')};
  $('close-saved-drawer').onclick=()=>$('saved-drawer-overlay').classList.remove('active');
  $('saved-drawer-overlay').onclick=e=>{if(e.target===$('saved-drawer-overlay'))$('saved-drawer-overlay').classList.remove('active')};
  $('export-saved-btn').onclick=exportSavedCSV;
  $('clear-saved-btn').onclick=()=>{savedJobs=[];localStorage.setItem('jf_saved','[]');updateSavedBadge();renderSavedDrawer();toast('All saved jobs cleared','info')};
  // Keyboard shortcuts modal
  $('kbd-btn').onclick=()=>$('kbd-modal-overlay').classList.toggle('active');
  // Nav toggle
  $('nav-toggle').onclick=()=>$('nav-links').classList.toggle('open');
  $('nav-links').querySelectorAll('.nav-link').forEach(l=>l.onclick=()=>$('nav-links').classList.remove('open'));
  // Footer type links
  document.querySelectorAll('.footer-type-link').forEach(l=>l.onclick=e=>{e.preventDefault();$('filter-type').value=l.dataset.type;applyFilters();$('jobs').scrollIntoView({behavior:'smooth'})});
  // Keyboard shortcuts
  document.onkeydown=e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
    if(e.key==='/'){e.preventDefault();$('search-input').focus()}
    if(e.key==='Escape'){closeModal();$('saved-drawer-overlay').classList.remove('active');$('kbd-modal-overlay').classList.remove('active')}
    if(e.key==='t'||e.key==='T')$('theme-toggle').click();
    if(e.key==='s'||e.key==='S')$('saved-jobs-toggle').click();
    if(e.key==='?')$('kbd-modal-overlay').classList.toggle('active');
  };
}

// ===== SCROLL =====
function setupScroll(){
  window.onscroll=()=>{
    $('navbar').classList.toggle('scrolled',scrollY>50);
    $('back-to-top').classList.toggle('visible',scrollY>600);
    ['hero','categories','jobs','about'].reverse().some(id=>{const el=document.getElementById(id);if(el&&scrollY>=el.offsetTop-200){document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));const a=document.querySelector(`.nav-link[href="#${id}"]`);if(a)a.classList.add('active');return true}});
  };
  $('back-to-top').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
  // Intersection observer
  const obs=new IntersectionObserver(e=>e.forEach(en=>{if(en.isIntersecting){en.target.style.opacity='1';en.target.style.transform='translateY(0)'}}),{threshold:0.1});
  document.querySelectorAll('.category-card,.step-card,.about-feature').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(20px)';el.style.transition='all .6s ease';obs.observe(el)});
}

// ===== HELPERS =====
function fmtDate(d){if(!d)return'Recently';const dt=new Date(d),diff=Math.floor((Date.now()-dt)/864e5);if(diff===0)return'Today';if(diff===1)return'Yesterday';if(diff<7)return diff+'d ago';if(diff<30)return Math.floor(diff/7)+'w ago';return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function fmtType(t){return{full_time:'Full Time',part_time:'Part Time',contract:'Contract',freelance:'Freelance',internship:'Internship'}[t]||'Full Time'}
