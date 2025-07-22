/**
 * painel-revendedora.js
 * * VERSÃO COM PÁGINA DE PROMOÇÕES ESTRUTURADA
 * - Adicionada a lógica para abrir os modais de cada tipo de promoção.
 * - Implementado o salvamento no localStorage para as ofertas de Frete Grátis e Primeira Compra.
 */

// --- VARIÁVEIS GLOBAIS ---
let resellerProducts = [];
let publishedProductIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let resellerPromotions = {}; // NOVO: Objeto para armazenar todas as promoções

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
    document.getElementById('save-free-shipping-btn').addEventListener('click', saveFreeShipping);
    document.getElementById('save-first-purchase-btn').addEventListener('click', saveFirstPurchaseCoupon);
    // Adicionar listeners para os outros botões de salvar aqui...
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
}

async function loadAllPublishedProducts() {
    const loader = document.getElementById('reseller-product-list-loader');
    if (loader) loader.classList.add('visible');
    
    // Evita recarregar desnecessariamente se os produtos já estiverem na memória
    if (resellerProducts.length > 0) {
        renderResellerProductsTable();
        if (loader) loader.classList.remove('visible');
        return;
    }

    let currentPage = 1;
    let hasMore = true;
    try {
        while(hasMore) {
            const data = await realApiFetch(currentPage, 100, ''); 
            if (!data.data || data.data.length === 0) {
                hasMore = false;
                break;
            }
            const publishedInPage = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
            if (publishedInPage.length > 0) {
                 const processed = publishedInPage.map(p => ({ id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', preco_original: parseFloat(p.preco || 0), imagem: (typeof p.imagem === 'string' ? p.imagem.split(',')[0].trim() : null) }));
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum produto publicado para você no momento.</td></tr>'; 
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
    // ... (restante do código para carregar as configurações de aparência)
}

function saveAppearanceSettings() {
    resellerSettings.brandName = document.getElementById('brand-name-input').value;
    resellerSettings.primaryColor = document.getElementById('primary-color-input').value;
    // ... (restante do código para salvar as configurações de aparência)
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações de aparência salvas!', 'success');
}

// --- LÓGICA DE PROMOÇÕES ---

function setupPromotionsPage() {
    // Carrega os dados das promoções salvas nos campos dos modais
    const { freeShipping, firstPurchase } = resellerPromotions;

    if (freeShipping) {
        document.getElementById('free-shipping-min-value').value = freeShipping.minValue || '';
    }
    if (firstPurchase) {
        document.getElementById('first-purchase-code').value = firstPurchase.code || 'BEMVINDA10';
        document.getElementById('first-purchase-discount').value = firstPurchase.discount || '10';
    }
    // Carregar dados de outras promoções aqui...
}

function saveFreeShipping() {
    const minValue = document.getElementById('free-shipping-min-value').value;
    if (!minValue || parseFloat(minValue) <= 0) {
        showToast("Por favor, insira um valor mínimo válido.", "error");
        return;
    }

    resellerPromotions.freeShipping = {
        active: true,
        minValue: parseFloat(minValue)
    };

    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Oferta de Frete Grátis salva!", "success");
    closeModal('free-shipping-modal');
}

function saveFirstPurchaseCoupon() {
    const code = document.getElementById('first-purchase-code').value.trim().toUpperCase();
    const discount = document.getElementById('first-purchase-discount').value;

    if (!code) {
        showToast("O código do cupom não pode estar vazio.", "error");
        return;
    }
    if (!discount || parseInt(discount) <= 0) {
        showToast("Insira um percentual de desconto válido.", "error");
        return;
    }

    resellerPromotions.firstPurchase = {
        active: true,
        code: code,
        discount: parseInt(discount)
    };

    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast("Cupom de Primeira Compra salvo!", "success");
    closeModal('first-purchase-modal');
}


// --- FUNÇÕES AUXILIARES ---
function applyMassMargin() {
    const newMargin = parseFloat(document.getElementById('mass-margin-input').value);
    if (isNaN(newMargin) || newMargin < 0) { showToast('Margem inválida.', 'error'); return; }
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
        document.getElementById(previewElementId).src = e.target.result;
        resellerSettings[settingsKey] = e.target.result;
    };
    reader.readAsDataURL(file);
}

function generateAndCopyCatalogLink() {
    const urlName = document.getElementById('catalog-url-name').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!urlName) {
        showToast('Defina um nome para a URL da sua loja.', 'error');
        return;
    }
    const finalUrl = `${window.location.origin}/catalogo/index.html?loja=${urlName}`;
    navigator.clipboard.writeText(finalUrl).then(() => {
        showToast('Link do catálogo copiado!', 'success');
    }, () => {
        showToast('Erro ao copiar o link.', 'error');
    });
}

// Funções de placeholder
function toggleResellerProductActive(productId) {
    const index = resellerActiveProductIds.indexOf(productId);
    if (index > -1) resellerActiveProductIds.splice(index, 1);
    else resellerActiveProductIds.push(productId);
    localStorage.setItem('resellerActiveProducts', JSON.stringify(resellerActiveProductIds));
    showToast('Visibilidade do produto atualizada!', 'success');
}
function showResellerProductEditModal(productId) { /* ... */ }
function showResellerTagsModal(productId) { /* ... */ }
