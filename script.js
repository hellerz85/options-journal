const STORAGE_KEY = 'options-journal-trades';
let trades = [];

document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US',{weekday:'long', year:'numeric', month:'long', day:'numeric'});

function loadTrades(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    trades = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Could not read saved trades', e);
    trades = [];
  }
  render();
}

function saveTrades(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }catch(e){
    console.error('Could not save trades', e);
    alert('Your trade was not saved — the browser storage may be full or blocked.');
  }
}

function calcPnl(t){
  if(t.exitPrice === null || t.exitPrice === undefined || t.exitPrice === '') return null;
  const diff = (parseFloat(t.exitPrice) - parseFloat(t.entryPrice));
  const mult = t.side === 'Long' ? 1 : -1;
  return diff * mult * 100 * parseFloat(t.contracts || 1);
}

function fmtMoney(n){
  const sign = n < 0 ? '-' : '+';
  return sign + '$' + Math.abs(n).toFixed(2);
}

function renderSummary(){
  const closed = trades.filter(t => calcPnl(t) !== null);
  const open = trades.filter(t => calcPnl(t) === null);
  const netPnl = closed.reduce((sum,t) => sum + calcPnl(t), 0);
  const wins = closed.filter(t => calcPnl(t) > 0).length;
  const winRate = closed.length ? Math.round((wins/closed.length)*100) : 0;

  const el = document.getElementById('summary');
  el.innerHTML = `
    <div class="stat"><div class="stat-label">Net P&amp;L</div><div class="stat-value ${netPnl>0?'pos':netPnl<0?'neg':'neu'}">${closed.length ? fmtMoney(netPnl) : '—'}</div></div>
    <div class="stat"><div class="stat-label">Win Rate</div><div class="stat-value neu">${closed.length ? winRate+'%' : '—'}</div></div>
    <div class="stat"><div class="stat-label">Open Positions</div><div class="stat-value neu">${open.length}</div></div>
    <div class="stat"><div class="stat-label">Total Trades</div><div class="stat-value neu">${trades.length}</div></div>
  `;
}

function getFiltered(){
  const status = document.getElementById('filterStatus').value;
  const type = document.getElementById('filterType').value;
  const ticker = document.getElementById('filterTicker').value.trim().toUpperCase();

  return trades.filter(t => {
    const pnl = calcPnl(t);
    if(status === 'open' && pnl !== null) return false;
    if(status === 'closed' && pnl === null) return false;
    if(type !== 'all' && t.type !== type) return false;
    if(ticker && !t.ticker.toUpperCase().includes(ticker)) return false;
    return true;
  }).sort((a,b) => (b.entryDate||'').localeCompare(a.entryDate||''));
}

function renderLedger(){
  const container = document.getElementById('ledgerContainer');
  const filtered = getFiltered();

  if(trades.length === 0){
    container.innerHTML = `<div class="empty"><h4>No entries yet</h4>Log your first position to start the ledger.</div>`;
    return;
  }
  if(filtered.length === 0){
    container.innerHTML = `<div class="empty"><h4>No matches</h4>Try adjusting your filters.</div>`;
    return;
  }

  let rows = filtered.map(t => {
    const pnl = calcPnl(t);
    const stampClass = pnl === null ? 'open' : pnl > 0 ? 'win' : 'loss';
    const stampText = pnl === null ? 'OPEN' : pnl > 0 ? 'WIN' : 'LOSS';
    const pnlDisplay = pnl === null ? '—' : `<span class="${pnl>0?'pos':'neg'}">${fmtMoney(pnl)}</span>`;

    return `
      <div class="row" data-id="${t.id}">
        <div class="stamp ${stampClass}">${stampText}</div>
        <div class="ticker-cell">${t.ticker}<span class="sub">${t.type} · ${t.side}</span></div>
        <div>${t.strategy}<span class="sub">Strategy</span></div>
        <div>$${t.strike}<span class="sub">Strike</span></div>
        <div>${t.exp || '—'}<span class="sub">Expiration</span></div>
        <div>${t.contracts}x @ $${parseFloat(t.entryPrice).toFixed(2)}<span class="sub">${t.entryDate || 'Entry'}</span></div>
        <div class="pnl-cell">${pnlDisplay}<span class="sub">${pnl===null ? 'Unrealized' : (t.exitDate||'Closed')}</span></div>
        <div class="row-actions">
          ${pnl === null ? `<button class="icon-btn" data-action="close" data-id="${t.id}">Close</button>` : ''}
          <button class="icon-btn" data-action="delete" data-id="${t.id}">Delete</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="ledger">
      <div class="ledger-head">
        <div></div><div>Ticker</div><div>Strategy</div><div>Strike</div><div>Expiration</div><div>Entry</div><div>P&amp;L</div><div></div>
      </div>
      ${rows}
    </div>`;

  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => deleteTrade(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', () => promptClose(btn.dataset.id));
  });
}

function render(){
  renderSummary();
  renderLedger();
}

function promptClose(id){
  const t = trades.find(x => x.id === id);
  if(!t) return;
  const price = prompt(`Exit price for ${t.ticker} ${t.type} $${t.strike} (per share):`);
  if(price === null || price === '') return;
  const date = prompt('Exit date (YYYY-MM-DD):', new Date().toISOString().slice(0,10));
  t.exitPrice = price;
  t.exitDate = date || '';
  saveTrades();
  render();
}

function deleteTrade(id){
  if(!confirm('Delete this entry? This cannot be undone.')) return;
  trades = trades.filter(t => t.id !== id);
  saveTrades();
  render();
}

function clearForm(){
  ['f_ticker','f_strike','f_exp','f_contracts','f_entryDate','f_entryPrice','f_exitPrice','f_exitDate','f_notes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('f_type').value = 'Call';
  document.getElementById('f_side').value = 'Long';
  document.getElementById('f_strategy').value = 'Single Leg';
}

document.getElementById('toggleForm').addEventListener('click', () => {
  document.getElementById('formPanel').classList.toggle('open');
});
document.getElementById('cancelForm').addEventListener('click', () => {
  document.getElementById('formPanel').classList.remove('open');
  clearForm();
});

document.getElementById('saveTrade').addEventListener('click', () => {
  const ticker = document.getElementById('f_ticker').value.trim().toUpperCase();
  const entryPrice = document.getElementById('f_entryPrice').value.trim();
  const strike = document.getElementById('f_strike').value.trim();
  const contracts = document.getElementById('f_contracts').value.trim() || '1';

  if(!ticker || !entryPrice || !strike){
    alert('Ticker, strike, and entry price are required.');
    return;
  }

  const trade = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
    ticker,
    type: document.getElementById('f_type').value,
    side: document.getElementById('f_side').value,
    strategy: document.getElementById('f_strategy').value,
    strike,
    exp: document.getElementById('f_exp').value.trim(),
    contracts,
    entryDate: document.getElementById('f_entryDate').value.trim(),
    entryPrice,
    exitPrice: document.getElementById('f_exitPrice').value.trim(),
    exitDate: document.getElementById('f_exitDate').value.trim(),
    notes: document.getElementById('f_notes').value.trim()
  };

  trades.push(trade);
  saveTrades();
  clearForm();
  document.getElementById('formPanel').classList.remove('open');
  render();
});

['filterStatus','filterType'].forEach(id => document.getElementById(id).addEventListener('change', renderLedger));
document.getElementById('filterTicker').addEventListener('input', renderLedger);

loadTrades();
