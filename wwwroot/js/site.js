// 1. Expense dialog (Overview, Expenses): any [data-expense] trigger opens it, filled from data-* attributes.
// If the current page doesn't have #expense-dialog (e.g. Analytics/Profile), an <a data-expense> falls back to its href.
document.addEventListener('click', e => {
    const opener = e.target.closest('[data-expense]');
    if (!opener) return;
    const dialog = document.getElementById('expense-dialog');
    if (!dialog) return;
    e.preventDefault();
    const form = dialog.querySelector('form');
    const d = opener.dataset;
    form.reset();
    for (const name of ['Id', 'Title', 'Price', 'Category', 'Date', 'PaymentMode', 'Description']) {
        const field = form.elements['Expense.' + name];
        if (field) field.value = d[name.toLowerCase()] ?? '';
    }
    const editing = d.id !== '0';
    dialog.querySelector('h2').textContent = editing ? 'Edit expense' : 'New expense';
    form.querySelector('[type=submit]').textContent = editing ? 'Save changes' : 'Add expense';
    dialog.showModal();
});

document.addEventListener('click', e => {
    if (e.target.id === 'expense-dialog') e.target.close();
});

// Global keyboard shortcut: press 'N' (outside inputs/modals) to open New Expense.
document.addEventListener('keydown', e => {
    if (e.key !== 'n' && e.key !== 'N') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
    if (document.querySelector('dialog[open], .modal.show')) return;
    const quickTrigger = document.querySelector('.cmd-quick-add');
    if (quickTrigger) {
        e.preventDefault();
        quickTrigger.click();
    }
});

// 2. 3D Holographic Card Tilt & Specular Glare Physics
(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.addEventListener('pointermove', e => {
        const card = e.target.closest('.tilt-card[data-tilt]');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const maxTilt = parseFloat(card.dataset.tilt) || 6;
        const ry = (px - 0.5) * maxTilt * 2;
        const rx = (0.5 - py) * maxTilt * 2;
        card.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        card.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        card.style.setProperty('--glare-op', '1');
    }, { passive: true });

    document.querySelectorAll('.tilt-card[data-tilt]').forEach(card => {
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--ry', '0deg');
            card.style.setProperty('--glare-op', '0');
        });
    });
})();

// 3. Live 60fps 3D Perspective Grid & Rotating 3D Wireframe Polyhedra Background
(() => {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0, dpr = 1;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', e => {
        ptr.tx = (e.clientX / Math.max(1, w) - 0.5) * 2;
        ptr.ty = (e.clientY / Math.max(1, h) - 0.5) * 2;
    }, { passive: true });
    resize();

    // 3D Octahedron unit vertices & edges
    const verts = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    const edges = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];

    const shapes = Array.from({ length: 12 }, (_, i) => ({
        x: (Math.sin(i * 2.1) * 0.75),
        y: (Math.cos(i * 1.7) * 0.65),
        z: 180 + (i * 75) % 620,
        size: 16 + (i % 4) * 9,
        rx: i * 0.8,
        ry: i * 1.3,
        vrx: (i % 2 ? 1 : -1) * (0.35 + (i % 3) * 0.15),
        vry: (0.45 + (i % 4) * 0.12),
        colorIdx: i % 3
    }));

    function rot3D(v, rx, ry) {
        let [x, y, z] = v;
        const cy = Math.cos(ry), sy = Math.sin(ry);
        let x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        const cx = Math.cos(rx), sx = Math.sin(rx);
        let y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
        return [x1, y2, z2];
    }

    function draw(now) {
        const t = reduced ? 0 : now * 0.001;
        ptr.x += (ptr.tx - ptr.x) * 0.06;
        ptr.y += (ptr.ty - ptr.y) * 0.06;

        const isDark = document.documentElement.dataset.bsTheme === 'dark';
        const palette = isDark
            ? ['rgba(204,255,0,', 'rgba(0,240,255,', 'rgba(255,42,133,']
            : ['rgba(79,38,255,', 'rgba(255,59,29,', 'rgba(0,184,98,'];
        const gridStroke = isDark ? 'rgba(0, 240, 255, 0.08)' : 'rgba(79, 38, 255, 0.07)';

        ctx.clearRect(0, 0, w, h);

        // 3D Perspective Floor Grid
        const fov = 360;
        const camX = ptr.x * 55;
        const camY = -95 + ptr.y * 25;
        const horizonY = h * 0.56 + ptr.y * 18;

        ctx.strokeStyle = gridStroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cols = 16, spacing = 110, depth = 900;
        for (let i = -cols; i <= cols; i++) {
            const gx = i * spacing - camX;
            const p1 = fov / (fov + 60);
            const p2 = fov / (fov + depth);
            ctx.moveTo(w / 2 + gx * p1, horizonY - camY * p1);
            ctx.lineTo(w / 2 + gx * p2, horizonY - camY * p2);
        }
        const zShift = (t * 65) % 90;
        for (let z = 60 + zShift; z < depth; z += 90) {
            const p = fov / (fov + z);
            const y = horizonY - camY * p;
            const halfW = cols * spacing * p;
            ctx.moveTo(w / 2 - halfW, y);
            ctx.lineTo(w / 2 + halfW, y);
        }
        ctx.stroke();

        // Floating 3D Wireframe Polyhedra
        for (const s of shapes) {
            const rx = s.rx + t * s.vrx + ptr.y * 0.5;
            const ry = s.ry + t * s.vry + ptr.x * 0.5;
            const z = ((s.z - t * 28) % 620 + 620) % 620 + 120;
            const scale = fov / (fov + z);
            const cx = w / 2 + (s.x * w * 0.65 - ptr.x * 70) * scale;
            const cy = h / 2 + (s.y * h * 0.55 - ptr.y * 50) * scale;
            const alpha = Math.min(1, (740 - z) / 480) * (isDark ? 0.42 : 0.32);

            const pts = verts.map(v => {
                const [vx, vy, vz] = rot3D(v, rx, ry);
                const ps = fov / (fov + z + vz * s.size);
                return [cx + vx * s.size * ps * 1.8, cy + vy * s.size * ps * 1.8];
            });

            ctx.strokeStyle = palette[s.colorIdx] + alpha.toFixed(3) + ')';
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            for (const [a, b] of edges) {
                ctx.moveTo(pts[a][0], pts[a][1]);
                ctx.lineTo(pts[b][0], pts[b][1]);
            }
            ctx.stroke();
        }

        if (!reduced) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
})();

// 4. Overview: Chart mode switch (Laser Curve vs. 3D Extruded Pillars)
document.addEventListener('click', e => {
    const modeBtn = e.target.closest('[data-chart-mode]');
    if (!modeBtn) return;
    const stage = document.getElementById('ov-chart-stage');
    if (!stage) return;
    const mode = modeBtn.dataset.chartMode;
    stage.dataset.mode = mode;
    stage.querySelectorAll('[data-chart-mode]').forEach(b => {
        const active = b === modeBtn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active);
    });
    const sub = document.getElementById('ov-stage-subtitle');
    if (sub) {
        sub.textContent = mode === 'bars'
            ? '3D extruded daily pillars — peak spikes illuminated, zero-spend days on emerald baseline'
            : 'Cumulative laser trajectory against last month + end-of-month runway';
    }
});

// 5. Overview: Interactive Horizon Scrubber (updates the hero headline as you scrub across days)
(() => {
    const hits = document.querySelector('.ov-scrub-hits');
    const eyebrow = document.getElementById('ov-scrub-eyebrow');
    const val = document.getElementById('ov-scrub-val');
    const sub = document.getElementById('ov-scrub-sub');
    const deltaNote = document.querySelector('#ov-scrub-delta .ov-delta-note');
    if (!hits || !eyebrow || !val || !sub) return;

    const defaultEyebrow = eyebrow.textContent;
    const defaultVal = val.dataset.default;
    const defaultSub = sub.dataset.default;
    const defaultDeltaNote = deltaNote?.textContent;

    hits.addEventListener('pointerover', e => {
        const col = e.target.closest('.ov-scrub-col');
        if (!col) return;
        eyebrow.textContent = col.dataset.dateLabel;
        val.textContent = col.dataset.cumFmt;
        sub.textContent = col.dataset.dayFmt;
        if (deltaNote && col.dataset.prevFmt) deltaNote.textContent = 'Benchmark: ' + col.dataset.prevFmt;
    });

    hits.addEventListener('pointerleave', () => {
        eyebrow.textContent = defaultEyebrow;
        val.textContent = defaultVal;
        sub.textContent = defaultSub;
        if (deltaNote && defaultDeltaNote != null) deltaNote.textContent = defaultDeltaNote;
    });
})();

// 6. Overview: 1-Tap Preset Chips populate the inline Quick-Log bar
document.addEventListener('click', e => {
    const chip = e.target.closest('.ov-preset-chip');
    if (!chip) return;
    const form = document.getElementById('ov-quick-form');
    if (!form) return;
    const d = chip.dataset;
    document.getElementById('qf-title').value = d.fillTitle ?? '';
    document.getElementById('qf-price').value = d.fillPrice ?? '';
    document.getElementById('qf-cat').value = d.fillCategory ?? '';
    document.getElementById('qf-mode').value = d.fillMode ?? '0';
    form.classList.remove('is-flashed');
    void form.offsetWidth;
    form.classList.add('is-flashed');
    document.getElementById('qf-price').focus();
    document.getElementById('qf-price').select();
});

// 7. Overview: Interactive Category DNA Ring & Live Ledger Filter
(() => {
    const dnaList = document.querySelector('.ov-dna-list');
    const readout = document.getElementById('ov-donut-readout');
    const segs = document.querySelectorAll('.ov-donut-seg');

    function highlightCat(item) {
        if (!readout) return;
        if (!item) {
            readout.querySelector('.ov-donut-center__lbl').textContent = readout.dataset.defaultLbl;
            readout.querySelector('.ov-donut-center__val').textContent = readout.dataset.defaultVal;
            readout.querySelector('.ov-donut-center__sub').textContent = readout.dataset.defaultSub;
            segs.forEach(s => s.classList.remove('is-active', 'is-dim'));
            return;
        }
        const idx = item.dataset.catIdx;
        readout.querySelector('.ov-donut-center__lbl').textContent = item.dataset.catName;
        readout.querySelector('.ov-donut-center__val').textContent = item.dataset.catVal;
        readout.querySelector('.ov-donut-center__sub').textContent = item.dataset.catSub;
        segs.forEach(s => {
            const match = s.dataset.catIdx === idx;
            s.classList.toggle('is-active', match);
            s.classList.toggle('is-dim', !match);
        });
    }

    if (dnaList) {
        dnaList.addEventListener('pointerover', e => {
            const item = e.target.closest('.ov-dna-item');
            if (item) highlightCat(item);
        });
        dnaList.addEventListener('focusin', e => {
            const item = e.target.closest('.ov-dna-item');
            if (item) highlightCat(item);
        });
        dnaList.addEventListener('pointerleave', () => highlightCat(null));
        dnaList.addEventListener('focusout', e => {
            if (!dnaList.contains(e.relatedTarget)) highlightCat(null);
        });
        dnaList.addEventListener('click', e => {
            const item = e.target.closest('.ov-dna-item');
            if (!item) return;
            const cat = item.dataset.catName;
            const pill = [...document.querySelectorAll('[data-ledger-filter]')].find(
                b => b.dataset.ledgerFilter.toLowerCase() === cat.toLowerCase()
            );
            if (pill) {
                pill.click();
                document.querySelector('.ov-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    document.addEventListener('click', e => {
        const btn = e.target.closest('[data-ledger-filter]');
        if (!btn) return;
        const target = btn.dataset.ledgerFilter.toLowerCase();
        document.querySelectorAll('.ov-filter-pill').forEach(p => {
            p.classList.toggle('is-active', p.dataset.ledgerFilter.toLowerCase() === target);
        });
        const rows = document.querySelectorAll('#ov-ledger-rows .ov-tx');
        let shown = 0;
        rows.forEach(r => {
            const match = target === 'all' || r.dataset.txCat.toLowerCase() === target;
            r.hidden = !match;
            if (match) shown++;
        });
        const emptyMsg = document.getElementById('ov-ledger-empty-filter');
        if (emptyMsg) emptyMsg.hidden = shown > 0;
    });
})();
