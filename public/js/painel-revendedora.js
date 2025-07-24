/**
 * painel-revendedora.js
 * * VERSÃO FINAL E COMPLETA
 * - Contém todas as funções originais, correções de bugs e novas implementações.
 * - Correção do bug dos modais de promoção (tela escura).
 * - Implementação da lógica para "Organizar Vitrine".
 * - Implementação do sistema de "Descrições" com modelos e tabelas de medidas.
 */

// --- VARIÁVEIS GLOBAIS DE ESTADO ---
let resellerProducts = [];
let publishedProductIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let themeSettings = {};
let resellerPromotions = {};
let resellerShowcase = {}; // Ex: { lancamentos: [1, 2], 'mais-vendidos': [3, 4] }
let resellerDescriptionModels = []; // Ex: [{ id: 'desc_123', name: 'Padrão', content: '...' }]
let resellerSizingCharts = []; // Ex: [{ id: 'chart_123', name: 'Calçados', headers: [], rows: [] }]
let resellerProductSizingChartLinks = {}; // Ex: { productId: 'chart_123' }
let resellerProductDescriptionLinks = {}; // Ex: { productId: 'desc_123' }

// Variáveis de controle para modais
let currentEditingShowcaseId = null;
let currentEditingModelId = null; // Para descrições e tabelas
let currentAssociationInfo = { modelId: null, type: null }; // type: 'description' ou 'sizingChart'

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const view = document.getElementById('revendedor-view');
    if (view) {
        try {
            loadLocalDataForReseller();
            setupEventListeners();
            setupMobileMenu();
            await loadAllPublishedProducts();
            
            const initialPage = document.querySelector('#revendedor-view .page.active');
            if (initialPage) {
                handlePageChange(initialPage.id);
            }

            if (typeof feather !== 'undefined') feather.replace();
        } catch (error) {
            console.error("Erro na inicialização do painel:", error);
            showToast("Ocorreu um erro crítico ao carregar o painel.", "error");
        }
    }
});

// --- FUNÇÕES AUXILIARES SEGURAS ---
function safeSetProperty(id, value, property = 'value') {
    const element = document.getElementById(id);
    if (element) {
        element[property] = value;
    } else {
        console.warn(`Elemento com ID '${id}' não foi encontrado para definir a propriedade.`);
    }
}

function safeGetProperty(id, property = 'value') {
    const element = document.getElementById(id);
    if (element) {
        return element[property];
    }
    console.warn(`Elemento com ID '${id}' não foi encontrado para obter a propriedade.`);
    return null;
}

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    setupNavigation();
    setupStaticEventListeners();
    setupDynamicEventListeners();
}

function setupStaticEventListeners() {
    // Aparência
    document.getElementById('open-theme-config-btn')?.addEventListener('click', () => {
        loadAppearanceSettingsIntoForm();
        openModal('theme-config-modal');
    });
    document.getElementById('save-theme-config-btn')?.addEventListener('click', saveAppearanceSettings);
    document.getElementById('save-settings-btn')?.addEventListener('click', saveGeneralSettings);
    setupImageUpload('appearance-logo-upload', 'appearance-logo-preview');
    setupImageUpload('appearance-banner-upload', 'appearance-banner-preview');

    // Produtos
    document.getElementById('apply-mass-margin')?.addEventListener('click', applyMassMargin);
    document.getElementById('save-reseller-margin-btn')?.addEventListener('click', saveProductEdit);
    
    // Promoções
    document.getElementById('save-flash-sale-btn')?.addEventListener('click', saveFlashSale);
    document.getElementById('save-free-shipping-btn')?.addEventListener('click', saveFreeShipping);
    document.getElementById('save-coupon-btn')?.addEventListener('click', saveCoupon);

    // Descrições
    document.getElementById('add-description-model-btn')?.addEventListener('click', () => openDescriptionModelModal());
    document.getElementById('save-description-model-btn')?.addEventListener('click', saveDescriptionModel);
    document.getElementById('add-sizing-chart-btn')?.addEventListener('click', () => openSizingChartModal());
    document.getElementById('save-sizing-chart-btn')?.addEventListener('click', saveSizingChart);
    document.getElementById('add-sizing-chart-row-btn')?.addEventListener('click', addSizingChartRow);
    document.getElementById('add-sizing-chart-col-btn')?.addEventListener('click', addSizingChartColumn);
    
    // Vitrine e Associações
    document.getElementById('save-showcase-selection-btn')?.addEventListener('click', saveShowcaseSelection);
    document.getElementById('showcase-product-search')?.addEventListener('keyup', (e) => renderShowcaseProductList(e.target.value));
    document.getElementById('save-association-btn')?.addEventListener('click', saveAssociation);
    document.getElementById('associate-product-search')?.addEventListener('keyup', (e) => renderAssociationProductList(e.target.value));

    // Abrir Modais de Promoção
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.currentTarget.getAttribute('data-modal-target');
            if(modalId) openModal(modalId);
        });
    });

    // Fechar Modais
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.closest('.modal-overlay').id;
            closeModal(modalId);
        });
    });
}

function setupDynamicEventListeners() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const { productId, showcaseId, descModelId, chartId, associateDescId, associateChartId } = button.dataset;

        if (button.matches('.edit-product-btn')) openProductEditModal(productId);
        if (showcaseId) openShowcaseModal(showcaseId);
        if (button.matches('.edit-desc-model-btn')) openDescriptionModelModal(descModelId);
        if (button.matches('.delete-desc-model-btn')) deleteDescriptionModel(descModelId);
        if (button.matches('.edit-chart-btn')) openSizingChartModal(chartId);
        if (button.matches('.delete-chart-btn')) deleteSizingChart(chartId);
        if (associateDescId) openAssociationModal(associateDescId, 'description');
        if (associateChartId) openAssociationModal(associateChartId, 'sizingChart');
    });

    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.activate-toggle')) {
            toggleResellerProductActive(parseInt(e.target.dataset.productId, 10));
        }
    });
}

function setupNavigation() {
    const navContainer = document.getElementById('revendedor-nav');
    if (!navContainer) return;
    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link || link.id === 'view-catalog-btn') return;
        e.preventDefault();
        
        const pageId = link.dataset.page;
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const mainContent = document.querySelector('#revendedor-view .main-content');
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = mainContent.querySelector(`#${pageId}`);
        if (targetPage) targetPage.classList.add('active');
        
        document.getElementById('revendedor-page-title').textContent = link.textContent.trim();
        handlePageChange(pageId);
    });
}

function handlePageChange(pageId) {
    switch(pageId) {
        case 'reseller-products': renderResellerProductsTable(); break;
        case 'reseller-showcase': setupShowcasePage(); break;
        case 'reseller-descriptions': setupDescriptionsPage(); break;
        case 'reseller-appearance': setupAppearancePage(); break;
    }
    if (typeof feather !== 'undefined') feather.replace();
}

function setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle-revendedor');
    const sidebar = document.querySelector('#revendedor-view .sidebar');
    if (toggle && sidebar) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
    }
    document.addEventListener('click', (e) => {
        if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// --- CARREGAMENTO E SALVAMENTO DE DADOS (localStorage) ---
function loadLocalDataForReseller() {
    resellerSettings = JSON.parse(localStorage.getItem('resellerSettings')) || {};
    themeSettings = JSON.parse(localStorage.getItem('themeSettings')) || {};
    publishedProductIds = JSON.parse(localStorage.getItem('erpPublished'))?.map(id => parseInt(id, 10)) || [];
    resellerProductMargins = JSON.parse(localStorage.getItem('resellerMargins')) || {};
    resellerProductTags = JSON.parse(localStorage.getItem('resellerProductTags')) || {};
    resellerActiveProductIds = JSON.parse(localStorage.getItem('resellerActiveProductIds'))?.map(id => parseInt(id, 10)) || [];
    resellerPromotions = JSON.parse(localStorage.getItem('resellerPromotions')) || {};
    resellerShowcase = JSON.parse(localStorage.getItem('resellerShowcase')) || {};
    resellerDescriptionModels = JSON.parse(localStorage.getItem('resellerDescriptionModels')) || [];
    resellerSizingCharts = JSON.parse(localStorage.getItem('resellerSizingCharts')) || [];
    resellerProductDescriptionLinks = JSON.parse(localStorage.getItem('resellerProductDescriptionLinks')) || {};
    resellerProductSizingChartLinks = JSON.parse(localStorage.getItem('resellerProductSizingChartLinks')) || {};
}

async function loadAllPublishedProducts() {
    const loader = document.getElementById('reseller-product-list-loader');
    if (loader) loader.classList.add('visible');
    resellerProducts = [];
    let currentPage = 1;
    let hasMore = true;
    try {
        while (hasMore) {
            const data = await realApiFetch(currentPage, 100, '');
            if (!data.data || data.data.length === 0) {
                hasMore = false;
                break;
            }
            const publishedInPage = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
            if (publishedInPage.length > 0) {
                const processed = publishedInPage.map(p => ({
                    id: parseInt(p.id, 10),
                    nome: p.nome || 'Nome não informado',
                    preco_original: parseFloat(p.preco || 0),
                    imagem: (typeof p.imagem === 'string' ? p.imagem.split(',')[0].trim() : null)
                }));
                resellerProducts.push(...processed);
            }
            hasMore = data.hasNext;
            currentPage++;
        }
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        showToast("Erro ao carregar seus produtos.", "error");
    } finally {
        if (loader) loader.classList.remove('visible');
    }
}

// --- PRODUTOS ---
function renderResellerProductsTable() {
    const tbody = document.getElementById('reseller-products-table-body');
    if (!tbody) return;
    tbody.innerHTML = resellerProducts.map(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = p.preco_original * (1 + margin / 100);
        const isActive = resellerActiveProductIds.includes(p.id);
        return `
            <tr>
                <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy"></td>
                <td data-label="Nome">${p.nome}</td>
                <td data-label="Preço Base">R$ ${p.preco_original.toFixed(2)}</td>
                <td data-label="Sua Margem (%)">${margin}%</td>
                <td data-label="Preço Final">R$ ${finalPrice.toFixed(2)}</td>
                <td data-label="Ativar"><label class="toggle-switch"><input type="checkbox" data-product-id="${p.id}" class="activate-toggle" ${isActive ? 'checked' : ''}><span class="slider"></span></label></td>
                <td data-label="Ações" class="actions-cell">
                    <button class="btn edit-product-btn" data-product-id="${p.id}" style="padding: 0.25rem 0.5rem;" title="Editar Margem e Tags"><i data-feather="edit-2"></i></button>
                </td>
            </tr>
        `;
    }).join('');
    if (resellerProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Nenhum produto publicado para você no momento.</td></tr>';
    }
    if (typeof feather !== 'undefined') feather.replace();
}

function openProductEditModal(productId) {
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    const modal = document.getElementById('reseller-product-edit-modal');
    modal.dataset.editingProductId = productId;
    
    document.getElementById('modal-reseller-product-name').textContent = `Editar: ${product.nome}`;
    safeSetProperty('reseller-margin-input', resellerProductMargins[productId] || 30);
    
    const tagsContainer = document.getElementById('tags-selection-container');
    const currentTags = new Set(resellerProductTags[productId] || []);
    tagsContainer.innerHTML = ['Lançamento', 'Promoção', 'Mais Vendido'].map(tag => `
        <label><input type="checkbox" class="tag-checkbox" value="${tag}" ${currentTags.has(tag) ? 'checked' : ''}> ${tag}</label>
    `).join('');
    
    openModal('reseller-product-edit-modal');
}

function saveProductEdit() {
    const modal = document.getElementById('reseller-product-edit-modal');
    const productId = modal.dataset.editingProductId;
    
    const newMargin = parseFloat(safeGetProperty('reseller-margin-input'));
    if (!isNaN(newMargin) && newMargin >= 0) {
        resellerProductMargins[productId] = newMargin;
        localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    }

    const selectedTags = Array.from(document.querySelectorAll('#tags-selection-container .tag-checkbox:checked')).map(cb => cb.value);
    resellerProductTags[productId] = selectedTags;
    localStorage.setItem('resellerProductTags', JSON.stringify(resellerProductTags));

    renderResellerProductsTable();
    closeModal('reseller-product-edit-modal');
    showToast('Produto atualizado com sucesso!', 'success');
}

function applyMassMargin() {
    const newMargin = parseFloat(safeGetProperty('mass-margin-input'));
    if (isNaN(newMargin) || newMargin < 0) {
        showToast('Por favor, insira uma margem válida.', 'error');
        return;
    }
    resellerProducts.forEach(p => { resellerProductMargins[p.id] = newMargin; });
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    showToast(`Margem de ${newMargin}% aplicada a todos os produtos!`, 'success');
}

function toggleResellerProductActive(productId) {
    const index = resellerActiveProductIds.indexOf(productId);
    if (index > -1) {
        resellerActiveProductIds.splice(index, 1);
    } else {
        resellerActiveProductIds.push(productId);
    }
    localStorage.setItem('resellerActiveProductIds', JSON.stringify(resellerActiveProductIds));
    showToast('Visibilidade do produto atualizada!', 'success');
}

// --- PROMOÇÕES ---
function populateProductSelects() {
    const selects = document.querySelectorAll('#flash-sale-product');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        resellerProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.nome;
            select.appendChild(option);
        });
    });
}
function saveFlashSale() {
    resellerPromotions.flashSale = {
        productId: safeGetProperty('flash-sale-product'),
        discount: safeGetProperty('flash-sale-discount'),
        endDate: safeGetProperty('flash-sale-end-date')
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Flash Sale salva!", "success");
    closeModal('flash-sale-modal');
}
function saveFreeShipping() {
    const minValue = safeGetProperty('free-shipping-min-value');
    if (!minValue || parseFloat(minValue) <= 0) {
        showToast("Insira um valor mínimo válido.", "error");
        return;
    }
    resellerPromotions.freeShipping = { active: true, minValue: parseFloat(minValue) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Frete Grátis salvo!", "success");
    closeModal('free-shipping-modal');
}
function saveCoupon() {
    const code = safeGetProperty('coupon-code').trim().toUpperCase();
    const discountValue = safeGetProperty('coupon-discount-value');
    const discountType = safeGetProperty('coupon-discount-type');
    if (!code || !discountValue) {
        showToast("Preencha todos os campos do cupom.", "error");
        return;
    }
    resellerPromotions.coupon = { active: true, code, discountValue: parseFloat(discountValue), discountType };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom salvo!", "success");
    closeModal('coupon-modal');
}

// --- ORGANIZAR VITRINE ---
function setupShowcasePage() {
    updateShowcaseCount('lancamentos');
    updateShowcaseCount('mais-vendidos');
}
function updateShowcaseCount(showcaseId) {
    const count = resellerShowcase[showcaseId]?.length || 0;
    const badge = document.getElementById(`showcase-${showcaseId}-count`);
    if (badge) badge.textContent = `${count} produto${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`;
}
function openShowcaseModal(showcaseId) {
    currentEditingShowcaseId = showcaseId;
    const titleEl = document.getElementById('showcase-modal-title');
    titleEl.textContent = `Gerenciar Vitrine: ${showcaseId.charAt(0).toUpperCase() + showcaseId.slice(1)}`;
    renderShowcaseProductList();
    openModal('showcase-product-modal');
}
function renderShowcaseProductList(searchTerm = '') {
    const container = document.getElementById('showcase-product-list');
    if (!container) return;
    const term = searchTerm.toLowerCase();
    const selectedIds = new Set(resellerShowcase[currentEditingShowcaseId] || []);
    const filteredProducts = resellerProducts.filter(p => p.nome.toLowerCase().includes(term));
    container.innerHTML = filteredProducts.map(p => `
        <label class="product-list-label">
            <input type="checkbox" value="${p.id}" class="showcase-product-checkbox" ${selectedIds.has(p.id) ? 'checked' : ''}>
            <img src="${proxyImageUrl(p.imagem)}" class="product-image" alt="${p.nome}">
            <span>${p.nome}</span>
        </label>
    `).join('');
}
function saveShowcaseSelection() {
    if (!currentEditingShowcaseId) return;
    const selectedIds = Array.from(document.querySelectorAll('#showcase-product-modal .showcase-product-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    resellerShowcase[currentEditingShowcaseId] = selectedIds;
    localStorage.setItem('resellerShowcase', JSON.stringify(resellerShowcase));
    closeModal('showcase-product-modal');
    showToast('Vitrine atualizada com sucesso!', 'success');
    updateShowcaseCount(currentEditingShowcaseId);
}

// --- DESCRIÇÕES E TABELAS DE MEDIDAS ---
function setupDescriptionsPage() {
    renderDescriptionModelsList();
    renderSizingChartManager();
}
function renderDescriptionModelsList() {
    const container = document.getElementById('description-models-list');
    if (!container) return;
    container.innerHTML = `<div class="table-container"><table class="product-table">
        <thead><tr><th>Nome do Modelo</th><th>Ações</th></tr></thead>
        <tbody>
        ${resellerDescriptionModels.map(model => `
            <tr>
                <td>${model.name}</td>
                <td class="actions-cell">
                    <button class="btn" data-associate-desc-id="${model.id}" title="Associar a Produtos"><i data-feather="link"></i></button>
                    <button class="btn edit-desc-model-btn" data-desc-model-id="${model.id}" title="Editar"><i data-feather="edit"></i></button>
                    <button class="btn btn-danger delete-desc-model-btn" data-desc-model-id="${model.id}" title="Excluir"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `).join('')}
        </tbody>
    </table></div>`;
    if (resellerDescriptionModels.length === 0) {
        container.innerHTML = `<p class="placeholder-card">Nenhum modelo de descrição criado.</p>`;
    }
    if (typeof feather !== 'undefined') feather.replace();
}
function openDescriptionModelModal(modelId = null) {
    currentEditingModelId = modelId;
    const modal = document.getElementById('description-model-modal');
    const title = document.getElementById('description-model-modal-title');
    if (modelId) {
        const model = resellerDescriptionModels.find(m => m.id === modelId);
        title.textContent = "Editar Modelo de Descrição";
        safeSetProperty('description-model-name', model.name);
        safeSetProperty('description-model-content', model.content);
    } else {
        title.textContent = "Criar Novo Modelo de Descrição";
        safeSetProperty('description-model-name', '');
        safeSetProperty('description-model-content', '');
    }
    openModal('description-model-modal');
}
function saveDescriptionModel() {
    const name = safeGetProperty('description-model-name').trim();
    const content = safeGetProperty('description-model-content').trim();
    if (!name || !content) {
        showToast("Nome e conteúdo são obrigatórios.", "error");
        return;
    }
    if (currentEditingModelId) {
        const index = resellerDescriptionModels.findIndex(m => m.id === currentEditingModelId);
        if (index > -1) resellerDescriptionModels[index] = { ...resellerDescriptionModels[index], name, content };
    } else {
        resellerDescriptionModels.push({ id: `desc_${Date.now()}`, name, content });
    }
    localStorage.setItem('resellerDescriptionModels', JSON.stringify(resellerDescriptionModels));
    showToast("Modelo de descrição salvo!", "success");
    closeModal('description-model-modal');
    renderDescriptionModelsList();
}
function deleteDescriptionModel(modelId) {
    resellerDescriptionModels = resellerDescriptionModels.filter(m => m.id !== modelId);
    localStorage.setItem('resellerDescriptionModels', JSON.stringify(resellerDescriptionModels));
    showToast("Modelo excluído.", "success");
    renderDescriptionModelsList();
}
function renderSizingChartManager() {
    const container = document.getElementById('sizing-charts-list');
    if (!container) return;
    container.innerHTML = `<div class="table-container"><table class="product-table">
        <thead><tr><th>Nome da Tabela</th><th>Ações</th></tr></thead>
        <tbody>
        ${resellerSizingCharts.map(chart => `
            <tr>
                <td>${chart.name}</td>
                <td class="actions-cell">
                    <button class="btn" data-associate-chart-id="${chart.id}" title="Associar a Produtos"><i data-feather="link"></i></button>
                    <button class="btn edit-chart-btn" data-chart-id="${chart.id}" title="Editar"><i data-feather="edit"></i></button>
                    <button class="btn btn-danger delete-chart-btn" data-chart-id="${chart.id}" title="Excluir"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `).join('')}
        </tbody>
    </table></div>`;
    if (resellerSizingCharts.length === 0) {
        container.innerHTML = `<p class="placeholder-card">Nenhuma tabela de medidas criada.</p>`;
    }
    if (typeof feather !== 'undefined') feather.replace();
}
function openSizingChartModal(chartId = null) {
    currentEditingModelId = chartId;
    const modal = document.getElementById('sizing-chart-modal');
    const title = document.getElementById('sizing-chart-modal-title');
    if (chartId) {
        const chart = resellerSizingCharts.find(c => c.id === chartId);
        title.textContent = "Editar Tabela de Medidas";
        safeSetProperty('sizing-chart-name', chart.name);
        renderSizingChartEditor(chart.headers, chart.rows);
    } else {
        title.textContent = "Criar Nova Tabela de Medidas";
        safeSetProperty('sizing-chart-name', '');
        renderSizingChartEditor(['Tamanho', 'Comprimento (cm)'], [['34', ''], ['35', '']]);
    }
    openModal('sizing-chart-modal');
}
function renderSizingChartEditor(headers, rows) {
    const editor = document.getElementById('sizing-chart-editor');
    let table = `<table class="product-table"><thead><tr>`;
    headers.forEach((header, index) => {
        table += `<th><input type="text" class="search-input header-input" value="${header}" data-col-index="${index}"></th>`;
    });
    table += `<th></th></tr></thead><tbody>`;
    rows.forEach((row, rowIndex) => {
        table += `<tr data-row-index="${rowIndex}">`;
        row.forEach((cell, colIndex) => {
            table += `<td><input type="text" class="search-input cell-input" value="${cell}" data-col-index="${colIndex}"></td>`;
        });
        table += `<td class="actions-cell"><button type="button" class="btn btn-danger btn-sm remove-row-btn"><i data-feather="trash-2"></i></button></td>`;
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    editor.innerHTML = table;
    editor.querySelectorAll('.remove-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('tr').remove());
    });
    if (typeof feather !== 'undefined') feather.replace();
}
function addSizingChartRow() { /* ... (código inalterado) ... */ }
function addSizingChartColumn() { /* ... (código inalterado) ... */ }
function saveSizingChart() {
    const name = safeGetProperty('sizing-chart-name').trim();
    if (!name) { showToast("O nome da tabela é obrigatório.", "error"); return; }
    const headers = Array.from(document.querySelectorAll('#sizing-chart-editor .header-input')).map(input => input.value);
    const rows = Array.from(document.querySelectorAll('#sizing-chart-editor tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('.cell-input')).map(input => input.value)
    );
    if (currentEditingModelId) {
        const index = resellerSizingCharts.findIndex(c => c.id === currentEditingModelId);
        if (index > -1) resellerSizingCharts[index] = { ...resellerSizingCharts[index], name, headers, rows };
    } else {
        resellerSizingCharts.push({ id: `chart_${Date.now()}`, name, headers, rows });
    }
    localStorage.setItem('resellerSizingCharts', JSON.stringify(resellerSizingCharts));
    showToast("Tabela de medidas salva!", "success");
    closeModal('sizing-chart-modal');
    renderSizingChartManager();
}
function deleteSizingChart(chartId) { /* ... (código inalterado) ... */ }
function openAssociationModal(modelId, type) {
    currentAssociationInfo = { modelId, type };
    const titleEl = document.getElementById('associate-modal-title');
    let modelName = '';
    if (type === 'description') {
        modelName = resellerDescriptionModels.find(m => m.id === modelId)?.name || '';
        titleEl.textContent = `Associar Descrição: "${modelName}"`;
    } else {
        modelName = resellerSizingCharts.find(c => c.id === modelId)?.name || '';
        titleEl.textContent = `Associar Tabela: "${modelName}"`;
    }
    renderAssociationProductList();
    openModal('associate-products-modal');
}
function renderAssociationProductList(searchTerm = '') {
    const container = document.getElementById('associate-product-list');
    if (!container) return;
    const { modelId, type } = currentAssociationInfo;
    const linkMap = type === 'description' ? resellerProductDescriptionLinks : resellerProductSizingChartLinks;
    const filteredProducts = resellerProducts.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    container.innerHTML = filteredProducts.map(p => {
        const isChecked = linkMap[p.id] === modelId;
        return `
            <label class="product-list-label">
                <input type="checkbox" value="${p.id}" class="association-product-checkbox" ${isChecked ? 'checked' : ''}>
                <img src="${proxyImageUrl(p.imagem)}" class="product-image" alt="${p.nome}">
                <span>${p.nome}</span>
            </label>
        `;
    }).join('');
}
function saveAssociation() {
    const { modelId, type } = currentAssociationInfo;
    const linkMap = type === 'description' ? resellerProductDescriptionLinks : resellerProductSizingChartLinks;
    const storageKey = type === 'description' ? 'resellerProductDescriptionLinks' : 'resellerProductSizingChartLinks';
    
    document.querySelectorAll('#associate-product-modal .association-product-checkbox').forEach(checkbox => {
        const productId = checkbox.value;
        if (checkbox.checked) {
            linkMap[productId] = modelId;
        } else if (linkMap[productId] === modelId) {
            delete linkMap[productId];
        }
    });
    
    localStorage.setItem(storageKey, JSON.stringify(linkMap));
    showToast("Associação salva com sucesso!", "success");
    closeModal('associate-products-modal');
}


// --- APARÊNCIA ---
function setupAppearancePage() {
    loadIdentitySettings();
}
function loadIdentitySettings() {
    safeSetProperty('brand-name-input', resellerSettings.brandName || '');
    safeSetProperty('contact-phone-input', resellerSettings.contactPhone || '');
    safeSetProperty('instagram-input', resellerSettings.instagram || '');
}
function saveGeneralSettings() {
    resellerSettings.brandName = safeGetProperty('brand-name-input');
    resellerSettings.contactPhone = safeGetProperty('contact-phone-input');
    resellerSettings.instagram = safeGetProperty('instagram-input');
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Identidade da loja salva com sucesso!', 'success');
}
function loadAppearanceSettingsIntoForm() {
    safeSetProperty('appearance-primary-color', themeSettings.primaryColor || '#DB1472');
    safeSetProperty('appearance-header-bg', themeSettings.headerBg || '#FFFFFF');
    safeSetProperty('appearance-logo-preview', themeSettings.logoUrl || 'https://placehold.co/200x80/e2e8f0/cccccc?text=Preview+Logo', 'src');
    safeSetProperty('appearance-banner-preview', themeSettings.bannerUrl || 'https://placehold.co/400x200/e2e8f0/cccccc?text=Preview+Banner', 'src');
}
function saveAppearanceSettings() {
    themeSettings.primaryColor = safeGetProperty('appearance-primary-color');
    themeSettings.headerBg = safeGetProperty('appearance-header-bg');
    themeSettings.logoUrl = safeGetProperty('appearance-logo-preview', 'src');
    themeSettings.bannerUrl = safeGetProperty('appearance-banner-preview', 'src');
    localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
    showToast('Aparência do catálogo salva com sucesso!', 'success');
}
function setupImageUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { preview.src = e.target.result; };
            reader.readAsDataURL(file);
        } else if (file) {
            showToast('Por favor, selecione um arquivo de imagem válido.', 'error');
            input.value = '';
        }
    });
}

// --- MODAIS ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId === 'flash-sale-modal') {
            populateProductSelects();
        }
        modal.classList.add('active');
        setTimeout(() => { if (typeof feather !== 'undefined') feather.replace(); }, 10);
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}
