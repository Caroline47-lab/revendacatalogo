/**
 * catalogo.js
 * Lógica principal para o funcionamento do catálogo.
 * Este script é carregado dinamicamente pelo theme.js para garantir a ordem de execução.
 */
(function() {
    console.log('Catalog script executing now that theme is ready.');

    // --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
    let allProducts = [];
    let cart = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let resellerSettings = {};
    
    // --- INICIALIZAÇÃO ---
    (async () => {
        try {
            console.log('Inicializando catálogo...');
            loadLocalDataForCatalog();
            setupCatalogEventListeners();
            await loadInitialProducts();
            renderFilters();
            applyResellerIdentity();
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            console.log('Catálogo inicializado com sucesso!');
        } catch (error) {
            console.error('Erro na inicialização do catálogo:', error);
            showErrorMessage('Erro ao carregar o catálogo. Verifique sua conexão.');
        }
    })();
    
    
    // --- FUNÇÕES DO CATÁLOGO ---
    
    function loadLocalDataForCatalog() {
        console.log('Carregando dados locais...');
        
        const settings = localStorage.getItem('resellerSettings');
        if (settings) {
            try {
                resellerSettings = JSON.parse(settings);
                console.log('Configurações do revendedor carregadas:', resellerSettings);
            } catch (e) {
                console.error('Erro ao parsear configurações:', e);
                resellerSettings = {};
            }
        }
    
        const savedCart = localStorage.getItem('resellerCart');
        if (savedCart) {
            try {
                cart = JSON.parse(savedCart);
                updateCartCount();
                console.log('Carrinho carregado:', cart.length, 'itens');
            } catch (e) {
                console.error('Erro ao parsear carrinho:', e);
                cart = [];
            }
        }
    }
    
    function setupCatalogEventListeners() {
        console.log('Configurando event listeners...');
        
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
                loadMoreProducts();
            }
        });
    }
    
    async function loadInitialProducts() {
        console.log('Carregando produtos iniciais...');
        
        currentPage = 1;
        hasMore = true;
        allProducts = []; 
        const grid = document.getElementById('catalog-product-grid');
        if(grid) grid.innerHTML = '';
        await loadMoreProducts();
    }
    
    async function loadMoreProducts() {
        if (isLoading || !hasMore) return;
        
        console.log('Carregando mais produtos - página:', currentPage);
        isLoading = true;
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.style.display = 'block';
    
        try {
            // CORREÇÃO: Passando os parâmetros corretos para realApiFetch
            const newProductsData = await realApiFetch(currentPage, 20); // página e quantidade por página
            
            if (newProductsData && newProductsData.data.length > 0) {
                const margins = JSON.parse(localStorage.getItem('resellerMargins')) || {};
                
                // CORREÇÃO: Usando a chave correta 'resellerActiveProductIds'
                const activeIdsRaw = localStorage.getItem('resellerActiveProductIds');
                let activeIds = [];
                
                if (activeIdsRaw) {
                    try {
                        activeIds = JSON.parse(activeIdsRaw);
                        console.log('IDs ativos encontrados:', activeIds.length);
                    } catch (e) {
                        console.error('Erro ao parsear IDs ativos:', e);
                    }
                }

                // Se não há produtos ativos definidos, mostrar todos
                const shouldFilter = activeIds.length > 0;

                const processedProducts = newProductsData.data
                    .filter(p => !shouldFilter || activeIds.includes(parseInt(p.id))) 
                    .map(p => {
                        const margin = margins[p.id] || 30;
                        const price = parseFloat(p.preco) || 0;
                        const finalPrice = price * (1 + margin / 100);
                        
                        return {
                            id: p.id,
                            nome: p.nome || 'Produto sem nome',
                            preco_final: finalPrice,
                            imagem: p.imagem ? p.imagem.split(',')[0].trim() : ''
                        };
                    });

                console.log('Produtos processados:', processedProducts.length);
                allProducts = [...allProducts, ...processedProducts];
                renderProductGrid(processedProducts);
                currentPage++;
                hasMore = newProductsData.hasNext;
            } else {
                console.log('Nenhum produto encontrado na página:', currentPage);
                hasMore = false;
            }

            if (!hasMore && allProducts.length === 0){
                 const grid = document.getElementById('catalog-product-grid');
                 if(grid) {
                     grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8"><p>Nenhum produto ativo para exibir no momento.</p><p class="text-sm mt-2">Verifique suas configurações ou adicione produtos ativos.</p></div>';
                 }
            }

        } catch (error) {
            console.error("Erro ao carregar mais produtos:", error);
            showErrorMessage('Erro ao carregar produtos. Tente novamente.');
        } finally {
            isLoading = false;
            if (loader) loader.style.display = 'none';
        }
    }
    
    function renderProductGrid(productsToRender) {
        console.log('Renderizando grid de produtos:', productsToRender.length);
        
        const grid = document.getElementById('catalog-product-grid');
        if (!grid) {
            console.error('Grid de produtos não encontrado!');
            return;
        }
    
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card group relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow'; 
            card.dataset.productId = product.id;
            
            // Usar a função proxyImageUrl do servicos.js
            const imageUrl = typeof proxyImageUrl === 'function' 
                ? proxyImageUrl(product.imagem) 
                : (product.imagem || 'https://placehold.co/300x300/e2e8f0/cccccc?text=Produto');
            
            card.innerHTML = `
                <div class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-t-lg lg:aspect-none group-hover:opacity-75 lg:h-64">
                    <img src="${imageUrl}" alt="${product.nome}" class="h-full w-full object-cover object-center lg:h-full lg:w-full" loading="lazy" onerror="this.src='https://placehold.co/300x300/e2e8f0/cccccc?text=Erro+Imagem'">
                </div>
                <div class="p-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-sm font-medium text-gray-900 truncate" title="${product.nome}">
                                <a href="#" class="hover:text-blue-600">
                                    <span aria-hidden="true" class="absolute inset-0"></span>
                                    ${product.nome}
                                </a>
                            </h3>
                        </div>
                        <p class="text-lg font-bold text-green-600 ml-2">R$ ${product.preco_final.toFixed(2)}</p>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    function renderFilters() {
        console.log('Renderizando filtros...');
        // Implementar filtros se necessário
    }
    
    function applyResellerIdentity() {
        console.log('Aplicando identidade do revendedor...');
        
        const footer = document.querySelector('footer');
        if(footer) {
            const brandName = resellerSettings.brandName || 'Sua Loja';
            footer.innerHTML = `
                <div class="max-w-7xl mx-auto px-4">
                    <h2 id="catalog-brand-name-footer" class="text-2xl font-bold mb-4">${brandName}</h2>
                    <div class="flex justify-center gap-6">
                        <a id="catalog-instagram-link" href="#" target="_blank" class="font-semibold flex items-center gap-2 hover:text-pink-400 transition-colors">
                            <i data-feather="instagram"></i>Instagram
                        </a>
                        <a id="catalog-whatsapp-link" href="#" target="_blank" class="font-semibold flex items-center gap-2 hover:text-green-400 transition-colors">
                            <i data-feather="message-circle"></i>WhatsApp
                        </a>
                    </div>
                </div>
            `;
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }
    
    function updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
            console.log('Carrinho atualizado:', totalItems, 'itens');
        }
    }
    
    function showErrorMessage(message) {
        const grid = document.getElementById('catalog-product-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                        <i data-feather="alert-circle" class="mx-auto text-red-500 w-12 h-12 mb-4"></i>
                        <h3 class="text-lg font-semibold text-red-800 mb-2">Ops! Algo deu errado</h3>
                        <p class="text-red-600">${message}</p>
                        <button onclick="location.reload()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                            Recarregar Página
                        </button>
                    </div>
                </div>
            `;
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    // Tornar algumas funções globais se necessário
    window.catalogFunctions = {
        loadInitialProducts,
        updateCartCount,
        showErrorMessage
    };
})();
