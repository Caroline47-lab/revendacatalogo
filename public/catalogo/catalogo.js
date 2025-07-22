/**
 * catalogo.js
 * Lógica principal para o funcionamento do catálogo.
 * VERSÃO CORRIGIDA: Agora espera o evento 'theme:ready' para iniciar.
 */

// AVISA QUE O SCRIPT FOI CARREGADO, MAS NÃO FAZ NADA AINDA
console.log('catalogo.js loaded, waiting for theme:ready...');

// ESPERA O SINAL DO TEMA ANTES DE INICIAR
document.addEventListener('theme:ready', () => {
    console.log('Theme is ready! Initializing catalog...');
    initializeCatalog();
});


function initializeCatalog() {
    // --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
    let allProducts = [];
    let currentProducts = [];
    let cart = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let resellerSettings = {};
    let activePromotions = {};
    let activeTheme = 'basic';
    
    // --- INICIALIZAÇÃO ---
    // A função principal agora é chamada após o evento
    (async () => {
        loadLocalDataForCatalog();
        setupCatalogEventListeners();
        await loadInitialProducts();
        renderFilters();
        applyResellerIdentity();
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    })();
    
    
    // --- FUNÇÕES DO CATÁLOGO ---
    
    function loadLocalDataForCatalog() {
        const settings = localStorage.getItem('resellerSettings');
        if (settings) resellerSettings = JSON.parse(settings);
    
        const promotions = localStorage.getItem('resellerPromotions');
        if (promotions) activePromotions = JSON.parse(promotions);
    
        const theme = localStorage.getItem('resellerActiveTheme');
        if (theme) activeTheme = theme;
    
        const savedCart = localStorage.getItem('resellerCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCartCount();
        }
    }
    
    function setupCatalogEventListeners() {
        // Lógica para infinite scroll, cliques em produtos, etc.
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
                loadMoreProducts();
            }
        });
    
        document.getElementById('catalog-product-grid').addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (card && card.dataset.productId) {
                // Lógica para abrir detalhes do produto
                console.log(`Product clicked: ${card.dataset.productId}`);
            }
        });
    }
    
    async function loadInitialProducts() {
        currentPage = 1;
        hasMore = true;
        allProducts = []; // Limpa a lista antes de carregar
        await loadMoreProducts();
    }
    
    async function loadMoreProducts() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.style.display = 'block';
    
        try {
            // Simulação de chamada de API
            // Em um cenário real, esta seria a chamada para `realApiFetch`
            const newProducts = await mockApiFetch(currentPage); 
            
            if (newProducts && newProducts.data.length > 0) {
                allProducts = [...allProducts, ...newProducts.data];
                renderProductGrid(newProducts.data);
                currentPage++;
                hasMore = newProducts.hasNext;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error("Erro ao carregar mais produtos:", error);
        } finally {
            isLoading = false;
            if (loader) loader.style.display = 'none';
        }
    }
    
    function renderProductGrid(productsToRender) {
        const grid = document.getElementById('catalog-product-grid');
        if (!grid) return;
    
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card'; // Classe base para estilização do tema
            card.dataset.productId = product.id;
            card.innerHTML = `
                <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-semibold text-md">${product.nome}</h3>
                    <p class="text-lg font-bold text-[var(--primary-color)] mt-2">R$ ${product.preco_final.toFixed(2)}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    function renderFilters() {
        // Lógica para renderizar filtros de tamanho, etc.
    }
    
    function applyResellerIdentity() {
        if(document.getElementById('catalog-brand-name-footer')) {
            document.getElementById('catalog-brand-name-footer').textContent = resellerSettings.brandName || 'Sua Loja';
        }
        // Aplicar outras configurações de identidade
    }
    
    function updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                cartCount.textContent = totalItems;
                cartCount.style.display = 'flex';
            } else {
                cartCount.style.display = 'none';
            }
        }
    }
    
    // --- Funções Mock e Utilitários ---
    
    function proxyImageUrl(url) {
        return url || 'https://placehold.co/300x300/e2e8f0/cccccc?text=Produto';
    }
    
    async function mockApiFetch(page = 1) {
        // Simula uma resposta da API para teste
        return new Promise(resolve => {
            setTimeout(() => {
                const products = [];
                for (let i = 0; i < 12; i++) {
                    const id = (page - 1) * 12 + i + 1;
                    products.push({
                        id: id,
                        nome: `Produto de Teste ${id}`,
                        preco_final: 99.90,
                        imagem: `https://placehold.co/300x300/e2e8f0/cccccc?text=Produto+${id}`
                    });
                }
                resolve({
                    data: products,
                    hasNext: page < 3 // Simula que há 3 páginas de produtos
                });
            }, 1000);
        });
    }
}
