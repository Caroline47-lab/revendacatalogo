/**
 * painel-revendedora.js
 * * VERSÃO CORRIGIDA E ESTABILIZADA
 * - Corrigido o bug crítico que impedia o funcionamento de todos os botões e o carregamento dos produtos.
 * - A função de inicialização de eventos foi reescrita para garantir que todos os botões sejam funcionais.
 * - Lógica de `onclick` no HTML foi substituída por `addEventListener` no JS para maior robustez.
 */

// --- VARIÁVEIS GLOBAIS ---
let resellerProducts = [];
let publishedProductIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let resellerPromotions = {}; 
let resellerProductDescriptions = {}; 
let resellerSizingCharts = []; 
let resellerProductSizingChartLinks = {}; 

const availableTags = ['Lançamento', 'Promoção', 'Mais Vendido', 'Últimas Peças'];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('revendedor-view')) {
        loadLocalDataForReseller();
        setupEventListeners();
        setupMobileMenu();
        loadAllPublishedProducts();
        feather.replace();
    }
});

// --- CONFIGURAÇÃO DE EVENTOS (Reescrita para garantir funcionalidade) ---
function setupEventListeners() {
    // Navegação principal
    setupNavigation();

    // Botões gerais (que existem fora de páginas específicas)
    document.getElementById('apply-mass-margin')?.addEventListener('click', applyMassMargin);
    document.getElementById('save-settings-btn')?.addEventListener('click', saveAppearanceSettings);
    document.getElementById('generate-link-btn')?.addEventListener('click', generateAndCopyCatalogLink);
    document.getElementById('logo-upload')?.addEventListener('change', (e) => handleImageUpload(e, 'logo-preview', 'logoUrl'));
    document.querySelectorAll('.banner-upload').forEach(input => {
        input.addEventListener('change', (e) => handleImageUpload(e, `banner-preview-${e.target.dataset.bannerId}`, `banner-${e.target.dataset.bannerId}`));
    });

    // Botões para abrir modais
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Botões para fechar todos os modais
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        const modalId = btn.closest('.modal-overlay').id;
        btn.addEventListener('click', () => closeModal(modalId));
    });

    // Botões de salvar promoções
    document.getElementById('save-flash-sale-btn')?.addEventListener('click', saveFlashSale);
    document.getElementById('save-stock-limit-btn')?.addEventListener('click', saveStockLimit);
    document.getElementById('save-time-limit-btn')?.addEventListener('click', saveTimeLimit);
    document.getElementById('save-bmpl-btn')?.addEventListener('click', saveBmpl);
    document.getElementById('save-prog-discount-btn')?.addEventListener('click', saveProgressiveDiscount);
    document.getElementById('save-free-shipping-btn')?.addEventListener('click', saveFreeShipping);
    document.getElementById('save-first-purchase-btn')?.addEventListener('click', saveFirstPurchaseCoupon);
    document.getElementById('save-vip-btn')?.addEventListener('click', saveVipCoupon);
    document.getElementById('save-seasonal-btn')?.addEventListener('click', saveSeasonalSale);

    // Botões da página de Descrições
    document.getElementById('add-sizing-chart-btn')?.addEventListener('click', () => openSizingChartModal());
    document.getElementById('save-sizing-chart-btn')?.addEventListener('click', saveSizingChart);
    document.getElementById('add-sizing-chart-row-btn')?.addEventListener('click', addSizingChartRow);
    document.getElementById('add-sizing-chart-col-btn')?.addEventListener('click', addSizingChartColumn);
    document.getElementById('save-product-description-btn')?.addEventListener('click', saveProductDescription);
}

function setupNavigation() {
    const navContainer = document.getElementById('revendedor-nav');
    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link || link.id === 'view-catalog-btn') return;
        e.preventDefault();
        
        const pageId = link.dataset.page;
        const pageTitle = document.getElementById('revendedor-page-title');
        
        pageTitle.textContent = link.textContent.trim();
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const mainContent = document.querySelector('#revendedor-view .main-content');
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        mainContent.querySelector(`#${pageId}`).classList.add('active');
        
        // Carrega ou prepara o conteúdo da página ativa
        if(pageId === 'reseller-products') renderResellerProductsTable(); // Apenas renderiza, não recarrega
        if(pageId === 'reseller-appearance') loadAppearanceSettings();
        if(pageId === 'reseller-promotions') setupPromotionsPage();
        if(pageId === 'reseller-descriptions') setupDescriptionsPage();
        
        feather.replace();
    });
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
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modalId.includes('sale') || modalId.includes('bmpl')) {
            populateProductSelects();
        }
        modal.classList.add('active');
        feather.replace();
    }
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- CARREGAMENTO DE DADOS ---
function loadLocalDataForReseller() {
    const savedPublished = localStorage.getItem('erpPublished');
    if (savedPublished) publishedProductIds = JSON.parse(savedPublished).map(id => parseInt(id, 10));
    const savedMargins = localStorage.getItem('resellerMargins');
    if (savedMargins) resellerProductMargins = JSON.parse(savedMargins);
    const savedTags = localStorage.getItem('resellerProductTags');
    if (savedTags) resellerProductTags = JSON.parse(savedTags);
    const savedResellerActive = localStorage.getItem('resellerActiveProducts');
    if (savedResellerActive) resellerActiveProductIds = JSON.parse(savedResellerActive).map(id => parseInt(id, 10));
    const savedSettings = localStorage.getItem('resellerSettings');
    if (savedSettings) resellerSettings = JSON.parse(savedSettings);
    const savedPromotions = localStorage.getItem('resellerPromotions');
    if (savedPromotions) resellerPromotions = JSON.parse(savedPromotions);
    const savedDescriptions = localStorage.getItem('resellerProductDescriptions');
    if (savedDescriptions) resellerProductDescriptions = JSON.parse(savedDescriptions);
    const savedSizingCharts = localStorage.getItem('resellerSizingCharts');
    if (savedSizingCharts) resellerSizingCharts = JSON.parse(savedSizingCharts);
    const savedSizingChartLinks = localStorage.getItem('resellerProductSizingChartLinks');
    if (savedSizingChartLinks) resellerProductSizingChartLinks = JSON.parse(savedSizingChartLinks);
}

async function loadAllPublishedProducts() {
    const loader = document.getElementById('reseller-product-list-loader');
    if (loader) loader.classList.add('visible');
    
    resellerProducts = []; 
    let currentPage = 1;
    let hasMore = true;
    try {
        loadLocalDataForReseller(); // Garante que a lista de IDs publicados está atualizada
        while(hasMore) {
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
        renderResellerProductsTable(); 
        if(loader) loader.classList.remove('visible');
    }
}

// --- LÓGICA DAS PÁGINAS ---

function renderResellerProductsTable() {
    const tbody = document.getElementById('reseller-products-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (resellerProducts.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Nenhum produto publicado para você no momento.</td></tr>'; 
        return; 
    }
    
    resellerProducts.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = p.preco_original * (1 + margin / 100);
        const isActive = resellerActiveProductIds.includes(p.id);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Imagem"><img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" class="product-image" loading="lazy"></td>
            <td data-label="Nome">${p.nome}</td>
            <td data-label="Preço Base">R$ ${p.preco_original.toFixed(2)}</td>
            <td data-label="Sua Margem (%)">${margin}%</td>
            <td data-label="Preço Final">R$ ${finalPrice.toFixed(2)}</td>
            <td data-label="Ativar"><label class="toggle-switch"><input type="checkbox" data-product-id="${p.id}" class="activate-toggle" ${isActive ? 'checked' : ''}><span class="slider"></span></label></td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn edit-margin-btn" data-product-id="${p.id}" style="padding: 0.25rem 0.5rem;" title="Editar Margem"><i data-feather="edit-2"></i></button>
                <button class="btn edit-tags-btn" data-product-id="${p.id}" style="padding: 0.25rem 0.5rem;" title="Editar Tags"><i data-feather="tag"></i></button>
            </td>
        `;
    });

    // Adiciona eventos após renderizar
    tbody.querySelectorAll('.activate-toggle').forEach(el => el.addEventListener('change', (e) => toggleResellerProductActive(parseInt(e.target.dataset.productId))));
    tbody.querySelectorAll('.edit-margin-btn').forEach(el => el.addEventListener('click', (e) => showResellerProductEditModal(parseInt(e.currentTarget.dataset.productId))));
    tbody.querySelectorAll('.edit-tags-btn').forEach(el => el.addEventListener('click', (e) => showResellerTagsModal(parseInt(e.currentTarget.dataset.productId))));

    feather.replace();
}

function loadAppearanceSettings() { /* ...código existente... */ }
function saveAppearanceSettings() { /* ...código existente... */ }

// --- LÓGICA DE PROMOÇÕES ---
function setupPromotionsPage() {
    // Carrega os dados salvos nos campos dos modais para fácil edição
    const { freeShipping, firstPurchase, stockLimit, vipCoupon, seasonalSale, timeLimit, progressiveDiscount, flashSale, bmpl } = resellerPromotions;

    if (freeShipping) document.getElementById('free-shipping-min-value').value = freeShipping.minValue || '';
    if (firstPurchase) {
        document.getElementById('first-purchase-code').value = firstPurchase.code || 'BEMVINDA10';
        document.getElementById('first-purchase-discount').value = firstPurchase.discount || '10';
    }
    // ... (código para carregar as outras promoções)
}

function populateProductSelects() {
    const selects = document.querySelectorAll('#flash-sale-product, #bmpl-product');
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

function saveFlashSale() { /* ...código existente... */ }
function saveStockLimit() { /* ...código existente... */ }
function saveTimeLimit() { /* ...código existente... */ }
function saveBmpl() { /* ...código existente... */ }
function saveProgressiveDiscount() { /* ...código existente... */ }
function saveFreeShipping() { /* ...código existente... */ }
function saveFirstPurchaseCoupon() { /* ...código existente... */ }
function saveVipCoupon() { /* ...código existente... */ }
function saveSeasonalSale() { /* ...código existente... */ }

// --- LÓGICA DA PÁGINA DE DESCRIÇÕES ---
function setupDescriptionsPage() {
    renderSizingChartManager();
    renderProductDescriptionList();
}

function renderSizingChartManager() {
    const container = document.getElementById('sizing-charts-list');
    if (!container) return;
    if (resellerSizingCharts.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 1rem; color: var(--text-light);">Nenhum modelo de tabela de medidas criado.</p>`;
        return;
    }
    let tableHTML = `<table class="product-table"><thead><tr><th>Nome do Modelo</th><th>Ações</th></tr></thead><tbody>`;
    resellerSizingCharts.forEach(chart => {
        tableHTML += `
            <tr>
                <td>${chart.name}</td>
                <td class="actions-cell">
                    <button class="btn edit-chart-btn" data-chart-id="${chart.id}" style="padding: 0.25rem 0.5rem;" title="Editar"><i data-feather="edit"></i></button>
                    <button class="btn btn-danger delete-chart-btn" data-chart-id="${chart.id}" style="padding: 0.25rem 0.5rem;" title="Excluir"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
    container.querySelectorAll('.edit-chart-btn').forEach(btn => btn.addEventListener('click', (e) => openSizingChartModal(e.currentTarget.dataset.chartId)));
    container.querySelectorAll('.delete-chart-btn').forEach(btn => btn.addEventListener('click', (e) => deleteSizingChart(e.currentTarget.dataset.chartId)));
    feather.replace();
}

function renderProductDescriptionList() {
    const tbody = document.getElementById('product-description-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    resellerProducts.forEach(product => {
        const description = resellerProductDescriptions[product.id] || 'Nenhuma';
        const chartId = resellerProductSizingChartLinks[product.id];
        const chart = resellerSizingCharts.find(c => c.id === chartId);
        const chartName = chart ? chart.name : 'Nenhuma';
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Produto">${product.nome}</td>
            <td data-label="Descrição">${description.substring(0, 50)}${description.length > 50 ? '...' : ''}</td>
            <td data-label="Tabela de Medidas">${chartName}</td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn edit-desc-btn" data-product-id="${product.id}" style="padding: 0.25rem 0.5rem;"><i data-feather="edit"></i> Editar</button>
            </td>
        `;
    });
    tbody.querySelectorAll('.edit-desc-btn').forEach(btn => btn.addEventListener('click', (e) => openProductDescriptionModal(parseInt(e.currentTarget.dataset.productId))));
    feather.replace();
}

function openSizingChartModal(chartId = null) {
    const modal = document.getElementById('sizing-chart-modal');
    const title = document.getElementById('sizing-chart-modal-title');
    const nameInput = document.getElementById('sizing-chart-name');
    modal.dataset.editingId = chartId || '';
    if (chartId) {
        const chart = resellerSizingCharts.find(c => c.id === chartId);
        if (!chart) return;
        title.textContent = "Editar Tabela de Medidas";
        nameInput.value = chart.name;
        renderSizingChartEditor(chart.headers, chart.rows);
    } else {
        title.textContent = "Criar Nova Tabela de Medidas";
        nameInput.value = '';
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
        table += `<tr>`;
        row.forEach((cell, colIndex) => {
            table += `<td><input type="text" class="search-input cell-input" value="${cell}" data-row-index="${rowIndex}" data-col-index="${colIndex}"></td>`;
        });
        table += `<td class="actions-cell"><button class="btn btn-danger btn-sm remove-row-btn"><i data-feather="trash-2"></i></button></td>`;
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    editor.innerHTML = table;
    editor.querySelectorAll('.remove-row-btn').forEach(btn => btn.addEventListener('click', (e) => removeSizingChartRow(e.currentTarget)));
    feather.replace();
}

function addSizingChartRow() {
    const table = document.querySelector('#sizing-chart-editor table tbody');
    if (!table) return;
    const colCount = table.closest('table').querySelector('thead tr').children.length - 1;
    const newRow = table.insertRow();
    for (let i = 0; i < colCount; i++) {
        newRow.insertCell().innerHTML = `<input type="text" class="search-input cell-input">`;
    }
    const actionCell = newRow.insertCell();
    actionCell.className = 'actions-cell';
    actionCell.innerHTML = `<button class="btn btn-danger btn-sm remove-row-btn"><i data-feather="trash-2"></i></button>`;
    actionCell.querySelector('.remove-row-btn').addEventListener('click', (e) => removeSizingChartRow(e.currentTarget));
    feather.replace();
}

function addSizingChartColumn() {
    const table = document.querySelector('#sizing-chart-editor table');
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    const newHeader = document.createElement('th');
    newHeader.innerHTML = `<input type="text" class="search-input header-input" value="Nova Medida">`;
    headerRow.insertBefore(newHeader, headerRow.lastChild);
    table.querySelectorAll('tbody tr').forEach(row => {
        const newCell = row.insertCell(row.cells.length - 1);
        newCell.innerHTML = `<input type="text" class="search-input cell-input">`;
    });
}

function removeSizingChartRow(button) {
    button.closest('tr').remove();
}

function saveSizingChart() {
    const modal = document.getElementById('sizing-chart-modal');
    const chartId = modal.dataset.editingId;
    const name = document.getElementById('sizing-chart-name').value.trim();
    if (!name) { showToast("O nome do modelo não pode ser vazio.", "error"); return; }
    const headers = Array.from(document.querySelectorAll('.header-input')).map(input => input.value);
    const rows = Array.from(document.querySelectorAll('#sizing-chart-editor tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('.cell-input')).map(input => input.value)
    );
    if (chartId) {
        const index = resellerSizingCharts.findIndex(c => c.id === chartId);
        resellerSizingCharts[index] = { ...resellerSizingCharts[index], name, headers, rows };
    } else {
        resellerSizingCharts.push({ id: `chart_${Date.now()}`, name, headers, rows });
    }
    localStorage.setItem('resellerSizingCharts', JSON.stringify(resellerSizingCharts));
    showToast("Modelo de tabela salvo com sucesso!", "success");
    closeModal('sizing-chart-modal');
    renderSizingChartManager();
}

function deleteSizingChart(chartId) {
    resellerSizingCharts = resellerSizingCharts.filter(c => c.id !== chartId);
    for (const productId in resellerProductSizingChartLinks) {
        if (resellerProductSizingChartLinks[productId] === chartId) {
            delete resellerProductSizingChartLinks[productId];
        }
    }
    localStorage.setItem('resellerSizingCharts', JSON.stringify(resellerSizingCharts));
    localStorage.setItem('resellerProductSizingChartLinks', JSON.stringify(resellerProductSizingChartLinks));
    showToast("Modelo de tabela excluído.", "success");
    renderSizingChartManager();
    renderProductDescriptionList();
}

function openProductDescriptionModal(productId) {
    const modal = document.getElementById('product-description-modal');
    const product = resellerProducts.find(p => p.id === productId);
    if (!product) return;
    modal.dataset.editingId = productId;
    document.getElementById('product-description-modal-title').textContent = `Editar: ${product.nome}`;
    document.getElementById('product-description-textarea').value = resellerProductDescriptions[productId] || '';
    const select = document.getElementById('product-sizing-chart-select');
    select.innerHTML = '<option value="">Nenhuma</option>';
    resellerSizingCharts.forEach(chart => {
        const option = document.createElement('option');
        option.value = chart.id;
        option.textContent = chart.name;
        select.appendChild(option);
    });
    select.value = resellerProductSizingChartLinks[productId] || '';
    openModal('product-description-modal');
}

function saveProductDescription() {
    const modal = document.getElementById('product-description-modal');
    const productId = modal.dataset.editingId;
    const description = document.getElementById('product-description-textarea').value;
    const chartId = document.getElementById('product-sizing-chart-select').value;
    resellerProductDescriptions[productId] = description;
    if (chartId) {
        resellerProductSizingChartLinks[productId] = chartId;
    } else {
        delete resellerProductSizingChartLinks[productId];
    }
    localStorage.setItem('resellerProductDescriptions', JSON.stringify(resellerProductDescriptions));
    localStorage.setItem('resellerProductSizingChartLinks', JSON.stringify(resellerProductSizingChartLinks));
    showToast("Descrição salva com sucesso!", "success");
    closeModal('product-description-modal');
    renderProductDescriptionList();
}

// --- Funções auxiliares ---
function applyMassMargin() { /* ... */ }
function handleImageUpload(event, previewElementId, settingsKey) { /* ... */ }
function generateAndCopyCatalogLink() { /* ... */ }
function toggleResellerProductActive(productId) { /* ... */ }
function showResellerProductEditModal(productId) { /* ... */ }
function saveResellerMargin(productId) { /* ... */ }
function showResellerTagsModal(productId) { /* ... */ }
function saveResellerTags(productId) { /* ... */ }
