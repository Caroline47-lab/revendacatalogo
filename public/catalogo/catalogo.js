/**
 * catalogo.js
 * Lógica principal para o funcionamento do catálogo.
 * VERSÃO CORRIGIDA: Agora expõe a função initializeCatalog para ser chamada pelo tema.
 */

console.log('catalogo.js loaded, waiting for initializeCatalog() call...');

/**
 * Função principal que inicializa toda a lógica do catálogo.
 * É chamada pelo script do tema (theme.js) assim que o layout HTML está pronto.
 */
function initializeCatalog() {
    console.log('Theme is ready! Initializing catalog...');

    // --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
    let allProducts = [];
    let cart = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let resellerSettings = {};
    let activePromotions = {};
    let activeTheme = 'basic';
    
    // --- INICIALIZAÇÃO ---
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
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
                loadMoreProducts();
            }
        });
    
        const productGrid = document.getElementById('catalog-product-grid');
        if (productGrid) {
            productGrid.addEventListener('click', (e) => {
                const card = e.target.closest('.product-card');
                if (card && card.dataset.productId) {
                    console.log(`Product clicked: ${card.dataset.productId}`);
                }
            });
        }
    }
    
    async function loadInitialProducts() {
        currentPage = 1;
        hasMore = true;
        allProducts = []; 
        const grid = document.getElementById('catalog-product-grid');
        if(grid) grid.innerHTML = ''; // Limpa a grade antes de carregar
        await loadMoreProducts();
    }
    
    async function loadMoreProducts() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.style.display = 'block';
    
        try {
            // Usando a API real
            const newProductsData = await realApiFetch(currentPage);
            
            if (newProductsData && newProductsData.data.length > 0) {
                const margins = JSON.parse(localStorage.getItem('resellerMargins')) || {};
                // CORREÇÃO: Usando a chave correta 'resellerActiveProductIds'
                const activeIdsRaw = localStorage.getItem('resellerActiveProductIds');
                const activeIds = activeIdsRaw ? JSON.parse(activeIdsRaw) : [];

                const processedProducts = newProductsData.data
                    // CORREÇÃO: Garante que a comparação seja entre números
                    .filter(p => activeIds.includes(parseInt(p.id))) 
                    .map(p => {
                        const margin = margins[p.id] || 30;
                        return {
                            id: p.id,
                            nome: p.nome,
                            preco_final: parseFloat(p.preco) * (1 + margin / 100),
                            imagem: p.imagem.split(',')[0].trim()
                        };
                    });

                allProducts = [...allProducts, ...processedProducts];
                renderProductGrid(processedProducts);
                currentPage++;
                hasMore = newProductsData.hasNext;
            } else {
                hasMore = false;
            }

            // Mensagem de "Nenhum produto" só aparece se, após todas as buscas, a lista estiver vazia.
            if (!hasMore && allProducts.length === 0){
                 const grid = document.getElementById('catalog-product-grid');
                 if(grid) grid.innerHTML = '<p class="col-span-full text-center text-gray-500">Nenhum produto ativo para exibir no momento.</p>';
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
            // A classe base é aplicada aqui, e o tema controla o estilo
            card.className = 'product-card group relative'; 
            card.dataset.productId = product.id;
            card.innerHTML = `
                <div class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md lg:aspect-none group-hover:opacity-75 lg:h-80">
                    <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="h-full w-full object-cover object-center lg:h-full lg:w-full">
                </div>
                <div class="mt-4 flex justify-between p-2">
                    <div>
                        <h3 class="text-sm text-gray-700">
                            <a href="#">
                                <span aria-hidden="true" class="absolute inset-0"></span>
                                ${product.nome}
                            </a>
                        </h3>
                    </div>
                    <p class="text-sm font-medium text-gray-900">R$ ${product.preco_final.toFixed(2)}</p>
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
    
    function proxyImageUrl(url) {
        return url || 'https://placehold.co/300x300/e2e8f0/cccccc?text=Produto';
    }
}
