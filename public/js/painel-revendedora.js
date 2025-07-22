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

// --- FUNÇÕES AUXILIARES ESSENCIAIS (Implementadas) ---

/**
 * Mostra uma notificação temporária na tela.
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    const colors = {
        info: '#334155',
        success: '#10b981',
        error: '#ef4444'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.style.bottom = '20px';
    setTimeout(() => { toast.style.bottom = '-100px'; }, 3000);
}

/**
 * Cria a URL para o proxy de imagens com fallback.
 */
function proxyImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return 'https://placehold.co/40x40/e2e8f0/94a3b8?text=S/Img';
    }
    const encodedUrl = encodeURIComponent(url);
    // Ajuste para usar o caminho relativo correto para o proxy
    return `../facilzap-images?url=${encodedUrl}`;
}


/**
 * Função principal para buscar produtos na API.
 */
async function realApiFetch(page, length, search = '') {
    // ATENÇÃO: A URL do proxy é definida no arquivo netlify.toml e deve ser /api/
    let relativeUrl = `../api/facilzap-proxy?page=${page}&length=${length}`;
    if (search) {
        relativeUrl += `&search=${encodeURIComponent(search)}`;
    }
    try {
        const response = await fetch(relativeUrl);
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }
        const result = await response.json();
        return {
            data: result.data || [],
            hasNext: (result.data || []).length === length
        };
    } catch (error) {
        console.error("Falha ao buscar dados da API:", error);
        showToast("Erro de conexão com a API.", "error");
        return { data: [], hasNext: false }; // Retorna um objeto vazio em caso de erro
    }
}


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

    // Delegação de Eventos para Tabelas Dinâmicas
    setupTableEventListeners();
}

function setupNavigation() {
    const navContainer = document.getElementById('revendedor-nav');
    navContainer.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link || link.id === 'view-catalog-btn') return;
        e.preventDefault();
        
        const pageId = link.dataset.page;
        const pageTitle = document.getElementById('revendedor-page-title');
        
        if (pageTitle) pageTitle.textContent = link.textContent.trim();
        navContainer.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        const mainContent = document.querySelector('#revendedor-view .main-content');
        mainContent.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const targetPage = mainContent.querySelector(`#${pageId}`);
        if (targetPage) targetPage.classList.add('active');
        
        if(pageId === 'reseller-products') renderResellerProductsTable();
        if(pageId === 'reseller-appearance') loadAppearanceSettings();
        if(pageId === 'reseller-promotions') setupPromotionsPage();
        if(pageId === 'reseller-descriptions') setupDescriptionsPage();
        
        feather.replace();
    });
}

function setupTableEventListeners() {
    const mainContent = document.querySelector('.main-content');

    mainContent.addEventListener('click', (e) => {
        const target = e.target;
        const productRowButton = target.closest('.edit-margin-btn, .edit-tags-btn, .edit-desc-btn');
        const chartRowButton = target.closest('.edit-chart-btn, .delete-chart-btn');
        
        if (productRowButton) {
            const productId = parseInt(productRowButton.dataset.productId, 10);
            if (productRowButton.classList.contains('edit-margin-btn')) {
                showResellerProductEditModal(productId);
            } else if (productRowButton.classList.contains('edit-tags-btn')) {
                showResellerTagsModal(productId);
            } else if (productRowButton.classList.contains('edit-desc-btn')) {
                openProductDescriptionModal(productId);
            }
        }

        if (chartRowButton) {
            const chartId = chartRowButton.dataset.chartId;
            if (chartRowButton.classList.contains('edit-chart-btn')) {
                openSizingChartModal(chartId);
            } else if (chartRowButton.classList.contains('delete-chart-btn')) {
                deleteSizingChart(chartId);
            }
        }
    });

    mainContent.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('activate-toggle')) {
            const productId = parseInt(target.dataset.productId, 10);
            toggleResellerProductActive(productId);
        }
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
        if (modalId.includes('flash-sale') || modalId.includes('bmpl')) {
            populateProductSelects();
        }
        modal.classList.add('active');
        setTimeout(() => feather.replace(), 10);
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
        loadLocalDataForReseller();
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
    feather.replace();
}

function loadAppearanceSettings() {
    const settings = resellerSettings;
    const brandNameInput = document.getElementById('brand-name-input');
    if (brandNameInput) brandNameInput.value = settings.brandName || '';
    // ... (adicione verificações para todos os outros elementos)
}

function saveAppearanceSettings() {
    resellerSettings.brandName = document.getElementById('brand-name-input')?.value;
    // ... (adicione verificações para todos os outros elementos)
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações de aparência salvas!', 'success');
}

// --- LÓGICA DE PROMOÇÕES ---
function setupPromotionsPage() {
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

function saveFlashSale() { 
    resellerPromotions.flashSale = {
        productId: document.getElementById('flash-sale-product').value,
        discount: document.getElementById('flash-sale-discount').value,
        endDate: document.getElementById('flash-sale-end-date').value
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Flash Sale salva!", "success"); 
    closeModal('flash-sale-modal'); 
}

function saveStockLimit() {
    resellerPromotions.stockLimit = { threshold: document.getElementById('stock-limit-threshold').value, message: document.getElementById('stock-limit-message').value };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Alerta de Estoque Limitado salvo!", "success"); closeModal('stock-limit-modal');
}
function saveTimeLimit() {
    resellerPromotions.timeLimit = { target: document.getElementById('time-limit-target').value, discount: document.getElementById('time-limit-discount').value, duration: document.getElementById('time-limit-duration').value };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Oferta por Tempo Limitado salva!", "success"); closeModal('time-limit-modal');
}
function saveBmpl() { 
    resellerPromotions.bmpl = {
        productId: document.getElementById('bmpl-product').value,
        buyQty: document.getElementById('bmpl-buy-qty').value,
        payQty: document.getElementById('bmpl-pay-qty').value
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Oferta Leve Mais, Pague Menos salva!", "success"); 
    closeModal('buy-more-pay-less-modal'); 
}
function saveProgressiveDiscount() {
    resellerPromotions.progressiveDiscount = { tier1: { value: document.getElementById('prog-discount-value1').value, discount: document.getElementById('prog-discount-percent1').value }, tier2: { value: document.getElementById('prog-discount-value2').value, discount: document.getElementById('prog-discount-percent2').value } };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Desconto Progressivo salvo!", "success"); closeModal('progressive-discount-modal');
}
function saveFreeShipping() {
    const minValue = document.getElementById('free-shipping-min-value').value;
    if (!minValue || parseFloat(minValue) <= 0) { showToast("Insira um valor mínimo válido.", "error"); return; }
    resellerPromotions.freeShipping = { active: true, minValue: parseFloat(minValue) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Frete Grátis salvo!", "success"); closeModal('free-shipping-modal');
}
function saveFirstPurchaseCoupon() {
    const code = document.getElementById('first-purchase-code').value.trim().toUpperCase();
    const discount = document.getElementById('first-purchase-discount').value;
    if (!code || !discount) { showToast("Preencha todos os campos.", "error"); return; }
    resellerPromotions.firstPurchase = { active: true, code: code, discount: parseInt(discount) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom de Primeira Compra salvo!", "success"); closeModal('first-purchase-modal');
}
function saveVipCoupon() {
    const code = document.getElementById('vip-code').value.trim().toUpperCase();
    const discount = document.getElementById('vip-discount').value;
    if (!code || !discount) { showToast("Preencha todos os campos.", "error"); return; }
    resellerPromotions.vipCoupon = { active: true, code: code, discount: parseInt(discount) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom VIP salvo!", "success"); closeModal('vip-customer-modal');
}
function saveSeasonalSale() {
    resellerPromotions.seasonalSale = { name: document.getElementById('seasonal-name').value, discount: document.getElementById('seasonal-discount').value, startDate: document.getElementById('seasonal-start-date').value, endDate: document.getElementById('seasonal-end-date').value };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Liquidação Sazonal salva!", "success"); closeModal('seasonal-sale-modal');
}

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
    editor.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-row-btn');
        if (removeButton) {
            removeSizingChartRow(removeButton);
        }
    });
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
function applyMassMargin() {
    const massMarginInput = document.getElementById('mass-margin-input');
    if (!massMarginInput) return;
    const newMargin = parseFloat(massMarginInput.value);
    if (isNaN(newMargin) || newMargin < 0) { 
        showToast('Por favor, insira uma margem válida.', 'error'); 
        return; 
    }
    resellerProducts.forEach(p => { resellerProductMargins[p.id] = newMargin; });
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    showToast(`Margem de ${newMargin}% aplicada a todos os produtos!`, 'success');
}

function handleImageUpload(event, previewElementId, settingsKey) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewElement = document.getElementById(previewElementId);
        if (previewElement) {
            previewElement.src = e.target.result;
        }
        resellerSettings[settingsKey] = e.target.result;
    };
    reader.readAsDataURL(file);
}

function generateAndCopyCatalogLink() {
    const urlNameInput = document.getElementById('catalog-url-name');
    if (!urlNameInput) return;
    const urlName = urlNameInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!urlName) {
        showToast('Por favor, insira um nome para a URL da sua loja.', 'error');
        return;
    }
    const finalUrl = `${window.location.origin}/catalogo/index.html?loja=${urlName}`;
    navigator.clipboard.writeText(finalUrl).then(() => {
        showToast('Link do catálogo copiado!', 'success');
    }).catch(err => {
        showToast('Erro ao copiar o link.', 'error');
        console.error('Erro ao copiar:', err);
    });
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

function showResellerProductEditModal(productId) {
    const product = resellerProducts.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modal-reseller-product-name').textContent = `Editar Margem: ${product.nome}`;
    document.getElementById('reseller-margin-input').value = resellerProductMargins[productId] || 30;
    const saveBtn = document.getElementById('save-reseller-margin-btn');
    if(saveBtn) saveBtn.onclick = () => saveResellerMargin(productId);
    openModal('reseller-product-edit-modal');
}

function saveResellerMargin(productId) {
    const newMargin = parseFloat(document.getElementById('reseller-margin-input').value);
    if (isNaN(newMargin) || newMargin < 0) { showToast('Margem inválida.', 'error'); return; }
    resellerProductMargins[productId] = newMargin;
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    closeModal('reseller-product-edit-modal');
    showToast('Margem atualizada!', 'success');
}

function showResellerTagsModal(productId) {
    const product = resellerProducts.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modal-tags-product-name').textContent = `Editar Tags: ${product.nome}`;
    const container = document.getElementById('tags-selection-container');
    container.innerHTML = '';
    const currentTags = resellerProductTags[productId] || [];
    availableTags.forEach(tag => {
        const isChecked = currentTags.includes(tag);
        container.innerHTML += `<label><input type="checkbox" class="tag-checkbox" value="${tag}" ${isChecked ? 'checked' : ''}> ${tag}</label>`;
    });
    const saveBtn = document.getElementById('save-reseller-tags-btn');
    if(saveBtn) saveBtn.onclick = () => saveResellerTags(productId);
    openModal('reseller-tags-modal');
}

function saveResellerTags(productId) {
    const selectedTags = Array.from(document.querySelectorAll('#tags-selection-container .tag-checkbox:checked')).map(cb => cb.value);
    resellerProductTags[productId] = selectedTags;
    localStorage.setItem('resellerProductTags', JSON.stringify(resellerProductTags));
    closeModal('reseller-tags-modal');
    showToast('Tags atualizadas!', 'success');
}
