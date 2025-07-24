/**
 * catalogo.js
 * * Este arquivo é o coração do catálogo público da revendedora.
 * Suas responsabilidades são:
 * 1. Identificar qual loja está sendo visualizada pela URL.
 * 2. Carregar as configurações e produtos específicos dessa loja.
 * 3. Renderizar os produtos na tela com preços e personalizações corretas.
 * 4. Aplicar o tema visual (cores, logos) definido pela revendedora.
 * 5. Adicionar interatividade (ex: botão de comprar no WhatsApp).
 */

document.addEventListener('DOMContentLoaded', () => {
    // A função init é o ponto de entrada que orquestra a montagem do catálogo.
    // Ela é chamada pelo script do tema (theme.js) após o layout base ter sido construído.
    // Como não temos o theme.js, estamos simulando sua chamada aqui.
    if (typeof window.initializeCatalog === 'function') {
        window.initializeCatalog();
    } else {
         console.warn("'theme.js' não encontrado ou não definiu 'window.initializeCatalog'. Iniciando diretamente.");
         initCatalog();
    }
});

/**
 * Função principal que inicializa todo o catálogo.
 */
async function initCatalog() {
    const themeRoot = document.getElementById('theme-root');
    if (!themeRoot) {
        console.error("Elemento #theme-root não encontrado. O tema não pôde ser renderizado.");
        return;
    }

    // Mostra um indicador de carregamento enquanto os dados são buscados.
    themeRoot.innerHTML = '<div class="spinner" style="margin-top: 5rem;"></div><p style="text-align: center; color: var(--text-light);">Montando a sua loja...</p>';

    // =================================================================================
    // PASSO 1: CARREGAR DADOS DA REVENDEDORA (SIMULADO)
    // =================================================================================
    // No futuro, esta função fará uma chamada à API/Supabase usando o ID da loja da URL.
    const resellerData = await loadResellerData();

    if (!resellerData) {
        themeRoot.innerHTML = '<p style="text-align: center; padding: 2rem;">Loja não encontrada ou indisponível.</p>';
        return;
    }

    // =================================================================================
    // PASSO 2: APLICAR TEMA E IDENTIDADE VISUAL
    // =================================================================================
    applyThemeAndIdentity(resellerData.theme, resellerData.settings);
    
    // =================================================================================
    // PASSO 3: CARREGAR E RENDERIZAR PRODUTOS
    // =================================================================================
    // Busca todos os produtos da API e depois filtra para mostrar apenas os ativos.
    const allProducts = await fetchAllProducts();
    const activeProducts = allProducts.filter(p => resellerData.activeProducts.includes(p.id));

    // O tema (theme.js) deve ter criado a estrutura HTML. Agora vamos preenchê-la.
    // Renderiza a vitrine (Lançamentos, Mais Vendidos, etc.)
    renderShowcaseSections(resellerData.showcase, activeProducts, resellerData.margins);
    
    // Renderiza a grade principal de produtos
    renderProductGrid(activeProducts, resellerData.margins);

    // Adiciona os event listeners para os botões de compra, etc.
    setupEventListeners(resellerData.settings.contactPhone);
    
    // Atualiza os ícones
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

/**
 * **FUNÇÃO SIMULADA**
 * Carrega os dados de configuração da revendedora.
 * No futuro, buscará dados do Supabase com base no parâmetro 'loja' da URL.
 * @returns {Promise<object|null>} Um objeto com todas as configurações da loja.
 */
async function loadResellerData() {
    // Exemplo de como pegar o nome da loja da URL: catalogo.html?loja=anas-loja
    const urlParams = new URLSearchParams(window.location.search);
    const storeIdentifier = urlParams.get('loja');

    console.log(`Carregando dados para a loja: ${storeIdentifier}`);

    // **SIMULAÇÃO:** Por enquanto, estamos usando dados fixos que representam
    // o que seria salvo no localStorage pelo painel da revendedora.
    // Quando o Supabase estiver pronto, esta parte será substituída por um fetch.
    return {
        settings: {
            brandName: "Sapatos da Ana",
            contactPhone: "5511987654321", // Apenas números, com código do país
            instagram: "sapatosdaana"
        },
        theme: {
            primaryColor: "#DB1472",
            headerBg: "#FFFFFF",
            logoUrl: "https://placehold.co/200x80/DB1472/FFFFFF?text=SapatosDaAna",
            bannerUrl: "https://placehold.co/1200x400/fce7f3/db1472?text=Coleção+Nova"
        },
        activeProducts: [3178781, 3178782, 3178783, 3178784], // IDs dos produtos que a revendedora ativou
        margins: {
            "3178781": 40, // Margem de 40% para este produto
            "3178782": 50,
            "3178783": 40,
            "3178784": 45
        },
        showcase: {
            lancamentos: [3178784], // IDs para a vitrine "Lançamentos"
            'mais-vendidos': [3178781, 3178782] // IDs para a vitrine "Mais Vendidos"
        }
    };
}

/**
 * Aplica as configurações de tema (cores) e identidade (logo, nome) na página.
 * @param {object} theme - Objeto com as configurações de cor.
 * @param {object} settings - Objeto com as configurações de identidade.
 */
function applyThemeAndIdentity(theme, settings) {
    // Aplica as cores como variáveis CSS no elemento raiz
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor || '#DB1472');
    root.style.setProperty('--card-bg', theme.headerBg || '#FFFFFF');
    
    // Atualiza o título da página
    document.title = `${settings.brandName} | Catálogo`;

    // Atualiza elementos que o theme.js deve ter criado
    const logoImg = document.getElementById('brand-logo');
    if (logoImg) logoImg.src = theme.logoUrl;

    const bannerImg = document.getElementById('brand-banner');
    if (bannerImg) bannerImg.src = theme.bannerUrl;
    
    const storeNameEl = document.getElementById('brand-name');
    if (storeNameEl) storeNameEl.textContent = settings.brandName;

    const whatsappLink = document.getElementById('whatsapp-contact-link');
    if (whatsappLink) whatsappLink.href = `https://wa.me/${settings.contactPhone}`;

    const instagramLink = document.getElementById('instagram-contact-link');
    if (instagramLink) instagramLink.href = `https://instagram.com/${settings.instagram}`;
}

/**
 * Busca todos os produtos da API, página por página.
 * @returns {Promise<Array<object>>} Uma lista com todos os produtos.
 */
async function fetchAllProducts() {
    let allProducts = [];
    let currentPage = 1;
    let hasMore = true;
    while(hasMore) {
        const response = await realApiFetch(currentPage, 100);
        if (response.data && response.data.length > 0) {
            allProducts = allProducts.concat(response.data);
        }
        hasMore = response.hasNext;
        currentPage++;
    }
    // Processa os produtos para um formato mais fácil de usar
    return allProducts.map(p => ({
        id: parseInt(p.id, 10),
        nome: p.nome,
        preco_original: parseFloat(p.preco || 0),
        imagem: (p.imagem || '').split(',')[0].trim(),
        estoque: processVariations(p.estoque)
    }));
}

/**
 * Renderiza as seções de vitrine (Lançamentos, etc.).
 * @param {object} showcase - O objeto com os IDs dos produtos de cada vitrine.
 * @param {Array<object>} allProducts - A lista de todos os produtos ativos.
 * @param {object} margins - O objeto com as margens de lucro.
 */
function renderShowcaseSections(showcase, allProducts, margins) {
    for (const sectionId in showcase) {
        const container = document.getElementById(`showcase-${sectionId}`);
        if (container) {
            const productIds = showcase[sectionId];
            const productsToShow = allProducts.filter(p => productIds.includes(p.id));
            container.innerHTML = productsToShow.map(p => renderProductCard(p, margins)).join('');
        }
    }
}

/**
 * Renderiza a grade principal com todos os produtos ativos.
 * @param {Array<object>} products - A lista de produtos ativos.
 * @param {object} margins - O objeto com as margens de lucro.
 */
function renderProductGrid(products, margins) {
    const grid = document.getElementById('product-grid');
    if (grid) {
        if (products.length === 0) {
            grid.innerHTML = '<p>Nenhum produto disponível no momento.</p>';
            return;
        }
        grid.innerHTML = products.map(p => renderProductCard(p, margins)).join('');
    }
}

/**
 * Cria o HTML para um único card de produto.
 * @param {object} product - O objeto do produto.
 * @param {object} margins - O objeto com as margens de lucro.
 * @returns {string} O HTML do card do produto.
 */
function renderProductCard(product, margins) {
    const marginPercent = margins[product.id] || 30; // Usa 30% como margem padrão
    const finalPrice = product.preco_original * (1 + marginPercent / 100);

    return `
        <div class="product-card border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 bg-white">
            <img src="${proxyImageUrl(product.imagem)}" alt="${product.nome}" class="w-full h-64 object-cover">
            <div class="p-4">
                <h3 class="text-lg font-semibold text-gray-800 truncate">${product.nome}</h3>
                <p class="text-xl font-bold text-[var(--primary-color)] mt-2">R$ ${finalPrice.toFixed(2)}</p>
                <button 
                    class="buy-button w-full mt-4 py-2 px-4 rounded-md text-white font-semibold transition-opacity duration-300"
                    style="background-color: var(--primary-color);"
                    data-product-name="${product.nome}"
                    data-product-price="R$ ${finalPrice.toFixed(2)}"
                >
                    <i data-feather="shopping-cart" class="inline-block mr-2"></i>
                    Comprar no WhatsApp
                </button>
            </div>
        </div>
    `;
}

/**
 * Adiciona os event listeners aos elementos interativos do catálogo.
 * @param {string} contactPhone - O número de WhatsApp da revendedora.
 */
function setupEventListeners(contactPhone) {
    document.body.addEventListener('click', (event) => {
        const buyButton = event.target.closest('.buy-button');
        if (buyButton) {
            const productName = buyButton.dataset.productName;
            const productPrice = buyButton.dataset.productPrice;
            const message = encodeURIComponent(`Olá! Tenho interesse no produto: ${productName} (${productPrice})`);
            const whatsappUrl = `https://wa.me/${contactPhone}?text=${message}`;
            window.open(whatsappUrl, '_blank');
        }
    });
}
