const app = {
    data: { stores: [], promoters: [] },
    filters: { freq: 'all', classification: 'all', search: '', sort: 'default', status: 'all' },
    rankingFreq: 'MENSAL',
    charts: {},

    init() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.innerText = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
        }

        const saved = localStorage.getItem('merch_v5_real');
        if (saved) {
            try {
                this.data = JSON.parse(saved);
                this.migrateData();
            } catch(e) {
                console.error("Erro ao carregar dados", e);
                Swal.fire('Erro', 'Dados corrompidos detectados.', 'error');
            }
        } else {
            this.loadDemoData();
        }

        this.updateUI();
    },

    migrateData() {
        if (!this.data.stores) this.data.stores = [];
        this.data.stores.forEach(s => {
            if (!s.classification) s.classification = 'PENDENTE';
            if (!s.canal) s.canal = 'NMR';
            if (s.score === undefined) s.score = 0;
            if (s.promoter_support === undefined) s.promoter_support = '';
            
            s.checks = s.checks.map(c => {
                if (typeof c === 'boolean') {
                    return { done: c, date: c ? new Date().toLocaleDateString('pt-BR') : null };
                }
                return c;
            });
        });
        this.save();
    },

    loadDemoData() {
        this.data.promoters = ["ALEXANDRE", "MARIA", "JOAO"];
        this.data.stores = [
            { id: 1, name: "LOJA EXEMPLO 1", promoter: "ALEXANDRE", promoter_support: "MARIA", freq: "MENSAL", canal: "NMR", checks: [{done:false, date:null}], classification: "PENDENTE", score: 0 }
        ];
    },

    save() {
        localStorage.setItem('merch_v5_real', JSON.stringify(this.data));
        this.updateDashboard(); 
    },

    switchView(viewName) {
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('animate-enter');
        });
        const view = document.getElementById(`view-${viewName}`);
        if (view) {
            view.classList.remove('hidden');
            void view.offsetWidth; 
            view.classList.add('animate-enter');
        }

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('bg-brand-500/10', 'text-brand-400', 'border-brand-500/20');
            btn.classList.add('text-slate-400', 'border-transparent');
        });
        const active = document.getElementById(`nav-${viewName}`);
        if(active) active.classList.add('bg-brand-500/10', 'text-brand-400', 'border-brand-500/20');
        
        if (viewName === 'stores') this.renderStores();
        if (viewName === 'best') this.renderBestStores();
        if (viewName === 'delays') {
            this.renderDelaysTable();
            this.renderDelaysDetailChart(); 
        }
    },

    updateUI() {
        this.renderStoreOptions();
        this.renderStores();
        this.renderBestStores();
        this.renderPending();
        this.renderPromoters();
        this.updateDashboard();
    },

    renderStoreOptions() {
        const list = this.data.promoters.sort().map(p => `<option value="${p}">${p}</option>`).join('');
        const promoterSelect = document.getElementById('input-store-promoter');
        const supportSelect = document.getElementById('input-store-promoter-apoio');
        if (promoterSelect) promoterSelect.innerHTML = '<option value="">Selecione o Titular...</option>' + list;
        if (supportSelect) supportSelect.innerHTML = '<option value="">Nenhum (Opcional)</option>' + list;
    },

    parseDate(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    },

    renderDelaysTable() {
        const searchInput = document.getElementById('delaySearchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const tbody = document.getElementById('delays-table-body');
        if (!tbody) return;

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); 

        const delays = this.data.stores.map(s => {
            let lastDate = null;
            s.checks.forEach(c => {
                if(c.done && c.date) {
                    const d = this.parseDate(c.date);
                    if(!lastDate || d > lastDate) lastDate = d;
                }
            });

            let daysDiff = 0;
            if(lastDate) {
                const diffTime = Math.abs(today - lastDate);
                daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            } else {
                const diffTime = Math.abs(today - startOfMonth);
                daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            
            const doneCount = s.checks.filter(c => c.done).length;
            if(doneCount === s.checks.length) daysDiff = 0; 

            return { 
                ...s,
                days: daysDiff,
                lastDateFormatted: lastDate ? lastDate.toLocaleDateString('pt-BR') : 'Nunca visitada'
            };
        })
        .filter(item => item.days > 0 && (item.name.toLowerCase().includes(search) || item.promoter.toLowerCase().includes(search)))
        .sort((a,b) => b.days - a.days);

        if (delays.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">Nenhum atraso encontrado ou sem correspondência.</td></tr>`;
            return;
        }

        tbody.innerHTML = delays.map(d => {
            const isCritical = d.days > 15;
            const isWarning = d.days > 7;
            let badgeClass = 'bg-slate-800 text-slate-400';
            let icon = '';

            if (isCritical) {
                badgeClass = 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse';
                icon = '<i class="fas fa-exclamation-triangle mr-1"></i>';
            } else if (isWarning) {
                badgeClass = 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
                icon = '<i class="fas fa-clock mr-1"></i>';
            }

            return `
            <tr class="hover:bg-white/5 transition-colors group">
                <td class="p-5">
                    <div class="font-bold text-white text-sm">${d.name}</div>
                    <div class="flex gap-2 mt-1">
                        <span class="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-dark-900 text-slate-400">${d.freq}</span>
                        <span class="text-[9px] px-1.5 py-0.5 rounded border border-white/10 bg-dark-900 text-slate-400 flex items-center gap-1"><i class="fas fa-star text-yellow-500"></i> ${d.score}</span>
                    </div>
                </td>
                <td class="p-5">
                    <div class="flex flex-col gap-1">
                        <div class="text-xs font-bold text-slate-200 flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-[9px] text-white">${d.promoter.charAt(0)}</div>
                            ${d.promoter}
                        </div>
                        ${d.promoter_support ? `
                        <div class="text-xs text-slate-400 flex items-center gap-2">
                            <div class="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[9px] text-white">${d.promoter_support.charAt(0)}</div>
                            ${d.promoter_support} <span class="text-[9px] opacity-50">(Apoio)</span>
                        </div>` : ''}
                    </div>
                </td>
                <td class="p-5">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${badgeClass}">
                        ${icon} ${d.days} dias sem leitura
                    </span>
                </td>
                <td class="p-5 text-xs text-slate-400">
                    Última Leitura: <span class="text-white font-mono">${d.lastDateFormatted}</span>
                </td>
                <td class="p-5 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="app.copyCobrarMsg('${d.promoter}', '${d.name}', ${d.days})" class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center" title="Copiar cobrança WhatsApp">
                            <i class="fab fa-whatsapp"></i>
                        </button>
                        <button onclick="app.editStore(${d.id})" class="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white transition-all flex items-center justify-center">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    },

    renderBestStores() {
        const grid = document.getElementById('best-stores-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const searchInput = document.getElementById('bestSearchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';

        let filtered = this.data.stores.filter(s => {
            const isBest = s.classification === 'BOA' || s.classification === 'PERFEITA';
            const matchSearch = s.name.toLowerCase().includes(search) || 
                                s.promoter.toLowerCase().includes(search);
            return isBest && matchSearch;
        });

        filtered.sort((a,b) => (b.score||0) - (a.score||0));

        this.renderBestChannelsChart(filtered);
        this.renderChannelComparisonChart(); 

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-20 text-center text-slate-500 bg-white/5 rounded-3xl border border-dashed border-white/10">Nenhuma loja de elite encontrada. Continue o bom trabalho!</div>`;
            return;
        }

        filtered.forEach(store => {
            const doneCount = store.checks.filter(c => c.done).length;
            const totalCount = store.checks.length;
            const percent = Math.round((doneCount / totalCount) * 100);
            
            const statusColors = {
                'BOA': 'bg-blue-500/20 text-blue-400 border border-blue-500/20',
                'PERFEITA': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
            };

            const card = document.createElement('div');
            const isPerfect = store.classification === 'PERFEITA';
            const borderGlow = isPerfect ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-blue-500/40 shadow-blue-500/10';

            card.className = `glass-panel p-6 rounded-3xl flex flex-col justify-between group relative overflow-hidden transition-all border-2 ${borderGlow} hover:scale-[1.02]`;

            card.innerHTML = `
                <div class="absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${isPerfect ? 'from-emerald-500/20' : 'from-blue-500/20'} to-transparent blur-2xl opacity-50"></div>
                <div>
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex flex-col gap-1">
                            <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusColors[store.classification]}">
                                <i class="fas ${isPerfect ? 'fa-crown' : 'fa-star'} mr-1"></i> ${store.classification}
                            </span>
                            <span class="text-[9px] font-bold text-slate-500 uppercase ml-1 tracking-widest">${store.canal || 'NMR'}</span>
                        </div>
                        <div class="text-xl font-black text-white/90">
                            ${store.score} <span class="text-xs text-slate-500 uppercase">pts</span>
                        </div>
                    </div>
                    <h3 class="text-white font-bold text-xl leading-tight mb-2 truncate">${store.name}</h3>
                    <div class="flex items-center gap-3 text-sm text-slate-400 mb-4">
                        <div class="w-8 h-8 rounded-full bg-dark-950 flex items-center justify-center text-brand-400 border border-white/5">
                            <i class="fas fa-user-tie text-xs"></i>
                        </div>
                        <div>
                            <p class="text-[10px] uppercase font-bold text-slate-500 leading-none mb-1">Responsável</p>
                            <p class="text-white font-medium">${store.promoter}</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between items-end">
                        <span class="text-[10px] font-bold text-slate-500 uppercase">Execução Mensal</span>
                        <span class="text-xs font-bold text-white">${percent}%</span>
                    </div>
                    <div class="w-full h-2 bg-dark-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div class="h-full rounded-full transition-all duration-1000 ${isPerfect ? 'bg-emerald-500' : 'bg-blue-500'}" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    renderBestChannelsChart(bestStores) {
        const canvas = document.getElementById('chartBestChannels');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(this.charts.bestChannels) this.charts.bestChannels.destroy();

        const channelCounts = { 'NMR': 0, 'DPP': 0, 'C&C': 0, 'PERF': 0 };
        bestStores.forEach(s => {
            if(channelCounts[s.canal] !== undefined) channelCounts[s.canal]++;
        });

        this.charts.bestChannels = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(channelCounts),
                datasets: [{
                    label: 'Lojas Elite',
                    data: Object.values(channelCounts),
                    backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'],
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#fff',
                        anchor: 'end',
                        align: 'top',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', stepSize: 1 } }
                }
            },
            plugins: [ChartDataLabels]
        });
    },

    renderChannelComparisonChart() {
        const canvas = document.getElementById('chartChannelComparison');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if(this.charts.channelComparison) this.charts.channelComparison.destroy();

        const channels = ['NMR', 'DPP', 'C&C', 'PERF'];
        const eliteData = [];
        const otherData = [];

        channels.forEach(ch => {
            const totalChannel = this.data.stores.filter(s => s.canal === ch).length;
            const eliteChannel = this.data.stores.filter(s => s.canal === ch && (s.classification === 'BOA' || s.classification === 'PERFEITA')).length;
            const others = totalChannel - eliteChannel;
            
            eliteData.push(eliteChannel);
            otherData.push(others);
        });

        this.charts.channelComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels,
                datasets: [
                    {
                        label: 'Elite (Boas/Perf)',
                        data: eliteData,
                        backgroundColor: '#10b981',
                        borderRadius: 6
                    },
                    {
                        label: 'Outras (Reg/Pend)',
                        data: otherData,
                        backgroundColor: '#334155',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 10 } } }
                }
            }
        });
    },

    updateDashboard() {
        const totalStores = this.data.stores.length;
        const totalDone = this.data.stores.reduce((acc, s) => acc + s.checks.filter(c => c.done).length, 0);
        const totalChecks = this.data.stores.reduce((acc, s) => acc + s.checks.length, 0);
        const pctGlobal = totalChecks > 0 ? Math.round((totalDone / totalChecks) * 100) : 0;

        const totalPerfect = this.data.stores.filter(s => s.classification === 'PERFEITA').length;
        const totalGood = this.data.stores.filter(s => s.classification === 'BOA').length;
        const eliteTotal = totalPerfect + totalGood;

        const elTotal = document.getElementById('total-stores');
        const elPct = document.getElementById('pct-global');
        const elElite = document.getElementById('total-elite');
        const elProgress = document.getElementById('global-progress-bar');

        if (elTotal) elTotal.innerText = totalStores;
        if (elPct) elPct.innerText = pctGlobal + '%';
        if (elElite) elElite.innerText = eliteTotal;
        if (elProgress) elProgress.style.width = pctGlobal + '%';

        this.renderHistoryChart();
        this.renderClassificationChart();
        this.renderTopStarsChart();
        this.renderTopSilverChart();
        this.renderAttentionChart();
        this.renderDelaysSummaryChart();
        this.renderTopPromoters();
    },

    renderDelaysSummaryChart() {
        const canvas = document.getElementById('chartDelaysSummary');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.delaysSummary) this.charts.delaysSummary.destroy();

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        let critical = 0, warning = 0, normal = 0;

        this.data.stores.forEach(s => {
            let lastDate = null;
            s.checks.forEach(c => {
                if(c.done && c.date) {
                    const d = this.parseDate(c.date);
                    if(!lastDate || d > lastDate) lastDate = d;
                }
            });

            let daysDiff = 0;
            if(lastDate) {
                const diffTime = Math.abs(today - lastDate);
                daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            } else {
                const diffTime = Math.abs(today - startOfMonth);
                daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            
            const doneCount = s.checks.filter(c => c.done).length;
            if(doneCount === s.checks.length) daysDiff = 0;

            if (daysDiff > 15) critical++;
            else if (daysDiff > 7) warning++;
            else if (daysDiff > 0) normal++;
        });

        this.charts.delaysSummary = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Crítico (>15d)', 'Alerta (>7d)', 'Recente'],
                datasets: [{
                    data: [critical, warning, normal],
                    backgroundColor: ['#ef4444', '#f97316', '#334155'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });
    },

    renderDelaysDetailChart() {
        const canvas = document.getElementById('chartDelaysDetail');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.delaysDetail) this.charts.delaysDetail.destroy();

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const storeDelays = this.data.stores.map(s => {
            let lastDate = null;
            s.checks.forEach(c => {
                if(c.done && c.date) {
                    const d = this.parseDate(c.date);
                    if(!lastDate || d > lastDate) lastDate = d;
                }
            });
            let daysDiff = 0;
            if(lastDate) daysDiff = Math.ceil(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24));
            else daysDiff = Math.ceil(Math.abs(today - startOfMonth) / (1000 * 60 * 60 * 24));
            
            const doneCount = s.checks.filter(c => c.done).length;
            if(doneCount === s.checks.length) daysDiff = 0;

            return { name: s.name, days: daysDiff };
        })
        .filter(d => d.days > 0)
        .sort((a,b) => b.days - a.days)
        .slice(0, 10);

        this.charts.delaysDetail = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: storeDelays.map(d => d.name.substring(0,15) + '...'),
                datasets: [{
                    label: 'Dias sem Leitura',
                    data: storeDelays.map(d => d.days),
                    backgroundColor: (ctx) => ctx.raw > 15 ? '#ef4444' : '#f97316',
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#fff',
                        anchor: 'end',
                        align: 'end',
                        formatter: (val) => val + ' dias',
                        font: { weight: 'bold', size: 10 }
                    }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 10 } } }
                }
            },
            plugins: [ChartDataLabels]
        });
    },

    renderStores() {
        const grid = document.getElementById('stores-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        const searchInput = document.getElementById('searchInput');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        const status = document.getElementById('filter-status')?.value || 'all';
        const freq = document.getElementById('filter-freq')?.value || 'all';
        const sort = document.getElementById('sort-order')?.value || 'default';

        let filtered = this.data.stores.filter(s => {
            const matchSearch = s.name.toLowerCase().includes(search) || 
                                s.promoter.toLowerCase().includes(search);
            const matchFreq = freq === 'all' || s.freq === freq;
            
            const done = s.checks.filter(c => c.done).length;
            const total = s.checks.length;
            let matchStatus = true;
            if (status === 'SEM_LEITURA') matchStatus = done === 0;
            else if (status === 'PENDENTE') matchStatus = done > 0 && done < total;
            else if (status === 'CONCLUIDO') matchStatus = done === total;

            return matchSearch && matchFreq && matchStatus;
        });

        if (sort === 'score-asc') filtered.sort((a,b) => (a.score||0) - (b.score||0));
        else if (sort === 'score-desc') filtered.sort((a,b) => (b.score||0) - (a.score||0));
        else if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));

        filtered.forEach(s => {
            const done = s.checks.filter(c => c.done).length;
            const total = s.checks.length;
            const pct = Math.round((done/total)*100);
            
            const card = document.createElement('div');
            card.className = 'glass-panel p-6 rounded-3xl card-hover relative group overflow-hidden';
            
            let statusBadge = '';
            if(done === 0) statusBadge = '<span class="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold">SEM LEITURA</span>';
            else if(done < total) statusBadge = '<span class="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold">PENDENTE</span>';
            else statusBadge = '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold">CONCLUÍDO</span>';

            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            ${statusBadge}
                            <span class="bg-white/5 text-slate-400 px-2 py-1 rounded text-[10px] font-bold">${s.freq}</span>
                        </div>
                        <h3 class="text-white font-bold text-lg leading-tight group-hover:text-brand-400 transition-colors">${s.name}</h3>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-xs font-black text-white">${s.score} <span class="text-[9px] text-slate-500">PTS</span></span>
                        <span class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">${s.canal || 'NMR'}</span>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/10">
                            <i class="fas fa-user-tie"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[9px] uppercase font-bold text-slate-500 leading-none mb-1">Responsável</p>
                            <p class="text-white text-sm font-medium truncate">${s.promoter}</p>
                            ${s.promoter_support ? `<p class="text-[10px] text-slate-500 truncate">Apoio: ${s.promoter_support}</p>` : ''}
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] font-bold text-slate-500 uppercase">Progresso</span>
                            <span class="text-xs font-bold text-white">${done}/${total} (${pct}%)</span>
                        </div>
                        <div class="w-full h-2 bg-dark-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                            <div class="h-full rounded-full transition-all duration-1000 ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'}" style="width: ${pct}%"></div>
                        </div>
                    </div>

                    <div class="flex gap-2 pt-2">
                        <button onclick="app.editStore(${s.id})" class="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl text-xs font-bold transition-all border border-white/5">
                            <i class="fas fa-edit mr-1"></i> Gerenciar
                        </button>
                        <button onclick="app.toggleCheck(${s.id})" class="px-4 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    toggleCheck(id) {
        const s = this.data.stores.find(x => x.id === id);
        if(!s) return;
        const nextIdx = s.checks.findIndex(c => !c.done);
        if(nextIdx !== -1) {
            s.checks[nextIdx] = { done: true, date: new Date().toLocaleDateString('pt-BR') };
            this.save();
            this.updateUI();
            this.playSuccessSound();
        } else {
            Swal.fire('Concluído', 'Todas as leituras deste PDV já foram realizadas.', 'info');
        }
    },

    renderPending() {
        const tbody = document.getElementById('pending-table-body');
        if (!tbody) return;

        const pending = this.data.stores.filter(s => s.checks.some(c => !c.done));
        const badge = document.getElementById('badge-pending-sidebar');
        if(badge) {
            if(pending.length > 0) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        if(pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-emerald-400 font-bold"><i class="fas fa-check-circle mr-2"></i> Tudo em dia!</td></tr>`;
            return;
        }

        tbody.innerHTML = pending.slice(0, 10).map(s => {
            const done = s.checks.filter(c => c.done).length;
            const total = s.checks.length;
            let team = s.promoter;
            if(s.promoter_support) team += ` <span class="text-slate-500 text-[10px]">+ ${s.promoter_support}</span>`;

            return `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="p-5 font-medium text-white">${s.name}</td>
                <td class="p-5 text-slate-400 text-xs">${team}</td>
                <td class="p-5"><span class="bg-amber-500/10 text-amber-500 px-2 py-1 rounded text-[10px] font-bold border border-amber-500/20">PENDENTE (${done}/${total})</span></td>
                <td class="p-5"><button onclick="app.editStore(${s.id})" class="text-brand-400 hover:text-white font-bold text-xs">Resolver <i class="fas fa-arrow-right ml-1"></i></button></td>
            </tr>
            `;
        }).join('');
    },

    renderPromoters() {
        const tbody = document.getElementById('promoters-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.data.promoters.sort().map(p => {
            const pStores = this.data.stores.filter(s => s.promoter === p);
            const pSupport = this.data.stores.filter(s => s.promoter_support === p);
            
            let total = 0, done = 0;
            pStores.forEach(s => { total += s.checks.length; done += s.checks.filter(c => c.done).length; });
            const pct = total > 0 ? Math.round((done/total)*100) : 0;
            
            return `
            <tr class="hover:bg-white/5 transition-colors group cursor-pointer" onclick="app.showPromoterDetails('${p}')">
                <td class="p-5 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        ${p.charAt(0)}
                    </div>
                    <div>
                        <div class="font-medium text-slate-200 group-hover:text-white transition-colors">${p}</div>
                        ${pSupport.length > 0 ? `<div class="text-[9px] text-slate-500">Apoio em ${pSupport.length} lojas</div>` : ''}
                    </div>
                </td>
                <td class="p-5">
                    <div class="flex items-center gap-2">
                        <div class="w-20 h-1.5 bg-dark-950 rounded-full overflow-hidden">
                            <div class="h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'}" style="width: ${pct}%"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-400">${pct}%</span>
                    </div>
                </td>
                <td class="p-5 text-slate-400 text-xs font-mono">${pStores.length} PDVs</td>
                <td class="p-5 text-right">
                    <button onclick="event.stopPropagation(); app.deletePromoter('${p}')" class="text-slate-600 hover:text-red-400 transition-colors"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    },

    showPromoterDetails(name) {
        const pStores = this.data.stores.filter(s => s.promoter === name || s.promoter_support === name);
        const nameEl = document.getElementById('detail-promoter-name');
        const statsEl = document.getElementById('detail-promoter-stats');
        if (nameEl) nameEl.innerText = name;
        if (statsEl) statsEl.innerText = `${pStores.length} Lojas (Titular + Apoio)`;
        
        const list = document.getElementById('detail-promoter-list');
        if (!list) return;

        list.innerHTML = pStores.map(s => {
            const done = s.checks.filter(c => c.done).length;
            const total = s.checks.length;
            const pct = Math.round((done/total)*100);
            const isSupport = s.promoter_support === name;
            
            return `
            <tr>
                <td class="p-4 text-white text-sm font-medium">${s.name}</td>
                <td class="p-4">
                    <span class="text-[10px] px-2 py-1 rounded border ${isSupport ? 'bg-purple-500/20 text-purple-300 border-purple-500/20' : 'bg-brand-500/20 text-brand-300 border-brand-500/20'}">
                        ${isSupport ? 'APOIO' : 'TITULAR'}
                    </span>
                </td>
                <td class="p-4"><span class="text-[10px] bg-slate-800 px-2 py-1 rounded border border-white/10">${s.freq}</span></td>
                <td class="p-4 text-right">
                    <span class="font-bold ${pct === 100 ? 'text-emerald-400' : 'text-slate-400'} text-xs">${done}/${total}</span>
                </td>
                <td class="p-4 text-right">
                    <button onclick="app.deleteStore(${s.id}, '${name}')" class="text-slate-500 hover:text-red-400 transition-colors p-2" title="Excluir Loja">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');

        const modal = document.getElementById('modal-promoter-details');
        if (modal) modal.classList.remove('hidden');
    },

    deleteStore(id, currentPromoterName = null) {
        const store = this.data.stores.find(s => s.id === id);
        if(!store) return;

        Swal.fire({
            title: 'Excluir Loja?',
            text: `Deseja remover o PDV "${store.name}" do sistema?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            background: '#0f172a', color: '#fff',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        }).then(res => {
            if(res.isConfirmed) {
                this.data.stores = this.data.stores.filter(s => s.id !== id);
                this.save();
                this.updateUI();
                
                if(currentPromoterName) {
                    const stillExists = this.data.promoters.includes(currentPromoterName);
                    if(stillExists) {
                        this.showPromoterDetails(currentPromoterName);
                    } else {
                        this.closeModal('modal-promoter-details');
                    }
                }

                Swal.fire({
                    toast: true, position: 'top-end', icon: 'success', 
                    title: 'Loja excluída', showConfirmButton: false, timer: 2000,
                    background: '#1e293b', color: '#fff'
                });
            }
        });
    },

    openStoreModal() {
        const idEl = document.getElementById('edit-store-id');
        if (idEl) idEl.value = '';
        const nameEl = document.getElementById('input-store-name');
        if (nameEl) nameEl.value = '';
        const promoterEl = document.getElementById('input-store-promoter');
        if (promoterEl) promoterEl.value = '';
        const supportEl = document.getElementById('input-store-promoter-apoio');
        if (supportEl) supportEl.value = ''; 
        const canalEl = document.getElementById('input-store-canal');
        if (canalEl) canalEl.value = 'NMR'; 
        const freqEl = document.getElementById('input-store-freq');
        if (freqEl) freqEl.value = 'MENSAL';
        const classificationEl = document.getElementById('input-store-classification');
        if (classificationEl) classificationEl.value = 'PENDENTE';
        const scoreEl = document.getElementById('input-store-score');
        if (scoreEl) scoreEl.value = 0;
        const scoreRangeEl = document.getElementById('input-store-score-range');
        if (scoreRangeEl) scoreRangeEl.value = 0;
        
        this.renderStoreOptions();
        const modal = document.getElementById('modal-store');
        if (modal) modal.classList.remove('hidden');
    },

    editStore(id) {
        const s = this.data.stores.find(x => x.id === id);
        if(s) {
            const idEl = document.getElementById('edit-store-id');
            if (idEl) idEl.value = s.id;
            const nameEl = document.getElementById('input-store-name');
            if (nameEl) nameEl.value = s.name;
            const promoterEl = document.getElementById('input-store-promoter');
            if (promoterEl) promoterEl.value = s.promoter;
            const supportEl = document.getElementById('input-store-promoter-apoio');
            if (supportEl) supportEl.value = s.promoter_support || ''; 
            const canalEl = document.getElementById('input-store-canal');
            if (canalEl) canalEl.value = s.canal || 'NMR';
            const freqEl = document.getElementById('input-store-freq');
            if (freqEl) freqEl.value = s.freq;
            const classificationEl = document.getElementById('input-store-classification');
            if (classificationEl) classificationEl.value = s.classification || 'PENDENTE';
            const scoreEl = document.getElementById('input-store-score');
            if (scoreEl) scoreEl.value = s.score || 0;
            const scoreRangeEl = document.getElementById('input-store-score-range');
            if (scoreRangeEl) scoreRangeEl.value = s.score || 0;

            const modal = document.getElementById('modal-store');
            if (modal) modal.classList.remove('hidden');
        }
    },

    saveStore(e) {
        e.preventDefault();
        const id = document.getElementById('edit-store-id').value;
        const name = document.getElementById('input-store-name').value.toUpperCase();
        const promoter = document.getElementById('input-store-promoter').value;
        const support = document.getElementById('input-store-promoter-apoio').value; 
        const canal = document.getElementById('input-store-canal').value; 
        const freq = document.getElementById('input-store-freq').value;
        const classification = document.getElementById('input-store-classification').value;
        const score = parseInt(document.getElementById('input-store-score').value);

        if(promoter && support && promoter === support) {
            Swal.fire('Erro', 'O promotor Titular e o de Apoio não podem ser a mesma pessoa.', 'error');
            return;
        }

        const freqMap = { 'MENSAL': 1, 'QUINZENAL': 2, 'SEMANAL': 4, 'EXTRA': 10 };
        const newTotal = freqMap[freq];

        if(id) {
            const s = this.data.stores.find(x => x.id == id);
            if(s) {
                s.name = name;
                s.promoter = promoter;
                s.promoter_support = support; 
                s.canal = canal; 
                s.classification = classification;
                s.score = score;
                if(s.freq !== freq) {
                    s.freq = freq;
                    s.checks = Array(newTotal).fill().map(() => ({done: false, date: null}));
                }
            }
        } else {
            this.data.stores.push({
                id: Date.now(),
                name: name,
                promoter: promoter,
                promoter_support: support, 
                canal: canal, 
                freq: freq,
                classification: classification,
                score: score,
                checks: Array(newTotal).fill().map(() => ({done: false, date: null}))
            });
        }

        this.save();
        this.closeModal('modal-store');
        this.switchView('stores');
        Swal.fire({
            toast: true, position: 'top-end', icon: 'success', 
            title: 'Salvo com sucesso', showConfirmButton: false, timer: 2000,
            background: '#1e293b', color: '#fff'
        });
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    },

    addPromoter() {
        Swal.fire({
            title: 'Novo Promotor',
            input: 'text',
            inputPlaceholder: 'Nome Completo',
            background: '#0f172a', color: '#fff',
            showCancelButton: true,
            confirmButtonColor: '#6366f1'
        }).then(res => {
            if(res.value) {
                this.data.promoters.push(res.value.toUpperCase());
                this.save();
                this.updateUI();
            }
        });
    },

    deletePromoter(name) {
        const hasStores = this.data.stores.some(s => s.promoter === name || s.promoter_support === name);
        if(hasStores) {
            Swal.fire('Atenção', `O promotor ${name} está vinculado a lojas (como titular ou apoio).`, 'warning');
            return;
        }
        Swal.fire({
            title: 'Excluir?',
            text: name,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            background: '#0f172a', color: '#fff'
        }).then(res => {
            if(res.isConfirmed) {
                this.data.promoters = this.data.promoters.filter(p => p !== name);
                this.save();
                this.updateUI();
            }
        });
    },

    resetMonth() {
        Swal.fire({
            title: 'Novo Ciclo',
            text: "Isso zerará TODAS as leituras do mês. Confirmar?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            background: '#0f172a', color: '#fff'
        }).then(res => {
            if(res.isConfirmed) {
                this.data.stores.forEach(s => {
                    s.checks.forEach(c => { c.done = false; c.date = null; });
                });
                this.save();
                this.updateUI();
                Swal.fire('Pronto', 'Ciclo reiniciado com sucesso.', 'success');
            }
        });
    },

    downloadBackup() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "backup_gestor_pro_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    uploadBackup(input) {
        const file = input.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                if(json.stores && json.promoters) {
                    this.data = json;
                    this.save();
                    this.updateUI();
                    Swal.fire('Sucesso', 'Dados restaurados com sucesso!', 'success');
                } else {
                    throw new Error("Formato inválido");
                }
            } catch(err) {
                Swal.fire('Erro', 'Arquivo de backup inválido.', 'error');
            }
        };
        reader.readAsText(file);
        input.value = ''; 
    },

    exportExcel() {
        const data = this.data.stores.map(s => {
            const done = s.checks.filter(c => c.done).length;
            const total = s.checks.length;
            const dates = s.checks.filter(c => c.done && c.date).map(c => c.date).join(', ');
            
            let progress = 0;
            if (total > 0) {
                progress = Math.round((done / total) * 100);
            }

            return {
                "ID": s.id,
                "Loja": s.name,
                "Canal": s.canal || 'NMR',
                "Titular": s.promoter,
                "Apoio": s.promoter_support || '-',
                "Frequência": s.freq,
                "Classificação": s.classification,
                "Pontuação": s.score,
                "Realizado": done,
                "Meta": total,
                "Datas": dates,
                "Progresso": `${progress}%`
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Geral");
        XLSX.writeFile(wb, "Relatorio_Gestor_Pro_Avancado.xlsx");
    },

    renderTopStarsChart() {
        const canvas = document.getElementById('chartTopStars');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.topStars) this.charts.topStars.destroy();

        const topStores = [...this.data.stores]
            .sort((a,b) => (b.score||0) - (a.score||0))
            .slice(0, 10);

        this.charts.topStars = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topStores.map(s => s.name.substring(0,25) + (s.name.length>25 ? '...' : '')),
                datasets: [{
                    label: 'Pontuação (Estrelas)',
                    data: topStores.map(s => s.score || 0),
                    backgroundColor: '#fbbf24', 
                    borderRadius: 8,
                    barThickness: 35, 
                    borderWidth: 1,
                    borderColor: '#f59e0b'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#000', 
                        anchor: 'end',
                        align: 'start', 
                        offset: 10,
                        formatter: (val) => val + ' ★',
                        font: { weight: 'bold', size: 12 }
                    }
                },
                scales: {
                    x: { max: 100, grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { color: '#fff', font: { size: 12, weight: '600' } } }
                }
            },
            plugins: [ChartDataLabels]
        });
    },

    renderTopSilverChart() {
        const canvas = document.getElementById('chartTopSilver');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.topSilver) this.charts.topSilver.destroy();

        const silverStores = this.data.stores
            .filter(s => s.classification === 'BOA')
            .sort((a,b) => (b.score||0) - (a.score||0))
            .slice(0, 10);

        this.charts.topSilver = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: silverStores.map(s => s.name.substring(0,18) + (s.name.length>18 ? '...' : '')),
                datasets: [{
                    data: silverStores.map(s => s.score || 0),
                    backgroundColor: '#94a3b8', 
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#fff',
                        anchor: 'end',
                        align: 'end',
                        font: { size: 10, weight: 'bold' }
                    }
                },
                scales: {
                    x: { max: 100, grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { size: 10 } } }
                }
            },
            plugins: [ChartDataLabels]
        });
    },

    renderAttentionChart() {
        const canvas = document.getElementById('chartAttention');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.attention) this.charts.attention.destroy();

        const attentionStores = this.data.stores
            .filter(s => s.classification === 'REGULAR' || s.classification === 'PENDENTE')
            .sort((a,b) => (b.score||0) - (a.score||0)) 
            .slice(0, 15);

        this.charts.attention = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: attentionStores.map(s => s.name.substring(0,18) + (s.name.length>18 ? '...' : '')),
                datasets: [{
                    data: attentionStores.map(s => s.score || 0),
                    backgroundColor: '#f97316', 
                    borderRadius: 6,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    datalabels: {
                        color: '#fff',
                        anchor: 'end',
                        align: 'end',
                        font: { size: 10 }
                    }
                },
                scales: {
                    x: { max: 100, grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { color: '#cbd5e1', font: { size: 10 } } }
                }
            },
            plugins: [ChartDataLabels]
        });
    },

    renderHistoryChart() {
        const canvas = document.getElementById('chartHistory');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.history) this.charts.history.destroy();

        const dateMap = {};
        this.data.stores.forEach(s => {
            s.checks.forEach(c => {
                if(c.done && c.date) {
                    const parts = c.date.split('/');
                    if(parts.length === 3) {
                        const key = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                        dateMap[key] = (dateMap[key] || 0) + 1;
                    }
                }
            });
        });
        const sortedKeys = Object.keys(dateMap).sort();
        const labels = sortedKeys.map(k => {
            const [y, m, d] = k.split('-');
            return `${d}/${m}`;
        });
        const values = sortedKeys.map(k => dateMap[k]);

        this.charts.history = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Leituras Diárias',
                    data: values,
                    borderColor: '#818cf8',
                    backgroundColor: 'rgba(129, 140, 248, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    renderClassificationChart() {
        const canvas = document.getElementById('chartClassification');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (this.charts.classification) this.charts.classification.destroy();

        const counts = { 'PERFEITA': 0, 'BOA': 0, 'REGULAR': 0, 'PENDENTE': 0 };
        this.data.stores.forEach(s => {
            const cls = s.classification || 'PENDENTE';
            if (counts[cls] !== undefined) counts[cls]++;
        });

        this.charts.classification = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#10b981', '#3b82f6', '#f97316', '#334155'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '75%'
            }
        });
    },

    setRankingFilter(freq) {
        this.rankingFreq = freq;
        ['MENSAL','QUINZENAL','SEMANAL'].forEach(f => {
            const btn = document.getElementById(`rank-btn-${f}`);
            if(btn) {
                if(f === freq) {
                    btn.className = 'px-4 py-1.5 rounded-md text-xs font-bold transition-all bg-brand-600 text-white shadow-lg';
                } else {
                    btn.className = 'px-4 py-1.5 rounded-md text-xs font-bold transition-all text-slate-500 hover:text-white';
                }
            }
        });
        this.renderTopPromoters();
    },

    renderTopPromoters() {
        const list = document.getElementById('top-promoters-list');
        if (!list) return;

        const stats = this.data.promoters.map(p => {
            const stores = this.data.stores.filter(s => s.promoter === p && s.freq === this.rankingFreq);
            let total = 0, done = 0;
            stores.forEach(s => { total += s.checks.length; done += s.checks.filter(c => c.done).length; });
            return { name: p, pct: total > 0 ? (done/total)*100 : 0, count: stores.length };
        }).filter(x => x.count > 0).sort((a,b) => b.pct - a.pct).slice(0, 10); 

        if(stats.length === 0) {
            list.innerHTML = `<li class="col-span-full text-center text-slate-500 text-sm py-4">Sem dados para ${this.rankingFreq}</li>`;
            return;
        }

        list.innerHTML = stats.map((s, idx) => `
            <li class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div class="flex items-center gap-3">
                    <span class="text-xs font-bold text-slate-500 w-4">${idx+1}</span>
                    <div class="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">${s.name.charAt(0)}</div>
                    <span class="text-xs font-bold text-white">${s.name}</span>
                </div>
                <div class="text-right">
                    <div class="text-xs font-black text-brand-400">${Math.round(s.pct)}%</div>
                    <div class="text-[9px] text-slate-500 font-bold">${s.count} PDVs</div>
                </div>
            </li>
        `).join('');
    },

    copyCobrarMsg(promoter, store, days) {
        const msg = `Olá ${promoter.split(' ')[0]}, verificamos que a loja *${store}* está há *${days} dias* sem leitura registrada no sistema. Por favor, priorizar essa visita. Obrigado!`;
        navigator.clipboard.writeText(msg).then(() => {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#1e293b', color: '#fff' });
            Toast.fire({ icon: 'success', title: 'Mensagem copiada!', text: 'Cole no WhatsApp.' });
        });
    },

    playSuccessSound() {}
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
