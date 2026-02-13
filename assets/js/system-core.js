(() => {
  console.log('[JSFC_SYSTEM] Tactical Interface Boot Sequence Initiated...');

  window.globalIntel = null;
  window.globalTelemetry = null;
  window.currentBattlemetricsRange = 'today';

  async function fetchIntegratedIntel() {
    console.log('[JSFC_INTEL] Initiating heartbeat synchronization...');
    try {
      const response = await fetch('/intel.json?t=' + Date.now());
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      window.globalIntel = data;

      updateBattlemetricsUI();
      if (data.unitcommander) {
        updateUnitCommanderUI(data.unitcommander);
        updateOperationLogsUI(data.unitcommander);
      }
    } catch (e) {
      console.warn('[JSFC_INTEL] Heartbeat warning (non-fatal):', e.message);
      // Ensure UI doesn't hang
      updateBattlemetricsUI();
    }
  }

  async function fetchTelemetry() {
    try {
      console.log('[JSFC_INTEL] Pulling telemetry shard...');
      const response = await fetch('/telemetry.json?t=' + Date.now());
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      window.globalTelemetry = data;
      updateBattlemetricsUI();
    } catch (e) {
      console.warn(
        '[JSFC_INTEL] Telemetry shard warning (non-fatal):',
        e.message,
      );
      window.globalTelemetry = {};
      updateBattlemetricsUI();
    }
  }

  function updateOperationLogsUI(uc) {
    const container = document.querySelector('.operation-logs-container');
    if (!container || !uc.campaigns) return;

    try {
      const logs = [...uc.campaigns]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4);

      container.innerHTML = logs
        .map((op) => {
          const date = new Date(op.created_at)
            .toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            })
            .toUpperCase();
          const slug = op.campaignName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
          return `
                    <a href="/campaigns/${slug}" class="group flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 hover:border-uksf-gold/30 transition-all no-underline overflow-hidden relative">
                        <div class="absolute top-0 left-0 w-1 h-full bg-neutral-800 group-hover:bg-uksf-gold transition-colors"></div>
                        <div class="flex items-center gap-6">
                            <span class="text-[8px] font-mono text-neutral-700 group-hover:text-uksf-gold transition-colors font-black uppercase tracking-widest">${date}</span>
                            <div class="flex flex-col">
                                <span class="text-[10px] font-black text-neutral-400 group-hover:text-white transition-colors uppercase tracking-tight">${op.campaignName}</span>
                                <span class="text-[7px] font-mono text-neutral-700 uppercase tracking-widest">RECORD_ID: TF-${op.id}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-[7px] font-mono text-neutral-800 uppercase tracking-widest font-black  hidden sm:block">${op.status}</span>
                            <svg class="w-3 h-3 text-neutral-800 group-hover:text-uksf-gold transform group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </a>
                `;
        })
        .join('');
    } catch (err) {
      console.error('UI_LOG_UPDATE_FAILURE', err);
    }
  }

  window.openOperationModal = (opId) => {
    const uc = window.globalIntel ? window.globalIntel.unitcommander : null;
    if (!uc || !uc.campaigns) return;
    const op = uc.campaigns.find((c) => c.id == opId);
    if (!op) return;

    const modal = document.getElementById('operation-modal');
    if (!modal) return;

    const img = document.getElementById('modal-op-image');
    const title = document.getElementById('modal-op-title');
    const date = document.getElementById('modal-op-date');
    const brief = document.getElementById('modal-op-brief');
    const map = document.getElementById('modal-op-map');

    if (title) title.innerText = op.campaignName;
    if (date)
      date.innerText = `COMMENCED: ${new Date(op.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}`;
    if (brief) brief.innerText = op.brief || 'NO_DATA_RECOVERED';
    if (map) map.innerText = `THEATER: ${op.map || 'CLASSIFIED'}`;

    if (img) {
      if (op.image && op.image.path) {
        img.src = op.image.path;
        img.classList.remove('hidden');
      } else {
        img.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  window.closeOperationModal = () => {
    const modal = document.getElementById('operation-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.closeOperationModal();
  });

  function updateBattlemetricsUI() {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const playerCount = document.getElementById('player-count');

    const source = window.globalIntel ? window.globalIntel.arma : null;
    const maxCapacity = source ? source.maxPlayers || 40 : 40;

    if (statusText) {
      if (source && source.status === 'online') {
        statusText.innerText = 'STATION_ACTIVE';
        statusText.className =
          'text-[8px] font-black text-mod-green tracking-widest uppercase font-mono';
        if (statusIndicator)
          statusIndicator.className = `w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]`;
        if (playerCount)
          playerCount.innerText = `${source.players}/${maxCapacity} DEPLOYED`;
      } else {
        statusText.innerText = 'LINK_SEVERED';
        statusText.className =
          'text-[8px] font-black text-red-600 tracking-widest uppercase font-mono';
        if (statusIndicator)
          statusIndicator.className =
            'w-1.5 h-1.5 bg-red-600 rounded-full opacity-40';
        if (playerCount) playerCount.innerText = 'OFFLINE';
      }
    }

    const containers = document.querySelectorAll('#battlemetrics-graph');
    if (containers.length > 0) {
      if (!window.globalTelemetry) {
        fetchTelemetry();
      } else {
        const range = window.currentBattlemetricsRange || 'today';
        let dataPoints = [];

        if (window.globalTelemetry[range]) {
          dataPoints = [...window.globalTelemetry[range]];
        }

        if (source) {
          dataPoints.unshift({
            attributes: {
              value: source.players,
              timestamp: new Date().toISOString(),
            },
          });
        }

        containers.forEach((c) =>
          renderBattlemetricsGraph(dataPoints, c, maxCapacity),
        );
      }
    }
  }

  function renderBattlemetricsGraph(data, container, maxVal = 40) {
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 100;
    const safeMax = Math.max(maxVal, 10);

    if (width === 0) {
      // Avoid infinite recursion if container is hidden
      return;
    }

    const range = window.currentBattlemetricsRange || 'today';
    const nowTime = Date.now();
    const lookback =
      range === 'month'
        ? 30 * 24 * 3600000
        : range === 'week'
          ? 7 * 24 * 3600000
          : 24 * 3600000;
    const startTime = nowTime - lookback;
    const endTime = nowTime;
    const timeRange = endTime - startTime;

    const getX = (t) => {
      if (timeRange === 0) return 0;
      const x = ((new Date(t).getTime() - startTime) / timeRange) * width;
      return Math.max(0, Math.min(width, x));
    };

    const getY = (v) => {
      const y = height - 4 - (v / safeMax) * (height - 8);
      return Math.max(2, Math.min(height - 2, y + 2));
    };

    let points = [];
    if (data && data.length > 0) {
      points = data
        .map((d) => ({
          v: d.attributes.value === 255 ? 0 : d.attributes.value,
          t: d.attributes.timestamp,
        }))
        .filter((p) => p.v < 500 && new Date(p.t).getTime() >= startTime);

      points.sort((a, b) => new Date(a.t) - new Date(b.t));
    }

    if (points.length === 0) {
      container.innerHTML = `<div class="h-full flex items-center justify-center font-mono text-[8px] text-neutral-800 uppercase tracking-[0.4em] ">No_Telemetry_Detected</div>`;
      return;
    }

    const firstX = getX(points[0].t);
    const firstY = getY(points[0].v);

    let pathData = `M ${firstX} ${firstY}`;
    let areaPath = `M ${firstX} ${height} L ${firstX} ${firstY}`;

    const baselineY = getY(0);
    const maxGap =
      range === 'month'
        ? 12 * 3600000
        : range === 'week'
          ? 3 * 3600000
          : 65 * 60000;

    points.forEach((p, index) => {
      const curX = getX(p.t);
      const curY = getY(p.v);

      if (index > 0) {
        const prevP = points[index - 1];
        const timeDiff = new Date(p.t).getTime() - new Date(prevP.t).getTime();

        if (timeDiff > maxGap) {
          pathData += ` L ${getX(prevP.t)} ${baselineY} M ${getX(p.t)} ${baselineY} L ${curX} ${curY}`;
          areaPath += ` L ${getX(prevP.t)} ${baselineY} L ${getX(p.t)} ${baselineY} L ${curX} ${curY}`;
        } else {
          pathData += ` L ${curX} ${curY}`;
          areaPath += ` L ${curX} ${curY}`;
        }
      }
    });

    const lastP = points[points.length - 1];
    const lastY = getY(lastP.v);

    if (endTime - new Date(lastP.t).getTime() > 10 * 60000) {
      pathData += ` L ${width} ${lastY}`;
      areaPath += ` L ${width} ${lastY}`;
    }

    areaPath += ` L ${width} ${height} Z`;

    container.innerHTML = `
            <div id="graph-tooltip" class="absolute top-2 right-2 bg-black/90 border border-white/10 px-3 py-2 pointer-events-none opacity-0 transition-opacity z-20 shadow-2xl font-mono">
                <span class="text-[9px] font-black text-uksf-gold uppercase block tracking-widest" id="tooltip-val">-- DEPLOYED</span>
                <span class="text-[7px] font-black text-neutral-600 uppercase block tracking-widest " id="tooltip-time">--:--:--</span>
            </div>
            <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#graphGradient)" stroke="none" />
                <path d="${pathData}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                ${points.map((p) => `<rect x="${getX(p.t) - 5}" y="0" width="10" height="${height}" fill="white" fill-opacity="0" class="cursor-crosshair" onmouseover="showGraphTooltip(${p.v}, '${p.t}')" onmouseout="hideGraphTooltip()" />`).join('')}
            </svg>
        `;
  }

  window.showGraphTooltip = (val, time) => {
    const t = document.getElementById('graph-tooltip');
    const vEl = document.getElementById('tooltip-val');
    const tEl = document.getElementById('tooltip-time');
    if (!t) return;
    t.style.opacity = '1';
    if (vEl) vEl.innerText = `${val} DEPLOYED`;
    const date = new Date(time);
    if (tEl)
      tEl.innerText = isNaN(date)
        ? 'LINK_ERROR'
        : date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }) + 'Z';
  };

  window.hideGraphTooltip = () => {
    const t = document.getElementById('graph-tooltip');
    if (t) t.style.opacity = '0';
  };

  function updateUnitCommanderUI(uc) {
    const feeds = document.querySelectorAll('.live-ops-feed-container');
    if (feeds.length === 0 || !uc || !uc.campaigns) return;

    let bestOp = null;
    let absoluteLatestTime = 0;
    const allCandidates = [...uc.campaigns];

    allCandidates.forEach((op) => {
      const events = (uc.campaignEvents && uc.campaignEvents[op.id]) || [];
      let opTime = new Date(op.updated_at || op.created_at || 0).getTime();
      if (events.length > 0) {
        const eventTimes = events.map((e) =>
          new Date(
            e.startDate ||
              e.startTime ||
              e.event_date ||
              e.dateTime ||
              e.updated_at ||
              e.created_at,
          ).getTime(),
        );
        opTime = Math.max(opTime, ...eventTimes);
      }
      if (opTime > absoluteLatestTime) {
        absoluteLatestTime = opTime;
        bestOp = { ...op, isStandalone: false };
      }
    });

    if (uc.standalone) {
      uc.standalone.forEach((ev) => {
        const evTime = new Date(
          ev.startDate ||
            ev.startTime ||
            ev.event_date ||
            ev.dateTime ||
            ev.updated_at ||
            ev.created_at,
        ).getTime();
        if (evTime > absoluteLatestTime) {
          absoluteLatestTime = evTime;
          bestOp = {
            ...ev,
            isStandalone: true,
            campaignName: ev.title || ev.eventName,
            status: 'ACTIVE',
          };
        }
      });
    }

    if (bestOp) renderUnitCommanderHTML(bestOp);
  }

  function renderUnitCommanderHTML(latestOp) {
    const createdDate = new Date(latestOp.created_at);
    const today = new Date();
    const durationStr =
      Math.floor(Math.abs(today - createdDate) / (1000 * 60 * 60 * 24)) + 'D';
    const opTitle = latestOp.campaignName || latestOp.title || 'OP_UNNAMED';
    const cleanLocation = (latestOp.map || latestOp.location || 'CLASSIFIED')
      .split('(')[0]
      .trim()
      .toUpperCase();
    const dateStr = new Date(latestOp.updated_at || latestOp.created_at)
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      .toUpperCase();

    const html = `
            <div class="p-6 border border-[#bfc1c3] dark:border-[#323e48] bg-white dark:bg-white/5 relative group overflow-hidden transition-all duration-300">
                <div class="flex justify-between items-start mb-6">
                    <div class="space-y-1">
                        <span class="block text-[7px] text-[#6f777b] uppercase font-bold tracking-widest">// LOG_SERIAL: ${latestOp.isStandalone ? 'EV' : 'TF'}-${latestOp.id}</span>
                        <span class="block text-[8px] text-[#532a45] dark:text-[#bfc1c3] uppercase font-bold tracking-widest">${dateStr}</span>
                    </div>
                    <div class="flex items-center gap-2 px-2 py-0.5 border border-[#bfc1c3] dark:border-[#323e48]">
                        <span class="w-1 h-1 bg-[#00703c] rounded-full animate-pulse shadow-sm"></span>
                        <span class="text-[7px] font-bold text-[#0b0c0c] dark:text-white uppercase tracking-widest">ENGAGED</span>
                    </div>
                </div>
                <h2 class="text-2xl font-bold text-[#0b0c0c] dark:text-white uppercase tracking-tight leading-none mb-6 group-hover:text-[#532a45] transition-colors font-industrial">${opTitle}</h2>
                <div class="grid grid-cols-2 gap-6 border-t border-[#bfc1c3] dark:border-[#323e48] pt-6">
                    <div class="space-y-1">
                        <span class="text-[6px] text-[#6f777b] uppercase font-bold tracking-widest block">// Theater_AO</span>
                        <span class="text-[9px] text-[#0b0c0c] dark:text-white font-bold uppercase tracking-tight truncate block">${cleanLocation}</span>
                    </div>
                    <div class="space-y-1 border-l border-[#bfc1c3] dark:border-[#323e48] pl-6">
                        <span class="text-[6px] text-[#6f777b] uppercase font-bold tracking-widest block">// Persistence</span>
                        <span class="text-[9px] text-[#323e48] dark:text-[#bfc1c3] font-bold uppercase tracking-tight block">${durationStr} IN THEATER</span>
                    </div>
                </div>
            </div>
        `;
    document
      .querySelectorAll('.live-ops-feed-container')
      .forEach((f) => (f.innerHTML = html));
  }

  async function updateDiscordStatus(serverId) {
    if (!serverId) return;
    try {
      const response = await fetch(
        `https://discord.com/api/guilds/${serverId}/widget.json`,
      );
      const data = await response.json();
      if (data && data.presence_count !== undefined) {
        const countStr = data.presence_count.toString().padStart(2, '0');
        document.querySelectorAll('.discord-online-count').forEach((el) => {
          el.innerText = countStr;
        });
      }
    } catch (error) {
      document.querySelectorAll('.discord-online-count').forEach((el) => {
        el.innerText = '??';
      });
    }
  }

  function updateClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    const now = new Date();
    clock.innerText = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  }

  window.initSystem = (serverId) => {
    fetchIntegratedIntel();
    setInterval(fetchIntegratedIntel, 300000);
    updateDiscordStatus(serverId);
    setInterval(() => updateDiscordStatus(serverId), 60000);
    setInterval(updateClock, 1000);
    updateClock();
    window.addEventListener('resize', () => {
      if (window.globalTelemetry) updateBattlemetricsUI();
    });
  };

  window.showToast = (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className =
        'fixed top-32 right-8 z-[9999] flex flex-col items-end space-y-3 pointer-events-none';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const isDanger = type === 'danger';
    toast.className = `p-6 bg-white dark:bg-[#1d2329] border border-[#bfc1c3] dark:border-[#323e48] relative overflow-hidden shadow-lg animate-slide-in-right flex items-center gap-6 min-w-[350px] pointer-events-auto select-none rounded-sm transition-colors duration-300`;
    toast.innerHTML = `
            <div class="absolute top-0 left-0 w-1.5 h-full ${isDanger ? 'bg-[#800000]' : 'bg-[#532a45]'}"></div>
            <span class="w-2 h-2 rounded-full ${isDanger ? 'bg-[#800000]' : 'bg-[#532a45]'}"></span>
            <div class="flex flex-col gap-1">
                <span class="text-[10px] font-bold text-[#0b0c0c] dark:text-white uppercase tracking-widest font-industrial">${message}</span>
                <span class="text-[7px] font-mono text-[#6f777b] uppercase tracking-widest font-bold">System Broadcast // ${new Date().toLocaleTimeString('en-GB', { hour12: false })}Z</span>
            </div>
        `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  };
})();
