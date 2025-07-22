/**
 * catalogo.js
 * Lógica principal para o funcionamento do catálogo.
 * Este script é carregado pelo index.html DEPOIS que o theme.js termina.
 */
(function() {
    console.log('catalogo.js: Executando agora que o layout do tema está pronto.');

    // --- VARIÁVEIS GLOBAIS ---
    let allProducts = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let resellerSettings = {};
    
    // --- INICIALIZAÇÃO ---
    (async () => {
        loadLocalDataForCatalog();
        setupCatalogEventListeners();
        await loadInitialProducts();
        applyResellerIdentity();
    })();
    
    
    // --- FUNÇÕES ---
    function loadLocalDataForCatalog() {
        const settings = localStorage.getItem('resellerSettings');
        if (settings) resellerSettings = JSON.parse(settings);
    }
    
    function setupCatalogEventListeners() {
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
                loadMoreProducts();
            }
        });
    }
    
    async function loadInitialProducts() {
        currentPage = 1;
        hasMore = true;
        allProducts = []; 
        const grid = document.getElementById('catalog-product-grid');
        if(grid) grid.innerHTML = '';
        await loadMoreProducts();
    }
    
    async function loadMoreProducts() {
        if (isLoading || !hasMore) return;
        isLoading = true;
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.style.display = 'block';
    
        try {
            const newProductsData = await realApiFetch(currentPage);
            
            if (newProductsData && newProductsData.data.length > 0) {
                const margins = JSON.parse(localStorage.getItem('resellerMargins')) || {};
                const activeIdsRaw = localStorage.getItem('resellerActiveProductIds');
                const activeIds = activeIdsRaw ? JSON.parse(activeIdsRaw) : [];

                const processedProducts = newProductsData.data
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
            card.className = 'product-card group relative'; 
            card.dataset.productId = product.id;
            card.innerHTML = `
                <div class="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md lg:aspect-none group-hover:opacity-75 lg:h-80">
                    <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="h-full w-full object-cover object-center lg:h-full lg:w-full">
                </div>
                <div class="mt-4 flex justify-between p-2">
                    <div><h3 class="text-sm text-gray-700"><a href="#"><span aria-hidden="true" class="absolute inset-0"></span>${product.nome}</a></h3></div>
                    <p class="text-sm font-medium text-gray-900">R$ ${product.preco_final.toFixed(2)}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    }
    
    function applyResellerIdentity() {
        const footer = document.querySelector('footer');
        if(footer) {
            footer.innerHTML = `
                <h2 id="catalog-brand-name-footer" class="text-2xl font-bold mb-2">${resellerSettings.brandName || 'Sua Loja'}</h2>
                <div class="flex justify-center gap-6">
                    <a id="catalog-instagram-link" href="#" target="_blank" class="font-semibold flex items-center gap-2"><i data-feather="instagram"></i>Instagram</a>
                    <a id="catalog-whatsapp-link" href="#" target="_blank" class="font-semibold flex items-center gap-2"><i data-feather="message-circle"></i>WhatsApp</a>
                </div>
            `;
            if (typeof feather !== 'undefined') feather.replace();
        }
    }
    
    function proxyImageUrl(url) {
        return url || 'https://placehold.co/300x300/e2e8f0/cccccc?text=Produto';
    }
})();
