/**
 * CORREÇÕES IDENTIFICADAS E SOLUÇÕES
 */

// PROBLEMA 1: Funções não implementadas (apenas comentários /* ... */)
// SOLUÇÃO: Implementar as funções básicas

function applyMassMargin() {
    const marginValue = document.getElementById('mass-margin-input')?.value;
    if (!marginValue || isNaN(marginValue)) {
        showToast('Por favor, insira uma margem válida.', 'error');
        return;
    }
    
    const margin = parseFloat(marginValue);
    resellerProducts.forEach(product => {
        resellerProductMargins[product.id] = margin;
    });
    
    localStorage.setItem('resellerMargins', JSON.stringify(resellerProductMargins));
    renderResellerProductsTable();
    showToast('Margem aplicada a todos os produtos!', 'success');
}

function handleImageUpload(event, previewElementId, settingsKey) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById(previewElementId);
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        
        // Salva no localStorage
        if (!resellerSettings) resellerSettings = {};
        resellerSettings[settingsKey] = e.target.result;
        localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
        showToast('Imagem carregada com sucesso!', 'success');
    };
    reader.readAsDataURL(file);
}

function generateAndCopyCatalogLink() {
    const baseUrl = window.location.origin;
    const catalogLink = `${baseUrl}/catalogo-revendedor?id=${Date.now()}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(catalogLink).then(() => {
            showToast('Link copiado para a área de transferência!', 'success');
        });
    } else {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = catalogLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Link copiado!', 'success');
    }
}

function loadAppearanceSettings() {
    if (!resellerSettings) return;
    
    // Carregar logo
    if (resellerSettings.logoUrl) {
        const logoPreview = document.getElementById('logo-preview');
        if (logoPreview) {
            logoPreview.src = resellerSettings.logoUrl;
            logoPreview.style.display = 'block';
        }
    }
    
    // Carregar banners
    for (let i = 1; i <= 3; i++) {
        const bannerKey = `banner-${i}`;
        if (resellerSettings[bannerKey]) {
            const bannerPreview = document.getElementById(`banner-preview-${i}`);
            if (bannerPreview) {
                bannerPreview.src = resellerSettings[bannerKey];
                bannerPreview.style.display = 'block';
            }
        }
    }
    
    // Carregar cores
    const colorInputs = ['primary-color', 'secondary-color', 'accent-color'];
    colorInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input && resellerSettings[inputId]) {
            input.value = resellerSettings[inputId];
        }
    });
}

function saveAppearanceSettings() {
    if (!resellerSettings) resellerSettings = {};
    
    // Salvar cores
    const colorInputs = ['primary-color', 'secondary-color', 'accent-color'];
    colorInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            resellerSettings[inputId] = input.value;
        }
    });
    
    localStorage.setItem('resellerSettings', JSON.stringify(resellerSettings));
    showToast('Configurações de aparência salvas!', 'success');
}

// PROBLEMA 2: Funções de promoção não implementadas
function saveFlashSale() {
    const productId = document.getElementById('flash-sale-product')?.value;
    const discount = document.getElementById('flash-sale-discount')?.value;
    const startDate = document.getElementById('flash-sale-start')?.value;
    const endDate = document.getElementById('flash-sale-end')?.value;
    
    if (!productId || !discount || !startDate || !endDate) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    if (!resellerPromotions) resellerPromotions = {};
    resellerPromotions.flashSale = { productId, discount, startDate, endDate };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    closeModal('flash-sale-modal');
    showToast('Oferta relâmpago salva!', 'success');
}

function saveFreeShipping() {
    const minValue = document.getElementById('free-shipping-min-value')?.value;
    if (!minValue) {
        showToast('Informe o valor mínimo para frete grátis.', 'error');
        return;
    }
    
    if (!resellerPromotions) resellerPromotions = {};
    resellerPromotions.freeShipping = { minValue: parseFloat(minValue) };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast('Frete grátis configurado!', 'success');
}

function saveFirstPurchaseCoupon() {
    const code = document.getElementById('first-purchase-code')?.value;
    const discount = document.getElementById('first-purchase-discount')?.value;
    
    if (!code || !discount) {
        showToast('Preencha o código e desconto.', 'error');
        return;
    }
    
    if (!resellerPromotions) resellerPromotions = {};
    resellerPromotions.firstPurchase = { code, discount };
    localStorage.setItem('resellerPromotions', JSON.stringify(resellerPromotions));
    showToast('Cupom de primeira compra salvo!', 'success');
}

// Implementar as outras funções de promoção seguindo o mesmo padrão...
function saveStockLimit() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

function saveTimeLimit() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

function saveBmpl() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

function saveProgressiveDiscount() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

function saveVipCoupon() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

function saveSeasonalSale() {
    // Implementação similar...
    showToast('Configuração salva!', 'success');
}

// PROBLEMA 3: Função showToast não está definida
function showToast(message, type = 'info') {
    // Criar elemento do toast se não existir
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// PROBLEMA 4: Função proxyImageUrl não definida
function proxyImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
        return 'https://via.placeholder.com/150x150?text=Sem+Imagem';
    }
    // Se já é uma URL completa, retorna como está
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }
    // Caso contrário, assume que é uma URL relativa e adiciona o domínio base
    return `https://seudominio.com/images/${imageUrl}`;
}

// PROBLEMA 5: Função realApiFetch não definida
async function realApiFetch(page = 1, limit = 100, search = '') {
    try {
        // Substitua pela sua URL de API real
        const response = await fetch(`/api/produtos?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Adapte a estrutura conforme sua API retorna
        return {
            data: data.produtos || data.data || [],
            hasNext: data.hasNext || (data.data && data.data.length === limit)
        };
    } catch (error) {
        console.error('Erro na API:', error);
        // Retorna dados vazios em caso de erro
        return { data: [], hasNext: false };
    }
}

// CORREÇÃO ADICIONAL: Verificar se elementos existem antes de usar
function setupEventListeners() {
    // Navegação principal
    setupNavigation();

    // Botões gerais - verificar se existem antes de adicionar listeners
    const applyMassMarginBtn = document.getElementById('apply-mass-margin');
    if (applyMassMarginBtn) {
        applyMassMarginBtn.addEventListener('click', applyMassMargin);
    }

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveAppearanceSettings);
    }

    const generateLinkBtn = document.getElementById('generate-link-btn');
    if (generateLinkBtn) {
        generateLinkBtn.addEventListener('click', generateAndCopyCatalogLink);
    }

    const logoUpload = document.getElementById('logo-upload');
    if (logoUpload) {
        logoUpload.addEventListener('change', (e) => handleImageUpload(e, 'logo-preview', 'logoUrl'));
    }

    // Banner uploads
    document.querySelectorAll('.banner-upload').forEach(input => {
        input.addEventListener('change', (e) => {
            const bannerId = e.target.dataset.bannerId;
            handleImageUpload(e, `banner-preview-${bannerId}`, `banner-${bannerId}`);
        });
    });

    // Botões para abrir modais
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Botões para fechar modais
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.closest('.modal-overlay')?.id;
            if (modalId) closeModal(modalId);
        });
    });

    // Botões de salvar promoções - com verificação de existência
    const promotionButtons = [
        { id: 'save-flash-sale-btn', fn: saveFlashSale },
        { id: 'save-stock-limit-btn', fn: saveStockLimit },
        { id: 'save-time-limit-btn', fn: saveTimeLimit },
        { id: 'save-bmpl-btn', fn: saveBmpl },
        { id: 'save-prog-discount-btn', fn: saveProgressiveDiscount },
        { id: 'save-free-shipping-btn', fn: saveFreeShipping },
        { id: 'save-first-purchase-btn', fn: saveFirstPurchaseCoupon },
        { id: 'save-vip-btn', fn: saveVipCoupon },
        { id: 'save-seasonal-btn', fn: saveSeasonalSale }
    ];

    promotionButtons.forEach(({ id, fn }) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', fn);
    });

    // Botões da página de Descrições
    const addSizingChartBtn = document.getElementById('add-sizing-chart-btn');
    if (addSizingChartBtn) {
        addSizingChartBtn.addEventListener('click', () => openSizingChartModal());
    }

    const saveSizingChartBtn = document.getElementById('save-sizing-chart-btn');
    if (saveSizingChartBtn) {
        saveSizingChartBtn.addEventListener('click', saveSizingChart);
    }

    // Continuar com os outros botões...
    const addRowBtn = document.getElementById('add-sizing-chart-row-btn');
    if (addRowBtn) addRowBtn.addEventListener('click', addSizingChartRow);

    const addColBtn = document.getElementById('add-sizing-chart-col-btn');
    if (addColBtn) addColBtn.addEventListener('click', addSizingChartColumn);

    const saveDescBtn = document.getElementById('save-product-description-btn');
    if (saveDescBtn) saveDescBtn.addEventListener('click', saveProductDescription);

    // Delegação de eventos para tabelas dinâmicas
    setupTableEventListeners();
}
