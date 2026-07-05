const tokenStore = {
    get access() { return localStorage.getItem('access_token'); },
    get refresh() { return localStorage.getItem('refresh_token'); },
    set(pair) {
        localStorage.setItem('access_token', pair.access_token);
        localStorage.setItem('refresh_token', pair.refresh_token);
    },
    clear() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }
};

async function apiFetch(url, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (tokenStore.access) headers.set('Authorization', `Bearer ${tokenStore.access}`);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && retry && tokenStore.refresh) {
        const refreshed = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: tokenStore.refresh })
        });
        if (refreshed.ok) {
            tokenStore.set(await refreshed.json());
            return apiFetch(url, options, false);
        }
    }
    if (response.status === 401) {
        tokenStore.clear();
        location.href = '/';
    }
    return response;
}

const state = {
    settings: [],
    ragKnowledgeBases: [],
    ragScope: [],
    ragMessage: '',
    kmConsoleUrl: '/knowledge/'
};

const modelSettingKeys = [
    'llm.base_url',
    'llm.api_key',
    'llm.chat_model',
    'llm.timeout_seconds'
];

const ragSettingKeys = [
    'rag.vector_top_k',
    'rag.vector_score_threshold',
    'rag.rerank_top_n',
    'rag.rerank_score_threshold'
];

function setting(key) {
    return state.settings.find(item => item.key === key);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

async function saveSetting(key, value) {
    await apiFetch(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value })
    });
}

async function readJson(response) {
    return response.json().catch(() => ({}));
}

async function loadMe() {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return;
    const me = await res.json();
    document.getElementById('adminUser').textContent = `${me.display_name || me.username}`;
}

async function loadDashboard() {
    const [summaryRes, trendRes] = await Promise.all([
        apiFetch('/api/admin/dashboard/summary'),
        apiFetch('/api/admin/dashboard/qa-trend')
    ]);
    const summary = await summaryRes.json();
    const trend = await trendRes.json();
    document.getElementById('dashboardPanel').innerHTML = `
        <h2>运营总览</h2>
        <div class="metric-grid">
            <div class="metric-card"><span>用户数</span><strong>${summary.user_count}</strong></div>
            <div class="metric-card"><span>知识库</span><strong>${summary.knowledge_base_count}</strong></div>
            <div class="metric-card"><span>文档</span><strong>${summary.document_count}</strong></div>
            <div class="metric-card"><span>切片</span><strong>${summary.chunk_count}</strong></div>
            <div class="metric-card"><span>问答</span><strong>${summary.qa_count}</strong></div>
        </div>
        <section class="admin-section">
            <h3>近 30 天知识问答日活趋势</h3>
            <p class="dashboard-hint">直观查看业务使用量波动</p>
            ${renderTrendBars(trend.items || [])}
        </section>
    `;
}

function renderTrendBars(items) {
    if (!items.length) {
        return '<p class="empty-hint">暂无趋势数据。</p>';
    }
    const maxCount = Math.max(1, ...items.map(item => Number(item.qa_count) || 0));
    return `
        <div class="trend-bar-chart">
            ${items.map(item => {
                const count = Number(item.qa_count) || 0;
                const height = count ? Math.max(8, Math.round((count / maxCount) * 120)) : 4;
                const label = String(item.date || '').slice(5);
                return `
                    <div class="trend-bar-item" title="${escapeHtml(item.date)}：${count} 次问答">
                        <div class="trend-bar-value">${count}</div>
                        <div class="trend-bar-track">
                            <div class="trend-bar" style="height: ${height}px"></div>
                        </div>
                        <div class="trend-bar-label">${escapeHtml(label)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function loadSettings() {
    const res = await apiFetch('/api/admin/settings');
    state.settings = await res.json();
}

async function loadRagKnowledgeBases() {
    const res = await apiFetch('/api/admin/rag/knowledge-bases');
    const payload = await readJson(res);
    if (!res.ok) {
        state.ragKnowledgeBases = [];
        state.ragMessage = payload.detail || payload.message || `加载正式知识库失败：${res.status}`;
        return;
    }
    const data = payload.data || {};
    state.ragKnowledgeBases = Array.isArray(data.items) ? data.items : [];
    if (typeof data.console_url === 'string' && data.console_url.trim()) {
        state.kmConsoleUrl = data.console_url.trim();
    }
}

async function loadRagScope() {
    const res = await apiFetch('/api/admin/rag/knowledge-scope');
    const payload = await readJson(res);
    if (!res.ok) {
        state.ragScope = [];
        state.ragMessage = payload.detail || payload.message || `加载默认范围失败：${res.status}`;
        return;
    }
    const data = payload.data || {};
    state.ragScope = Array.isArray(data.knowledge_base_ids) ? data.knowledge_base_ids.map(String) : [];
    if (typeof data.console_url === 'string' && data.console_url.trim()) {
        state.kmConsoleUrl = data.console_url.trim();
    }
}

function renderInput(item, options = {}) {
    const type = options.type || (item.value_type === 'int' || item.value_type === 'float' ? 'number' : 'text');
    const value = item.is_secret && item.value === '******' ? '' : item.value;
    const attrs = [
        `data-setting="${item.key}"`,
        `value="${escapeHtml(value)}"`,
        type === 'number' ? 'step="any"' : '',
        options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : '',
        item.is_secret ? 'type="password"' : `type="${type}"`
    ].filter(Boolean).join(' ');
    return `<input ${attrs}>`;
}

function renderModelPanel() {
    const rows = modelSettingKeys.map(key => setting(key)).filter(Boolean);
    document.getElementById('modelPanel').innerHTML = `
        <h2>模型设置</h2>
        <div class="admin-form-grid">
            ${rows.map(item => `
                <label class="setting-row">
                    <span>${item.description}<small>${item.key}</small></span>
                    ${renderInput(item, { placeholder: item.is_secret ? '留空则不修改' : '' })}
                </label>
            `).join('')}
        </div>
        <div class="admin-actions">
            <button id="saveModelSettingsBtn">保存模型设置</button>
        </div>
    `;
    document.getElementById('saveModelSettingsBtn').addEventListener('click', async () => {
        for (const item of rows) {
            const input = document.querySelector(`[data-setting="${CSS.escape(item.key)}"]`);
            if (item.is_secret && !input.value) continue;
            await saveSetting(item.key, input.value);
        }
        await reloadAdminData();
        renderModelPanel();
    });
}

function renderKnowledgeRows() {
    if (!state.ragKnowledgeBases.length) {
        return '<p class="empty-hint">当前没有可用于智能问答的正式知识库。</p>';
    }
    return state.ragKnowledgeBases.map(kb => {
        const checked = state.ragScope.includes(String(kb.id)) ? 'checked' : '';
        const readyCount = Number(kb.ready_document_count || 0);
        const statusHint = readyCount > 0 ? `已就绪 ${readyCount} 篇` : '暂无可检索文档';
        return `
            <label class="kb-bind-row">
                <input type="checkbox" value="${escapeHtml(String(kb.id))}" ${checked}>
                <span>
                    <strong>${escapeHtml(kb.name || '')}</strong>
                    <small>${escapeHtml(kb.document_type || '未分类')} · 文档 ${Number(kb.document_count || 0)} · ${escapeHtml(statusHint)}</small>
                </span>
            </label>
        `;
    }).join('');
}

function renderKnowledgePanel() {
    const ragRows = ragSettingKeys.map(key => setting(key)).filter(Boolean);
    document.getElementById('knowledgePanel').innerHTML = `
        <h2>知识库范围与 RAG</h2>
        <section class="admin-section">
            <h3>正式知识库范围</h3>
            <p class="kb-section-hint">智能问答只会从这里选中的正式知识库中检索资料。没有就绪文档的知识库会保留展示，后续文档就绪后可直接生效。</p>
            <div class="kb-bind-list">
                ${renderKnowledgeRows()}
            </div>
            <div class="admin-actions">
                <button id="saveRagScopeBtn">保存默认范围</button>
            </div>
            ${state.ragMessage ? `<p class="kb-bind-message">${escapeHtml(state.ragMessage)}</p>` : ''}
        </section>
        <section class="admin-section">
            <h3>进入知识管理</h3>
            <p class="kb-section-hint">知识库创建、文档上传、审核、切片和向量处理统一在知识管理模块完成。</p>
            <div class="admin-actions">
                <button id="openKnowledgeConsoleBtn" type="button">进入知识管理</button>
            </div>
        </section>
        <section class="admin-section">
            <h3>RAG 参数</h3>
            <div class="admin-form-grid">
                ${ragRows.map(item => `
                    <label class="setting-row">
                        <span>${item.description}<small>${item.key}</small></span>
                        ${renderInput(item)}
                    </label>
                `).join('')}
            </div>
            <div class="admin-actions">
                <button id="saveRagSettingsBtn">保存 RAG 设置</button>
            </div>
        </section>
    `;

    document.getElementById('saveRagScopeBtn')?.addEventListener('click', async () => {
        const ids = Array.from(document.querySelectorAll('.kb-bind-list input[type="checkbox"]:checked')).map(input => input.value);
        const response = await apiFetch('/api/admin/rag/knowledge-scope', {
            method: 'PUT',
            body: JSON.stringify({ knowledge_base_ids: ids })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            state.ragMessage = payload.detail || payload.message || `保存失败：${response.status}`;
            renderKnowledgePanel();
            return;
        }
        const data = payload.data || {};
        state.ragScope = Array.isArray(data.knowledge_base_ids) ? data.knowledge_base_ids.map(String) : ids;
        state.ragMessage = state.ragScope.length ? `已保存 ${state.ragScope.length} 个正式知识库范围` : '已清空默认知识库范围';
        if (typeof data.console_url === 'string' && data.console_url.trim()) {
            state.kmConsoleUrl = data.console_url.trim();
        }
        renderKnowledgePanel();
    });

    document.getElementById('saveRagSettingsBtn')?.addEventListener('click', async () => {
        for (const item of ragRows) {
            const input = document.querySelector(`[data-setting="${CSS.escape(item.key)}"]`);
            await saveSetting(item.key, input.value);
        }
        await reloadAdminData();
        renderKnowledgePanel();
    });

    document.getElementById('openKnowledgeConsoleBtn')?.addEventListener('click', () => {
        window.location.href = state.kmConsoleUrl;
    });
}

async function reloadAdminData() {
    await Promise.all([loadSettings(), loadRagKnowledgeBases(), loadRagScope()]);
}

function showTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.adminTab === tab);
    });
    document.querySelectorAll('.admin-panel').forEach(panel => panel.style.display = 'none');
    if (tab === 'dashboard') document.getElementById('dashboardPanel').style.display = 'block';
    if (tab === 'models') {
        renderModelPanel();
        document.getElementById('modelPanel').style.display = 'block';
    }
    if (tab === 'knowledge') {
        renderKnowledgePanel();
        document.getElementById('knowledgePanel').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[data-admin-tab]').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.adminTab)));
    await loadMe();
    await Promise.all([loadDashboard(), reloadAdminData()]);
    showTab('dashboard');
});
