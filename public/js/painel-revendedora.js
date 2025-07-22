/**
 * painel-revendedora.js
 * VERSÃO CORRIGIDA: Mantém todo o código original que já funcionava.
 * Adiciona a nova lógica para o modal de configuração de aparência, sem remover
 * as funcionalidades existentes de produtos, promoções, etc.
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
let resellerShowcase = {};
let currentEditingShowcaseId = null;
let resellerDescriptionModels = [];
let currentAssociationType = null;
let currentModelIdToAssociate = null;

// VARIÁVEL ANTIGA DE TEMA (não será mais usada para carregar arquivos)
let resellerActiveTheme = 'basic'; 

// NOVO: Objeto para guardar as configurações de aparência do catálogo
let resellerCatalogAppearance = {}; 

const availableTags = ['Lançamento', 'Promoção', 'Mais Vendido', 'Últimas Peças'];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    const view = document.getElementById('revendedor-view');
    if (view) {
        try {
            loadLocalDataForReseller();
            setupEventListeners();
            setupMobileMenu();
            await loadAllPublishedProducts();
            if (document.querySelector('#reseller-appearance').classList.contains('active')) {
                setupAppearancePage();
            }
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        } catch (error)
        {
            console.error("Erro na inicialização:", error);
            showToast("Ocorreu um erro ao carregar o painel.", "error");
        }
    }
});

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    setupNavigation();

    // Botão de salvar da página de aparência (agora salva identidade e URL)
    document.getElementById('save-settings-btn')?.addEventListener('click', saveGeneralSettings);
    
    // Botão para abrir o NOVO modal de configuração de tema
    document.getElementById('open-theme-config-btn')?.addEventListener('click', () => {
        loadAppearanceSettingsIntoForm(); // Preenche o modal com dados salvos
        openModal('theme-config-modal');
    });

    // Botão para SALVAR as configurações DENTRO do modal de tema
    document.getElementById('save-theme-config-btn')?.addEventListener('click', () => {
        saveAppearanceSettings();
        closeModal('theme-config-modal');
        showToast('Aparência do catálogo salva com sucesso!', 'success');
    });

    // Listeners para os uploads de imagem no modal
    setupImageUpload('appearance-logo-upload', 'appearance-logo-preview');
    setupImageUpload('appearance-banner-upload', 'appearance-banner-preview');

    // Mantém todos os seus outros event listeners originais
    document.getElementById('apply-mass-margin')?.addEventListener('click', applyMassMargin);
    document.getElementById('generate-link-btn')?.addEventListener('click', generateAndCopyCatalogLink);
    
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', (e) => {
            // Adicionado para não conflitar com o novo botão de abrir modal
            if (e.currentTarget.id === 'open-theme-config-btn') return;
            const modalId = e.currentTarget.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.closest('.modal-overlay').id;
            closeModal(modalId);
        });
    });
    
    document.getElementById('save-flash-sale-btn')?.addEventListener('click', saveFlashSale);
    document.getElementById('save-stock-limit-btn')?.addEventListener('click', saveStockLimit);
    document.getElementById('save-time-limit-btn')?.addEventListener('click', saveTimeLimit);
    document.getElementById('save-bmpl-btn')?.addEventListener('click', saveBmpl);
    document.getElementById('save-prog-discount-btn')?.addEventListener('click', saveProgressiveDiscount);
    document.getElementById('save-free-shipping-btn')?.addEventListener('click', saveFreeShipping);
    document.getElementById('save-first-purchase-btn')?.addEventListener('click', saveFirstPurchaseCoupon);
    document.getElementById('save-vip-btn')?.addEventListener('click', saveVipCoupon);
    document.getElementById('save-seasonal-btn')?.addEventListener('click', saveSeasonalSale);
    document.getElementById('add-sizing-chart-btn')?.addEventListener('click', () => openSizingChartModal());
    document.getElementById('save-sizing-chart-btn')?.addEventListener('click', saveSizingChart);
    document.getElementById('add-sizing-chart-row-btn')?.addEventListener('click', addSizingChartRow);
    document.getElementById('add-sizing-chart-col-btn')?.addEventListener('click', addSizingChartColumn);
    document.getElementById('save-product-description-btn')?.addEventListener('click', saveProductDescription);
    document.getElementById('add-description-model-btn')?.addEventListener('click', () => openDescriptionModelModal());
    document.getElementById('save-description-model-btn')?.addEventListener('click', saveDescriptionModel);
    document.getElementById('save-association-btn')?.addEventListener('click', saveAssociation);
    document.getElementById('associate-product-search')?.addEventListener('keyup', filterAssociationProducts);
    document.getElementById('save-showcase-selection-btn')?.addEventListener('click', saveShowcaseSelection);
    document.getElementById('showcase-product-search')?.addEventListener('keyup', filterShowcaseProducts);

    setupDynamicEventListeners();
}

function setupNavigation() {
    const navContainer = document.getElementById('revendedor-nav');
    if (!navContainer) return;
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
        if(pageId === 'reseller-appearance') setupAppearancePage();
        if(pageId === 'reseller-promotions') setupPromotionsPage();
        if(pageId === 'reseller-descriptions') setupDescriptionsPage();
        if(pageId === 'reseller-showcase') setupShowcasePage();
        
        feather.replace();
    });
}

function setupDynamicEventListeners() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    mainContent.addEventListener('click', (e) => {
        const target = e.target.closest('button, .theme-card');
        if (!target) return;

        const { 
            productId, chartId, showcaseId, 
            descModelId, associateChartId, associateDescId,
            themeId
        } = target.dataset;

        if (target.matches('.edit-margin-btn')) showResellerProductEditModal(productId);
        if (target.matches('.edit-tags-btn')) showResellerTagsModal(productId);
        if (target.matches('.edit-desc-btn')) openProductDescriptionModal(productId);
        if (target.matches('.edit-chart-btn')) openSizingChartModal(chartId);
        if (target.matches('.delete-chart-btn')) deleteSizingChart(chartId);
        if (target.matches('.edit-desc-model-btn')) openDescriptionModelModal(descModelId);
        if (target.matches('.delete-desc-model-btn')) deleteDescriptionModel(descModelId);
        if (associateChartId) openAssociationModal(associateChartId, 'sizingChart');
        if (associateDescId) openAssociationModal(associateDescId, 'description');
        if (showcaseId) openShowcaseModal(showcaseId);
    });

    mainContent.addEventListener('change', (e) => {
        if (e.target.matches('.activate-toggle')) {
            toggleResellerProductActive(parseInt(e.target.dataset.productId, 10));
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
    const savedShowcase = localStorage.getItem('resellerShowcase');
    if (savedShowcase) resellerShowcase = JSON.parse(savedShowcase);
    const savedDescModels = localStorage.getItem('resellerDescriptionModels');
    if(savedDescModels) resellerDescriptionModels = JSON.parse(savedDescModels);
    
    // Adiciona o carregamento das configurações de aparência
    const savedAppearance = localStorage.getItem('resellerCatalogAppearance');
    if (savedAppearance) {
        resellerCatalogAppearance = JSON.parse(savedAppearance);
    } else {
        resellerCatalogAppearance = {
            primaryColor: '#DB1472',
            headerBg: '#FFFFFF',
            logoUrl: 'https://placehold.co/200x80/e2e8f0/cccccc?text=Preview+Logo',
            bannerUrl: 'https://placehold.co/400x200/e2e8f0/cccccc?text=Preview+Banner'
        };
    }
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

// --- LÓGICA DE APARÊNCIA (NOVA ABORDAGEM) ---

function setupAppearancePage() {
    loadIdentitySettings();
}

/**
 * Salva as configurações GERAIS (identidade e URL).
 */
function saveGeneralSettings() {
    resellerSettings = {
        ...resellerSettings,
        brandName: document.getElementById('brand-name-input').value,
        contactPhone: document.getElementById('contact-phone-input').value,
        instagram: document.getElementById('instagram-input').value,
        catalogUrlName: document.getElementById('catalog-url-name').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
    };
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações de Identidade e URL salvas!', 'success');
}

/**
 * Salva as configurações de APARÊNCIA (cores, imagens) do modal.
 */
function saveAppearanceSettings() {
    resellerCatalogAppearance = {
        primaryColor: document.getElementById('appearance-primary-color').value,
        headerBg: document.getElementById('appearance-header-bg').value,
        logoUrl: document.getElementById('appearance-logo-preview').src,
        bannerUrl: document.getElementById('appearance-banner-preview').src,
    };
    localStorage.setItem('resellerCatalogAppearance', JSON.stringify(resellerCatalogAppearance));
}

/**
 * Carrega as configurações de aparência salvas e preenche os campos do MODAL.
 */
function loadAppearanceSettingsIntoForm() {
    const settings = resellerCatalogAppearance;
    document.getElementById('appearance-primary-color').value = settings.primaryColor || '#DB1472';
    document.getElementById('appearance-header-bg').value = settings.headerBg || '#FFFFFF';
    document.getElementById('appearance-logo-preview').src = settings.logoUrl || 'https://placehold.co/200x80/e2e8f0/cccccc?text=Preview+Logo';
    document.getElementById('appearance-banner-preview').src = settings.bannerUrl || 'https://placehold.co/400x200/e2e8f0/cccccc?text=Preview+Banner';
}

/**
 * Função auxiliar para lidar com upload de imagem e preview.
 */
function setupImageUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    input.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });
}

function loadIdentitySettings() {
    const settings = resellerSettings;
    document.getElementById('brand-name-input').value = settings.brandName || '';
    document.getElementById('contact-phone-input').value = settings.contactPhone || '';
    document.getElementById('instagram-input').value = settings.instagram || '';
    document.getElementById('catalog-url-name').value = settings.catalogUrlName || '';
}

// --- DEMAIS FUNÇÕES (PRODUTOS, PROMOÇÕES, VITRINE, DESCRIÇÕES, ETC.) ---

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

function setupPromotionsPage() {
    // ...código futuro...
}

function setupShowcasePage() {
    updateShowcaseCounts();
}

function updateShowcaseCounts() {
    const container = document.getElementById('showcase-sections-container');
    if (!container) return;
    container.querySelectorAll('[data-showcase-id]').forEach(button => {
        const showcaseId = button.dataset.showcaseId;
        const count = resellerShowcase[showcaseId]?.length || 0;
        const badge = button.closest('.settings-section').querySelector('.product-count-badge');
        if (badge) {
            badge.textContent = `${count} produto${count !== 1 ? 's' : ''}`;
        }
    });
}

function openShowcaseModal(showcaseId) {
    currentEditingShowcaseId = showcaseId;
    const titleEl = document.getElementById('showcase-modal-title');
    const showcaseCard = document.querySelector(`[data-showcase-id="${showcaseId}"]`).closest('.settings-section');
    const cardTitle = showcaseCard.querySelector('h2').textContent;
    titleEl.textContent = `Gerenciar: ${cardTitle}`;
    renderShowcaseProductList();
    openModal('showcase-product-modal');
}

function renderShowcaseProductList(searchTerm = '') {
    const container = document.getElementById('showcase-product-list');
    if (!container) return;
    container.innerHTML = '';
    const term = searchTerm.toLowerCase();
    const selectedProductIds = resellerShowcase[currentEditingShowcaseId] || [];
    const filteredProducts = resellerProducts.filter(p => p.nome.toLowerCase().includes(term));
    if (filteredProducts.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 1rem; color: var(--text-light);">Nenhum produto encontrado.</p>`;
        return;
    }
    filteredProducts.forEach(p => {
        const isChecked = selectedProductIds.includes(p.id);
        const itemHTML = `
            <label style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                <input type="checkbox" value="${p.id}" class="showcase-product-checkbox" ${isChecked ? 'checked' : ''}>
                <img src="${proxyImageUrl(p.imagem)}" class="product-image">
                <span>${p.nome}</span>
            </label>
        `;
        container.innerHTML += itemHTML;
    });
}

function filterShowcaseProducts(event) {
    renderShowcaseProductList(event.target.value);
}

function saveShowcaseSelection() {
    if (!currentEditingShowcaseId) return;
    const selectedIds = Array.from(document.querySelectorAll('.showcase-product-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    resellerShowcase[currentEditingShowcaseId] = selectedIds;
    localStorage.setItem('resellerShowcase', JSON.stringify(resellerShowcase));
    closeModal('showcase-product-modal');
    showToast('Vitrine atualizada com sucesso!', 'success');
    updateShowcaseCounts();
    currentEditingShowcaseId = null;
}

function setupDescriptionsPage() {
    renderDescriptionModelsList();
    renderSizingChartManager();
    renderProductDescriptionList();
}

function renderDescriptionModelsList() {
    const container = document.getElementById('description-models-list');
    if (!container) return;
    if (resellerDescriptionModels.length === 0) {
        container.innerHTML = `<p style="text-align: center; padding: 1rem; color: var(--text-light);">Nenhum modelo de descrição criado.</p>`;
        return;
    }
    let tableHTML = `<table class="product-table"><thead><tr><th>Nome do Modelo</th><th>Ações</th></tr></thead><tbody>`;
    resellerDescriptionModels.forEach(model => {
        tableHTML += `
            <tr>
                <td>${model.name}</td>
                <td class="actions-cell">
                    <button class="btn btn-primary" data-associate-desc-id="${model.id}" style="padding: 0.25rem 0.5rem;" title="Associar a Produtos"><i data-feather="link"></i></button>
                    <button class="btn edit-desc-model-btn" data-desc-model-id="${model.id}" style="padding: 0.25rem 0.5rem;" title="Editar"><i data-feather="edit"></i></button>
                    <button class="btn btn-danger delete-desc-model-btn" data-desc-model-id="${model.id}" style="padding: 0.25rem 0.5rem;" title="Excluir"><i data-feather="trash-2"></i></button>
                </td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
    feather.replace();
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
                    <button class="btn btn-primary" data-associate-chart-id="${chart.id}" style="padding: 0.25rem 0.5rem;" title="Associar a Produtos"><i data-feather="link"></i></button>
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

function openDescriptionModelModal(modelId = null) {
    const modal = document.getElementById('description-model-modal');
    const title = document.getElementById('description-model-modal-title');
    const nameInput = document.getElementById('description-model-name');
    const contentTextarea = document.getElementById('description-model-content');
    modal.dataset.editingId = modelId || '';

    if (modelId) {
        const model = resellerDescriptionModels.find(m => m.id === modelId);
        if (!model) return;
        title.textContent = "Editar Modelo de Descrição";
        nameInput.value = model.name;
        contentTextarea.value = model.content;
    } else {
        title.textContent = "Criar Novo Modelo de Descrição";
        nameInput.value = '';
        contentTextarea.value = '';
    }
    openModal('description-model-modal');
}

function saveDescriptionModel() {
    const modal = document.getElementById('description-model-modal');
    const modelId = modal.dataset.editingId;
    const name = document.getElementById('description-model-name').value.trim();
    const content = document.getElementById('description-model-content').value.trim();

    if (!name || !content) {
        showToast("Nome e conteúdo do modelo são obrigatórios.", "error");
        return;
    }

    if (modelId) {
        const index = resellerDescriptionModels.findIndex(m => m.id === modelId);
        if (index > -1) {
            resellerDescriptionModels[index] = { ...resellerDescriptionModels[index], name, content };
        }
    } else {
        resellerDescriptionModels.push({ id: `desc_${Date.now()}`, name, content });
    }

    localStorage.setItem('resellerDescriptionModels', JSON.stringify(resellerDescriptionModels));
    showToast("Modelo de descrição salvo com sucesso!", "success");
    closeModal('description-model-modal');
    renderDescriptionModelsList();
}

function deleteDescriptionModel(modelId) {
    resellerDescriptionModels = resellerDescriptionModels.filter(m => m.id !== modelId);
    localStorage.setItem('resellerDescriptionModels', JSON.stringify(resellerDescriptionModels));
    showToast("Modelo de descrição excluído.", "success");
    renderDescriptionModelsList();
}

function openAssociationModal(modelId, type) {
    currentModelIdToAssociate = modelId;
    currentAssociationType = type;

    const titleEl = document.getElementById('associate-modal-title');
    let modelName = '';
    if (type === 'description') {
        const model = resellerDescriptionModels.find(m => m.id === modelId);
        modelName = model ? model.name : '';
        titleEl.textContent = `Associar Descrição: "${modelName}"`;
    } else if (type === 'sizingChart') {
        const model = resellerSizingCharts.find(c => c.id === modelId);
        modelName = model ? model.name : '';
        titleEl.textContent = `Associar Tabela: "${modelName}"`;
    }
    
    renderAssociationProductList();
    openModal('associate-products-modal');
}

function renderAssociationProductList(searchTerm = '') {
    const container = document.getElementById('associate-product-list');
    if (!container) return;
    
    container.innerHTML = '';
    const term = searchTerm.toLowerCase();
    const filteredProducts = resellerProducts.filter(p => p.nome.toLowerCase().includes(term));

    if (filteredProducts.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 1rem; color: var(--text-light);">Nenhum produto encontrado.</p>`;
        return;
    }

    filteredProducts.forEach(p => {
        let isChecked = false;
        if (currentAssociationType === 'description') {
            const descModel = resellerDescriptionModels.find(m => m.id === currentModelIdToAssociate);
            isChecked = descModel && resellerProductDescriptions[p.id] === descModel.content;
        } else if (currentAssociationType === 'sizingChart') {
            isChecked = resellerProductSizingChartLinks[p.id] === currentModelIdToAssociate;
        }

        const itemHTML = `
            <label style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                <input type="checkbox" value="${p.id}" class="association-product-checkbox" ${isChecked ? 'checked' : ''}>
                <img src="${proxyImageUrl(p.imagem)}" class="product-image">
                <span>${p.nome}</span>
            </label>
        `;
        container.innerHTML += itemHTML;
    });
}

function filterAssociationProducts(event) {
    renderAssociationProductList(event.target.value);
}

function saveAssociation() {
    const selectedProductIds = Array.from(document.querySelectorAll('.association-product-checkbox:checked')).map(cb => parseInt(cb.value, 10));
    
    if (currentAssociationType === 'description') {
        const model = resellerDescriptionModels.find(m => m.id === currentModelIdToAssociate);
        if (model) {
            selectedProductIds.forEach(productId => {
                resellerProductDescriptions[productId] = model.content;
            });
            localStorage.setItem('resellerProductDescriptions', JSON.stringify(resellerProductDescriptions));
        }
    } else if (currentAssociationType === 'sizingChart') {
        selectedProductIds.forEach(productId => {
            resellerProductSizingChartLinks[productId] = currentModelIdToAssociate;
        });
        localStorage.setItem('resellerProductSizingChartLinks', JSON.stringify(resellerProductSizingChartLinks));
    }

    showToast("Associação salva com sucesso!", "success");
    closeModal('associate-products-modal');
    renderProductDescriptionList();
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
        table += `<tr data-row-index="${rowIndex}">`;
        row.forEach((cell, colIndex) => {
            table += `<td><input type="text" class="search-input cell-input" value="${cell}" data-col-index="${colIndex}"></td>`;
        });
        table += `<td class="actions-cell"><button class="btn btn-danger btn-sm remove-row-btn"><i data-feather="trash-2"></i></button></td>`;
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    editor.innerHTML = table;
    editor.querySelectorAll('.remove-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('tr').remove());
    });
    feather.replace();
}

function addSizingChartRow() {
    const tableBody = document.querySelector('#sizing-chart-editor table tbody');
    if (!tableBody) return;
    const headerRow = document.querySelector('#sizing-chart-editor table thead tr');
    if(!headerRow) return;
    const colCount = headerRow.children.length - 1;
    const newRow = tableBody.insertRow();
    for (let i = 0; i < colCount; i++) {
        newRow.insertCell().innerHTML = `<input type="text" class="search-input cell-input" value="">`;
    }
    const actionCell = newRow.insertCell();
    actionCell.className = 'actions-cell';
    actionCell.innerHTML = `<button class="btn btn-danger btn-sm remove-row-btn"><i data-feather="trash-2"></i></button>`;
    actionCell.querySelector('.remove-row-btn').addEventListener('click', (e) => e.target.closest('tr').remove());
    feather.replace();
}

function addSizingChartColumn() {
    const table = document.querySelector('#sizing-chart-editor table');
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    const bodyRows = table.querySelectorAll('tbody tr');
    if (headerRow) {
        const newHeaderCell = document.createElement('th');
        newHeaderCell.innerHTML = `<input type="text" class="search-input header-input" value="Nova Medida">`;
        headerRow.insertBefore(newHeaderCell, headerRow.lastChild);
    }
    bodyRows.forEach(row => {
        const newCell = row.insertCell(row.cells.length - 1);
        newCell.innerHTML = `<input type="text" class="search-input cell-input" value="">`;
    });
}

function saveSizingChart() {
    const modal = document.getElementById('sizing-chart-modal');
    const chartId = modal.dataset.editingId;
    const name = document.getElementById('sizing-chart-name').value.trim();
    if (!name) { showToast("O nome do modelo não pode ser vazio.", "error"); return; }
    const headers = Array.from(document.querySelectorAll('#sizing-chart-editor .header-input')).map(input => input.value);
    const rows = Array.from(document.querySelectorAll('#sizing-chart-editor tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('.cell-input')).map(input => input.value)
    );
    if (chartId) {
        const index = resellerSizingCharts.findIndex(c => c.id === chartId);
        if(index > -1) resellerSizingCharts[index] = { ...resellerSizingCharts[index], name, headers, rows };
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
    const product = resellerProducts.find(p => p.id === parseInt(productId));
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

function generateAndCopyCatalogLink() {
    const urlName = resellerSettings.catalogUrlName || '';
    if (!urlName) {
        showToast('Defina um nome para a URL da sua loja na aba "Aparência".', 'error');
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
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    document.getElementById('modal-reseller-product-name').textContent = `Editar Margem: ${product.nome}`;
    document.getElementById('reseller-margin-input').value = resellerProductMargins[productId] || 30;
    document.getElementById('save-reseller-margin-btn').onclick = () => saveResellerMargin(productId);
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
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;
    document.getElementById('modal-tags-product-name').textContent = `Editar Tags: ${product.nome}`;
    const container = document.getElementById('tags-selection-container');
    container.innerHTML = '';
    const currentTags = resellerProductTags[productId] || [];
    availableTags.forEach(tag => {
        const isChecked = currentTags.includes(tag);
        container.innerHTML += `<label><input type="checkbox" class="tag-checkbox" value="${tag}" ${isChecked ? 'checked' : ''}> ${tag}</label>`;
    });
    document.getElementById('save-reseller-tags-btn').onclick = () => saveResellerTags(productId);
    openModal('reseller-tags-modal');
}

function saveResellerTags(productId) {
    const selectedTags = Array.from(document.querySelectorAll('#tags-selection-container .tag-checkbox:checked')).map(cb => cb.value);
    resellerProductTags[productId] = selectedTags;
    localStorage.setItem('resellerProductTags', JSON.stringify(resellerProductTags));
    closeModal('reseller-tags-modal');
    showToast('Tags atualizadas!', 'success');
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
    resellerPromotions.stockLimit = { 
        threshold: document.getElementById('stock-limit-threshold').value, 
        message: document.getElementById('stock-limit-message').value 
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Alerta de Estoque Limitado salvo!", "success"); 
    closeModal('stock-limit-modal');
}

function saveTimeLimit() {
    resellerPromotions.timeLimit = { 
        target: document.getElementById('time-limit-target').value, 
        discount: document.getElementById('time-limit-discount').value, 
        duration: document.getElementById('time-limit-duration').value 
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Oferta por Tempo Limitado salva!", "success"); 
    closeModal('time-limit-modal');
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
    resellerPromotions.progressiveDiscount = { 
        tier1: { 
            value: document.getElementById('prog-discount-value1').value, 
            discount: document.getElementById('prog-discount-percent1').value 
        }, 
        tier2: { 
            value: document.getElementById('prog-discount-value2').value, 
            discount: document.getElementById('prog-discount-percent2').value 
        } 
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Desconto Progressivo salvo!", "success"); 
    closeModal('progressive-discount-modal');
}

function saveFreeShipping() {
    const minValue = document.getElementById('free-shipping-min-value').value;
    if (!minValue || parseFloat(minValue) <= 0) { 
        showToast("Insira um valor mínimo válido.", "error"); 
        return; 
    }
    resellerPromotions.freeShipping = { active: true, minValue: parseFloat(minValue) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Frete Grátis salvo!", "success"); 
    closeModal('free-shipping-modal');
}

function saveFirstPurchaseCoupon() {
    const code = document.getElementById('first-purchase-code').value.trim().toUpperCase();
    const discount = document.getElementById('first-purchase-discount').value;
    if (!code || !discount) { 
        showToast("Preencha todos os campos.", "error"); 
        return; 
    }
    resellerPromotions.firstPurchase = { active: true, code: code, discount: parseInt(discount) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom de Primeira Compra salvo!", "success"); 
    closeModal('first-purchase-modal');
}

function saveVipCoupon() {
    const code = document.getElementById('vip-code').value.trim().toUpperCase();
    const discount = document.getElementById('vip-discount').value;
    if (!code || !discount) { 
        showToast("Preencha todos os campos.", "error"); 
        return; 
    }
    resellerPromotions.vipCoupon = { active: true, code: code, discount: parseInt(discount) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom VIP salvo!", "success"); 
    closeModal('vip-customer-modal');
}

function saveSeasonalSale() {
    resellerPromotions.seasonalSale = { 
        name: document.getElementById('seasonal-name').value, 
        discount: document.getElementById('seasonal-discount').value, 
        startDate: document.getElementById('seasonal-start-date').value, 
        endDate: document.getElementById('seasonal-end-date').value 
    };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Liquidação Sazonal salva!", "success"); 
    closeModal('seasonal-sale-modal');
}
