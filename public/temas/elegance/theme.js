/**
 * theme.js: Script para o tema Elegance
 * Este arquivo constrói o layout do tema dinamicamente e aplica as configurações de personalização.
 */
document.addEventListener('DOMContentLoaded', () => {
    buildEleganceLayout();

    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    if (isPreview) {
        applyPreviewSettings();
    } else {
        // Lógica para carregar as configurações salvas permanentemente (do banco de dados)
    }
});

/**
 * Constrói a estrutura HTML principal do tema Elegance.
 */
function buildEleganceLayout() {
    const root = document.getElementById('theme-root');
    if (!root) return;

    root.innerHTML = `
        <div id="catalog-wrapper">
            <!-- Barra de Mensagens Rotativa -->
            <div id="top-bar-wrapper" class="text-white py-2 text-sm font-medium overflow-hidden whitespace-nowrap" style="display: none;">
                <div id="catalog-top-bar-container" class="catalog-top-bar inline-block">
                    <!-- Mensagens injetadas aqui -->
                </div>
            </div>

            <!-- Cabeçalho Principal -->
            <header id="header-wrapper" class="relative">
                <div id="header-main-content" class="h-20 flex justify-between items-center px-4 md:px-6 gap-4">
                    <button id="catalog-menu-toggle" class="md:hidden"><i data-feather="menu"></i></button>
                    <div class="hidden md:block w-1/3">
                        <!-- Espaço para links ou redes sociais -->
                    </div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                         <img id="catalog-logo" src="https://placehold.co/160x80/e2e8f0/cccccc?text=Logo" alt="Logo da loja" class="h-16 object-contain">
                    </div>
                    <div class="w-1/3 flex justify-end items-center gap-4">
                        <a href="#" id="search-icon-wrapper" class="relative"><i data-feather="search"></i></a>
                        <a href="#" id="cart-button" class="relative">
                            <i data-feather="shopping-cart"></i>
                            <span class="cart-count absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="display: none;">0</span>
                        </a>
                    </div>
                </div>
                 <nav id="theme-navigation" class="max-w-7xl mx-auto px-4 py-2 hidden md:flex items-center">
                    <a href="#" class="theme-menu-link px-3 py-2 rounded-md text-sm font-medium">Início</a>
                    <a href="#" class="theme-menu-link px-3 py-2 rounded-md text-sm font-medium">Sapatos</a>
                    <a href="#" class="theme-menu-link px-3 py-2 rounded-md text-sm font-medium">Bolsas</a>
                    <a href="#" class="theme-menu-link px-3 py-2 rounded-md text-sm font-medium">Contato</a>
                </nav>
            </header>

            <!-- Conteúdo Principal da Loja -->
            <main class="relative z-0">
                <div id="catalog-banner" class="h-64 md:h-96 bg-slate-200 bg-cover bg-center"></div>
                <div class="max-w-7xl mx-auto px-4 py-8">
                     <div class="catalog-filters-container text-center mb-8">
                        <h3 id="filter-title" class="text-xl font-bold mb-4">Filtre por Numeração</h3>
                        <div id="size-filter-bubbles" class="filter-bubbles">
                        </div>
                    </div>
                    <div id="catalog-product-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <!-- Produtos carregados aqui pelo catalogo.js -->
                    </div>
                    <div id="infinite-scroll-loader" class="loading-indicator col-span-full" style="display: none;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </main>

            <!-- Rodapé -->
            <footer class="text-center py-8 bg-slate-800 text-white">
                <h2 id="catalog-brand-name-footer" class="text-2xl font-bold mb-2">Sua Marca</h2>
                <p id="catalog-description" class="max-w-xl mx-auto mb-4 text-slate-300"></p>
                <div class="flex justify-center gap-6">
                    <a id="catalog-instagram-link" href="#" target="_blank" class="font-semibold flex items-center gap-2"><i data-feather="instagram"></i>Instagram</a>
                    <a id="catalog-whatsapp-link" href="#" target="_blank" class="font-semibold flex items-center gap-2"><i data-feather="message-circle"></i>WhatsApp</a>
                </div>
            </footer>
        </div>
        <div id="product-detail-wrapper" class="view"></div>
    `;

    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // CORREÇÃO: CHAMA DIRETAMENTE A FUNÇÃO DE INICIALIZAÇÃO DO CATÁLOGO
    if (typeof initializeCatalog === 'function') {
        initializeCatalog();
    } else {
        console.error('Função initializeCatalog() não encontrada. O catalogo.js foi carregado?');
    }
}

/**
 * Aplica as configurações salvas no localStorage para a pré-visualização.
 */
function applyPreviewSettings() {
    const settingsJSON = localStorage.getItem('theme_preview_settings');
    if (!settingsJSON) return;

    const settings = JSON.parse(settingsJSON);
    
    // --- Barra de Mensagens ---
    const topBarWrapper = document.getElementById('top-bar-wrapper');
    if (topBarWrapper) {
        if (settings.topbarActive) {
            topBarWrapper.style.display = 'block';
            topBarWrapper.style.backgroundColor = settings.topbarBgColor;
            topBarWrapper.style.color = settings.topbarTextColor;
            const messages = [settings.topbarText1, settings.topbarText2, settings.topbarText3].filter(Boolean);
            if (messages.length > 0) {
                const marqueeContent = [...messages, ...messages].map(msg => `<span class="mx-4">${msg}</span>`).join('');
                document.getElementById('catalog-top-bar-container').innerHTML = marqueeContent;
            } else {
                 topBarWrapper.style.display = 'none';
            }
        } else {
            topBarWrapper.style.display = 'none';
        }
    }

    // --- Cores do Cabeçalho ---
    const headerWrapper = document.getElementById('header-wrapper');
    if (headerWrapper) headerWrapper.style.backgroundColor = settings.headerBg;
    
    // --- Logo ---
    const logoImg = document.getElementById('catalog-logo');
    if (logoImg) {
        const isMobile = window.innerWidth < 768;
        const logoToShow = isMobile ? settings.logoMobile : settings.logoDesktop;
        if (logoToShow) logoImg.src = logoToShow;
    }

    // --- Ícones ---
    const cartIcon = document.querySelector('#cart-button i');
    if (cartIcon) {
        cartIcon.setAttribute('data-feather', settings.useBagIcon ? 'shopping-bag' : 'shopping-cart');
        cartIcon.style.color = settings.headerIconColor;
    }
    const menuIcon = document.querySelector('#catalog-menu-toggle i');
    if (menuIcon) menuIcon.style.color = settings.headerIconColor;
    const searchIcon = document.querySelector('#search-icon-wrapper i');
    if (searchIcon) searchIcon.style.color = settings.headerIconColor;

    // --- Menu e Navegação ---
    const nav = document.getElementById('theme-navigation');
    if (nav) {
        nav.style.justifyContent = settings.menuAlignment;
        if (settings.menuIsSticky) {
            headerWrapper.classList.add('sticky-header');
        } else {
            headerWrapper.classList.remove('sticky-header');
        }
    }

    // --- Corpo da Loja ---
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.style.backgroundColor = settings.bodyBgColor;

    const banner = document.getElementById('catalog-banner');
    if (banner) {
        const isMobile = window.innerWidth < 768;
        const bannerToShow = isMobile ? settings.bannerMobile : settings.bannerDesktop;
        if (bannerToShow) {
            banner.style.backgroundImage = `url(${bannerToShow})`;
        }
    }

    // --- Estilos Dinâmicos (Cores de Hover, Títulos, Cards) ---
    const dynamicStyleId = 'theme-dynamic-styles';
    let dynamicStyle = document.getElementById(dynamicStyleId);
    if (!dynamicStyle) {
        dynamicStyle = document.createElement('style');
        dynamicStyle.id = dynamicStyleId;
        document.head.appendChild(dynamicStyle);
    }
    dynamicStyle.innerHTML = `
        .theme-menu-link { color: ${settings.menuLinkColor}; }
        .theme-menu-link:hover { color: ${settings.menuLinkHoverColor}; }
        #filter-title { color: ${settings.sectionTitleColor}; }
        .product-card { 
            border-radius: ${settings.cardBorderRadius};
            box-shadow: ${settings.cardHasShadow ? 'var(--shadow)' : 'none'};
        }
    `;

    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}
