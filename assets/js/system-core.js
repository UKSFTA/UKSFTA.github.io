(() => {
  console.log('[JSFC_SYSTEM] Tactical Interface Boot Sequence Initiated...');

  window.globalIntel = null;
  window.globalTelemetry = null;
  window.currentBattlemetricsRange = 'today';

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
  async function fetchIntegratedIntel() {
    console.log('[JSFC_INTEL] Initiating heartbeat synchronization...');
    try {
      const response = await fetch(`/intel.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      window.globalIntel = data;

      updateBattlemetricsUI();
      if (data.average_attendance !== undefined) {
        const avgEl = document.getElementById('avg-deployed-count');
        if (avgEl)
          avgEl.innerText = data.average_attendance.toString().padStart(2, '0');
      }
      if (data.personnel_count !== undefined) {
        const pEl = document.getElementById('personnel-count');
        if (pEl)
          pEl.innerText = data.personnel_count.toString().padStart(2, '0');
      }
      if (data.uptime_percentage !== undefined) {
        const uEl = document.getElementById('uptime-count');
        if (uEl) uEl.innerText = `${data.uptime_percentage}%`;

        document.querySelectorAll('.signal-strength').forEach((el) => {
          el.innerText = `Signal: ${data.uptime_percentage}%`;
        });
        document.querySelectorAll('.link-id').forEach((el) => {
          el.innerText = `NET_ID: UKSF_INTEL`;
        });
      }

      // Handle Alerts Feed (Service Updates)
      const alertsContainer = document.getElementById(
        'service-updates-container',
      );
      const alertsFeed = document.getElementById('alerts-feed');
      if (
        alertsContainer &&
        alertsFeed &&
        data.unitcommander?.alerts?.length > 0
      ) {
        alertsContainer.classList.remove('hidden');
        alertsFeed.innerHTML = data.unitcommander.alerts
          .map(
            (alert) => `
          <div class="bg-govuk-blue/5 border-l-8 border-govuk-blue p-6">
            <h4 class="text-xl font-bold mb-2">${alert.title}</h4>
            <div class="text-lg leading-relaxed text-mod-grey-1 dark:text-mod-grey-3">${alert.content}</div>
            <div class="text-sm font-bold mt-4 text-govuk-blue uppercase tracking-widest">Published: ${new Date(alert.date).toLocaleDateString('en-GB')}</div>
          </div>
        `,
          )
          .join('');
      }

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
      const response = await fetch(`/telemetry.json?t=${Date.now()}`);
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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
  function updateModalContent(op) {
    const title = document.getElementById('modal-op-title');
    const date = document.getElementById('modal-op-date');
    const brief = document.getElementById('modal-op-brief');
    const map = document.getElementById('modal-op-map');
    const img = document.getElementById('modal-op-image');

    if (title) title.innerText = op.campaignName;
    if (date) {
      const formattedDate = new Date(op.created_at).toLocaleDateString(
        'en-GB',
        {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        },
      );
      date.innerText = `COMMENCED: ${formattedDate.toUpperCase()}`;
    }
    if (brief) brief.innerText = op.brief || 'NO_DATA_RECOVERED';
    if (map) map.innerText = `THEATER: ${op.map || 'CLASSIFIED'}`;

    if (img) {
      if (op.image?.path) {
        img.src = op.image.path;
        img.classList.remove('hidden');
      } else {
        img.classList.add('hidden');
      }
    }
  }

  window.openOperationModal = (opId) => {
    const uc = window.globalIntel ? window.globalIntel.unitcommander : null;
    if (!uc || !uc.campaigns) return;
    const op = uc.campaigns.find((c) => c.id === opId);
    if (!op) return;

    const modal = document.getElementById('operation-modal');
    if (!modal) return;

    updateModalContent(op);

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
  function updateStatusIndicator(source, maxCapacity) {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const playerCount = document.getElementById('player-count');

    if (!statusText) return;

    if (source && source.status === 'online') {
      const pCount = source.rcon_verified || source.players;
      statusText.innerText = 'STATION_ACTIVE';
      statusText.className =
        'text-[8px] font-black text-mod-green tracking-widest uppercase font-mono';
      if (statusIndicator) {
        statusIndicator.className =
          'w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]';
      }
      if (playerCount) {
        playerCount.innerText = pCount.toString().padStart(2, '0');
      }
      // Log Steam Info if present
      if (source.steam) {
        console.log(
          `[JSFC_INTEL] Steam Node: v${source.steam.version} (${source.steam.os})`,
        );
      }
    } else {
      statusText.innerText = 'LINK_SEVERED';
      statusText.className =
        'text-[8px] font-black text-red-600 tracking-widest uppercase font-mono';
      if (statusIndicator) {
        statusIndicator.className =
          'w-1.5 h-1.5 bg-red-600 rounded-full opacity-40';
      }
      if (playerCount) playerCount.innerText = 'OFFLINE';
    }
  }

  function updateBattlemetricsUI() {
    const source = window.globalIntel ? window.globalIntel.arma : null;
    const maxCapacity = source ? source.maxPlayers || 40 : 40;

    // 1. Update large numeric player-count display
    const playerCountEl = document.getElementById('player-count');
    if (playerCountEl) {
      if (source && source.status === 'online') {
        const pCount = source.rcon_verified || source.players || 0;
        playerCountEl.innerText = pCount.toString().padStart(2, '0');
      } else {
        playerCountEl.innerText = '--';
      }
    }

    updateStatusIndicator(source, maxCapacity);

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

        // Add 'Live' point if server is online
        if (source && source.status === 'online') {
          dataPoints.push({
            attributes: {
              value: source.rcon_verified || source.players || 0,
              timestamp: new Date().toISOString(),
            },
          });
        }

        containers.forEach((c) => {
          renderBattlemetricsGraph(dataPoints, c, maxCapacity);
        });
      }
    }
  }

  function getGraphData(data, startTime, safeMax, height, width, timeRange) {
    const points = data
      .map((d) => ({
        v: d.attributes.value,
        t: d.attributes.timestamp,
      }))
      .filter(
        (p) => p.v !== 255 && p.v < 500 && new Date(p.t).getTime() >= startTime,
      );

    points.sort((a, b) => new Date(a.t) - new Date(b.t));

    const getX = (t) => {
      if (timeRange === 0) return 0;
      const x = ((new Date(t).getTime() - startTime) / timeRange) * width;
      return Math.max(0, Math.min(width, x));
    };

    const getY = (v) => {
      const y = height - 4 - (v / safeMax) * (height - 8);
      return Math.max(2, Math.min(height - 2, y + 2));
    };

    return { points, getX, getY };
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
  function renderBattlemetricsGraph(data, container, maxVal = 40) {
    if (!container || !data) return;

    // Ensure container is relative for absolute tooltip positioning
    container.style.position = 'relative';
    const width = container.clientWidth;
    const height = container.clientHeight || 100;
    if (width === 0) return;

    const range = window.currentBattlemetricsRange || 'today';
    const nowTime = Date.now();
    const lookback =
      range === 'month'
        ? 30 * 24 * 3600000
        : range === 'week'
          ? 7 * 24 * 3600000
          : 24 * 3600000;
    const startTime = nowTime - lookback;
    const timeRange = nowTime - startTime;
    const safeMax = Math.max(maxVal, 10);

    const { points, getX, getY } = getGraphData(
      data,
      startTime,
      safeMax,
      height,
      width,
      timeRange,
    );

    if (points.length === 0) {
      container.innerHTML =
        '<div class="h-full flex items-center justify-center font-mono text-[8px] text-neutral-800 uppercase tracking-[0.4em] ">No_Telemetry_Detected</div>';
      return;
    }

    const firstX = 0;
    const firstY = getY(points[0].v);

    let pathData = `M ${firstX} ${firstY}`;
    let areaPath = `M ${firstX} ${height} L ${firstX} ${firstY}`;

    points.forEach((p) => {
      const curX = getX(p.t);
      const curY = getY(p.v);
      pathData += ` L ${curX} ${curY}`;
      areaPath += ` L ${curX} ${curY}`;
    });

    areaPath += ` L ${width} ${height} Z`;

    container.innerHTML = `
      <div id="graph-tooltip" class="absolute top-0 right-0 bg-[#0b0c0c] border border-white/20 p-3 pointer-events-none opacity-0 transition-opacity z-50 shadow-2xl font-mono min-w-[140px]" style="visibility: hidden;">
          <span class="text-[10px] font-bold text-mod-green uppercase block tracking-widest mb-1" id="tooltip-val">-- DEPLOYED</span>
          <span class="text-[8px] font-bold text-white/40 uppercase block tracking-widest" id="tooltip-time">--:--:--</span>
      </div>
      <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" class="overflow-visible" preserveAspectRatio="none">
          <defs>
              <linearGradient id="graphGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#2fb060" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#2fb060" stop-opacity="0" />
              </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#graphGradient)" stroke="none" />
          <path d="${pathData}" fill="none" stroke="#2fb060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <div id="graph-interaction-layer" class="absolute inset-0 z-40 cursor-crosshair"></div>
    `;

    // High-performance single-listener interaction
    const interactionLayer = container.querySelector('#graph-interaction-layer');
    if (interactionLayer) {
      interactionLayer.addEventListener('mousemove', (e) => {
        const rect = interactionLayer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // Find nearest point
        let nearest = points[0];
        let minDist = Math.abs(getX(points[0].t) - mouseX);
        
        for (const p of points) {
          const dist = Math.abs(getX(p.t) - mouseX);
          if (dist < minDist) {
            minDist = dist;
            nearest = p;
          }
        }
        
        window.showGraphTooltip(nearest.v, nearest.t);
      });

      interactionLayer.addEventListener('mouseleave', () => {
        window.hideGraphTooltip();
      });
    }
  }

  window.showGraphTooltip = (val, time) => {
    const t = document.getElementById('graph-tooltip');
    const vEl = document.getElementById('tooltip-val');
    const tEl = document.getElementById('tooltip-time');
    if (!t) return;
    
    if (vEl) vEl.innerText = `${val.toString().padStart(2, '0')} DEPLOYED`;
    const date = new Date(time);
    if (tEl)
      tEl.innerText = Number.isNaN(date.getTime())
        ? 'LINK_ERROR'
        : `${date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}Z`;
    
    t.style.opacity = '1';
    t.style.visibility = 'visible';
  };

  window.hideGraphTooltip = () => {
    const t = document.getElementById('graph-tooltip');
    if (t) {
      t.style.opacity = '0';
      t.style.visibility = 'hidden';
    }
  };

  window.setBattlemetricsRange = (range) => {
    window.currentBattlemetricsRange = range;
    document.querySelectorAll('.bm-range-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-range') === range);
    });
    updateBattlemetricsUI();
  };

  function updateUnitCommanderUI(uc) {
    const feeds = document.querySelectorAll('.live-ops-feed-container');
    if (feeds.length === 0 || !uc || !uc.campaigns) return;

    let bestOp = null;
    let absoluteLatestTime = 0;
    const allCandidates = [...uc.campaigns];

    allCandidates.forEach((op) => {
      const events = uc.campaignEvents?.[op.id] || [];
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
    const durationStr = `${Math.floor(Math.abs(today - createdDate) / (1000 * 60 * 60 * 24))}D`;
    const opTitle = latestOp.campaignName || latestOp.title || 'OP_UNNAMED';
    const cleanLocation = (latestOp.map || latestOp.location || 'CLASSIFIED')
      .split('(')[0]
      .trim()
      .toUpperCase();
    const dateStr = new Date(latestOp.updated_at || latestOp.created_at)
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      .toUpperCase();

    const avgVal = window.globalIntel?.average_attendance;
    const avgDeployed =
      avgVal !== undefined && avgVal !== null
        ? avgVal.toString().padStart(2, '0')
        : '--';

    const html = `
            <div class="space-y-6 group cursor-default">
                <div class="space-y-1">
                    <span class="block text-[7px] text-mod-green font-black uppercase tracking-[0.3em]">// LOG_SERIAL: ${latestOp.isStandalone ? 'EV' : 'TF'}-${latestOp.id}</span>
                    <h2 class="text-2xl font-bold text-white uppercase tracking-tighter leading-none m-0 group-hover:text-mod-green transition-colors">${opTitle}</h2>
                </div>

                <div class="grid grid-cols-1 gap-px bg-white/5 border border-white/10">
                    <div class="p-4 bg-[#0b0c0c]/40">
                        <span class="block text-[8px] text-white/30 font-bold uppercase tracking-widest mb-2">Theater_AO</span>
                        <span class="block text-lg font-bold text-white uppercase truncate">${cleanLocation}</span>
                    </div>
                    <div class="p-4 bg-[#0b0c0c]/40 border-t border-white/5">
                        <span class="block text-[8px] text-white/30 font-bold uppercase tracking-widest mb-2">Operational Status</span>
                        <div class="flex items-center gap-3">
                            <span class="w-2 h-2 bg-mod-green rounded-full animate-pulse"></span>
                            <span class="text-xs font-bold text-white uppercase tracking-widest">Active_Engagement // ${durationStr}_DEPLOYED</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="space-y-1">
                        <span class="text-[8px] text-white/30 font-bold uppercase tracking-widest block">Strategic Objective</span>
                        <p class="text-[11px] text-white/70 leading-relaxed m-0 font-mono italic">"Dismantle adversary coordination networks through precision strikes and partner-force advisement."</p>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <div class="flex flex-col">
                            <span class="text-[8px] text-white/30 font-bold uppercase tracking-widest block mb-1">Command Authority</span>
                            <span class="text-[9px] text-white font-bold uppercase">JSFC_TFHQ_G3</span>
                        </div>
                        <div class="flex flex-col text-right">
                            <span class="text-[8px] text-white/30 font-bold uppercase tracking-widest block mb-1">Personnel_Str</span>
                            <span class="text-[11px] text-mod-green font-bold">${avgDeployed} VERIFIED</span>
                        </div>
                    </div>
                </div>

                <div class="pt-2 flex justify-between items-center text-[8px] font-mono text-white/20">
                    <span>REF_ID: ${latestOp.updated_at ? 'SYNC_COMPLETE' : 'CACHED'}</span>
                    <span class="uppercase tracking-widest">${dateStr} // LOG_CLOSED</span>
                </div>
            </div>
        `;
    document.querySelectorAll('.live-ops-feed-container').forEach((f) => {
      f.innerHTML = html;
    });
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
    } catch (_error) {
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
