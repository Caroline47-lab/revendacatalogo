/**
 * catalogo.js
 * * Otimizado para performance com carregamento sob demanda (Infinite Scroll)
 * * e imagens responsivas (srcset).
 */

// --- VARIÁVEIS GLOBAIS DO CATÁLOGO ---
let resellerProducts = [];
let resellerProductMargins = {};
let resellerActiveProductIds = [];
let resellerSettings = {};
let cart = [];
let currentCustomer = null;
let pendingCartAction = null;
let selectedSize = '';

// Otimização: Variáveis de estado para o Infinite Scroll
let catalogCurrentPage = 1;
let catalogIsLoading = false;
let catalogHasMore = true;
let searchDebounceTimer;

// --- INICIALIZAÇÃO DO CATÁLOGO ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('catalog-preview-view')) {
        loadLocalDataForCatalog();
        initializeCatalog();
        setupInfiniteScroll();
    }
});

// --- LÓGICA DE OTIMIZAÇÃO DE IMAGEM ---

/**
 * Cria a URL para o proxy de imagens com parâmetros de otimização.
 * @param {string} url - A URL original da imagem.
 * @param {object} options - Opções de otimização { w, q, format }.
 * @returns {string} A URL do proxy otimizada.
 */
function getOptimizedImageUrl(url, { w, q = 75, format = 'webp' } = {}) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return `https://placehold.co/${w || 300}x${w || 300}/e2e8f0/94a3b8?text=Sem+Imagem`;
    }
    const encodedUrl = encodeURIComponent(url);
    return `/facilzap-images?url=${encodedUrl}&w=${w}&q=${q}&format=${format}`;
}


// --- LÓGICA DE CARREGAMENTO E RENDERIZAÇÃO ---

function loadLocalDataForCatalog() {
    const savedMargins = localStorage.getItem('resellerMargins');
    if (savedMargins) resellerProductMargins = JSON.parse(savedMargins);
    
    const savedResellerActive = localStorage.getItem('resellerActiveProducts');
    if (savedResellerActive) {
        resellerActiveProductIds = JSON.parse(savedResellerActive).map(id => parseInt(id, 10));
    }
    const savedSettings = localStorage.getItem('resellerSettings');
    if (savedSettings) resellerSettings = JSON.parse(savedSettings);
}

function initializeCatalog() {
    renderCatalogShell();
    loadAndDisplayProducts(); // Carrega a primeira página
}

async function loadAndDisplayProducts() {
    if (catalogIsLoading || !catalogHasMore) return;

    catalogIsLoading = true;
    const loader = document.getElementById('infinite-scroll-loader');
    if(loader) loader.style.display = 'block';

    try {
        const data = await realApiFetch(catalogCurrentPage, 20, '');
        
        const productsToDisplay = data.data.filter(p => resellerActiveProductIds.includes(parseInt(p.id, 10)));

        if (productsToDisplay.length > 0) {
            const processed = processProductData(productsToDisplay);
            resellerProducts.push(...processed);
            appendProductsToCatalogGrid(processed);
        }
        
        catalogHasMore = data.hasNext;
        if (catalogHasMore) {
            catalogCurrentPage++;
        } else {
            if(loader) loader.style.display = 'none';
        }
        
        if (catalogCurrentPage === 2) { 
            renderSizeFilters();
        }

    } catch (error) {
        console.error("Erro ao buscar produtos para o catálogo:", error);
        showToast("Erro ao carregar os produtos.", "error");
    } finally {
        catalogIsLoading = false;
        if(!catalogHasMore && loader) loader.style.display = 'none';
        
        const grid = document.getElementById('catalog-product-grid');
        if(resellerProducts.length === 0 && !catalogIsLoading) {
            if(grid) grid.innerHTML = '<p class="placeholder-card col-span-full">Nenhum produto encontrado.</p>';
        }
    }
}

function processProductData(products) {
    return products.map(p => {
        const variacoes = processVariations(p.estoque);
        const imagens = typeof p.imagem === 'string' ? p.imagem.split(',').map(url => url.trim()) : [];
        return { 
            id: parseInt(p.id, 10), 
            nome: p.nome || 'Nome não informado', 
            preco_original: parseFloat(p.preco || 0), 
            imagem: imagens[0] || null, 
            variacoes: variacoes,
            categoria_nome: p.categoria_nome || 'Sem Categoria' 
        };
    });
}

function setupInfiniteScroll() {
    const loader = document.getElementById('infinite-scroll-loader');
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !catalogIsLoading && catalogHasMore) {
            loadAndDisplayProducts();
        }
    }, { rootMargin: '0px 0px 400px 0px' });

    if (loader) {
        observer.observe(loader);
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
    // ... (código existente sem alterações)
}

function filterAndRenderCatalogGrid() {
    // ... (código existente sem alterações)
}

function appendProductsToCatalogGrid(products) {
    const grid = document.getElementById('catalog-product-grid');
    if (!grid) return;

    products.forEach(p => {
        const margin = resellerProductMargins[p.id] || 30;
        const finalPrice = parseFloat(p.preco_original) * (1 + margin / 100);
        
        const card = document.createElement('div');
        card.className = 'group relative bg-white border border-gray-200 rounded-lg flex flex-col overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300';

        // Otimização: Uso de srcset para imagens responsivas
        const imgSrc = getOptimizedImageUrl(p.imagem, { w: 300 });
        const imgSrcset = `
            ${getOptimizedImageUrl(p.imagem, { w: 300 })} 300w,
            ${getOptimizedImageUrl(p.imagem, { w: 600 })} 600w
        `;

        card.innerHTML = `
            <div class="aspect-w-3 aspect-h-4 bg-gray-200 sm:aspect-none sm:h-48">
                <img src="${imgSrc}" srcset="${imgSrcset}" sizes="(max-width: 768px) 50vw, 25vw" alt="${p.nome}" loading="lazy" class="w-full h-full object-cover object-center sm:w-full sm:h-full group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/300x300/e2e8f0/94a3b8?text=Imagem'">
            </div>
            <div class="flex-1 p-4 space-y-2 flex flex-col">
                <h3 class="text-sm font-medium text-gray-900 flex-1">
                    <a href="#" data-product-id="${p.id}">
                        <span aria-hidden="true" class="absolute inset-0"></span>
                        ${p.nome}
                    </a>
                </h3>
                <p class="text-base font-bold text-gray-900">R$ ${finalPrice.toFixed(2)}</p>
                <button class="mt-4 w-full bg-[var(--reseller-primary-color)] text-white font-semibold py-2 px-4 rounded-md hover:opacity-90 transition-opacity z-10 relative" data-product-id="${p.id}">
                    Comprar
                </button>
            </div>
        `;
        
        card.querySelectorAll('[data-product-id]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showProductDetailPage(e.currentTarget.dataset.productId)
            });
        });

        grid.appendChild(card);
    });
    feather.replace();
}

function showProductDetailPage(productId) {
    // ... (código existente, mas agora a imagem principal também pode ser otimizada)
    const product = resellerProducts.find(p => p.id === parseInt(productId));
    // ...
    const mainImageSrc = getOptimizedImageUrl(product.imagem, { w: 800 });
    // ... usar mainImageSrc no <img>
}

// ... (restante do arquivo catalogo.js sem alterações)
