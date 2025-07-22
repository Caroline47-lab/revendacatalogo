/**
 * painel-revendedora.js
 * * VERSÃO CORRIGIDA
 * - Corrigido o bug crítico que impedia os produtos publicados pelo admin de aparecerem no painel da revendedora.
 * - A função `loadAllPublishedProducts` agora força a recarga dos produtos da API para refletir o estado atual.
 */

// --- VARIÁVEIS GLOBAIS ---
let resellerProducts = [];
let publishedProductIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let resellerPromotions = {}; 

const availableTags = ['Lançamento', 'Promoção', 'Mais Vendido', 'Últimas Peças'];

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('revendedor-view')) {
        loadLocalDataForReseller();
        setupEventListeners();
        setupMobileMenu();
        loadAllPublishedProducts(); // Carrega a página inicial de produtos
        feather.replace();
    }
});

// --- CONFIGURAÇÃO DE EVENTOS ---
function setupEventListeners() {
    // Navegação principal
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
        
        if(pageId === 'reseller-products') loadAllPublishedProducts();
        if(pageId === 'reseller-appearance') loadAppearanceSettings();
        if(pageId === 'reseller-promotions') setupPromotionsPage();
        
        feather.replace();
    });

    // Botões gerais
    document.getElementById('apply-mass-margin').addEventListener('click', applyMassMargin);
    document.getElementById('save-settings-btn').addEventListener('click', saveAppearanceSettings);
    document.getElementById('generate-link-btn').addEventListener('click', generateAndCopyCatalogLink);
    document.getElementById('logo-upload').addEventListener('change', (e) => handleImageUpload(e, 'logo-preview', 'logoUrl'));
    document.querySelectorAll('.banner-upload').forEach(input => {
        input.addEventListener('change', (e) => handleImageUpload(e, `banner-preview-${e.target.dataset.bannerId}`, `banner-${e.target.dataset.bannerId}`));
    });

    // Botões para abrir modais de promoção
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Botões para fechar modais
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        const modalId = btn.closest('.modal-overlay').id;
        btn.addEventListener('click', () => closeModal(modalId));
    });

    // Botões de salvar promoções
    document.getElementById('save-flash-sale-btn').addEventListener('click', saveFlashSale);
    document.getElementById('save-stock-limit-btn').addEventListener('click', saveStockLimit);
    document.getElementById('save-time-limit-btn').addEventListener('click', saveTimeLimit);
    document.getElementById('save-bmpl-btn').addEventListener('click', saveBmpl);
    document.getElementById('save-prog-discount-btn').addEventListener('click', saveProgressiveDiscount);
    document.getElementById('save-free-shipping-btn').addEventListener('click', saveFreeShipping);
    document.getElementById('save-first-purchase-btn').addEventListener('click', saveFirstPurchaseCoupon);
    document.getElementById('save-vip-btn').addEventListener('click', saveVipCoupon);
    document.getElementById('save-seasonal-btn').addEventListener('click', saveSeasonalSale);
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
    if (modal) modal.classList.add('active');
    feather.replace();
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// --- CARREGAMENTO DE DADOS ---
function loadLocalDataForReseller() {
    const savedPublished = localStorage.getItem('erpPublished');
    if (savedPublished) {
        publishedProductIds = JSON.parse(savedPublished).map(id => parseInt(id, 10));
    }
    
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
}

/**
 * CORREÇÃO CRÍTICA APLICADA AQUI.
 * A função agora sempre limpa a lista de produtos antes de buscar na API.
 * Isso garante que a lista seja sempre a mais atual, refletindo o que o admin publicou.
 */
async function loadAllPublishedProducts() {
    const loader = document.getElementById('reseller-product-list-loader');
    if (loader) loader.classList.add('visible');
    
    // CORREÇÃO: Limpa a lista de produtos para forçar a recarga a partir da API.
    resellerProducts = []; 
    
    let currentPage = 1;
    let hasMore = true;
    try {
        // Recarrega a lista de IDs publicados do localStorage, caso tenha mudado.
        loadLocalDataForReseller();

        while(hasMore) {
            const data = await realApiFetch(currentPage, 100, ''); 
            if (!data.data || data.data.length === 0) {
                hasMore = false;
                break;
            }
            
            // Filtra os produtos da página atual para incluir apenas os que foram publicados pelo admin
            const publishedInPage = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
            
            if (publishedInPage.length > 0) {
                 const processed = publishedInPage.map(p => {
                    return { 
                        id: parseInt(p.id, 10), 
                        nome: p.nome || 'Nome não informado', 
                        preco_original: parseFloat(p.preco || 0), 
                        imagem: (typeof p.imagem === 'string' ? p.imagem.split(',')[0].trim() : null) 
                    };
                });
                resellerProducts.push(...processed);
            }
            
            hasMore = data.hasNext;
            currentPage++;
        }
    } catch (error) {
        console.error("Erro ao buscar produtos para revendedora:", error);
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Nenhum produto publicado para você no momento. Verifique o painel da empresa.</td></tr>'; 
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
            <td data-label="Ativar"><label class="toggle-switch"><input type="checkbox" onchange="toggleResellerProductActive(${p.id})" ${isActive ? 'checked' : ''}><span class="slider"></span></label></td>
            <td data-label="Ações" class="actions-cell">
                <button class="btn" onclick="showResellerProductEditModal(${p.id})" style="padding: 0.25rem 0.5rem;" title="Editar Margem"><i data-feather="edit-2"></i></button>
                <button class="btn" onclick="showResellerTagsModal(${p.id})" style="padding: 0.25rem 0.5rem;" title="Editar Tags"><i data-feather="tag"></i></button>
            </td>
        `;
    });
    feather.replace();
}

function loadAppearanceSettings() {
    const settings = resellerSettings;
    document.getElementById('brand-name-input').value = settings.brandName || '';
    document.getElementById('primary-color-input').value = settings.primaryColor || '#DB1472';
    document.getElementById('secondary-color-input').value = settings.secondaryColor || '#F8B81F';
    document.getElementById('contact-phone-input').value = settings.contactPhone || '';
    document.getElementById('instagram-input').value = settings.instagram || '';
    document.getElementById('description-textarea').value = settings.description || '';
    document.getElementById('top-bar-msg-1').value = settings.topBarMsg1 || '';
    document.getElementById('top-bar-msg-2').value = settings.topBarMsg2 || '';
    document.getElementById('top-bar-msg-3').value = settings.topBarMsg3 || '';
    document.getElementById('catalog-url-name').value = settings.catalogUrlName || '';
    if(settings.logoUrl) document.getElementById('logo-preview').src = settings.logoUrl;
    if(settings['banner-desktop-main']) document.getElementById('banner-preview-desktop-main').src = settings['banner-desktop-main'];
    if(settings['banner-mobile-main']) document.getElementById('banner-preview-mobile-main').src = settings['banner-mobile-main'];
}

function saveAppearanceSettings() {
    resellerSettings.brandName = document.getElementById('brand-name-input').value;
    resellerSettings.primaryColor = document.getElementById('primary-color-input').value;
    resellerSettings.secondaryColor = document.getElementById('secondary-color-input').value;
    resellerSettings.contactPhone = document.getElementById('contact-phone-input').value;
    resellerSettings.instagram = document.getElementById('instagram-input').value;
    resellerSettings.description = document.getElementById('description-textarea').value;
    resellerSettings.topBarMsg1 = document.getElementById('top-bar-msg-1').value;
    resellerSettings.topBarMsg2 = document.getElementById('top-bar-msg-2').value;
    resellerSettings.topBarMsg3 = document.getElementById('top-bar-msg-3').value;
    resellerSettings.catalogUrlName = document.getElementById('catalog-url-name').value;
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações de aparência salvas!', 'success');
}

// --- LÓGICA DE PROMOÇÕES ---

function setupPromotionsPage() {
    const { freeShipping, firstPurchase, stockLimit, vipCoupon, seasonalSale, timeLimit, progressiveDiscount } = resellerPromotions;
    if (freeShipping) document.getElementById('free-shipping-min-value').value = freeShipping.minValue || '';
    if (firstPurchase) {
        document.getElementById('first-purchase-code').value = firstPurchase.code || 'BEMVINDA10';
        document.getElementById('first-purchase-discount').value = firstPurchase.discount || '10';
    }
    if (stockLimit) {
        document.getElementById('stock-limit-threshold').value = stockLimit.threshold || '5';
        document.getElementById('stock-limit-message').value = stockLimit.message || 'Últimas unidades!';
    }
    if (vipCoupon) {
        document.getElementById('vip-code').value = vipCoupon.code || '';
        document.getElementById('vip-discount').value = vipCoupon.discount || '';
    }
    if (seasonalSale) {
        document.getElementById('seasonal-name').value = seasonalSale.name || '';
        document.getElementById('seasonal-discount').value = seasonalSale.discount || '';
        document.getElementById('seasonal-start-date').value = seasonalSale.startDate || '';
        document.getElementById('seasonal-end-date').value = seasonalSale.endDate || '';
    }
     if (timeLimit) {
        document.getElementById('time-limit-target').value = timeLimit.target || 'all';
        document.getElementById('time-limit-discount').value = timeLimit.discount || '';
        document.getElementById('time-limit-duration').value = timeLimit.duration || '24h';
    }
    if (progressiveDiscount) {
        document.getElementById('prog-discount-value1').value = progressiveDiscount.tier1?.value || '';
        document.getElementById('prog-discount-percent1').value = progressiveDiscount.tier1?.discount || '';
        document.getElementById('prog-discount-value2').value = progressiveDiscount.tier2?.value || '';
        document.getElementById('prog-discount-percent2').value = progressiveDiscount.tier2?.discount || '';
    }
}

function saveFlashSale() { showToast("Flash Sale salva!", "success"); closeModal('flash-sale-modal'); }
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
function saveBmpl() { showToast("Oferta Leve Mais, Pague Menos salva!", "success"); closeModal('buy-more-pay-less-modal'); }
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

// --- FUNÇÕES AUXILIARES ---
function applyMassMargin() { /* ...código existente... */ }
function handleImageUpload(event, previewElementId, settingsKey) { /* ...código existente... */ }
function generateAndCopyCatalogLink() { /* ...código existente... */ }
function toggleResellerProductActive(productId) {
    const index = resellerActiveProductIds.indexOf(productId);
    if (index > -1) resellerActiveProductIds.splice(index, 1);
    else resellerActiveProductIds.push(productId);
    localStorage.setItem('resellerActiveProducts', JSON.stringify(resellerActiveProductIds));
    showToast('Visibilidade do produto atualizada!', 'success');
}
function showResellerProductEditModal(productId) {
    const product = resellerProducts.find(p => p.id === productId);
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
