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
let selectedSize = ''; // Variável para guardar o tamanho selecionado

// --- INICIALIZAÇÃO DO CATÁLOGO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('catalog-preview-view')) {
        loadLocalDataForCatalog();
        loadAndDisplayCatalog();
        feather.replace();
    }
});

// --- LÓGICA DO CATÁLOGO ---

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

async function loadAndDisplayCatalog() {
    renderCatalogShell();
    
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
                appendProductsToCatalogGrid(processed);
            }
            
            hasMore = data.hasNext;
            currentPage++;
        }
    } catch (error) {
        console.error("Erro ao buscar produtos para o catálogo:", error);
        showToast("Erro ao carregar os produtos.", "error");
    } finally {
        renderSizeFilters();
        const loader = document.getElementById('catalog-loader');
        if(loader) loader.style.display = 'none';
        if(resellerProducts.length === 0) {
            const grid = document.getElementById('catalog-product-grid');
            if(grid) grid.innerHTML = '<p class="placeholder-card" style="grid-column: 1 / -1;">Nenhum produto encontrado.</p>';
        }
    }
}

function renderSizeFilters() {
    const allVariations = resellerProducts
        .flatMap(p => p.variacoes.map(v => (v.nome || '').replace(/Tamanho:\s*/i, '').trim()))
        .filter(v => v && !isNaN(v));

    const uniqueSizes = [...new Set(allVariations)].sort((a, b) => a - b);

    const container = document.getElementById('size-filter-bubbles');
    if (!container) return;
    
    container.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.className = 'filter-bubble active';
    allButton.textContent = 'Todos';
    allButton.addEventListener('click', () => {
        selectedSize = '';
        document.querySelectorAll('.filter-bubble').forEach(b => b.classList.remove('active'));
        allButton.classList.add('active');
        filterAndRenderCatalogGrid();
    });
    container.appendChild(allButton);

    uniqueSizes.forEach(size => {
        const bubble = document.createElement('button');
        bubble.className = 'filter-bubble';
        bubble.textContent = size;
        bubble.dataset.size = size;
        bubble.addEventListener('click', () => {
            selectedSize = size;
            document.querySelectorAll('.filter-bubble').forEach(b => b.classList.remove('active'));
            bubble.classList.add('active');
            filterAndRenderCatalogGrid();
        });
        container.appendChild(bubble);
    });
}

function renderCatalogShell() {
    const settings = resellerSettings;
    document.documentElement.style.setProperty('--reseller-primary-color', settings.primaryColor || '#DB1472');
    document.documentElement.style.setProperty('--reseller-secondary-color', settings.secondaryColor || '#F8B81F');
    
    const topBarContainer = document.getElementById('catalog-top-bar-container');
    const messages = [ settings.topBarMsg1 || 'USE O CUPOM:PRIMEIRACOMPRA', settings.topBarMsg2 || 'APROVEITE 10% OFF', settings.topBarMsg3 || 'FRETE GRÁTIS ACIMA DE R$599' ].filter(Boolean);
    if (messages.length > 0) {
        const contentHTML = messages.map(msg => `<span>${msg}</span>`).join('');
        topBarContainer.innerHTML = `<div class="top-bar-content">${contentHTML}${contentHTML}</div>`;
    } else {
        topBarContainer.style.display = 'none';
    }

    const bannerArea = document.getElementById('catalog-banner');
    const bannerUrl = window.innerWidth > 768 ? settings['banner-desktop-main'] : settings['banner-mobile-main'];
    if (bannerUrl) {
        bannerArea.style.backgroundImage = `url(${bannerUrl})`;
        bannerArea.textContent = '';
    }

    document.getElementById('catalog-logo').src = settings.logoUrl || 'https://placehold.co/180x180/e2e8f0/cccccc?text=';
    document.getElementById('catalog-brand-name-footer').textContent = settings.brandName || 'Sua Marca';
    document.getElementById('catalog-description').textContent = settings.description || 'Bem-vindo(a) ao meu catálogo!';
    document.getElementById('catalog-instagram-link').href = settings.instagram ? `https://instagram.com/${settings.instagram.replace('@','')}` : '#';
    document.getElementById('catalog-whatsapp-link').href = settings.contactPhone ? `https://wa.me/55${settings.contactPhone.replace(/\D/g,'')}` : '#';

    document.getElementById('catalog-menu-toggle').addEventListener('click', () => {
        document.getElementById('category-modal').classList.add('active');
    });

    document.getElementById('cart-button').addEventListener('click', (e) => { e.preventDefault(); showCartModal(); });
    
    const searchInput = document.getElementById('catalog-search-input');
    const searchBtn = document.getElementById('catalog-search-btn');
    const performSearch = () => filterAndRenderCatalogGrid();
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') performSearch(); });

    feather.replace();
}

function filterAndRenderCatalogGrid() {
    const searchTerm = document.getElementById('catalog-search-input').value.toLowerCase();
    const categoryFilter = ''; 

    let activeCatalogProducts = resellerProducts.filter(p => resellerActiveProductIds.includes(p.id));
    
    if (searchTerm) activeCatalogProducts = activeCatalogProducts.filter(p => p.nome.toLowerCase().includes(searchTerm));
    if (categoryFilter) activeCatalogProducts = activeCatalogProducts.filter(p => p.categoria_nome === categoryFilter);
    if (selectedSize) {
        activeCatalogProducts = activeCatalogProducts.filter(p => 
            p.variacoes.some(v => (v.nome || '').replace(/Tamanho:\s*/i, '').trim() === selectedSize)
        );
    }

    const grid = document.getElementById('catalog-product-grid');
    grid.innerHTML = '';
    if (activeCatalogProducts.length === 0) {
        grid.innerHTML = '<p class="placeholder-card" style="grid-column: 1 / -1;">Nenhum produto encontrado.</p>';
        return;
    }
    appendProductsToCatalogGrid(activeCatalogProducts, true);
}

function appendProductsToCatalogGrid(products, clearGrid = false) {
    const grid = document.getElementById('catalog-product-grid');
    if (!grid) return;
    if (clearGrid) grid.innerHTML = '';

    products.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
        const card = document.createElement('div');
        card.className = 'catalog-product-card';
        card.innerHTML = `<img src="${proxyImageUrl(p.imagem)}" alt="${p.nome}" loading="lazy" width="300" height="300" onerror="this.src='https://placehold.co/300x300/e2e8f0/94a3b8?text=Imagem'"><div class="catalog-product-card-body"><h3>${p.nome}</h3><p class="price">R$ ${finalPrice.toFixed(2)}</p><button class="btn view-product-btn" data-product-id="${p.id}">Ver Detalhes</button></div>`;
        
        // CORREÇÃO: Usa e.currentTarget para garantir que pegamos o botão, mesmo se houver um ícone dentro.
        card.querySelector('.view-product-btn').addEventListener('click', (e) => showProductDetailPage(e.currentTarget.dataset.productId));
        grid.appendChild(card);
    });
    feather.replace();
}

function showProductDetailPage(productId) {
    // Logging de Diagnóstico Passo 1: A função foi chamada?
    console.log(`[Diagnóstico] Chamando showProductDetailPage com o ID: ${productId} (tipo: ${typeof productId})`);

    document.getElementById('catalog-wrapper').style.display = 'none';
    const detailWrapper = document.getElementById('product-detail-wrapper');
    detailWrapper.style.display = 'block';

    // Logging de Diagnóstico Passo 2: O produto foi encontrado?
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    console.log('[Diagnóstico] Produto encontrado:', product);

    if (!product) {
        detailWrapper.innerHTML = `<p class="placeholder-card">Produto não encontrado.</p>`;
        // Logging de Diagnóstico Passo 3: O que acontece se o produto não for encontrado.
        console.error(`[Diagnóstico] ERRO: Produto com ID ${productId} não foi encontrado na lista 'resellerProducts'.`);
        return;
    }

    const margin = resellerProductMargins[product.id] || 30;
    const finalPrice = parseFloat(product.preco_original) * (1 + margin / 100);
    const productTags = resellerProductTags[productId] || [];

    const thumbnailsHTML = (product.imagens_adicionais && product.imagens_adicionais.length > 0 ? product.imagens_adicionais : [product.imagem]).slice(0, 4).map((imgUrl, index) => `
        <img src="${proxyImageUrl(imgUrl).replace('600x600', '80x80')}" alt="Thumbnail ${index + 1}" class="thumbnail w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg cursor-pointer border-2 ${index === 0 ? 'border-pink-500 active' : 'border-transparent'}" onclick="changeImage(this, '${proxyImageUrl(imgUrl)}')">
    `).join('');

    const tagsHTML = productTags.map(tag => {
        let tagClass = '';
        if (tag === 'Destaque') tagClass = 'highlight';
        else if (tag === 'Lançamento') tagClass = 'launch';
        else if (tag === 'Promoção') tagClass = 'promo';
        return `<span class="product-detail-tag ${tagClass}">${tag.toUpperCase()}</span>`;
    }).join('');

    const sizesHTML = product.variacoes.map(v => {
        const size = String(v.nome || '').replace(/Tamanho:\s*/i, '').trim();
        const isOutOfStock = v.quantidade <= 0;
        return `<button class="size-btn border-2 rounded-lg p-3 text-center font-semibold ${isOutOfStock ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:border-pink-500 focus:border-pink-500 focus:bg-pink-50'}" ${isOutOfStock ? 'disabled' : ''}>${size}</button>`;
    }).join('');

    const detailHTML = `
        <div class="container mx-auto p-4 lg:p-8">
            <button class="btn mb-4" id="back-to-catalog-btn" style="background-color: var(--cor-primaria); color: white;"><i data-feather="arrow-left"></i> Voltar ao catálogo</button>
            <main class="grid grid-cols-1 lg:grid-cols-2 lg:gap-16">
                <section class="flex flex-col-reverse md:flex-row gap-4">
                    <div class="flex md:flex-col gap-3 justify-center">${thumbnailsHTML}</div>
                    <div class="flex-1">
                        <img id="main-product-image" src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="w-full h-auto object-cover rounded-xl shadow-lg">
                    </div>
                </section>
                <section class="mt-8 lg:mt-0">
                    <h1 class="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight mb-2">${product.nome}</h1>
                    <div class="flex items-center gap-4 mb-4 text-sm text-slate-500">
                        <div class="flex items-center gap-1 text-amber-500">
                            <i data-feather="star" class="w-4 h-4 fill-current"></i><i data-feather="star" class="w-4 h-4 fill-current"></i><i data-feather="star" class="w-4 h-4 fill-current"></i><i data-feather="star" class="w-4 h-4 fill-current"></i><i data-feather="star" class="w-4 h-4"></i>
                            <span class="ml-1 font-semibold text-slate-600">4.8</span><span>(89 avaliações)</span>
                        </div>
                    </div>
                    <div class="mb-6">
                        <span class="text-3xl lg:text-4xl font-bold" style="color: var(--cor-primaria);">R$ ${finalPrice.toFixed(2)}</span>
                        <span class="text-slate-500">/cada</span>
                    </div>
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-base font-semibold text-slate-800">Selecione a Numeração:</label>
                            <a href="#" class="text-sm font-medium" style="color: var(--cor-primaria);"><i data-feather="ruler" class="w-4 h-4 inline-block -mt-1"></i> Tabela de medidas</a>
                        </div>
                        <div class="grid grid-cols-4 gap-2">${sizesHTML}</div>
                    </div>
                    <div class="mb-6">
                         <label class="text-base font-semibold text-slate-800 mb-2 block">Quantidade:</label>
                         <div class="flex items-center border border-slate-300 rounded-lg w-32">
                            <button class="p-3 text-slate-500 hover:text-pink-600" onclick="updateQuantity(-1)"><i data-feather="minus" class="w-4 h-4"></i></button>
                            <input id="quantity-input" type="text" value="1" class="w-full text-center font-bold text-lg border-none focus:ring-0">
                            <button class="p-3 text-slate-500 hover:text-pink-600" onclick="updateQuantity(1)"><i data-feather="plus" class="w-4 h-4"></i></button>
                         </div>
                    </div>
                    <button class="cta-button w-full h-14 rounded-lg text-white font-bold text-lg shadow-lg hover:opacity-90 transition-all transform hover:scale-105">COMPRAR AGORA</button>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 text-center text-sm text-slate-600">
                        <div class="flex flex-col items-center gap-1"><i data-feather="shield" class="w-6 h-6 text-green-600"></i><span>Compra 100% Segura</span></div>
                        <div class="flex flex-col items-center gap-1"><i data-feather="truck" class="w-6 h-6 text-blue-600"></i><span>Entrega para todo Brasil</span></div>
                        <div class="flex flex-col items-center gap-1"><i data-feather="refresh-cw" class="w-6 h-6 text-orange-500"></i><span>Devolução Grátis</span></div>
                    </div>
                </section>
            </main>
        </div>
    `;
    
    // Logging de Diagnóstico Passo 4: O HTML foi construído?
    console.log('[Diagnóstico] HTML da página de detalhes foi construído.');
    detailWrapper.innerHTML = detailHTML;
    console.log('[Diagnóstico] HTML inserido no wrapper.');

    detailWrapper.querySelector('#back-to-catalog-btn').addEventListener('click', () => {
        detailWrapper.style.display = 'none';
        document.getElementById('catalog-wrapper').style.display = 'block';
    });

    feather.replace();
    console.log('[Diagnóstico] Ícones Feather renderizados.');
}

function changeImage(thumbElement, newSrc) {
    document.getElementById('main-product-image').src = newSrc.replace('80x80', '600x600');
    document.querySelectorAll('.thumbnail').forEach(thumb => thumb.classList.remove('border-pink-500', 'active'));
    thumbElement.classList.add('border-pink-500', 'active');
}

function updateQuantity(amount) {
    const input = document.getElementById('quantity-input');
    let currentValue = parseInt(input.value);
    if (currentValue + amount > 0) {
        input.value = currentValue + amount;
    }
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
