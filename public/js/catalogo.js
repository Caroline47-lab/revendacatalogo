/**
 * catalogo.js
 * * Este arquivo contém toda a lógica para o catálogo público do cliente.
 */

// --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
let resellerProducts = [];
let allCategories = [];
let publishedProductIds = [];
let publishedCategoryIds = [];
let resellerProductMargins = {};
let resellerProductTags = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let cart = [];
let currentCustomer = null;
let pendingCartAction = null;

// --- INICIALIZAÇÃO DO CATÁLOGO ---
document.addEventListener('DOMContentLoaded', () => {
    // Roda o setup apenas se encontrar o container do catálogo
    if (document.getElementById('catalog-wrapper')) {
        loadLocalDataForCatalog();
        loadAllPublishedProducts().then(() => {
            renderCatalogPreview();
        });
        feather.replace();
    }
});

// --- LÓGICA DO CATÁLOGO ---

/**
 * Carrega os dados salvos no localStorage que são relevantes para o catálogo.
 */
function loadLocalDataForCatalog() {
    const savedPublished = localStorage.getItem('erpPublished');
    if (savedPublished) {
        publishedProductIds = JSON.parse(savedPublished).map(id => parseInt(id, 10));
    }
    const savedPublishedCategories = localStorage.getItem('erpPublishedCategories');
    if (savedPublishedCategories) publishedCategoryIds = JSON.parse(savedPublishedCategories);
    const savedMargins = localStorage.getItem('resellerMargins');
    if (savedMargins) resellerProductMargins = JSON.parse(savedMargins);
    const savedTags = localStorage.getItem('resellerProductTags');
    if (savedTags) resellerProductTags = JSON.parse(savedTags);
    const savedResellerActive = localStorage.getItem('resellerActiveProducts');
    if (savedResellerActive) {
        resellerActiveProductIds = JSON.parse(savedResellerActive).map(id => parseInt(id, 10));
    }
    const savedSettings = localStorage.getItem('resellerSettings');
    if (savedSettings) resellerSettings = JSON.parse(savedSettings);
}

/**
 * Busca na API todos os produtos que foram marcados como publicados pelo admin.
 */
async function loadAllPublishedProducts() {
    resellerProducts = []; 
    let currentPage = 1;
    let hasMore = true;

    try {
        while(hasMore) {
            const data = await realApiFetch(currentPage, 100, ''); 
            if (data.data.length === 0) {
                hasMore = false;
                break;
            }

            const publishedInPage = data.data.filter(p => publishedProductIds.includes(parseInt(p.id, 10)));
            
            if (publishedInPage.length > 0) {
                 const processed = publishedInPage.map(p => {
                    const variacoes = processVariations(p.estoque);
                    const estoqueTotal = variacoes.reduce((total, v) => total + v.quantidade, 0);
                    const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
                    return { id: parseInt(p.id, 10), nome: p.nome || 'Nome não informado', sku: p.sku || 'N/A', preco_original: parseFloat(p.preco || 0), imagem: imagens[0] || null, imagens_adicionais: imagens, estoque_total: estoqueTotal, variacoes: variacoes, status: estoqueTotal > 0 ? 'ativo' : 'sem_estoque', categoria_nome: p.categoria_nome || 'Sem Categoria' };
                });
                resellerProducts.push(...processed);
            }
            
            hasMore = data.hasNext;
            currentPage++;
        }
    } catch (error) {
        console.error("Erro ao buscar produtos para o catálogo:", error);
        showToast("Erro ao carregar os produtos.", "error");
    }
}


function renderCatalogPreview(searchTerm = '', categoryFilter = '') {
    const catalogView = document.getElementById('catalog-preview-view');
    // A estrutura principal do catálogo já estará no HTML, então só precisamos preenchê-la.
    const wrapper = document.getElementById('catalog-wrapper');
    if (!wrapper) return;

    const settings = resellerSettings;
    document.documentElement.style.setProperty('--reseller-primary-color', settings.primaryColor || '#DB1472');
    document.documentElement.style.setProperty('--reseller-secondary-color', settings.secondaryColor || '#F8B81F');
    
    const topBarContainer = catalogView.querySelector('#catalog-top-bar-container');
    const messages = [ settings.topBarMsg1 || 'USE O CUPOM:PRIMEIRACOMPRA', settings.topBarMsg2 || 'APROVEITE 10% OFF', settings.topBarMsg3 || 'FRETE GRÁTIS ACIMA DE R$599' ].filter(Boolean);
    if (messages.length > 0) {
        const contentHTML = messages.map(msg => `<span>${msg}</span>`).join('');
        topBarContainer.innerHTML = `<div class="top-bar-content">${contentHTML}${contentHTML}</div>`;
    } else {
        topBarContainer.innerHTML = '';
    }

    const bannerArea = catalogView.querySelector('#catalog-banner');
    const bannerUrl = window.innerWidth > 768 ? settings['banner-desktop-main'] : settings['banner-mobile-main'];
    if (bannerUrl) {
        bannerArea.style.backgroundImage = `url(${bannerUrl})`;
        bannerArea.textContent = '';
    }

    catalogView.querySelector('#catalog-logo').src = settings.logoUrl || 'https://placehold.co/180x180/e2e8f0/cccccc?text=';
    catalogView.querySelector('#catalog-brand-name-footer').textContent = settings.brandName || 'Sua Marca';
    catalogView.querySelector('#catalog-description').textContent = settings.description || 'Bem-vindo(a) ao meu catálogo!';
    catalogView.querySelector('#catalog-instagram-link').href = settings.instagram ? `https://instagram.com/${settings.instagram.replace('@','')}` : '#';
    catalogView.querySelector('#catalog-whatsapp-link').href = settings.contactPhone ? `https://wa.me/55${settings.contactPhone.replace(/\D/g,'')}` : '#';
    
    let activeCatalogProducts = resellerProducts.filter(p => resellerActiveProductIds.includes(p.id));
    
    if (searchTerm) activeCatalogProducts = activeCatalogProducts.filter(p => p.nome.toLowerCase().includes(searchTerm));
    if (categoryFilter) activeCatalogProducts = activeCatalogProducts.filter(p => p.categoria_nome === categoryFilter);

    const grid = catalogView.querySelector('#catalog-product-grid');
    grid.innerHTML = '';
    if (activeCatalogProducts.length === 0) { grid.innerHTML = '<p class="placeholder-card" style="grid-column: 1 / -1;">Nenhum produto encontrado.</p>'; return; }

    activeCatalogProducts.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
        const card = document.createElement('div');
        card.className = 'catalog-product-card';
        card.innerHTML = `<img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" loading="lazy" width="300" height="300" onerror="this.src='https://placehold.co/300x300/e2e8f0/94a3b8?text=Imagem'"><div class="catalog-product-card-body"><h3>${p.nome}</h3><p class="price">R$ ${finalPrice.toFixed(2)}</p><button class="btn view-product-btn" data-product-id="${p.id}">Ver Detalhes</button></div>`;
        grid.appendChild(card);
    });
    
    catalogView.querySelectorAll('.view-product-btn').forEach(btn => btn.addEventListener('click', (e) => showProductDetailPage(e.target.dataset.productId)));
    
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '<a href="#" class="category-link" data-category="">Ver Todas as Categorias</a>';
    publishedCategoryIds.forEach(catName => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'category-link';
        link.dataset.category = catName;
        link.textContent = catName;
        categoryList.appendChild(link);
    });

    document.querySelectorAll('.category-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const category = e.target.dataset.category;
            renderCatalogPreview(searchTerm, category);
            closeModal('category-modal');
        });
    });
    
    catalogView.querySelector('#catalog-menu-toggle').addEventListener('click', () => {
        document.getElementById('category-modal').classList.add('active');
    });

    catalogView.querySelector('#cart-button').addEventListener('click', (e) => { e.preventDefault(); showCartModal(); });
    
    const searchInput = catalogView.querySelector('#catalog-search-input');
    const searchBtn = catalogView.querySelector('#catalog-search-btn');
    const performSearch = () => renderCatalogPreview(searchInput.value.toLowerCase(), categoryFilter);
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });
    
    updateCartCount();
    feather.replace();
}

function showProductDetailPage(productId) {
    document.getElementById('catalog-wrapper').style.display = 'none';
    const detailWrapper = document.getElementById('product-detail-wrapper');
    detailWrapper.style.display = 'block';

    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) {
        detailWrapper.innerHTML = `<p class="placeholder-card">Produto não encontrado.</p>`;
        return;
    }

    const margin = resellerProductMargins[product.id] || 30;
    const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
    const priceFrom = finalPrice / 0.92;
    const productTags = resellerProductTags[productId] || [];

    const tagsHTML = productTags.map(tag => {
        let tagClass = '';
        if (tag === 'Destaque') tagClass = 'highlight';
        else if (tag === 'Lançamento') tagClass = 'launch';
        else if (tag === 'Promoção') tagClass = 'promo';
        return `<span class="product-detail-tag ${tagClass}">${tag.toUpperCase()}</span>`;
    }).join('');

    const variationsHTML = product.variacoes.map(v => {
        const size = String(v.nome || '').replace('Tamanho: ', '').trim();
        const isOutOfStock = v.quantidade <= 0;
        return `
            <div class="size-option ${isOutOfStock ? 'disabled' : ''}">
                <div class="size-label">${size}</div>
                <div class="quantity-stepper" data-variation-name="${v.nome}" data-max-stock="${v.quantidade}">
                    <button class="quantity-btn" data-action="decrease" ${isOutOfStock ? 'disabled' : ''}>-</button>
                    <input type="number" class="quantity-input" value="0" min="0" max="${v.quantidade}" ${isOutOfStock ? 'disabled' : ''} readonly>
                    <button class="quantity-btn" data-action="increase" ${isOutOfStock ? 'disabled' : ''}>+</button>
                </div>
            </div>
        `;
    }).join('');

    detailWrapper.innerHTML = `
        <div id="product-detail-container">
            <button class="btn" id="back-to-catalog-btn" style="margin-bottom: 1rem;"><i data-feather="arrow-left"></i> Voltar ao catálogo</button>
            <div class="product-detail-grid">
                <div class="product-detail-images">
                    <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" loading="lazy" width="580" height="580">
                </div>
                <div class="product-detail-info">
                    <div class="product-detail-tags">${tagsHTML}</div>
                    <h1>${product.nome}</h1>
                    <div class="product-detail-rating">
                        <i data-feather="star" fill="#f59e0b" stroke="#f59e0b"></i>
                        <i data-feather="star" fill="#f59e0b" stroke="#f59e0b"></i>
                        <i data-feather="star" fill="#f59e0b" stroke="#f59e0b"></i>
                        <i data-feather="star" fill="#f59e0b" stroke="#f59e0b"></i>
                        <i data-feather="star" fill="#f59e0b" stroke="#f59e0b"></i>
                    </div>
                    <div class="product-detail-price-container">
                        <span class="price-from">De R$ ${priceFrom.toFixed(2)}</span>
                        <span class="price-to">A Partir de: R$ ${finalPrice.toFixed(2)}</span>
                    </div>
                    <div class="size-options-container">
                        <label>Tamanho:</label>
                        <div class="size-grid">${variationsHTML}</div>
                    </div>
                    <button class="btn buy-button" id="detail-buy-btn" data-product-id="${product.id}">COMPRAR</button>
                    <div class="product-info-icons">
                        <div><i data-feather="truck"></i><span>Despacho em até 72hs úteis</span></div>
                        <div><i data-feather="credit-card"></i><span>Pague no cartão de crédito</span></div>
                        <div><i data-feather="box"></i><span>Receba o produto que está esperando</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    detailWrapper.querySelector('#back-to-catalog-btn').addEventListener('click', () => {
        detailWrapper.style.display = 'none';
        document.getElementById('catalog-wrapper').style.display = 'block';
    });

    detailWrapper.addEventListener('click', e => {
        if (e.target.classList.contains('quantity-btn')) {
            const stepper = e.target.closest('.quantity-stepper');
            const input = stepper.querySelector('.quantity-input');
            const maxStock = parseInt(stepper.dataset.maxStock);
            let currentValue = parseInt(input.value);
            const action = e.target.dataset.action;

            if (action === 'increase') {
                if (currentValue < maxStock) {
                    input.value = currentValue + 1;
                } else {
                    showToast(`Apenas ${maxStock} unidades em estoque.`, 'warning');
                }
            } else if (action === 'decrease' && currentValue > 0) {
                input.value = currentValue - 1;
            }
        }
    });

    detailWrapper.querySelector('#detail-buy-btn').addEventListener('click', e => {
        const productId = e.target.dataset.productId;
        const sizeOptions = detailWrapper.querySelectorAll('.quantity-stepper');
        let itemsToAdd = [];
        let hasError = false;
        sizeOptions.forEach(option => {
            const quantity = parseInt(option.querySelector('.quantity-input').value);
            if (quantity > 0) {
                const variationName = option.dataset.variationName;
                const maxStock = parseInt(option.dataset.maxStock);
                if (quantity > maxStock) {
                    showToast(`Quantidade para ${variationName} excede o estoque (${maxStock}).`, 'error');
                    hasError = true;
                }
                itemsToAdd.push({ productId, variationName, quantity });
            }
        });

        if (hasError) return;

        if (itemsToAdd.length > 0) {
            handleAddToCart(itemsToAdd);
        } else {
            showToast('Selecione a quantidade de pelo menos um item.', 'error');
        }
    });

    feather.replace();
}

function handleAddToCart(items) {
    if (!currentCustomer) {
        pendingCartAction = () => {
            items.forEach(item => addToCart(item.productId, item.variationName, item.quantity));
            showToast(`${items.length} item(ns) adicionado(s) ao carrinho!`, 'success');
        };
        document.getElementById('customer-info-modal').classList.add('active');
    } else {
        items.forEach(item => addToCart(item.productId, item.variationName, item.quantity));
        showToast(`${items.length} item(ns) adicionado(s) ao carrinho!`, 'success');
    }
}

function saveCustomerAndAddToCart() {
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    if (!name || !phone) {
        showToast('Por favor, preencha nome e telefone.', 'error');
        return;
    }
    currentCustomer = { name, phone };
    localStorage.setItem('currentCustomer', JSON.stringify(currentCustomer));
    
    closeModal('customer-info-modal');
    if (pendingCartAction) {
        pendingCartAction();
        pendingCartAction = null;
    }
}

function addToCart(productId, variation, quantity) {
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    if (!product) return;

    const variationData = product.variacoes.find(v => v.nome === variation);
    if (!variationData || quantity > variationData.quantidade) {
        showToast(`Estoque insuficiente para ${product.nome} (${variation}).`, 'error');
        return;
    }

    const cartItemId = `${productId}-${variation}`;
    const existingItem = cart.find(item => item.cartId === cartItemId);
    if (existingItem) {
        if (existingItem.quantity + quantity > variationData.quantidade) {
            showToast(`Quantidade máxima para ${product.nome} (${variation}) atingida.`, 'error');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity: quantity, variation: variation, cartId: cartItemId });
    }
    updateCartCount();
    updateAbandonedCart();
}

function updateAbandonedCart() {
    if (!currentCustomer) return;

    const existingCartIndex = abandonedCarts.findIndex(c => c.customer.phone === currentCustomer.phone);
    
    if (existingCartIndex > -1) {
        abandonedCarts[existingCartIndex].items = cart;
        abandonedCarts[existingCartIndex].date = new Date().toISOString();
    } else {
        abandonedCarts.push({
            id: Date.now(),
            customer: currentCustomer,
            items: cart,
            date: new Date().toISOString()
        });
    }
    localStorage.setItem('abandonedCarts', JSON.stringify(abandonedCarts));
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

function showCartModal() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem 0;">Seu carrinho está vazio.</p>';
    } else {
        cart.forEach(item => {
            const margin = resellerProductMargins[item.id] || 30;
            const finalPrice = parseFloat(item.preco_original) * (1 + margin / 100);
            total += finalPrice * item.quantity;
            const itemEl = document.createElement('div');
            itemEl.style.padding = '0.5rem 0';
            itemEl.style.borderBottom = '1px solid var(--border-color)';
            itemEl.innerHTML = `<p>${item.quantity}x ${item.nome} (${item.variation}) - <strong>R$ ${(finalPrice * item.quantity).toFixed(2)}</strong></p>`;
            cartItemsContainer.appendChild(itemEl);
        });
    }
    document.getElementById('cart-total').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('cart-modal').classList.add('active');
    feather.replace();
}
    
function createPendingOrderAndOpenWhatsApp() {
    if (cart.length === 0) {
        showToast('Seu carrinho está vazio.', 'error');
        return;
    }
    if (!currentCustomer) {
         showToast('Informações do cliente não encontradas.', 'error');
         return;
    }

    const total = cart.reduce((sum, item) => {
        const margin = resellerProductMargins[item.id] || 30;
        const finalPrice = parseFloat(item.preco_original) * (1 + margin / 100);
        return sum + (finalPrice * item.quantity);
    }, 0);

    const newSale = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        customer: currentCustomer,
        items: [...cart],
        total: total,
        status: 'pendente'
    };

    let message = `Olá, ${resellerSettings.brandName || 'Revendedora'}! Gostaria de fazer o seguinte pedido:\n\n`;
    cart.forEach(item => {
        const margin = resellerProductMargins[item.id] || 30;
        const finalPrice = parseFloat(item.preco_original) * (1 + margin / 100);
        message += `*${item.quantity}x* - ${item.nome} (${item.variation}) - R$ ${finalPrice.toFixed(2)} cada\n`;
    });
    message += `\n*Total do Pedido: R$ ${total.toFixed(2)}*`;
    
    const phone = (resellerSettings.contactPhone || '').replace(/\D/g, '');
    if (!phone) { showToast('O número de contato da revendedora não está configurado.', 'error'); return; }
    
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    cart = [];
    updateCartCount();
    closeModal('cart-modal');
    showToast('Pedido enviado! Aguardando confirmação.', 'success');
}

function closeModal(modalId) { 
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

