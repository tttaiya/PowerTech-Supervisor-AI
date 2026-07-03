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

const state = { settings: [], knowledgeBases: [], pendingKnowledgeBase: null, createMessage: '', uploadMessage: '', bindMessage: '' };

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
    'rag.rerank_score_threshold',
    'rag.bound_knowledge_base_ids'
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

async function loadKnowledgeBases() {
    const res = await apiFetch('/api/admin/knowledge-bases');
    const payload = await res.json();
    state.knowledgeBases = payload.data || [];
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

function getBoundKnowledgeBaseIds() {
    const item = setting('rag.bound_knowledge_base_ids');
    return Array.isArray(item?.value) ? item.value : [];
}

function renderKnowledgePanel() {
    const ragRows = ragSettingKeys.filter(key => key !== 'rag.bound_knowledge_base_ids').map(key => setting(key)).filter(Boolean);
    const boundIds = getBoundKnowledgeBaseIds();
    const pendingKb = state.pendingKnowledgeBase;
    document.getElementById('knowledgePanel').innerHTML = `
        <h2>知识库与 RAG</h2>
        <section class="admin-section">
            <h3>添加知识库</h3>
            <form id="kbForm" class="inline-form">
                <input name="name" placeholder="知识库名称" required>
                <input name="code" placeholder="编码" required>
                <button id="createKbBtn">创建</button>
            </form>
            ${state.createMessage ? `<p class="kb-form-message">${escapeHtml(state.createMessage)}</p>` : ''}
            ${pendingKb ? `
                <div class="kb-upload-panel">
                    <div>
                        <strong>${escapeHtml(pendingKb.name)}</strong>
                        <small>${escapeHtml(pendingKb.code)} · 已创建，请选择知识文档</small>
                    </div>
                    <input id="kbDocumentInput" type="file" accept=".md,.txt,text/markdown,text/plain">
                    <div class="kb-upload-actions">
                        <button type="button" id="chooseKbDocumentBtn">选择文档</button>
                        <button type="button" id="clearKbUploadBtn">稍后上传</button>
                    </div>
                    <p class="kb-upload-hint">支持 Markdown（.md）和纯文本（.txt），建议使用 UTF-8 编码。</p>
                    ${state.uploadMessage ? `<p class="kb-upload-message">${escapeHtml(state.uploadMessage)}</p>` : ''}
                </div>
            ` : ''}
        </section>
        <section class="admin-section">
            <h3>绑定电力知识库</h3>
            <p class="kb-section-hint">勾选后点击保存绑定，聊天页默认会从这些知识库检索资料回答知识问题。</p>
            <div class="kb-bind-list">
                ${state.knowledgeBases.map(kb => `
                    <div class="kb-bind-row">
                        <input type="checkbox" value="${kb.id}" ${boundIds.includes(kb.id) ? 'checked' : ''}>
                        <span><strong>${escapeHtml(kb.name)}</strong><small>${escapeHtml(kb.code)} · ${escapeHtml(kb.status)}</small></span>
                        <div class="kb-row-actions">
                            <button type="button" data-toggle-kb="${kb.id}" data-status="${kb.status === 'enabled' ? 'disabled' : 'enabled'}">${kb.status === 'enabled' ? '停用' : '启用'}</button>
                            <button type="button" class="danger" data-delete-kb="${kb.id}" data-name="${escapeHtml(kb.name)}">删除</button>
                        </div>
                    </div>
                `).join('') || '<p class="empty-hint">暂无知识库，请先创建。</p>'}
            </div>
            <div class="admin-actions">
                <button id="saveKbBindingBtn">保存绑定</button>
            </div>
            ${state.bindMessage ? `<p class="kb-bind-message">${escapeHtml(state.bindMessage)}</p>` : ''}
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

    document.getElementById('kbForm').addEventListener('submit', async e => {
        e.preventDefault();
        const formElement = e.currentTarget;
        const form = new FormData(formElement);
        const name = String(form.get('name') || '').trim();
        const code = String(form.get('code') || '').trim();
        const button = document.getElementById('createKbBtn');
        if (!name || !code) {
            state.createMessage = '请填写知识库名称和编码';
            renderKnowledgePanel();
            return;
        }

        state.createMessage = '正在创建知识库...';
        button.disabled = true;

        try {
            const response = await apiFetch('/api/admin/knowledge-bases', {
                method: 'POST',
                body: JSON.stringify({ name, code })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.data) {
                state.createMessage = payload.detail || payload.message || `创建失败：${response.status}`;
                renderKnowledgePanel();
                return;
            }

            state.pendingKnowledgeBase = payload.data;
            state.createMessage = '知识库创建成功，请选择知识文档';
            state.uploadMessage = '';
            formElement.reset();
            await reloadAdminData();
            renderKnowledgePanel();
        } catch (error) {
            state.createMessage = `创建失败：${error.message}`;
            renderKnowledgePanel();
        } finally {
            button.disabled = false;
        }
    });

    document.getElementById('chooseKbDocumentBtn')?.addEventListener('click', () => {
        document.getElementById('kbDocumentInput')?.click();
    });

    document.getElementById('clearKbUploadBtn')?.addEventListener('click', () => {
        state.pendingKnowledgeBase = null;
        state.uploadMessage = '';
        renderKnowledgePanel();
    });

    document.getElementById('kbDocumentInput')?.addEventListener('change', async e => {
        const file = e.currentTarget.files?.[0];
        if (!file || !state.pendingKnowledgeBase) return;
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.md') && !fileName.endsWith('.txt')) {
            state.uploadMessage = '只支持上传 .md 或 .txt 文档';
            renderKnowledgePanel();
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        state.uploadMessage = `正在上传 ${file.name}...`;
        renderKnowledgePanel();

        const response = await apiFetch(`/api/admin/knowledge-bases/${state.pendingKnowledgeBase.id}/documents`, {
            method: 'POST',
            body: formData
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
            state.pendingKnowledgeBase = null;
            state.createMessage = '';
            state.uploadMessage = '';
        } else {
            state.uploadMessage = `上传失败：${payload.message || payload.detail || response.statusText}`;
        }
        await reloadAdminData();
        renderKnowledgePanel();
    });

    document.querySelectorAll('[data-toggle-kb]').forEach(btn => {
        btn.addEventListener('click', async () => {
            await apiFetch(`/api/admin/knowledge-bases/${btn.dataset.toggleKb}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: btn.dataset.status })
            });
            await reloadAdminData();
            renderKnowledgePanel();
        });
    });

    document.querySelectorAll('[data-delete-kb]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const confirmed = window.confirm(`确认删除知识库「${btn.dataset.name}」？`);
            if (!confirmed) return;
            await apiFetch(`/api/admin/knowledge-bases/${btn.dataset.deleteKb}`, {
                method: 'DELETE'
            });
            const nextBoundIds = getBoundKnowledgeBaseIds().filter(id => id !== btn.dataset.deleteKb);
            await saveSetting('rag.bound_knowledge_base_ids', nextBoundIds);
            state.knowledgeBases = state.knowledgeBases.filter(kb => kb.id !== btn.dataset.deleteKb);
            const boundSetting = setting('rag.bound_knowledge_base_ids');
            if (boundSetting) boundSetting.value = nextBoundIds;
            if (state.pendingKnowledgeBase?.id === btn.dataset.deleteKb) {
                state.pendingKnowledgeBase = null;
                state.createMessage = '';
                state.uploadMessage = '';
            }
            renderKnowledgePanel();
        });
    });

    document.getElementById('saveKbBindingBtn')?.addEventListener('click', async () => {
            const ids = Array.from(document.querySelectorAll('.kb-bind-list input[type="checkbox"]:checked')).map(input => input.value);
            await saveSetting('rag.bound_knowledge_base_ids', ids);
            state.bindMessage = ids.length ? `已绑定 ${ids.length} 个知识库` : '已清空默认绑定知识库';
            await reloadAdminData();
            renderKnowledgePanel();
        });

    document.getElementById('saveRagSettingsBtn').addEventListener('click', async () => {
        for (const item of ragRows) {
            const input = document.querySelector(`[data-setting="${CSS.escape(item.key)}"]`);
            await saveSetting(item.key, input.value);
        }
        await reloadAdminData();
        renderKnowledgePanel();
    });
}

async function reloadAdminData() {
    await Promise.all([loadSettings(), loadKnowledgeBases()]);
}

function showTab(tab) {
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
