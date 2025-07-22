/**
 * theme.js: Script para o tema Elegance
 * Constrói o layout e chama o script do catálogo para preenchê-lo.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Theme script carregado, construindo layout...');
    buildEleganceLayout();

    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    if (isPreview) {
        console.log('Modo preview detectado, aplicando configurações...');
        applyPreviewSettings();
    }
});

function buildEleganceLayout() {
    console.log('Construindo layout do tema Elegance...');
    
    const root = document.getElementById('theme-root');
    if (!root) {
        console.error('Elemento theme-root não encontrado!');
        return;
    }

    root.innerHTML = `
        <div id="catalog-wrapper">
            <div id="top-bar-wrapper" class="text-white py-2 text-sm font-medium overflow-hidden whitespace-nowrap" style="display: none;">
                <div id="catalog-top-bar-container" class="catalog-top-bar inline-block"></div>
            </div>
            <header id="header-wrapper" class="relative bg-white shadow-sm">
                 <div id="header-main-content" class="h-20 flex justify-between items-center px-4 md:px-6 gap-4 max-w-7xl mx-auto">
                    <button id="catalog-menu-toggle" class="md:hidden p-2"><i data-feather="menu"></i></button>
                    <div class="hidden md:block w-1/3"></div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                         <img id="catalog-logo" src="https://placehold.co/160x80/e2e8f0/cccccc?text=Logo" alt="Logo da loja" class="h-16 object-contain" onerror="this.src='https://placehold.co/160x80/e2e8f0/cccccc?text=Erro+Logo'">
                    </div>
                    <div class="w-1/3 flex justify-end items-center gap-4">
                        <a href="#" id="search-icon-wrapper" class="relative p-2 hover:text-blue-600 transition-colors"><i data-feather="search"></i></a>
                        <a href="#" id="cart-button" class="relative p-2 hover:text-blue-600 transition-colors">
                            <i data-feather="shopping-cart"></i>
                            <span class="cart-count absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="display: none;">0</span>
                        </a>
                    </div>
                </div>
                 <nav id="theme-navigation" class="max-w-7xl mx-auto px-4 py-2 hidden md:flex items-center border-t border-gray-100"></nav>
            </header>
            <main class="relative z-0 min-h-screen">
                <div id="catalog-banner" class="h-64 md:h-96 bg-gradient-to-r from-blue-500 to-purple-600 bg-cover bg-center flex items-center justify-center">
                    <div class="text-center text-white">
                        <h1 class="text-3xl md:text-5xl font-bold mb-4">Bem-vindo à Nossa Loja</h1>
                        <p class="text-lg md:text-xl opacity-90">Descubra produtos incríveis com os melhores preços</p>
                    </div>
                </div>
                <div class="max-w-7xl mx-auto px-4 py-8">
                     <div class="catalog-filters-container text-center mb-8">
                        <h3 id="filter-title" class="text-2xl font-bold mb-4 text-gray-800">Filtre por Numeração</h3>
                        <div id="size-filter-bubbles" class="filter-bubbles flex flex-wrap justify-center gap-2"></div>
                    </div>
                    <div id="catalog-product-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        <!-- Produtos serão inseridos aqui -->
                        <div class="col-span-full text-center py-8">
                            <div class="spinner mx-auto"></div>
                            <p class="mt-4 text-gray-600">Carregando produtos...</p>
                        </div>
                    </div>
                    <div id="infinite-scroll-loader" class="loading-indicator col-span-full text-center py-8" style="display: none;">
                        <div class="spinner mx-auto"></div>
                        <p class="mt-4 text-gray-600">Carregando mais produtos...</p>
                    </div>
                </div>
            </main>
            <footer class="text-center py-12 bg-gray-800 text-white">
                <!-- Conteúdo do footer será inserido pelo catálogo -->
            </footer>
        </div>
        <div id="product-detail-wrapper" class="view"></div>
    `;

    console.log('Layout construído, inicializando ícones...');
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // CORREÇÃO: Aguarda um pequeno delay antes de carregar o script do catálogo
    setTimeout(() => {
        console.log('Carregando script do catálogo...');
        loadCatalogScript();
    }, 100);
}

function loadCatalogScript() {
    // CORREÇÃO: Usar o nome correto do arquivo
    const catalogScript = document.createElement('script');
    catalogScript.src = '../js/catalogo.js'; // Certifique-se de que o arquivo tem este nome exato
    catalogScript.defer = true;
    
    catalogScript.onload = () => {
        console.log('Script do catálogo carregado com sucesso!');
    };
    
    catalogScript.onerror = (error) => {
        console.error('Erro ao carregar script do catálogo:', error);
        showLoadingError();
    };
    
    document.body.appendChild(catalogScript);
}

function showLoadingError() {
    const grid = document.getElementById('catalog-product-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <i data-feather="alert-triangle" class="mx-auto text-red-500 w-12 h-12 mb-4"></i>
                    <h3 class="text-lg font-semibold text-red-800 mb-2">Erro no Carregamento</h3>
                    <p class="text-red-600 mb-4">Não foi possível carregar o catálogo. Verifique se todos os arquivos estão no local correto.</p>
                    <button onclick="location.reload()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors">
                        Tentar Novamente
                    </button>
                </div>
            </div>
        `;
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

function applyPreviewSettings() {
    console.log('Aplicando configurações de preview...');
    
    const settingsJSON = localStorage.getItem('theme_preview_settings');
    if (!settingsJSON) {
        console.log('Nenhuma configuração de preview encontrada');
        return;
    }

    let settings;
    try {
        settings = JSON.parse(settingsJSON);
        console.log('Configurações de preview carregadas:', settings);
    } catch (e) {
        console.error('Erro ao parsear configurações de preview:', e);
        return;
    }

    // --- Barra de Mensagens ---
    const topBarWrapper = document.getElementById('top-bar-wrapper');
    if (topBarWrapper && settings.topbarActive) {
        topBarWrapper.style.display = 'block';
        topBarWrapper.style.backgroundColor = settings.topbarBgColor || '#000';
        topBarWrapper.style.color = settings.topbarTextColor || '#fff';
        
        const messages = [settings.topbarText1, settings.topbarText2, settings.topbarText3].filter(Boolean);
        if (messages.length > 0) {
            const marqueeContent = [...messages, ...messages].map(msg => `<span class="mx-4">${msg}</span>`).join('');
            document.getElementById('catalog-top-bar-container').innerHTML = marqueeContent;
        }
    }

    // --- Cores do Cabeçalho ---
    const headerWrapper = document.getElementById('header-wrapper');
    if (headerWrapper && settings.headerBg) {
        headerWrapper.style.backgroundColor = settings.headerBg;
    }
    
    // --- Logo ---
    const logoImg = document.getElementById('catalog-logo');
    if (logoImg) {
        const isMobile = window.innerWidth < 768;
        const logoToShow = isMobile ? settings.logoMobile : settings.logoDesktop;
        if (logoToShow) {
            logoImg.src = logoToShow;
            logoImg.onerror = () => {
                logoImg.src = 'https://placehold.co/160x80/e2e8f0/cccccc?text=Erro+Logo';
            };
        }
    }

    // --- Ícones do Header ---
    const iconColor = settings.headerIconColor || '#374151';
    const cartIcon = document.querySelector('#cart-button i');
    if (cartIcon) {
        cartIcon.setAttribute('data-feather', settings.useBagIcon ? 'shopping-bag' : 'shopping-cart');
        cartIcon.style.color = iconColor;
    }
    const menuIcon = document.querySelector('#catalog-menu-toggle i');
    if (menuIcon) menuIcon.style.color = iconColor;
    const searchIcon = document.querySelector('#search-icon-wrapper i');
    if (searchIcon) searchIcon.style.color = iconColor;

    // --- Menu e Navegação ---
    const nav = document.getElementById('theme-navigation');
    if (nav) {
        nav.style.justifyContent = settings.menuAlignment || 'center';
        if (settings.menuIsSticky) {
            headerWrapper.classList.add('sticky', 'top-0', 'z-50');
        }
    }

    // --- Corpo da Loja ---
    const mainElement = document.querySelector('main');
    if (mainElement && settings.bodyBgColor) {
        mainElement.style.backgroundColor = settings.bodyBgColor;
    }

    // --- Banner ---
    const banner = document.getElementById('catalog-banner');
    if (banner) {
        const isMobile = window.innerWidth < 768;
        const bannerToShow = isMobile ? settings.bannerMobile : settings.bannerDesktop;
        if (bannerToShow) {
            banner.style.backgroundImage = `url(${bannerToShow})`;
            banner.style.backgroundSize = 'cover';
            banner.style.backgroundPosition = 'center';
        }
    }

    // --- Estilos Dinâmicos ---
    updateDynamicStyles(settings);

    // Atualizar ícones
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function updateDynamicStyles(settings) {
    const dynamicStyleId = 'theme-dynamic-styles';
    let dynamicStyle = document.getElementById(dynamicStyleId);
    
    if (!dynamicStyle) {
        dynamicStyle = document.createElement('style');
        dynamicStyle.id = dynamicStyleId;
        document.head.appendChild(dynamicStyle);
    }
    
    dynamicStyle.innerHTML = `
        .theme-menu-link { 
            color: ${settings.menuLinkColor || '#374151'}; 
            transition: color 0.2s ease;
        }
        .theme-menu-link:hover { 
            color: ${settings.menuLinkHoverColor || '#1d4ed8'}; 
        }
        #filter-title { 
            color: ${settings.sectionTitleColor || '#1f2937'}; 
        }
        .product-card { 
            border-radius: ${settings.cardBorderRadius || '0.5rem'};
            ${settings.cardHasShadow !== false ? 'box-shadow: var(--shadow);' : ''}
            transition: all 0.2s ease;
        }
        .product-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
    `;
}
