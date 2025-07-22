/**
 * catalogo.js
 * Lógica principal e unificada para o funcionamento do catálogo da revendedora.
 * Este script é carregado pelo `catalogo/index.html` DEPOIS que o script do tema
 * (theme.js) termina de construir o layout, garantindo que todos os elementos HTML existam.
 */
(function() {
    console.log("catalogo.js (Unificado): Iniciando. O layout do tema está pronto.");

    // --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
    let allProducts = [];
    let cart = [];
    let currentPage = 1;
    let isLoading = false;
    let hasMore = true;
    let resellerSettings = {};
    
    // --- INICIALIZAÇÃO ---
    // A inicialização ocorre imediatamente, pois este script só é carregado
    // quando o DOM do tema já está pronto.
    (async () => {
        loadLocalDataForCatalog();
        setupCatalogEventListeners();
        await loadAndRenderInitialProducts();
        applyResellerIdentityToCatalog();
        updateCartCount(); // Garante que o carrinho seja atualizado no carregamento inicial
        
        // Renderiza os ícones uma última vez para garantir que tudo esteja no lugar
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    })();
    
    
    // --- FUNÇÕES DE CONFIGURAÇÃO E EVENTOS ---
    
    /**
     * Carrega dados essenciais do localStorage, como configurações da revendedora e carrinho.
     */
    function loadLocalDataForCatalog() {
        const settingsData = localStorage.getItem('resellerSettings');
        if (settingsData) {
            resellerSettings = JSON.parse(settingsData);
        }
    
        const savedCartData = localStorage.getItem('resellerCart');
        if (savedCartData) {
            cart = JSON.parse(savedCartData);
        }
    }
    
    /**
     * Configura os listeners de eventos globais do catálogo, como o scroll infinito.
     */
    function setupCatalogEventListeners() {
        // Listener para o scroll infinito
        window.addEventListener('scroll', () => {
            // Carrega mais produtos quando o usuário chega perto do final da página
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 && !isLoading && hasMore) {
                loadMoreProducts();
            }
        });

        // Futuros listeners (ex: clique no botão do carrinho, filtros) podem ser adicionados aqui.
    }
    
    // --- FUNÇÕES DE PRODUTOS ---

    /**
     * Orquestra o carregamento inicial dos produtos.
     */
    async function loadAndRenderInitialProducts() {
        currentPage = 1;
        hasMore = true;
        allProducts = []; 
        const grid = document.getElementById('catalog-product-grid');
        if(grid) {
            grid.innerHTML = ''; // Limpa a grade antes de carregar novos produtos
        }
        await loadMoreProducts();
    }
    
    /**
     * Busca uma nova página de produtos da API e os renderiza na tela.
     */
    async function loadMoreProducts() {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.style.display = 'block';
    
        try {
            // Usa a função global do servicos.js para buscar os produtos
            const newProductsData = await realApiFetch(currentPage);
            
            if (newProductsData && newProductsData.data.length > 0) {
                // Pega as configurações de margem e produtos ativos da revendedora
                const margins = JSON.parse(localStorage.getItem('resellerMargins')) || {};
                const activeIdsRaw = localStorage.getItem('resellerActiveProductIds');
                const activeIds = activeIdsRaw ? JSON.parse(activeIdsRaw) : [];

                // Filtra e processa os produtos:
                // 1. Filtra para mostrar apenas os produtos que a revendedora marcou como ativos.
                // 2. Mapeia os dados, aplicando a margem de lucro para calcular o preço final.
                const processedProducts = newProductsData.data
                    .filter(p => activeIds.includes(parseInt(p.id))) 
                    .map(p => {
                        const margin = margins[p.id] || 30; // Usa 30% como margem padrão
                        return {
                            id: p.id,
                            nome: p.nome,
                            preco_final: parseFloat(p.preco) * (1 + margin / 100),
                            imagem: p.imagem ? p.imagem.split(',')[0].trim() : '' // Pega a primeira imagem
                        };
                    });

                allProducts = [...allProducts, ...processedProducts];
                renderProductCards(processedProducts); // Renderiza apenas os novos produtos
                currentPage++;
                hasMore = newProductsData.hasNext;
            } else {
                hasMore = false;
            }

            // Se não há mais produtos e a lista está vazia, exibe uma mensagem
            if (!hasMore && allProducts.length === 0){
                 const grid = document.getElementById('catalog-product-grid');
                 if(grid) grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Nenhum produto ativo para exibir no momento.</p>';
            }

        } catch (error) {
            console.error("Erro ao carregar mais produtos:", error);
            const grid = document.getElementById('catalog-product-grid');
            if(grid) grid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Ocorreu um erro ao carregar os produtos.</p>';
        } finally {
            isLoading = false;
            if (loader) loader.style.display = 'none';
        }
    }
    
    /**
     * Renderiza os cards de produto e os adiciona à grade na página.
     * @param {Array} productsToRender - A lista de produtos a serem adicionados ao DOM.
     */
    function renderProductCards(productsToRender) {
        const grid = document.getElementById('catalog-product-grid');
        if (!grid) {
            console.error("Elemento #catalog-product-grid não encontrado para renderizar produtos.");
            return;
        }
    
        productsToRender.forEach(product => {
            const card = document.createElement('div');
            // As classes de estilo são genéricas e devem funcionar com o CSS do tema
            card.className = 'product-card group relative border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 bg-white'; 
            card.dataset.productId = product.id;
            
            card.innerHTML = `
                <a href="#" class="block">
                    <div class="aspect-w-1 aspect-h-1 w-full bg-gray-100">
                        <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="h-full w-full object-cover object-center group-hover:opacity-80 transition-opacity duration-300">
                    </div>
                    <div class="p-4">
                        <h3 class="text-sm md:text-base font-semibold text-gray-800 truncate">${product.nome}</h3>
                        <p class="mt-2 text-base md:text-lg font-bold text-gray-900">R$ ${product.preco_final.toFixed(2).replace('.', ',')}</p>
                    </div>
                </a>
            `;
            grid.appendChild(card);
        });
    }

    // --- FUNÇÕES DE IDENTIDADE E UI ---

    /**
     * Aplica as informações da revendedora (nome da loja, links) no layout do tema.
     */
    function applyResellerIdentityToCatalog() {
        // Aplica o nome da marca no rodapé
        const footerBrandName = document.getElementById('catalog-brand-name-footer');
        if(footerBrandName) {
            footerBrandName.textContent = resellerSettings.brandName || 'Sua Loja';
        }

        // Preenche o rodapé com os dados da revendedora
        const footer = document.querySelector('footer');
        if(footer) {
            footer.innerHTML = `
                <h2 id="catalog-brand-name-footer" class="text-2xl font-bold mb-4">${resellerSettings.brandName || 'Sua Loja'}</h2>
                <div class="flex justify-center items-center gap-6">
                    <a id="catalog-instagram-link" href="${resellerSettings.instagram || '#'}" target="_blank" class="font-semibold flex items-center gap-2 hover:text-pink-400 transition-colors">
                        <i data-feather="instagram"></i>Instagram
                    </a>
                    <a id="catalog-whatsapp-link" href="https://wa.me/${resellerSettings.contactPhone || ''}" target="_blank" class="font-semibold flex items-center gap-2 hover:text-green-400 transition-colors">
                        <i data-feather="message-circle"></i>WhatsApp
                    </a>
                </div>
                <p class="text-xs text-slate-400 mt-8">Desenvolvido com ❤️ por CJOTA</p>
            `;
        }
    }
    
    /**
     * Atualiza o contador de itens no ícone do carrinho.
     */
    function updateCartCount() {
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCountElement.textContent = totalItems;
            cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }
    
    /**
     * Garante que uma URL de imagem seja válida ou retorna um placeholder.
     * @param {string} url - A URL da imagem.
     * @returns {string} A URL válida ou a URL de um placeholder.
     */
    function proxyImageUrl(url) {
        return url || 'https://placehold.co/400x400/e2e8f0/cccccc?text=Produto';
    }

})();
