(() => {
  const FALLBACK_LOGO = 'https://www.glidetourism.com/assets/logo.png';
  const cfg = window.APP_CONFIG || {};
  const $ = id => document.getElementById(id);
  const today = new Date();
  const monthLetters = 'ABCDEFGHIJKL';
  const state = { token: '', user: '', active: 'quote', lastDuplicatePayload: null, advanceQuote: null, invoiceQuote: null, assignQuote: null, confirmAction: null, invoiceAssignment: null, invoiceAdvancePaid: 0, editQuoteNo: '', quoteSequence: null, paymentAccount: 'glide' };

  function init(){
    // Login must stay available even if a later dashboard section has a missing/mismatched element during an update.
    setLogos();
    bindLogin();
    try {
      setDateDisplay(); setDateLimits(); bindConfirmModal(); bindPaymentAccount(); bindVehicleTariff(); bindNavigation(); bindQuoteForm(); bindAdvanceForm(); bindInvoiceForm(); bindAssignForm(); bindHotelEnquiryForm(); bindDriverPaymentForm(); addHotelRow(); addInclusionRow(); addChargeRow(); addPackageItemRow(); updateQuote(); updateAdvancePreview(); updateInvoicePreview(); updateAssignPreview(); updateHotelEnquiryPreview(); updateDriverPaymentPreview();
    } catch (err) {
      console.error('Dashboard init warning:', err);
      setMsg('loginMsg', 'Dashboard file mismatch detected. Upload the matching index.html and script.js, then hard refresh.', 'bad');
    }
  }
  function setLogos(){ ['loginLogo','headerLogo'].forEach(id => { const img=$(id); if(img) img.src = cfg.logoUrl || FALLBACK_LOGO; }); }
  function setDateDisplay(){ if($('quoteDateDisplay')) $('quoteDateDisplay').value = formatDate(today); if($('autoDateText')) $('autoDateText').textContent = formatDate(today); }
  function setDateLimits(){ const min=todayIso(); ['pickupDate','dropDate'].forEach(id=>{ if($(id)) $(id).min=min; }); }
  function bindConfirmModal(){ if(!$('confirmModal')) return; $('confirmYesBtn').addEventListener('click',()=>{ const fn=state.confirmAction; hideConfirm(); if(typeof fn==='function') fn(); }); $('confirmNoBtn').addEventListener('click',hideConfirm); }
  function showConfirm(message,onYes,title='Confirm'){ $('confirmTitle').textContent=title; $('confirmText').textContent=message; state.confirmAction=onYes; $('confirmModal').classList.remove('d-none'); }
  function hideConfirm(){ $('confirmModal').classList.add('d-none'); state.confirmAction=null; }

  function selectedPaymentDetails(){return {code:'glide',name:cfg.bankName||'Glide Tourism',account:cfg.bankAccount||'34890210000878',ifsc:cfg.bankIfsc||'UCBA0003489',upi:cfg.upi||'8667737237',branch:''};}
  function paymentDetailsMarkup(){const p=selectedPaymentDetails();return `<b>GPay / PhonePe:</b> ${escapeHtml(p.upi)} · <b>Account Name:</b> ${escapeHtml(p.name)} · <b>A/C:</b> ${escapeHtml(p.account)} · <b>IFSC:</b> ${escapeHtml(p.ifsc)}`;}
  function bindPaymentAccount(){} // One payment account only.
  function setPaymentAccount(code){state.paymentAccount='glide';}
  function syncPaymentAccount(){}
  // New bookings use these customer-facing names. Rates are unchanged.
  const GT_TARIFF = {
    'Sedan (Etios/Dzire) 4+1':{kmDay:300,rate:12,bataDay:400,tn:500,kerala:1000},
    'Ertiga 6+1':{kmDay:300,rate:17,bataDay:500,tn:1000,kerala:1500},
    'Innova 7+1':{kmDay:300,rate:18,bataDay:500,tn:1300,kerala:1500},
    'Crysta 6+1':{kmDay:300,rate:19,bataDay:500,tn:1500,kerala:1500},
    'Crysta 7+1':{kmDay:300,rate:19,bataDay:500,tn:1500,kerala:1500},
    'Tempo Traveller 12+1':{kmDay:300,rate:22,bataDay:500,tn:3000,kerala:5500},
    'Urbania 12+1':{kmDay:300,rate:38,bataDay:1000,tn:4000,kerala:6000},
    'Urbania 17+1':{kmDay:300,rate:38,bataDay:1000,tn:5000,kerala:7000}
  };
  function vehicleName(value){
    const name=String(value||'').trim();
    const legacy={'Sedan':'Sedan (Etios/Dzire) 4+1','Ertiga':'Ertiga 6+1','Innova':'Innova 7+1',
      'Tempo Traveller 12 Seater':'Tempo Traveller 12+1','Urbania 12 Seater':'Urbania 12+1','Urbania 17 Seater':'Urbania 17+1'};
    return Object.prototype.hasOwnProperty.call(legacy,name)?legacy[name]:name;
  }
  const tariffMemory={minKm:0,minBata:0};
  function activeTariff(){
    if(isManualVehicleSelected())return {kmDay:num($('manualVehicleKmDay')?.value),rate:num($('manualVehicleRate')?.value),bataDay:num($('manualVehicleBataDay')?.value),tn:0,kerala:0,manual:true};
    const name=vehicleName($('vehicleType')?.value);
    // Legacy Crysta bookings have the same tariff; do not infer their seating.
    return GT_TARIFF[name==='Crysta'?'Crysta 7+1':name]||null;
  }
  function tariffMinimums(){const t=activeTariff();const days=calcDuration($('pickupDate').value,$('dropDate').value).days;return {t,days,minKm:t&&days?t.kmDay*days:0,minBata:t&&days?t.bataDay*days:0};}
  function autoFillTariff(kind){
    const {t,days,minKm,minBata}=tariffMinimums();
    if(t){
      if(kind==='vehicle'){
        $('kmIncluded').value=minKm||'';
        $('extraKmCharge').value=t.rate||'';
        $('dayRent').value=minBata||'';
      } else if(kind==='dates'||kind==='manual') {
        // Never silently reduce a staff-entered higher margin.
        if(!$('kmIncluded').value || num($('kmIncluded').value)<minKm || num($('kmIncluded').value)===tariffMemory.minKm) $('kmIncluded').value=minKm||'';
        if(!$('dayRent').value || num($('dayRent').value)<minBata || num($('dayRent').value)===tariffMemory.minBata) $('dayRent').value=minBata||'';
      }
      if((kind==='vehicle'||kind==='state')&&$('permitState')){
        const ps=$('permitState').value;
        if(ps==='tn'||ps==='kerala') $('permit').value=t[ps]||0;
        if(ps==='none'&&kind==='state') $('permit').value=0;
      }
    }
    tariffMemory.minKm=minKm; tariffMemory.minBata=minBata;
    updateQuote();
  }
  function updateTariffSuggestions(){
    const {t,days,minKm,minBata}=tariffMinimums();
    if($('minKmSuggestion')) $('minKmSuggestion').textContent=t&&days?`Minimum: ${minKm} KM (${t.kmDay} × ${days} days)`:'Select vehicle and travel dates';
    if($('kmRateSuggestion')) $('kmRateSuggestion').textContent=t?`Reference rate: ₹${t.rate}/KM · enter your selling rate`:'Select vehicle for reference rate';
    if($('bataSuggestion')) $('bataSuggestion').textContent=t&&days?`Minimum: ₹${t.bataDay} × ${days} days = ₹${formatMoney(minBata)} · higher amount allowed`:'Select vehicle and travel dates';
    if($('permitSuggestion')){
      const ps=$('permitState')?.value||'none';
      $('permitSuggestion').textContent=t&&ps==='tn'?`Tamil Nadu suggested: ₹${formatMoney(t.tn)}`:t&&ps==='kerala'?`Kerala suggested: ₹${formatMoney(t.kerala)}`:ps==='custom'?'Enter your own permit amount':'No permit selected';
    }
    const invalidKm=t&&days&&(!String($('kmIncluded').value).trim()||num($('kmIncluded').value)<minKm);
    const invalidBata=t&&days&&(!String($('dayRent').value).trim()||num($('dayRent').value)<minBata);
    for(const [id,errId,invalid,min,unit] of [['kmIncluded','kmError',invalidKm,minKm,'KM'],['dayRent','bataError',invalidBata,minBata,'₹']]){
      $(id).classList.toggle('tariff-invalid',!!invalid);
      if($(errId)){ $(errId).hidden=!invalid;$(errId).textContent=invalid?`Minimum ${unit}${formatMoney(min)} required. Increase the amount.`:''; }
    }
  }
  function bindVehicleTariff(){
    const openBtn=$('vehicleTariffBtn'),modal=$('vehicleTariffModal'),closeBtn=$('vehicleTariffCloseBtn'),box=$('vehicleTariffTable');
    if(box){box.innerHTML='<p class="tariff-note">Daily minimum kilometres · indicative tariffs · suggested state permits (all editable in quotation)</p><table><thead><tr><th>Vehicle</th><th>KM/day</th><th>Rate/KM</th><th>Bata/day</th><th>TN permit</th><th>Kerala permit</th></tr></thead><tbody>'+Object.entries(GT_TARIFF).map(([name,x])=>`<tr><td>${escapeHtml(name)}</td><td>${x.kmDay}</td><td>₹${x.rate}</td><td>₹${x.bataDay}</td><td>₹${x.tn}</td><td>₹${x.kerala}</td></tr>`).join('')+'</tbody></table>';}
    if(openBtn&&modal)openBtn.addEventListener('click',()=>modal.classList.remove('d-none'));
    if(closeBtn)closeBtn.addEventListener('click',()=>modal.classList.add('d-none'));
    if(modal)modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('d-none');});
  }

  function bindLogin(){
    $('togglePassword').addEventListener('click', () => { const input=$('loginPass'); input.type=input.type==='password'?'text':'password'; $('togglePassword').textContent=input.type==='password'?'👁':'🙈'; });
    $('loginForm').addEventListener('submit', e => { e.preventDefault(); doLogin(); });
    $('logoutBtn').addEventListener('click', () => showConfirm('Are you sure you want to logout?', () => { state.token=''; $('appScreen').hidden=true; $('loginScreen').hidden=false; $('loginPass').value=''; setMsg('loginMsg',''); }, 'Logout confirmation'));
  }
  function doLogin(){
    const username=$('loginUser').value.trim(), password=$('loginPass').value.trim();
    if(!username || !password){ setMsg('loginMsg','Enter username and password.','bad'); return; }

    const run = window.google && window.google.script && window.google.script.run;
    if(!run){
      setMsg('loginMsg','Dashboard API not loaded. Check assets/config.js and assets/api-bridge.js upload.', 'bad');
      return;
    }

    $('loginBtn').disabled=true;
    setMsg('loginMsg','Checking login...');

    try {
      run.withSuccessHandler(res=>{
        $('loginBtn').disabled=false;
        if(!res || !res.ok){ setMsg('loginMsg', res?.message || 'Login failed.','bad'); return; }
        state.token=res.token; state.user=res.username; $('staffName').textContent=res.username; $('loginScreen').hidden=true; $('appScreen').hidden=false; switchModule('quote'); refreshQuoteSequence(); updateQuote();
      }).withFailureHandler(err=>{
        $('loginBtn').disabled=false;
        setMsg('loginMsg', err.message || String(err),'bad');
      }).login(username,password);
    } catch(err) {
      $('loginBtn').disabled=false;
      setMsg('loginMsg', err.message || String(err), 'bad');
    }
  }

  function bindNavigation(){
    const mobileBtn=$('mobileMenuBtn'), nav=$('topNav');
    if(mobileBtn && nav){
      mobileBtn.addEventListener('click',()=>{
        const open=!nav.classList.contains('open');
        nav.classList.toggle('open',open);
        mobileBtn.classList.toggle('open',open);
        mobileBtn.setAttribute('aria-expanded',open?'true':'false');
        mobileBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
      });
    }
    document.querySelectorAll('[data-module]').forEach(btn => btn.addEventListener('click', () => {
      switchModule(btn.dataset.module);
      if(nav && nav.classList.contains('open')){
        nav.classList.remove('open');
        if(mobileBtn){ mobileBtn.classList.remove('open'); mobileBtn.setAttribute('aria-expanded','false'); mobileBtn.setAttribute('aria-label','Open menu'); }
      }
    }));
  }
  function switchModule(name){
    const target=$(name+'Module');
    if(!target) return;
    state.active=name;
    document.querySelectorAll('.module-view').forEach(v => v.classList.add('d-none'));
    target.classList.remove('d-none');
    document.querySelectorAll('[data-module]').forEach(b => b.classList.toggle('active', b.dataset.module===name));
    if(name==='quote') updateQuote();
    if(name==='advance') updateAdvancePreview();
    if(name==='invoice') updateInvoicePreview();
    if(name==='assign') updateAssignPreview();
    if(name==='hotel') updateHotelEnquiryPreview();
    if(name==='driverPay') updateDriverPaymentPreview();
  }

  function bindQuoteForm(){
    document.querySelectorAll('#quoteForm input,#quoteForm select,#quoteForm textarea').forEach(el => { el.addEventListener('input', updateQuote); el.addEventListener('change', updateQuote); });
    if($('vehicleType')) $('vehicleType').addEventListener('change',()=>{ if(!isManualVehicleSelected()&&$('manualVehicleName'))$('manualVehicleName').value=''; toggleManualVehicleField(); autoFillTariff('vehicle'); });
    ['pickupDate','dropDate'].forEach(id=>$(id)?.addEventListener('change',()=>autoFillTariff('dates')));
    ['manualVehicleKmDay','manualVehicleBataDay','manualVehicleRate'].forEach(id=>$(id)?.addEventListener('input',()=>{if(id==='manualVehicleRate'&&isManualVehicleSelected())$('extraKmCharge').value=$('manualVehicleRate').value;autoFillTariff('manual');}));
    $('permitState')?.addEventListener('change',()=>autoFillTariff('state'));
    if($('manualVehicleName')) $('manualVehicleName').addEventListener('input',updateQuote);
    toggleManualVehicleField();
    document.querySelectorAll('.date-click').forEach(box => { const input=box.querySelector('input[type="date"]'); const openPicker=()=>{ if(!input) return; input.focus(); if(typeof input.showPicker==='function') { try{ input.showPicker(); }catch(e){} } }; box.addEventListener('click', openPicker); if(input){ input.addEventListener('click', e=>{ e.stopPropagation(); openPicker(); }); input.addEventListener('focus', openPicker); } });
    if($('quoteFetchBtn')) $('quoteFetchBtn').addEventListener('click', fetchQuoteForUpdate);
    ['quoteFetchMonthCode','quoteFetchRunningNo'].forEach(id=>{ if($(id)) $(id).addEventListener('input',()=>setMsg('quoteFetchMsg','')); });
    $('addHotelBtn').addEventListener('click', () => { addHotelRow(); updateQuote(); });
    if($('addInclusionBtn')) $('addInclusionBtn').addEventListener('click', () => { addInclusionRow(); updateQuote(); });
    $('clearBtn').addEventListener('click', clearQuoteForm);
    $('printBtn').addEventListener('click', () => {const error=validateQuote(quotePayload());if(error){setMsg('saveMsg',error,'bad');return;} printCurrent(buildQuotePrintName());});
    $('generateBtn').addEventListener('click', () => saveQuote('ask'));
    $('overwriteBtn').addEventListener('click', () => { hideDuplicateModal(); saveQuote('overwrite', state.lastDuplicatePayload); });
    $('nextNoBtn').addEventListener('click', () => { hideDuplicateModal(); saveQuote('next', state.lastDuplicatePayload); });
    $('cancelDupBtn').addEventListener('click', hideDuplicateModal);
  }
  function optionList(max,selected){
    const val=String(selected||'');
    return '<option value="">-</option>'+Array.from({length:max},(_,i)=>{ const n=String(i+1); return `<option value="${n}" ${val===n?'selected':''}>${n}</option>`; }).join('');
  }

  function addHotelRow(data={}){
    const row=document.createElement('div'); row.className='hotel-row hotel-grid';
    const hotelTypes=['','Enquire Hotel','2-Star','3-Star','4-Star','5-Star','Resort','Cottage','Home Stay','Villa'];
    row.innerHTML=`<select class="hotel-nights" aria-label="Nights">${optionList(10,data.nights)}</select><select class="hotel-rooms" aria-label="Rooms">${optionList(10,data.rooms)}</select><input type="text" class="hotel-location" value="${escapeAttr(data.location||'')}" placeholder="Location"><select class="hotel-type" aria-label="Hotel Type">${hotelTypes.map(x=>`<option value="${escapeAttr(x)}" ${String(data.hotelType||'')===x?'selected':''}>${x||'-'}</option>`).join('')}</select><input type="text" class="hotel-name" value="${escapeAttr(data.hotelName||'')}" placeholder="Hotel name"><input class="hotel-cost" type="number" step="0.01" min="0" value="${escapeAttr(data.cost??'')}" placeholder="₹ Cost"><button type="button" class="remove-hotel">×</button>`;
    row.querySelectorAll('input,select').forEach(el=>{ el.addEventListener('input',updateQuote); el.addEventListener('change',updateQuote); });
    row.querySelector('.remove-hotel').addEventListener('click',()=>{ row.remove(); if(!document.querySelectorAll('.hotel-row').length) addHotelRow(); updateQuote(); });
    $('hotelRows').appendChild(row);
  }

  function addInclusionRow(data=''){
    if(!$('inclusionRows'))return;
    const row=document.createElement('div');row.className='inclusion-row custom-inclusion-row';
    const description=typeof data==='string'?data:(data.description||data.details||'');
    const amount=typeof data==='string'?'':(data.amount??'');
    row.innerHTML=`<input class="inc-custom" type="text" value="${escapeAttr(description)}" placeholder="e.g. Arrival ticket Chennai to Bangalore"><input class="inc-amount" type="number" min="0" step="0.01" value="${escapeAttr(amount)}" placeholder="₹ Amount"><button type="button" class="remove-inclusion">×</button>`;
    row.querySelectorAll('input').forEach(el=>el.addEventListener('input',updateQuote));
    row.querySelector('.remove-inclusion').addEventListener('click',()=>{row.remove();if(!document.querySelectorAll('.inclusion-row').length)addInclusionRow();updateQuote();});
    $('inclusionRows').appendChild(row);
  }
  function getManualInclusions(){return Array.from(document.querySelectorAll('.inclusion-row')).map(row=>({
      description:String(row.querySelector('.inc-custom')?.value||'').trim(),amount:num(row.querySelector('.inc-amount')?.value)
    })).filter(x=>x.description||x.amount>0);
  }
  function manualInclusionText(x){
    const description=typeof x==='string'?x:(x.description||x.details||'Inclusion');
    return String(description).trim().replace(/\s+—\s*₹[\d,]+(?:\.\d+)?\s*$/, '');
  }

  function cleanHotelRooms(h){
    const raw = String((h && (h.rooms || h.room || h.roomCount || h.noOfRooms || h.numberOfRooms)) || '').trim();
    if (!raw) return '';
    // Prevent old select text fallback like "-12345678910" from appearing in the PDF preview.
    if (raw.replace(/\s/g,'') === '-12345678910') return '';
    return raw;
  }

  function isManualVehicleSelected(){ return $('vehicleType') && $('vehicleType').value==='Other / Manual Vehicle'; }
  function toggleManualVehicleField(){
    if(!$('manualVehicleWrap') || !$('manualVehicleName')) return;
    const show=isManualVehicleSelected() || String($('manualVehicleName').value||'').trim();
    ['manualVehicleWrap','manualKmDayWrap','manualBataDayWrap','manualRateWrap'].forEach(id=>$(id)?.classList.toggle('d-none', !show));
  }
  function getFinalVehicleType(){
    const manual=String($('manualVehicleName')?.value||'').trim();
    return manual || ($('vehicleType')?.value || '');
  }
  function setVehicleTypeFromSaved(value){
    const saved=vehicleName(value);
    if(!$('vehicleType')) return;
    // Keep an old Crysta booking editable without inventing its seating capacity.
    if(saved==='Crysta' && !Array.from($('vehicleType').options).some(o=>o.value==='Crysta')){
      const option=document.createElement('option'); option.value='Crysta';
      option.textContent='Crysta (legacy booking - confirm seating)'; option.hidden=true;
      $('vehicleType').appendChild(option);
    }
    const options=Array.from($('vehicleType').options).map(o=>o.value || o.textContent.trim());
    if(saved && options.includes(saved)){
      $('vehicleType').value=saved;
      if($('manualVehicleName')) $('manualVehicleName').value='';
    } else if(saved){
      $('vehicleType').value='Other / Manual Vehicle';
      if($('manualVehicleName')) $('manualVehicleName').value=saved;
    } else {
      $('vehicleType').value='';
      if($('manualVehicleName')) $('manualVehicleName').value='';
    }
    toggleManualVehicleField();
  }
  function getHotels(){
    return Array.from(document.querySelectorAll('.hotel-row')).map(row=>{
      const nightsEl=row.querySelector('.hotel-nights') || row.children[0];
      const roomsEl=row.querySelector('.hotel-rooms') || row.children[1];
      const locationEl=row.querySelector('.hotel-location') || row.children[2];
      const typeEl=row.querySelector('.hotel-type') || row.children[3];
      const nameEl=row.querySelector('.hotel-name') || row.children[4];
      return {
        nights:String(nightsEl?.value||'').trim(),
        rooms:String(roomsEl && 'value' in roomsEl ? roomsEl.value : '').trim(),
        location:String(locationEl?.value||'').trim(),
        hotelType:String(typeEl?.value||'').trim(),
        hotelName:String(nameEl?.value||'').trim(),
        cost:num(row.querySelector('.hotel-cost')?.value)
      };
    }).filter(h=>h.location||h.hotelName||h.rooms||h.hotelType||h.nights||h.cost);
  }
  function quotePayload(){ return { token:state.token, quoteNo:state.editQuoteNo || '', runningNo:$('runningNo').value.trim(), clientName:$('clientName').value.trim(), phone:$('phone').value.trim(), intermediateLocation:$('intermediateLocation').value.trim(), pickup:$('pickup').value.trim(), drop:$('drop').value.trim(), pickupDate:$('pickupDate').value, dropDate:$('dropDate').value, vehicleType:getFinalVehicleType(), acStatus:document.querySelector('input[name="acStatus"]:checked')?.value||'AC', kmIncluded:$('kmIncluded').value, extraKmCharge:$('extraKmCharge').value, dayRent:$('dayRent').value, checkpostTolls:$('checkpostTolls').value, sightseeingParking:$('sightseeingParking').value, permit:$('permit').value, totalHotelCost:getHotels().reduce((a,h)=>a+num(h.cost),0),manualVehicleKmDay:$('manualVehicleKmDay').value,manualVehicleBataDay:$('manualVehicleBataDay').value, advanceAmount:$('advanceAmount').value, hotels:getHotels(), inclusions:{ breakfast:$('incBreakfast').checked, lunch:$('incLunch').checked, dinner:$('incDinner').checked, campfire:$('incCampfire').checked, tickets:$('incTickets').checked, manual:getManualInclusions() }, manualInclusions:getManualInclusions(), itineraryText:$('itineraryText').value, notes:$('notes').value, paymentAccount:'glide' }; }
  function validateQuote(p){ if(!state.token) return 'Please login again.'; if(!p.clientName) return 'Client name is required.'; if(!p.phone) return 'Phone number is required.'; if(!p.pickupDate||!p.dropDate) return 'Pickup date and drop date are required.'; if(p.pickupDate < todayIso() || p.dropDate < todayIso()) return 'Old dates cannot be selected.'; if(isManualVehicleSelected() && !String($('manualVehicleName')?.value||'').trim()) return 'Manual vehicle name is required.'; if(!p.vehicleType)return 'Vehicle type is required.';
    const {t,days,minKm,minBata}=tariffMinimums();
    if(!t||!days)return 'Select a vehicle and valid pickup/drop dates.';
    if(!String(p.kmIncluded).trim()||!String(p.dayRent).trim())return 'Enter included kilometres and total driver bata.';
    if(isManualVehicleSelected()&&num(p.manualVehicleKmDay)<=0)return 'Enter the manual vehicle minimum KM/day.';
    if(num(p.kmIncluded)<minKm)return `Included KM cannot be below ${minKm} KM for ${days} days.`;
    if(num(p.dayRent)<minBata)return `Driver bata total cannot be below ₹${formatMoney(minBata)}.`;
    if(num(p.extraKmCharge)<=0)return 'Enter a rate per KM greater than zero.';
    if(getManualInclusions().some(x=>!x.description&&x.amount>0))return 'Add a description for each priced inclusion.';
    return ''; }
  function saveQuote(action='ask', existingPayload=null){
    const payload=existingPayload||quotePayload(); payload.duplicateAction=action; const error=validateQuote(payload); if(error){ setMsg('saveMsg',error,'bad'); return; }
    state.lastDuplicatePayload=payload; $('generateBtn').disabled=true; setMsg('saveMsg','Saving quote to Google Sheet and Drive...');
    google.script.run.withSuccessHandler(res=>{ $('generateBtn').disabled=false; if(res?.duplicate){ showDuplicateModal(res); setMsg('saveMsg','Duplicate quote number found. Choose an option.','bad'); return; } if(!res?.ok){ setMsg('saveMsg',res?.message||'Save failed','bad'); return; } if(res.runningNo) $('runningNo').value=res.runningNo; if(res.quoteNo) state.editQuoteNo=res.quoteNo; refreshQuoteSequence(); updateQuote(); setMsg('saveMsg',`${res.message} ${res.quoteNo} · PDF: ${res.fileName}`,'good'); if(res.pdfUrl && confirm(`${res.quoteNo} saved. Open Drive PDF now?`)) window.open(res.pdfUrl,'_blank'); }).withFailureHandler(err=>{ $('generateBtn').disabled=false; setMsg('saveMsg',err.message||String(err),'bad'); }).generateQuote(payload);
  }
  function clearQuoteForm(){ showConfirm('Are you sure you want to clear the entries?', () => { state.editQuoteNo=''; $('quoteForm').reset(); $('hotelRows').innerHTML=''; if($('inclusionRows')) $('inclusionRows').innerHTML=''; if($('quoteFetchMsg')) setMsg('quoteFetchMsg',''); addHotelRow(); addInclusionRow(); tariffMemory.minKm=0;tariffMemory.minBata=0;setDateDisplay(); setDateLimits(); if($('runningNo')) $('runningNo').value=''; toggleManualVehicleField(); refreshQuoteSequence(); updateQuote(); }, 'Clear entries'); }

  function refreshQuoteSequence(){
    if(!state.token) return;
    google.script.run.withSuccessHandler(res=>{
      if(res?.ok){
        state.quoteSequence=res;
        if($('lastQuoteNoText')) $('lastQuoteNoText').textContent=res.lastQuoteNo||'--';
        updateQuote();
      }
    }).withFailureHandler(()=>{}).getQuoteSequenceInfo(state.token);
  }

  function fetchQuoteForUpdate(){
    const ref=quoteRefFromParts('quoteFetchMonthCode','quoteFetchRunningNo');
    if(!ref.ok){ setMsg('quoteFetchMsg',ref.message,'bad'); return; }
    $('quoteFetchBtn').disabled=true;
    setMsg('quoteFetchMsg','Fetching existing quote...');
    google.script.run.withSuccessHandler(res=>{
      $('quoteFetchBtn').disabled=false;
      if(!res?.ok){ setMsg('quoteFetchMsg',res?.message||'Quote not found','bad'); return; }
      loadQuoteIntoQuoteForm(res.quote);
      setMsg('quoteFetchMsg',`Fetched ${res.quote.quoteNo}. Edit and click Save.`, 'good');
    }).withFailureHandler(err=>{
      $('quoteFetchBtn').disabled=false;
      setMsg('quoteFetchMsg',err.message||String(err),'bad');
    }).fetchQuoteByParts(state.token,ref.monthCode,ref.runningNo);
  }

  function loadQuoteIntoQuoteForm(q){
    if(!q) return;
    state.editQuoteNo=q.quoteNo || '';
    setPaymentAccount(q.paymentAccount || 'glide');
    const m=String(q.quoteNo||'').match(/^Q([A-L])\/\d{2}-\d{2}\/(\d+)/i);
    if(m){ $('runningNo').value=padNo(Number(m[2])); }
    $('clientName').value=q.clientName||'';
    $('phone').value=q.phone||'';
    $('intermediateLocation').value=q.intermediateLocation||'';
    $('pickup').value=q.pickup||'';
    $('drop').value=q.drop||'';
    $('pickupDate').value=q.pickupDateIso||'';
    $('dropDate').value=q.dropDateIso||'';
    setVehicleTypeFromSaved(q.vehicleType || '');
    const ac=q.acStatus==='Non AC'?'Non AC':'AC';
    document.querySelectorAll('input[name="acStatus"]').forEach(r=>{ r.checked=r.value===ac; });
    $('kmIncluded').value=q.kmIncluded||'';
    $('extraKmCharge').value=q.extraKmCharge||'';
    $('dayRent').value=q.dayRent||'';
    $('checkpostTolls').value=q.checkpostTolls||'';
    $('sightseeingParking').value=q.sightseeingParking||'';
    $('permit').value=q.permit||'';
    $('totalHotelCost').value=q.totalHotelCost||'';
    if($('manualVehicleKmDay'))$('manualVehicleKmDay').value=q.manualVehicleKmDay||'';
    if($('manualVehicleBataDay'))$('manualVehicleBataDay').value=q.manualVehicleBataDay||'';
    if($('manualVehicleRate'))$('manualVehicleRate').value=q.extraKmCharge||'';
    if($('permitState'))$('permitState').value='custom';
    $('advanceAmount').value=q.advanceAmount||'';
    const inc=q.inclusions || {};
    $('incBreakfast').checked=!!inc.breakfast;
    $('incLunch').checked=!!inc.lunch;
    $('incDinner').checked=!!inc.dinner;
    $('incCampfire').checked=!!inc.campfire;
    $('incTickets').checked=!!inc.tickets;
    $('hotelRows').innerHTML='';
    const hotels=Array.isArray(q.hotels)?q.hotels:[];
    if(hotels.length){ hotels.forEach(h=>addHotelRow(h)); } else { addHotelRow(); }
    if($('inclusionRows')){ $('inclusionRows').innerHTML=''; const manual=Array.isArray(q.manualInclusions)?q.manualInclusions:[]; if(manual.length){ manual.forEach(x=>addInclusionRow(x)); } else { addInclusionRow(); } }
    $('itineraryText').value=q.itineraryText||'';
    $('notes').value=q.notes||'';
    updateQuote();
  }

  function showDuplicateModal(res){ $('duplicateText').innerHTML=`<strong>${escapeHtml(res.quoteNo)}</strong> already exists.<br>Overwrite existing quote or create with new quote number <strong>${escapeHtml(res.nextQuoteNo)}</strong>?`; $('duplicateModal').classList.remove('d-none'); }
  function hideDuplicateModal(){ $('duplicateModal').classList.add('d-none'); }
  function updateQuote(){
    const p=quotePayload();const q=getQuoteMeta(p.runningNo);const duration=calcDuration(p.pickupDate,p.dropDate);
    if($('lastQuoteNoText'))$('lastQuoteNoText').textContent=state.quoteSequence?.lastQuoteNo||'--';
    $('durationBadge').textContent=`Duration: ${duration.text}`;
    const hotelTotal=p.hotels.reduce((a,h)=>a+num(h.cost),0);
    $('totalHotelCost').value=hotelTotal;
    const inclusionsTotal=p.manualInclusions.reduce((a,h)=>a+num(h.amount),0);
    const packageCost=calculateCost(p,duration.days);
    $('packageCost').value='₹'+formatMoney(packageCost);
    $('costBreakdown').textContent=`${formatMoney(num(p.kmIncluded))} KM × ₹${formatMoney(num(p.extraKmCharge))} + ₹${formatMoney(num(p.dayRent))} total driver bata + ₹${formatMoney(num(p.checkpostTolls)+num(p.sightseeingParking)+num(p.permit))} permits/tolls/parking + ₹${formatMoney(hotelTotal)} hotels + ₹${formatMoney(inclusionsTotal)} inclusions = ₹${formatMoney(packageCost)}`;
    updateTariffSuggestions();
    $('quotePreview').innerHTML=buildQuoteDocumentHtml(p,q,duration,packageCost);
  }

  function bindAdvanceForm(){
    ['advMonthCode','advRunningNo','advPaid','advNotes'].forEach(id=>{ if($(id)) $(id).addEventListener('input',updateAdvancePreview); });
    if($('advFetchBtn')) $('advFetchBtn').addEventListener('click', fetchAdvanceQuote);
    if($('advClearBtn')) $('advClearBtn').addEventListener('click', clearAdvance);
    if($('advPrintBtn')) $('advPrintBtn').addEventListener('click',()=>printCurrent(buildAdvancePrintName()));
    if($('advWhatsAppBtn')) $('advWhatsAppBtn').addEventListener('click', messageAdvanceCustomer);
    if($('advSaveBtn')) $('advSaveBtn').addEventListener('click',saveAdvance);
  }
  function fetchAdvanceQuote(){ const ref=quoteRefFromParts('advMonthCode','advRunningNo'); if(!ref.ok){ setMsg('advMsg',ref.message,'bad'); return; } setMsg('advMsg','Fetching quote...'); google.script.run.withSuccessHandler(res=>{ if(!res?.ok){ setMsg('advMsg',res?.message||'Quote not found','bad'); return; } state.advanceQuote=res.quote; setPaymentAccount(res.quote.paymentAccount || 'glide'); $('advPaid').value=res.quote.advanceAmount||''; updateAdvancePreview(); setMsg('advMsg',`Quote fetched: ${res.quote.quoteNo}`,'good'); }).withFailureHandler(err=>setMsg('advMsg',err.message||String(err),'bad')).fetchQuoteByParts(state.token,ref.monthCode,ref.runningNo); }
  function clearAdvance(){ showConfirm('Are you sure you want to clear the entries?', () => { $('advanceForm').reset(); state.advanceQuote=null; $('advFetched').textContent='No quote fetched.'; setMsg('advMsg',''); updateAdvancePreview(); }, 'Clear entries'); }
  function saveAdvance(){ if(!state.advanceQuote){ setMsg('advMsg','Fetch quote first.','bad'); return; } $('advSaveBtn').disabled=true; setMsg('advMsg','Saving advance receipt...'); google.script.run.withSuccessHandler(res=>{ $('advSaveBtn').disabled=false; if(!res?.ok){ setMsg('advMsg',res?.message||'Save failed','bad'); return; } setMsg('advMsg',`${res.message} Balance ₹${formatMoney(res.balanceDue)} · PDF: ${res.fileName}`,'good'); if(res.pdfUrl && confirm(`${res.receiptNo} saved. Open Drive PDF now?`)) window.open(res.pdfUrl,'_blank'); }).withFailureHandler(err=>{ $('advSaveBtn').disabled=false; setMsg('advMsg',err.message||String(err),'bad'); }).generateAdvanceReceipt({ token:state.token, quoteNo:state.advanceQuote.quoteNo, advancePaid:$('advPaid').value, notes:$('advNotes').value, paymentAccount:'glide' }); }
  function updateAdvancePreview(){ const q=state.advanceQuote; const paid=num($('advPaid')?.value); if(q){ $('advFetched').innerHTML=fetchedHtml(q); $('advBalance').value='₹'+formatMoney(Math.max(0,num(q.packageCost)-paid)); } $('advancePreview').innerHTML=buildAdvanceReceiptHtml(q,paid); }

  function messageAdvanceCustomer(){
    const q=state.advanceQuote;
    if(!q){ setMsg('advMsg','Fetch quote first.','bad'); return; }
    const paid=num($('advPaid')?.value);
    if(!paid){ setMsg('advMsg','Enter advance paid amount first.','bad'); return; }
    const name=q.clientName || 'Customer';
    const phone=q.phone || '';
    const msg=`👋 Dear ${name},

We have successfully received your advance payment of ₹${formatMoney(paid)}. Thank you for confirming your booking with *Glide Tourism* 🙏

✅ Your trip is now officially secured.
Our team will ensure a smooth and comfortable journey for you.

📌 Driver and vehicle details will be shared prior to your travel date.

If you need any customization or have special requests, feel free to reach us anytime.

📞 8667737237

We look forward to serving you! 😊`;
    openWhatsAppMessage(phone,msg,'advMsg');
  }

  function bindHotelEnquiryForm(){
    if(!$('hotelForm')) return;
    ['hotelName','hotelWhatsapp','hotelAdults','hotelKids','hotelRoomsRequired','hotelCheckin','hotelCheckout','hotelRequirement','hotelBreakfast','hotelLunch','hotelDinner','hotelCampfire','hotelSafari'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('input',updateHotelEnquiryPreview);
      el.addEventListener('change',updateHotelEnquiryPreview);
    });
    if($('hotelClearBtn')) $('hotelClearBtn').addEventListener('click',clearHotelEnquiry);
    if($('hotelEnquireBtn')) $('hotelEnquireBtn').addEventListener('click',sendHotelEnquiry);
  }

  function hotelEnquiryData(){
    return {
      hotelName:String($('hotelName')?.value||'').trim(),
      hotelWhatsapp:String($('hotelWhatsapp')?.value||'').trim(),
      adults:num($('hotelAdults')?.value),
      kids:num($('hotelKids')?.value),
      rooms:num($('hotelRoomsRequired')?.value)||1,
      checkin:$('hotelCheckin')?.value||'',
      checkout:$('hotelCheckout')?.value||'',
      addOns:[
        $('hotelBreakfast')?.checked?'Breakfast':'',
        $('hotelLunch')?.checked?'Lunch':'',
        $('hotelDinner')?.checked?'Dinner':'',
        $('hotelCampfire')?.checked?'Campfire':'',
        $('hotelSafari')?.checked?'Safari':''
      ].filter(Boolean),
      requirement:String($('hotelRequirement')?.value||'').trim()
    };
  }

  function buildHotelEnquiryMessage(d){
    const hotel=d.hotelName || 'Hotel Name';
    const lines=[
      `Hi ${hotel},`,
      '',
      'This is Glide Tourism.',
      'www.glidetourism.com',
      '',
      `I would like to enquire about ${d.rooms} ${plural(d.rooms,'room')} for my client. Please share your best available quote for the following requirement:`,
      '',
      `• ${d.adults || 0} ${plural(d.adults,'Adult')}`,
      `• ${d.kids || 0} ${plural(d.kids,'Kid')}`,
      `• Check-in: ${formatDateInput(d.checkin)}`,
      `• Check-out: ${formatDateInput(d.checkout)}`,
      `• ${d.rooms} ${plural(d.rooms,'room')}`
    ];
    if(d.addOns.length) lines.push(`• Add-ons: ${d.addOns.join(', ')}`);
    if(d.requirement) lines.push(`• Additional Requirement: ${d.requirement}`);
    lines.push('', 'Kindly confirm availability and share your best quote. Thank you.');
    return lines.join('\n');
  }

  function updateHotelEnquiryPreview(){
    if(!$('hotelPreview')) return;
    $('hotelPreview').textContent=buildHotelEnquiryMessage(hotelEnquiryData());
  }

  function clearHotelEnquiry(){
    showConfirm('Are you sure you want to clear the hotel enquiry?',()=>{
      $('hotelForm').reset();
      if($('hotelAdults')) $('hotelAdults').value='2';
      if($('hotelKids')) $('hotelKids').value='0';
      if($('hotelRoomsRequired')) $('hotelRoomsRequired').value='1';
      setMsg('hotelMsg','');
      updateHotelEnquiryPreview();
    },'Clear hotel enquiry');
  }

  function sendHotelEnquiry(){
    const d=hotelEnquiryData();
    if(!d.hotelWhatsapp){ setMsg('hotelMsg','Enter hotel WhatsApp number.','bad'); return; }
    const msg=buildHotelEnquiryMessage(d);
    openWhatsAppMessage(d.hotelWhatsapp,msg,'hotelMsg');
  }

  function bindDriverPaymentForm(){
    if(!$('driverPayForm')) return;
    ['dpDriverName','dpDriverPhone','dpMode','dpCc','dpPickupDate','dpDropDate','dpDayRent','dpKmCharge','dpDistance','dpFixedAmount','dpTolls','dpParking','dpPermit','dpBata','dpBreakage','dpAdvance'].forEach(id=>{
      const el=$(id); if(!el) return;
      el.addEventListener('input',updateDriverPaymentPreview);
      el.addEventListener('change',updateDriverPaymentPreview);
    });
    if($('dpClearBtn')) $('dpClearBtn').addEventListener('click',clearDriverPayment);
    if($('dpWhatsAppBtn')) $('dpWhatsAppBtn').addEventListener('click',sendDriverPaymentMessage);
  }

  function driverPaymentData(){
    const pickup=$('dpPickupDate')?.value||'';
    const drop=$('dpDropDate')?.value||'';
    const days=driverPaymentDays(pickup,drop);
    const mode=$('dpMode')?.value||'dayKm';
    const cc=$('dpCc')?.value==='yes';
    const dayRent=num($('dpDayRent')?.value);
    const kmCharge=num($('dpKmCharge')?.value);
    const distance=num($('dpDistance')?.value);
    const fixedAmount=num($('dpFixedAmount')?.value);
    const dayRentTotal=dayRent*days;
    const kmTotal=distance*kmCharge;
    const base=mode==='fixed'?fixedAmount:(dayRentTotal+kmTotal);
    const ccAmount=cc?Math.round(base*0.05):0;
    const afterCc=base-ccAmount;
    const addons=[
      {label:'Tolls', amount:num($('dpTolls')?.value)},
      {label:'Parking', amount:num($('dpParking')?.value)},
      {label:'Interstate Permit', amount:num($('dpPermit')?.value)},
      {label:'Driver Bata', amount:num($('dpBata')?.value)},
      {label:'Breakage', amount:num($('dpBreakage')?.value)}
    ];
    const addonTotal=addons.reduce((sum,x)=>sum+x.amount,0);
    const finalTotal=afterCc+addonTotal;
    const advance=num($('dpAdvance')?.value);
    const remaining=finalTotal-advance;
    return {
      driverName:String($('dpDriverName')?.value||'').trim(),
      driverPhone:String($('dpDriverPhone')?.value||'').trim(),
      mode, cc, pickup, drop, days,
      dayRent, kmCharge, distance, fixedAmount,
      dayRentTotal, kmTotal, base, ccAmount, afterCc,
      addons, finalTotal, advance, remaining
    };
  }

  function driverPaymentDays(pickup,drop){
    if(!pickup || !drop) return 0;
    const s=new Date(pickup+'T00:00:00');
    const e=new Date(drop+'T00:00:00');
    if(isNaN(s) || isNaN(e)) return 0;
    const diff=Math.round((e-s)/86400000);
    return diff>=0?diff+1:0;
  }

  function buildDriverPaymentMessage(d){
    const lines=['*Final Payment*','',`👤 Driver: ${d.driverName || 'Driver'}`,''];
    const q=line=>lines.push(`> ${line}`);
    const addonIcons={
      'Tolls':'🧾',
      'Parking':'🅿',
      'Interstate Permit':'🛂',
      'Driver Bata':'🚕',
      'Breakage':'🔧'
    };

    if(d.mode==='fixed'){
      q(`💰 Fixed Amount: ₹${formatMoney(d.fixedAmount)}`);
      if(d.cc){
        q(`🏷 CC 5%: ₹${formatMoney(d.ccAmount)}`);
        q(`✅ After CC: ₹${formatMoney(d.afterCc)}`);
      }
    } else {
      q(`🗓 Day Rent: ₹${formatMoney(d.dayRent)} × ${d.days} ${d.days===1?'day':'days'} = ₹${formatMoney(d.dayRentTotal)}`);
      q(`🚘 KM Charges: ${formatMoney(d.distance)} km × ₹${formatMoney(d.kmCharge)} = ₹${formatMoney(d.kmTotal)}`);
      q(`🧾 Subtotal: ₹${formatMoney(d.base)}`);
      if(d.cc){
        q(`🏷 CC 5%: ₹${formatMoney(d.ccAmount)}`);
        q(`✅ After CC: ₹${formatMoney(d.afterCc)}`);
      }
    }

    d.addons.filter(x=>x.amount>0).forEach(x=>{
      const icon=addonIcons[x.label] || '➕';
      q(`${icon} ${x.label}: ₹${formatMoney(x.amount)}`);
    });

    q(`💰 Final Total: ₹${formatMoney(d.finalTotal)}`);
    q(`💵 Advance Paid: ₹${formatMoney(d.advance)}`);
    q(`📌 Remaining Balance: ₹${formatMoney(d.remaining)}`);

    lines.push('', 'Kindly check and confirm.', '', 'Glide Tourism', '📞 8667737237');
    return lines.join('\n');
  }

  function updateDriverPaymentPreview(){
    if(!$('driverPayPreview')) return;
    const d=driverPaymentData();
    if($('dpDays')) $('dpDays').value=d.days?`${d.days} ${d.days===1?'day':'days'}`:'-';
    const isFixed=d.mode==='fixed';
    if($('dpDayKmSection')) $('dpDayKmSection').classList.toggle('d-none',isFixed);
    if($('dpFixedSection')) $('dpFixedSection').classList.toggle('d-none',!isFixed);
    $('driverPayPreview').textContent=buildDriverPaymentMessage(d);
  }

  function clearDriverPayment(){
    showConfirm('Are you sure you want to clear the final payment entries?',()=>{
      $('driverPayForm').reset();
      setMsg('dpMsg','');
      updateDriverPaymentPreview();
    },'Clear final payment');
  }

  function sendDriverPaymentMessage(){
    const d=driverPaymentData();
    if(!d.driverPhone){ setMsg('dpMsg','Enter driver WhatsApp number.','bad'); return; }
    if(d.mode==='dayKm' && (!d.days || !d.dayRent || !d.kmCharge)){
      setMsg('dpMsg','Enter pickup/drop dates, day rent and KM charge.','bad'); return;
    }
    if(d.mode==='fixed' && !d.fixedAmount){ setMsg('dpMsg','Enter fixed amount.','bad'); return; }
    openWhatsAppMessage(d.driverPhone,buildDriverPaymentMessage(d),'dpMsg');
  }

  function openWhatsAppMessage(phone,message,msgId){
    const cleaned=normaliseWhatsAppNumber(phone);
    if(!cleaned){ setMsg(msgId,'Enter a valid WhatsApp number.','bad'); return; }
    const url=`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url,'_blank');
    setMsg(msgId,'WhatsApp message opened.','good');
  }

  function normaliseWhatsAppNumber(phone){
    let d=String(phone||'').replace(/\D/g,'');
    if(!d) return '';
    if(d.length===10) d='91'+d;
    if(d.length===11 && d.startsWith('0')) d='91'+d.slice(1);
    if(d.length<10) return '';
    return d;
  }

  function plural(n,word){ return Number(n)===1 ? word : word+'s'; }

  function bindInvoiceForm(){
    ['invMonthCode','invRunningNo','driverName','driverPhone','vehicleNumber','kmRan','paymentMethod','paymentAfterPickup','secondPayment','finalBalancePaid','invNotes'].forEach(id=>$(id).addEventListener('input',updateInvoicePreview));
    $('invFetchBtn').addEventListener('click',fetchInvoiceQuote); $('invClearBtn').addEventListener('click',clearInvoice); $('invPrintBtn').addEventListener('click',()=>printCurrent(buildInvoicePrintName())); $('invSaveBtn').addEventListener('click',saveInvoice); $('addChargeBtn').addEventListener('click',()=>{ addChargeRow(); updateInvoicePreview(); }); if($('addPackageItemBtn')) $('addPackageItemBtn').addEventListener('click',()=>{ addPackageItemRow(); updateInvoicePreview(); });
  }
  function addChargeRow(data={}){ const row=document.createElement('div'); row.className='charge-row'; row.innerHTML=`<input class="charge-desc" type="text" value="${escapeAttr(data.desc||'')}" placeholder="Charge description"><input class="charge-amount" type="number" min="0" value="${escapeAttr(data.amount||'')}" placeholder="Amount"><button type="button" class="remove-charge">×</button>`; row.querySelectorAll('input').forEach(el=>el.addEventListener('input',updateInvoicePreview)); row.querySelector('.remove-charge').addEventListener('click',()=>{ row.remove(); if(!document.querySelectorAll('.charge-row').length) addChargeRow(); updateInvoicePreview(); }); $('chargeRows').appendChild(row); }
  function getCharges(){ return Array.from(document.querySelectorAll('.charge-row')).map(row=>({ desc:row.querySelector('.charge-desc').value.trim(), amount:row.querySelector('.charge-amount').value })).filter(c=>c.desc||num(c.amount)>0); }
  function fetchInvoiceQuote(){
    const ref=quoteRefFromParts('invMonthCode','invRunningNo');
    if(!ref.ok){ setMsg('invMsg',ref.message,'bad'); return; }
    setMsg('invMsg','Fetching quote, advance and driver assignment...');
    google.script.run.withSuccessHandler(res=>{
      if(!res?.ok){ setMsg('invMsg',res?.message||'Quote not found','bad'); return; }
      state.invoiceQuote=res.quote; state.invoiceAssignment=res.assignment||null;
      setPaymentAccount(res.invoice?.paymentAccount || res.assignment?.paymentAccount || res.quote.paymentAccount || 'glide');
      state.invoiceAdvancePaid=num(res.advancePaid);
      $('kmRan').value=res.quote.kmIncluded||'';
      $('driverName').value=res.assignment?.driverName||'';
      $('driverPhone').value=res.assignment?.driverPhone||'';
      $('vehicleNumber').value=res.assignment?.vehicleNumber||'';
      $('paymentAfterPickup').value=res.invoice?.paymentAfterPickup??res.assignment?.initialPaymentAfterPickup??'';
      $('secondPayment').value=res.invoice?.secondPayment??'';
      $('finalBalancePaid').value=res.invoice?.finalBalancePaid??'';
      if(res.invoice?.paymentMethod) $('paymentMethod').value=res.invoice.paymentMethod;
      restorePackageItems(res.invoice?.packageItems||[]);
      if($('packageCostReference')) $('packageCostReference').textContent='Original quoted combined hotel / inclusion cost: ₹'+formatMoney(res.quote.totalHotelCost||0);
      updateInvoicePreview();
      setMsg('invMsg',`Quote fetched: ${res.quote.quoteNo}${res.invoice?' · saved invoice data loaded':''}`,'good');
    }).withFailureHandler(err=>setMsg('invMsg',err.message||String(err),'bad')).fetchInvoiceContextByParts(state.token,ref.monthCode,ref.runningNo);
  }
  function clearInvoice(){ showConfirm('Are you sure you want to clear the entries?', () => {
    $('invoiceForm').reset(); state.invoiceQuote=null; state.invoiceAssignment=null; state.invoiceAdvancePaid=0;
    $('chargeRows').innerHTML=''; addChargeRow(); restorePackageItems([]);
    if($('packageCostReference')) $('packageCostReference').textContent='';
    $('invFetched').textContent='No quote fetched.'; setMsg('invMsg',''); updateInvoicePreview();
  }, 'Clear entries'); }
  function saveInvoice(){
    if(!state.invoiceQuote){ setMsg('invMsg','Fetch quote first.','bad'); return; }
    const totals=invoiceTotals(state.invoiceQuote);
    if(!totals.packageItems.length){ setMsg('invMsg','Add at least one package cost breakdown entry before saving.','bad'); return; }
    if(totals.packageItems.some(x=>!x.desc||x.amount<0)){ setMsg('invMsg','Enter a description and valid amount for each breakdown item.','bad'); return; }
    if(totals.packageBreakdownTotal>num(state.invoiceQuote.packageCost)+0.01){ setMsg('invMsg','Breakdown amounts cannot exceed original package amount.','bad'); return; }
    if(!totals.isPaid){ setMsg('invMsg','Final Invoice can only be saved after all payments are received. Remaining: ₹'+formatMoney(totals.finalPayment),'bad'); return; }
    if(totals.packageItems.length+getCharges().length+(totals.extraKm>0?1:0)>14){ setMsg('invMsg','Too many lines for a readable one-page invoice. Shorten or combine particulars.','bad'); return; }
    $('invSaveBtn').disabled=true; setMsg('invMsg','Saving paid final invoice...');
    google.script.run.withSuccessHandler(res=>{
      $('invSaveBtn').disabled=false;
      if(!res?.ok){setMsg('invMsg',res?.message||'Save failed','bad');return;}
      setMsg('invMsg',`${res.message} · PDF: ${res.fileName}`,'good');
      if(res.pdfUrl && confirm(`${res.invoiceNo} saved. Open Drive PDF now?`)) window.open(res.pdfUrl,'_blank');
    }).withFailureHandler(err=>{ $('invSaveBtn').disabled=false; setMsg('invMsg',err.message||String(err),'bad'); }).generateFinalInvoice({
      token:state.token, quoteNo:state.invoiceQuote.quoteNo,
      driverName:$('driverName').value,driverPhone:$('driverPhone').value,vehicleNumber:$('vehicleNumber').value,
      kmRan:$('kmRan').value,paymentMethod:$('paymentMethod').value,
      paymentAfterPickup:$('paymentAfterPickup').value,secondPayment:$('secondPayment').value,
      finalBalancePaid:$('finalBalancePaid').value,packageItems:getPackageItems(),
      additionalCharges:getCharges(),notes:$('invNotes').value,paymentAccount:'glide'
    });
  }
  function updateInvoicePreview(){
    const q=state.invoiceQuote;
    if(q) $('invFetched').innerHTML=fetchedHtml(q);
    const totals=invoiceTotals(q);
    $('finalPayment').value='₹'+formatMoney(totals.finalPayment);
    $('invoicePreview').innerHTML=buildFinalInvoiceHtml(q,totals);
  }

  function bindAssignForm(){
    [
      'asgMonthCode','asgRunningNo','bookingId','asgVehicleType','asgDriverName','asgDriverPhone','asgVehicleNumber',
      'asgPickupTime','asgDropTime','asgPickupFrom','asgDropAt','asgInitialPayment','asgNotes'
    ].forEach(id=>{
      const el=$(id);
      if(!el) return;
      const handler=()=>{
        if(id==='asgInitialPayment') recalcAssignFinalBalance();
        updateAssignPreview();
      };
      el.addEventListener('input',handler);
      el.addEventListener('change',handler);
    });
    if($('asgFinalBalance')){
      $('asgFinalBalance').readOnly=true;
      $('asgFinalBalance').setAttribute('tabindex','-1');
    }
    $('asgFetchBtn').addEventListener('click',fetchAssignQuote);
    $('asgClearBtn').addEventListener('click',clearAssign);
    $('asgPrintBtn').addEventListener('click',()=>printCurrent(buildAssignPrintName()));
    $('asgSaveBtn').addEventListener('click',saveAssign);
    addDriverMessageLink();
    addCustomerMessageLink();
  }

  function addDriverMessageLink(){
    if($('asgDriverMessageBtn') || !$('asgSaveBtn')) return;
    const link=document.createElement('a');
    link.id='asgDriverMessageBtn';
    link.className='secondary-btn action-btn';
    link.textContent='Customer Details';
    link.href='#';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.style.textDecoration='none';
    link.addEventListener('click',event=>{
      try {
        // Read current fields at click time, including unsaved edits.
        link.href=driverMessageLink();
        setMsg('asgMsg','Driver message ready. Review it in WhatsApp before sending.','good');
      } catch(error) {
        event.preventDefault();
        setMsg('asgMsg',error.message||String(error),'bad');
      }
    });
    $('asgSaveBtn').parentNode.insertBefore(link,$('asgSaveBtn'));
  }

  function addCustomerMessageLink(){
    if($('asgCustomerMessageBtn') || !$('asgSaveBtn')) return;
    const link=document.createElement('a');
    link.id='asgCustomerMessageBtn';
    link.className='secondary-btn action-btn';
    link.textContent='Driver and Vehicle Details';
    link.href='#';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.style.textDecoration='none';
    link.addEventListener('click',event=>{
      try {
        link.href=customerMessageLink();
        setMsg('asgMsg','Customer message ready. Review it in WhatsApp before sending.','good');
      } catch(error) {
        event.preventDefault();
        setMsg('asgMsg',error.message||String(error),'bad');
      }
    });
    $('asgSaveBtn').parentNode.insertBefore(link,$('asgSaveBtn'));
  }
  function customerMessageText(q){
    if(!q) throw new Error('Fetch quote first.');
    const customerName=String(q.clientName||'').trim();
    const driverName=String($('asgDriverName').value||'').trim();
    const driverPhone=String($('asgDriverPhone').value||'').trim();
    const vehicle=String($('asgVehicleType').value||q.vehicleType||'').trim();
    const vehicleNumber=String($('asgVehicleNumber').value||'').trim();
    if(!customerName) throw new Error('Customer name is required in the quotation.');
    if(!driverName) throw new Error('Enter the driver name.');
    driverMessagePhone(driverPhone);
    if(!vehicle || !vehicleNumber) throw new Error('Enter the vehicle type and vehicle number.');
    const companyName=String(cfg.companyName||'Glide Tourism').trim();
    const supportPhone=String(cfg.phone||'+91 8667737237').trim();
    return [
      `Dear ${customerName},`,
      '',
      'Here are the driver and vehicle details for your trip.',
      `> Driver Name: ${driverName}`,
      `> Driver Phone number: ${driverPhone}`,
      `> Vehicle: ${vehicle}`,
      `> Vehicle Number: ${vehicleNumber}`,
      '',
      'Everything is arranged as planned.',
      'Our driver will coordinate with you and reach on time for pickup.',
      '',
      `For any assistance, feel free to contact us anytime: ${supportPhone}`,
      '',
      'Wishing you a safe and pleasant journey.',
      'Regards,',
      companyName
    ].join('\n');
  }
  function customerMessageLink(){
    const message=customerMessageText(state.assignQuote);
    let phone;
    try { phone=driverMessagePhone(state.assignQuote.phone); }
    catch(error) { throw new Error('Enter a valid customer phone number in the quotation, including country code for international numbers.'); }
    return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
  }

  function driverMessageDateTime(dateText,time){
    if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time||''))) return null;
    return combineQuoteDateTime(dateText,time);
  }
  function driverMessagePhone(value){
    const raw=String(value||'').trim();
    let digits=raw.replace(/\D/g,'');
    if(raw.startsWith('00')) digits=digits.slice(2);
    if(digits.length===10 && !raw.startsWith('+') && !raw.startsWith('00')) digits='91'+digits;
    if(!/^[1-9]\d{10,14}$/.test(digits)) throw new Error('Enter a valid driver phone number, including country code for international numbers.');
    return digits;
  }
  function driverMessageDate(date){
    const month=date.toLocaleDateString('en-GB',{month:'long'});
    const weekday=date.toLocaleDateString('en-GB',{weekday:'long'});
    return `${date.getDate()} ${month} ${date.getFullYear()} (${weekday})`;
  }
  function driverMessageTime(date){
    const hours=date.getHours();
    return `${hours%12||12}:${String(date.getMinutes()).padStart(2,'0')} ${hours>=12?'PM':'AM'}`;
  }
  function driverMessageText(q){
    if(!q) throw new Error('Fetch quote first.');
    const driverName=String($('asgDriverName').value||'').trim();
    if(!driverName) throw new Error('Enter the driver name.');
    const pickup=driverMessageDateTime(q.pickupDateIso||q.pickupDate,$('asgPickupTime').value);
    const drop=driverMessageDateTime(q.dropDateIso||q.dropDate,$('asgDropTime').value);
    if(!pickup || !drop) throw new Error('Enter valid pickup and drop dates and times.');
    if(drop<pickup) throw new Error('Drop date and time must be on or after pickup.');
    const pickupFrom=String($('asgPickupFrom').value||q.pickup||'').trim();
    const destination=String(q.intermediateLocation||'').trim();
    const dropAt=String($('asgDropAt').value||q.drop||'').trim();
    if(!pickupFrom || !destination || !dropAt) throw new Error('Pickup, destination and drop locations are required.');
    const customerName=String(q.clientName||'').trim();
    const customerPhone=String(q.phone||'').trim();
    if(!customerName || !customerPhone) throw new Error('Customer name and contact number are required in the quotation.');
    const dateOnly=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const duration=calcDuration(dateOnly(pickup),dateOnly(drop));
    return [
      `Dear ${driverName},`,
      'Here are the trip details for your reference:',
      '',
      `> Pickup: ${driverMessageDate(pickup)} at ${driverMessageTime(pickup)} – ${pickupFrom}`,
      `> Destination: ${destination}`,
      `> Drop: ${driverMessageDate(drop)} at ${driverMessageTime(drop)} – ${dropAt}`,
      `> Duration: ${duration.days} ${duration.days===1?'Day':'Days'} / ${duration.nights} ${duration.nights===1?'Night':'Nights'}`,
      '',
      `Customer Name: ${customerName}`,
      `Contact Number: ${customerPhone}`
    ].join('\n');
  }
  function driverMessageLink(){
    const message=driverMessageText(state.assignQuote);
    const phone=driverMessagePhone($('asgDriverPhone').value);
    return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
  }

  function fetchAssignQuote(){
    const ref=quoteRefFromParts('asgMonthCode','asgRunningNo');
    if(!ref.ok){ setMsg('asgMsg',ref.message,'bad'); return; }
    setMsg('asgMsg','Fetching quote...');
    google.script.run.withSuccessHandler(res=>{
      if(!res?.ok){ setMsg('asgMsg',res?.message||'Quote not found','bad'); return; }
      state.assignQuote=res.quote;
      setPaymentAccount(res.assignment?.paymentAccount || res.quote.paymentAccount || 'glide');
      const a=res.assignment||null;
      $('asgPickupDateDisplay').value=res.quote.pickupDate||'';
      $('asgDropDateDisplay').value=res.quote.dropDate||'';
      $('bookingId').value=a?.bookingId || 'Auto on Save';
      $('asgVehicleType').value=a?.vehicleType || res.quote.vehicleType || '';
      $('asgDriverName').value=a?.driverName || '';
      $('asgDriverPhone').value=a?.driverPhone || '';
      $('asgVehicleNumber').value=a?.vehicleNumber || '';
      $('asgPickupTime').value=a?.pickupTime || '';
      $('asgDropTime').value=a?.dropTime || '';
      $('asgPickupFrom').value=a?.pickupFrom || res.quote.pickup || '';
      $('asgDropAt').value=a?.dropAt || res.quote.drop || '';
      $('asgInitialPayment').value=a?.initialPaymentAfterPickup || '';
      $('asgNotes').value=a?.notes || '';
      recalcAssignFinalBalance();
      if(a && a.finalDayBalance && $('asgFinalBalance')) $('asgFinalBalance').value=a.finalDayBalance;
      updateAssignPreview();
      setMsg('asgMsg',`Quote fetched: ${res.quote.quoteNo}${a?' · saved assignment loaded':''}`,'good');
    }).withFailureHandler(err=>setMsg('asgMsg',err.message||String(err),'bad')).fetchAssignContextByParts(state.token,ref.monthCode,ref.runningNo);
  }

  function clearAssign(){ showConfirm('Are you sure you want to clear the entries?', () => { $('assignForm').reset(); state.assignQuote=null; $('asgFetched').textContent='No quote fetched.'; setMsg('asgMsg',''); updateAssignPreview(); }, 'Clear entries'); }
  function saveAssign(){ if(!state.assignQuote){ setMsg('asgMsg','Fetch quote first.','bad'); return; } $('asgSaveBtn').disabled=true; setMsg('asgMsg','Saving driver and vehicle details...'); google.script.run.withSuccessHandler(res=>{ $('asgSaveBtn').disabled=false; if(!res?.ok){ setMsg('asgMsg',res?.message||'Save failed','bad'); return; } if(res.bookingId) $('bookingId').value=res.bookingId; updateAssignPreview(); setMsg('asgMsg',`${res.message} Booking ID: ${res.bookingId}`,'good'); if(res.customerPdfUrl && confirm(`${res.bookingId} saved. Open Driver and Vehicle Details PDF now?`)) window.open(res.customerPdfUrl,'_blank'); }).withFailureHandler(err=>{ $('asgSaveBtn').disabled=false; setMsg('asgMsg',err.message||String(err),'bad'); }).generateDriverAssignment({ token:state.token, quoteNo:state.assignQuote.quoteNo, assignedVehicleType:$('asgVehicleType').value, driverName:$('asgDriverName').value, driverPhone:$('asgDriverPhone').value, vehicleNumber:$('asgVehicleNumber').value, pickupTime:$('asgPickupTime').value, dropTime:$('asgDropTime').value, pickupFrom:$('asgPickupFrom').value, dropAt:$('asgDropAt').value, initialPaymentAfterPickup:$('asgInitialPayment').value, finalDayBalance:$('asgFinalBalance').value, notes:$('asgNotes').value,paymentAccount:'glide' }); }
  function updateAssignPreview(){ const q=state.assignQuote; if(q) $('asgFetched').innerHTML=fetchedHtml(q); $('assignPreview').innerHTML=buildAssignPreviewHtml(q); }

  function fetchedHtml(q){ return `<strong>${escapeHtml(q.quoteNo)}</strong><br>${escapeHtml(q.clientName)} · ${escapeHtml(q.phone)}<br>${escapeHtml(q.pickup)} → ${escapeHtml(q.intermediateLocation)} → ${escapeHtml(q.drop)}<br>${escapeHtml(q.pickupDate)} to ${escapeHtml(q.dropDate)} · ${escapeHtml(q.vehicleType)}<br>Package: ₹${formatMoney(q.packageCost)} · Advance: ₹${formatMoney(q.advanceAmount)}`; }

  function buildQuoteDocumentHtml(p,q,duration,packageCost){
    const hotels=p.hotels; const route=routeText(p.pickup,p.intermediateLocation,p.drop);
    const hotelHtml=hotels.length?`<section class="pdf-card accommodation-card"><div class="pdf-section-title">Accommodation</div><table class="pdf-hotel-table"><thead><tr><th>Nights</th><th>Rooms</th><th>Location</th><th>Hotel Type</th><th>Hotel</th></tr></thead><tbody>${hotels.map(h=>`<tr><td>${escapeHtml(h.nights||'-')}</td><td>${escapeHtml(cleanHotelRooms(h)||'-')}</td><td>${escapeHtml(h.location||'-')}</td><td>${escapeHtml(h.hotelType||'-')}</td><td>${escapeHtml(h.hotelName||'-')}</td></tr>`).join('')}</tbody></table></section>`:'';
    const pages=[];
    pages.push(`<section class="pdf-page quote-page"><div class="pdf-content">${brandRowHtml(q.quoteNo,'Quotation')}<div class="pdf-hero"><h2>Dear ${escapeHtml(p.clientName||'Guest')},</h2><p>Thank you for choosing <strong>Glide Tourism</strong>. Please find your customized quotation for <strong>${escapeHtml(p.intermediateLocation||'your trip')}</strong>.</p><div class="pdf-pills"><span><b>Phone</b> ${escapeHtml(p.phone||'-')}</span><span><b>Dates</b> ${formatDateInput(p.pickupDate)} to ${formatDateInput(p.dropDate)}</span><span><b>Duration</b> ${escapeHtml(duration.text)}</span><span><b>Vehicle</b> ${escapeHtml(p.vehicleType||'-')} · ${escapeHtml(p.acStatus)}</span><span class="wide"><b>Route</b> ${escapeHtml(route)}</span></div></div><div class="pdf-price-row two-cell"><div class="pdf-price-cell cost"><small>Total Package Cost <span>(KM included: ${formatMoney(num(p.kmIncluded))}, Rate: ₹${formatMoney(num(p.extraKmCharge))}/KM)</span></small><b>₹${formatMoney(packageCost)}</b></div><div class="pdf-price-cell"><small>Advance Needed To Confirm Booking</small><b>₹${formatMoney(num(p.advanceAmount))}</b></div></div><div class="pdf-note-bar payment-inline"><strong>Advance payment is required to confirm the booking.</strong> The total package amount includes the services and accommodation listed below.<br>${paymentDetailsMarkup()}</div>${hotelHtml}<div class="pdf-info-grid bottom-info"><section class="pdf-list-card"><h3>Inclusions</h3><ul>${buildInclusions(p).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="pdf-list-card"><h3>Booking Steps</h3><ol><li>Pay advance amount to confirm booking.</li><li>Share payment screenshot / UTR.</li><li>Booking confirmation receipt will be shared.</li></ol></section></div>${footerHtml()}</div></section>`);
    const days=parseItineraryDays(p.itineraryText); if(days.length){ chunk(days,6).forEach(ch=>pages.push(itineraryPageHtml(ch,ch.length===1))); } pages.push(finalTermsPageHtml()); return pages.join('');
  }
  function buildAdvanceReceiptHtml(q,paid){ if(!q) return blankDoc('Advance Receipt','Fetch a quotation to preview the receipt.'); const balance=Math.max(0,num(q.packageCost)-num(paid)); const receiptNo='AR-'+q.quoteNo; return `<section class="pdf-page receipt-page"><div class="pdf-content">${brandRowHtml(receiptNo,'Advance Payment Receipt')}<div class="receipt-title"><h2>Advance Payment Receipt</h2><p>Payment status: <strong>Advance Received</strong></p></div><div class="receipt-grid"><table class="pdf-data"><tr><th>Quote No</th><td>${escapeHtml(q.quoteNo)}</td></tr><tr><th>Customer</th><td>${escapeHtml(q.clientName)}</td></tr><tr><th>Phone</th><td>${escapeHtml(q.phone)}</td></tr><tr><th>Vehicle</th><td>${escapeHtml(q.vehicleType)}</td></tr></table><table class="pdf-data"><tr><th>Pickup</th><td>${escapeHtml(q.pickup)}</td></tr><tr><th>Intermediate</th><td>${escapeHtml(q.intermediateLocation)}</td></tr><tr><th>Drop</th><td>${escapeHtml(q.drop)}</td></tr><tr><th>Travel Dates</th><td>${escapeHtml(q.pickupDate)} to ${escapeHtml(q.dropDate)}</td></tr></table></div><table class="amount-table"><tr><th>Description</th><th>Amount</th></tr><tr><td>Total Package Amount</td><td>₹${formatMoney(q.packageCost)}</td></tr><tr><td>Advance Paid</td><td>₹${formatMoney(paid)}</td></tr><tr class="strong"><td>Balance Due</td><td>₹${formatMoney(balance)}</td></tr></table><div class="pdf-inline-account">${paymentDetailsMarkup()}</div><section class="pdf-terms-card compact"><h3>Terms & Conditions</h3><ul>${termsList().map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><div class="receipt-thanks">Thank you for choosing Glide Tourism.<br>For inquiries, contact ${escapeHtml(cfg.phone||'+91 8667737237')}<br>This is a computer-generated receipt and does not require a signature.</div>${footerHtml()}</div></section>`; }
  function blankDoc(title,msg){ return `<section class="pdf-page"><div class="pdf-content">${brandRowHtml('',title)}<div class="pdf-thank-card"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(msg)}</p></div>${footerHtml()}</div></section>`; }
  function addPackageItemRow(data={}){
    const wrap=$('packageItemRows'); if(!wrap) return;
    const row=document.createElement('div'); row.className='package-item-row';
    row.innerHTML=`<input type="text" class="package-item-desc" maxlength="90" placeholder="Hotel accommodation / arrival bus ticket / other" value="${escapeAttr(data.desc||'')}"><input type="number" min="0" step="0.01" class="package-item-amount" placeholder="Amount ₹" value="${data.amount!==undefined&&data.amount!==null?escapeAttr(data.amount):''}"><button type="button" class="remove-package-item" aria-label="Remove item">×</button>`;
    row.querySelectorAll('input').forEach(el=>el.addEventListener('input',updateInvoicePreview));
    row.querySelector('button').addEventListener('click',()=>{ row.remove(); updateInvoicePreview(); });
    wrap.appendChild(row);
  }
  function getPackageItems(){
    return Array.from(document.querySelectorAll('.package-item-row')).map(row=>({
      desc:row.querySelector('.package-item-desc').value.trim(),
      amount:row.querySelector('.package-item-amount').value
    })).filter(x=>x.desc||num(x.amount)>0);
  }
  function restorePackageItems(items){
    if(!$('packageItemRows')) return;
    $('packageItemRows').innerHTML='';
    (Array.isArray(items)?items:[]).forEach(addPackageItemRow);
    if(!getPackageItems().length) addPackageItemRow();
  }
  function invoiceTotals(q){
    if(!q) return {extraKm:0,extraKmAmount:0,additionalTotal:0,totalInvoice:0,finalPayment:0,finalBalancePaid:0,advancePaid:0,totalPaid:0,isPaid:false,additionalDetails:'',packageItems:[],packageBreakdownTotal:0};
    const kmRan=num($('kmRan').value);
    const extraKm=Math.max(0,kmRan-num(q.kmIncluded));
    const extraKmAmount=extraKm*num(q.extraKmCharge);
    const charges=getCharges().map(c=>({desc:c.desc,amount:num(c.amount)}));
    const additionalTotal=charges.reduce((s,c)=>s+c.amount,0)+extraKmAmount;
    const totalInvoice=num(q.packageCost)+additionalTotal;
    const advancePaid=num(state.invoiceAdvancePaid);
    const paymentAfterPickup=num($('paymentAfterPickup').value);
    const secondPayment=num($('secondPayment').value);
    const finalBalancePaid=num($('finalBalancePaid')?.value);
    const totalPaid=advancePaid+paymentAfterPickup+secondPayment+finalBalancePaid;
    const finalPayment=Math.max(0,Math.round((totalInvoice-totalPaid)*100)/100);
    const isPaid=totalInvoice>0&&Math.abs(totalPaid-totalInvoice)<0.01;
    const packageItems=getPackageItems().map(c=>({desc:c.desc,amount:num(c.amount)}));
    const packageBreakdownTotal=packageItems.reduce((s,c)=>s+c.amount,0);
    const lines=[];
    if(extraKm>0) lines.push(`Extra KM: ${extraKm} KM - ₹${formatMoney(extraKmAmount)}`);
    charges.forEach(c=>lines.push(`${c.desc||'Additional charge'} - ₹${formatMoney(c.amount)}`));
    return {extraKm,extraKmAmount,additionalTotal,totalInvoice,finalPayment,finalBalancePaid,advancePaid,totalPaid,isPaid,packageItems,packageBreakdownTotal,additionalDetails:lines.join('\n')};
  }
  function buildFinalInvoiceHtml(q,t){
    if(!q) return blankDoc('Final Invoice','Fetch a quotation to preview the final invoice.');
    const invoiceNo=invoiceNoFromQuote(q.quoteNo);
    const breakdown=t.packageItems.filter(x=>x.desc||x.amount).map((x,i)=>`<tr><td class="invoice-index">${i+1}</td><td>${escapeHtml(x.desc||'Package item')}</td><td class="right">₹${formatMoney(x.amount)}</td></tr>`).join('');
    const charges=getCharges().map(c=>({desc:c.desc,amount:num(c.amount)}));
    const extras=[...(t.extraKm>0?[{desc:`Extra KM (${formatMoney(t.extraKm)} KM × ₹${formatMoney(q.extraKmCharge)})`,amount:t.extraKmAmount}]:[]),...charges];
    const extrasHtml=extras.map(x=>`<tr><td>${escapeHtml(x.desc||'Additional charge')}</td><td class="right">₹${formatMoney(x.amount)}</td></tr>`).join('');
    const unallocated=num(q.packageCost)-t.packageBreakdownTotal;
    const extraNote=unallocated>0.01?`<div class="invoice-muted-line">Other included package services: ₹${formatMoney(unallocated)}</div>`:unallocated < -0.01?'<div class="invoice-warning-line">Breakdown exceeds original package amount — please check.</div>':'';
    const settleStatus=t.isPaid?'PAID IN FULL':'DRAFT — PAYMENT NOT COMPLETE';
    const detailCount=t.packageItems.length+extras.length;
    const density=detailCount>11?' invoice-tight':detailCount>7?' invoice-compact':'';
    return `<section class="pdf-page invoice-page invoice-onepage${density}"><div class="pdf-content">
      ${brandRowHtml(invoiceNo,'Invoice')}
      <div class="invoice-titlebar"><div><h2>FINAL INVOICE</h2><p>Quote: <strong>${escapeHtml(q.quoteNo)}</strong> · Payment: <strong>${escapeHtml($('paymentMethod').value||'Cash')}</strong></p></div><span class="invoice-status ${t.isPaid?'paid':'pending'}">${settleStatus}</span></div>
      <div class="invoice-detail-grid"><section class="pdf-card"><h3>Customer & Trip</h3><table class="pdf-data"><tr><th>Customer</th><td>${escapeHtml(q.clientName||'-')}</td></tr><tr><th>Phone</th><td>${escapeHtml(q.phone||'-')}</td></tr><tr><th>Route</th><td>${escapeHtml(routeText(q.pickup,q.intermediateLocation,q.drop))}</td></tr><tr><th>Dates</th><td>${escapeHtml(q.pickupDate||'-')} to ${escapeHtml(q.dropDate||'-')}</td></tr></table></section><section class="pdf-card"><h3>Vehicle & Driver</h3><table class="pdf-data"><tr><th>Vehicle</th><td>${escapeHtml(q.vehicleType||'-')}</td></tr><tr><th>Vehicle No.</th><td>${escapeHtml($('vehicleNumber').value||'-')}</td></tr><tr><th>Driver</th><td>${escapeHtml($('driverName').value||'-')}</td></tr><tr><th>Driver Phone</th><td>${escapeHtml($('driverPhone').value||'-')}</td></tr></table></section></div>
      <div class="invoice-kmline">KM Included: <b>${formatMoney(q.kmIncluded)}</b> &nbsp; · &nbsp; KM Ran: <b>${formatMoney($('kmRan').value)}</b> &nbsp; · &nbsp; Extra KM: <b>${formatMoney(t.extraKm)}</b></div>
      <div class="invoice-table-heading">PACKAGE COST BREAKDOWN <small>Already included in package</small></div>
      <table class="invoice-line-table"><thead><tr><th class="invoice-index">No</th><th>Particulars</th><th class="right">Amount</th></tr></thead><tbody>${breakdown||'<tr><td>—</td><td>Package services (no itemization entered)</td><td class="right">—</td></tr>'}</tbody></table>${extraNote}
      ${extras.length?`<div class="invoice-table-heading">ADDITIONAL CHARGES</div><table class="invoice-line-table invoice-extras"><thead><tr><th>Particulars</th><th class="right">Amount</th></tr></thead><tbody>${extrasHtml}</tbody></table>`:''}
      <div class="invoice-table-heading">PAYMENT SUMMARY</div>
      <div class="invoice-summary"><div class="invoice-sum-row invoice-total"><span>TOTAL INVOICE AMOUNT</span><b>₹${formatMoney(t.totalInvoice)}</b></div><div class="invoice-sum-row"><span>Advance Paid</span><b>₹${formatMoney(t.advancePaid)}</b></div><div class="invoice-sum-row"><span>Payment After Pickup</span><b>₹${formatMoney($('paymentAfterPickup').value)}</b></div><div class="invoice-sum-row"><span>Second Payment</span><b>₹${formatMoney($('secondPayment').value)}</b></div><div class="invoice-sum-row"><span>Final Balance Paid</span><b>₹${formatMoney(t.finalBalancePaid)}</b></div><div class="invoice-sum-row invoice-paid"><span>TOTAL PAID</span><b>₹${formatMoney(t.totalPaid)}</b></div></div>
      <div class="invoice-account-info">${paymentDetailsMarkup()}</div>
      <div class="invoice-short-terms">${extraTravelTerms().map(escapeHtml).join(' · ')}</div>
      <div class="invoice-bottom-note">${t.isPaid?'Payment received in full. Thank you for choosing Glide Tourism.':'Preview only — collect remaining ₹'+formatMoney(t.finalPayment)+' before saving the final invoice.'}</div>
    </div></section>`;
  }

  function buildAssignPreviewHtml(q){ if(!q) return blankDoc('Driver and Vehicle Details','Fetch a quotation to preview driver and vehicle details.'); const data=assignData(q); return assignmentPdfPage(data,'customer'); }
  function recalcAssignFinalBalance(){
    const q=state.assignQuote;
    if(!q || !$('asgFinalBalance')) return;
    const fare=num(q.packageCost);
    const advance=num(q.advanceAmount);
    const initialAfterPickup=num($('asgInitialPayment')?.value);
    const remainingLastDay=Math.max(0,fare-advance-initialAfterPickup);
    $('asgFinalBalance').value=remainingLastDay;
  }

  function assignData(q){
    recalcAssignFinalBalance();
    const vehicle=$('asgVehicleType').value||q.vehicleType;
    const pickupDt=combineQuoteDateTime(q.pickupDateIso||q.pickupDate,$('asgPickupTime').value);
    const dropDt=combineQuoteDateTime(q.dropDateIso||q.dropDate,$('asgDropTime').value);
    const booking=($('bookingId').value && $('bookingId').value!=='Auto on Save') ? $('bookingId').value : 'Auto on Save';
    const fare=num(q.packageCost);
    const adv=num(q.advanceAmount);
    const initialAfterPickup=num($('asgInitialPayment').value);
    const finalDayBalance=Math.max(0,fare-adv-initialAfterPickup);
    const bal=Math.max(0,fare-adv);
    if($('asgFinalBalance')) $('asgFinalBalance').value=finalDayBalance;
    return { quoteNo:q.quoteNo, bookingId:booking, clientName:q.clientName, phone:q.phone, driverName:$('asgDriverName').value||'Driver Name', driverPhone:$('asgDriverPhone').value||'Driver Phone', vehicleType:vehicle||'-', vehicleNumber:$('asgVehicleNumber').value||'-', pickupDateTime:pickupDt, dropDateTime:dropDt, pickupFrom:$('asgPickupFrom').value||q.pickup, dropAt:$('asgDropAt').value||q.drop, intermediateLocation:q.intermediateLocation, fare, advance:adv, balance:bal, initialPaymentAfterPickup:initialAfterPickup, finalDayBalance, extraKmCharge:num(q.extraKmCharge), notes:$('asgNotes').value };
  }

  function assignmentPdfPage(d,type){
    const isCustomer=type==='customer';
    const title='Driver and Vehicle Details';
    const paymentCard=isCustomer?`<section class="pdf-card customer-payment-card" style="font-size:9.5pt;"><h3>Payment Summary</h3><table class="pdf-data" style="font-size:9.2pt;"><tr><th>Fare</th><td>₹${formatMoney(d.fare)}</td></tr><tr><th>Advance Paid</th><td>₹${formatMoney(d.advance)}</td></tr><tr><th>Balance Before Pickup Payment</th><td>₹${formatMoney(d.balance)}</td></tr><tr><th>After Pickup</th><td>Kindly proceed with the initial payment of <strong>₹${formatMoney(d.initialPaymentAfterPickup)}</strong> for fuel and driver allowance.</td></tr><tr><th>Final Day</th><td>Please complete the remaining payment of <strong>₹${formatMoney(d.finalDayBalance)}</strong> at or before drop-off.</td></tr><tr><th>Extra KM</th><td>Extra kilometres, if any, will be charged at ₹${formatMoney(d.extraKmCharge)}/KM after the included KM limit.</td></tr></table><div class="pdf-note-bar payment-inline" style="font-size:9.1pt;line-height:1.55;"><strong>Always use the company account for secure transactions.</strong><br>${paymentDetailsMarkup()}</div></section>`:'';
    const driverNotes=!isCustomer?`<section class="pdf-list-card assignment-message" style="font-size:9.3pt;"><h3>Driver Instructions</h3><ul>${driverInstructions(d).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section>`:'';
    return `<section class="pdf-page receipt-page"><div class="pdf-content">${brandRowHtml(d.bookingId,'Details')}<div class="receipt-title"><h2>${escapeHtml(title)}</h2><p>Booking ID: <strong>${escapeHtml(d.bookingId)}</strong> · Quote: <strong>${escapeHtml(d.quoteNo)}</strong></p></div><div class="receipt-grid"><section class="pdf-card"><h3>Customer & Trip</h3><table class="pdf-data"><tr><th>Customer</th><td>${escapeHtml(d.clientName)}</td></tr><tr><th>Phone</th><td>${escapeHtml(d.phone)}</td></tr><tr><th>Pickup</th><td>${formatLongDateTime(d.pickupDateTime)}<br>${escapeHtml(d.pickupFrom)}</td></tr><tr><th>Stops</th><td>${escapeHtml(d.intermediateLocation)}</td></tr><tr><th>Drop</th><td>${formatLongDateTime(d.dropDateTime)}<br>${escapeHtml(d.dropAt)}</td></tr></table></section><section class="pdf-card"><h3>Vehicle & Driver</h3><table class="pdf-data"><tr><th>Driver</th><td>${escapeHtml(d.driverName)}</td></tr><tr><th>Driver Phone</th><td>${escapeHtml(d.driverPhone)}</td></tr><tr><th>Vehicle</th><td>${escapeHtml(d.vehicleType)}</td></tr><tr><th>Vehicle No</th><td>${escapeHtml(d.vehicleNumber)}</td></tr></table></section></div>${paymentCard}<div class="pdf-short-terms">${extraTravelTerms().map(escapeHtml).join('<br>')}</div>${driverNotes}<div class="receipt-thanks">For support, contact ${escapeHtml(cfg.phone||'+91 8667737237')}<br>This is a computer-generated driver and vehicle details document.</div>${footerHtml()}</div></section>`;
  }

  function driverInstructions(d){ const list=['Please reach the pickup location on time and contact the customer before reaching.','Please introduce yourself and confirm clearly that you are the assigned driver from Glide Tourism.','Take the odometer reading before leaving the office and share it with the office team.','After drop, return to office and share the final odometer/end KM reading.','Kindly follow the itinerary and route instructions shared by the office.','For any route, customer or vehicle issue during the trip, contact the office immediately at 8667737237.']; if(d.notes) list.push(d.notes); return list; }

  function brandRowHtml(docNo,label){
    const quoteBox=docNo?`<div class="pdf-quote-box"><div class="label">${escapeHtml(label||'Document')}</div><b>${escapeHtml(docNo)}</b><br>Date: ${formatDate(today)}</div>`:'';
    return `<div class="pdf-brand-row"><div class="pdf-brand"><div class="pdf-logo"><img src="${escapeAttr(cfg.logoUrl||'https://www.glidetourism.com/assets/logo.png')}" alt="Glide Tourism G logo"></div><div class="pdf-company"><h1>GLIDE TOURISM</h1><p class="brand-subtitle">Your Trusted Travel Partner</p><p class="brand-details"><span>www.glidetourism.com · MSME: UDYAM-TN-03-0362900 · Phone: +91 8667737237</span><span>Service Areas: Bangalore · Mysore · Coimbatore</span></p></div></div>${quoteBox}</div>`;
  }

  function itineraryPageHtml(days,single){ return `<section class="pdf-page itinerary-page"><div class="pdf-content">${brandRowHtml('','')}<div class="pdf-section-title">Day-wise Itinerary</div><div class="pdf-itinerary-grid ${single?'single':''}">${days.map(dayCardHtml).join('')}</div>${footerHtml()}</div></section>`; }
  function dayCardHtml(day){ const m=String(day.title||'').match(/day\s*(\d+)/i); const dayNo=m?m[1]:'•'; const stay=(day.items||[]).filter(x=>/^stay\s*:/i.test(x)); const items=(day.items||[]).filter(x=>!/^stay\s*:/i.test(x)); return `<article class="pdf-day-card"><div class="pdf-day-badge"><span>Day</span><b>${escapeHtml(dayNo)}</b></div><div class="pdf-day-content"><h3>${escapeHtml(day.title||'Itinerary')}</h3>${items.length?`<ul>${items.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}${stay.map(x=>`<div class="pdf-stay">${escapeHtml(x)}</div>`).join('')}</div></article>`; }
  function finalTermsPageHtml(){ return `<section class="pdf-page terms-page"><div class="pdf-content">${brandRowHtml('','')}<div class="pdf-thank-card"><h2>Thank You</h2><p>Thank you for choosing <strong>Glide Tourism</strong>. We look forward to making your journey comfortable, safe and memorable.</p><p>This quotation is system-generated and requires no signature.</p></div><section class="pdf-terms-card"><h3>Terms & Conditions</h3><ul>${termsList().map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section>${footerHtml()}</div></section>`; }
  function extraTravelTerms(){return ['If vomiting or excessive soiling occurs inside the vehicle, additional cleaning charges may apply depending on the vehicle type and cleaning required.','The order of sightseeing visits may change, and some locations may be skipped due to time constraints, traffic or other unavoidable circumstances.'];}
  function termsList(){ return ['Driver details will be assigned 24 hours prior to journey commencement.','Minimum included kilometres are based on the vehicle and trip days (300 km/day, or Traveller 400 km/day).' ,'Vehicle A/C may be switched off in hill sections, heavy climbs or idle parking as per driver safety judgement.','Payment Policy: advance is required based on booking requirement. After pickup, 50% must be paid towards driver allowance and fuel. Final payment should be completed on the last day. Receipt will be provided after payment.','Please avoid late payments during the trip.','Cancellation charges apply as per company policy.','Any itinerary changes may increase kilometre usage or package costing.','Extra kilometre / additional day will be charged as quoted.','Always use the company payment number: '+selectedPaymentDetails().upi+' (GPay / PhonePe).','Room cancellation, refund, early check-in, late check-out and room category changes are fully subject to the hotel / resort policy.','Government restrictions, weather conditions, traffic delays, road closures or attraction closures may affect sightseeing coverage.'].concat(extraTravelTerms()); }
  function footerHtml(){ return ''; }

  function quoteRefFromParts(monthId,runId){ const mc=String($(monthId).value||'').trim().toUpperCase().replace(/[^A-L]/g,'').charAt(0); const rn=String($(runId).value||'').replace(/\D/g,''); if(!mc) return {ok:false,message:'Enter month code like F.'}; if(!rn) return {ok:false,message:'Enter quote number like 25.'}; return {ok:true,monthCode:mc,runningNo:padNo(Number(rn))}; }
  function getQuoteMeta(running){ if(state.editQuoteNo){ const m=String(state.editQuoteNo).match(/^Q([A-L])\/(\d{2}-\d{2})\/(\d+)/i); if(m) return { quoteNo:state.editQuoteNo, monthCode:m[1].toUpperCase(), fy:m[2], runningNo:padNo(Number(m[3])) }; } const monthCode=state.quoteSequence?.monthCode||monthLetters[today.getMonth()]; const fy=state.quoteSequence?.financialYear||fiscalYear(today); const clean=String(running||'').replace(/\D/g,''); const rn=clean?padNo(Number(clean)):(state.quoteSequence?.nextRunningNo||'--'); const quoteNo=clean?`Q${monthCode}/${fy}/${rn}`:(state.quoteSequence?.nextQuoteNo||`Q${monthCode}/${fy}/${rn}`); return { quoteNo, monthCode, fy, runningNo:rn }; }
  function buildInclusions(p){ const arr=['Cab with driver as per itinerary.','Fuel & driver allowance included.']; if(num(p.checkpostTolls)>0) arr.push('Checkpost & tolls included.'); if(num(p.sightseeingParking)>0) arr.push('Sightseeing parking included.'); if(num(p.permit)>0) arr.push('Permit included.'); if(p.hotels.length) arr.push('Hotel accommodation as mentioned.'); if(p.inclusions.breakfast) arr.push('Breakfast included.'); if(p.inclusions.lunch) arr.push('Lunch included.'); if(p.inclusions.dinner) arr.push('Dinner included.'); if(p.inclusions.campfire) arr.push('Campfire included.'); if(p.inclusions.tickets) arr.push('Entry tickets included.'); (p.inclusions.manual||[]).map(manualInclusionText).forEach(x=>arr.push(x)); return arr; }
  function parseItineraryDays(text){ const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean); const days=[]; let current=null; lines.forEach(line=>{ if(/^day\s*\d+/i.test(line)){ if(current) days.push(current); current={title:line,items:[]}; } else { if(!current) current={title:'Itinerary',items:[]}; current.items.push(line); } }); if(current) days.push(current); return days; }
  function calculateCost(p,days){return (num(p.kmIncluded)*num(p.extraKmCharge))+num(p.dayRent)+num(p.checkpostTolls)+num(p.sightseeingParking)+num(p.permit)+(p.hotels||[]).reduce((a,h)=>a+num(h.cost),0)+(p.manualInclusions||[]).reduce((a,x)=>a+num(x.amount),0);}
  function calcDuration(start,end){ if(!start||!end) return {days:0,nights:0,text:'--'}; const s=new Date(start+'T00:00:00'), e=new Date(end+'T00:00:00'); const diff=Math.round((e-s)/86400000); const days=diff>=0?diff+1:0; const nights=days>0?days-1:0; return {days,nights,text:days?`${days} day${days>1?'s':''}, ${nights} night${nights!==1?'s':''}`:'--'}; }
  function chunk(arr,size){ const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }
  function fiscalYear(date){ const y=date.getFullYear(); const start=date.getMonth()>=3?y:y-1; return String(start).slice(-2)+'-'+String(start+1).slice(-2); }
  function padNo(n){ return n<10?'0'+n:String(n); }
  function formatLongDateTime(d){ return d && !isNaN(d) ? d.toLocaleString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:true}) : '-'; }
  function todayIso(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
  function combineQuoteDateTime(dateText,time){ if(!dateText) return null; let d; if(/^\d{4}-\d{2}-\d{2}$/.test(dateText)){ d=new Date(dateText+'T00:00:00'); } else { const m=String(dateText).match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/); const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11}; d=m?new Date(Number(m[3]),months[m[2]],Number(m[1])):new Date(dateText); } if(isNaN(d)) return null; const parts=String(time||'00:00').split(':').map(Number); d.setHours(parts[0]||0,parts[1]||0,0,0); return d; }
  function invoiceNoFromQuote(q){ const m=String(q||'').match(/^Q([A-L])\/(\d{2})-\d{2}\/(\d+)/i); return m?`INVCG${m[2]}${m[1].toUpperCase()}_${m[3]}`:'INVCG-'+safeQuote(q); }
  function safeQuote(q){ return String(q||'').replace(/\//g,'-'); }
  function buildQuotePrintName(){ const q=getQuoteMeta($('runningNo').value.trim()).quoteNo; return `${safeQuote(q)} ${($('clientName').value||'Client').trim()}`; }
  function buildAdvancePrintName(){ const q=state.advanceQuote; return q?`Advance Receipt ${safeQuote(q.quoteNo)} ${q.clientName||'Client'}`:'Advance_Receipt'; }
  function buildInvoicePrintName(){ const q=state.invoiceQuote; return q?`Final Invoice ${safeQuote(q.quoteNo)} ${q.clientName||'Client'}`:'Final_Invoice'; }
  function buildAssignPrintName(){ const q=state.assignQuote; return q?`Driver and Vehicle Details ${safeQuote(q.quoteNo)} ${q.clientName||'Client'}`:'Driver and Vehicle Details'; }
  function printCurrent(name){ const old=document.title; document.title=name||'Glide Tourism PDF'; setTimeout(()=>{ window.print(); setTimeout(()=>{ document.title=old; },500); },50); }
  function setMsg(id,msg,type){ const el=$(id); el.textContent=msg||''; el.classList.remove('good','bad'); if(type) el.classList.add(type); }
  function routeText(a,b,c){ return [a,b,c].map(x=>String(x||'').trim()).filter(Boolean).join(' → ') || '-'; }
  function num(v){ const n=Number(String(v||'').replace(/,/g,'')); return isNaN(n)?0:n; }
  function formatDate(d){ return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-'); }
  function formatDateInput(v){ if(!v) return '-'; return formatDate(new Date(v+'T00:00:00')); }
  function formatMoney(n){ return Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
  function escapeHtml(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#096;'); }

  document.addEventListener('DOMContentLoaded', init);
})();
