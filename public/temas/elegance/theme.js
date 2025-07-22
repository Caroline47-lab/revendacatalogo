/**
 * theme.js: Script para o tema Elegance
 * Responsabilidade ÚNICA: Construir o layout HTML do tema dentro do #theme-root.
 * CORREÇÃO: A lógica de carregar o 'catalogo.js' foi REMOVIDA daqui e
 * centralizada no 'catalogo/index.html' para garantir a ordem de execução.
 */
document.addEventListener('DOMContentLoaded', () => {
    buildEleganceLayout();

    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';

    // Se for uma pré-visualização, aplica as configurações salvas no localStorage
    if (isPreview) {
        applyPreviewSettings();
    }
});

/**
 * Constrói a estrutura HTML base do tema Elegance.
 */
function buildEleganceLayout() {
    const root = document.getElementById('theme-root');
    if (!root) {
        console.error("Elemento #theme-root não encontrado. O tema não pode ser construído.");
        return;
    }

    root.innerHTML = `
        <div id="catalog-wrapper">
            <!-- Barra de Mensagens no Topo -->
            <div id="top-bar-wrapper" class="text-white py-2 text-sm font-medium overflow-hidden whitespace-nowrap" style="display: none;">
                <div id="catalog-top-bar-container" class="catalog-top-bar inline-block"></div>
            </div>

            <!-- Cabeçalho Principal -->
            <header id="header-wrapper" class="relative bg-white shadow-md">
                 <div id="header-main-content" class="h-20 flex justify-between items-center px-4 md:px-6 gap-4 max-w-7xl mx-auto">
                    <button id="catalog-menu-toggle" class="md:hidden text-slate-600"><i data-feather="menu"></i></button>
                    <div class="hidden md:flex items-center justify-start w-1/3">
                        <nav id="theme-navigation-desktop" class="flex items-center gap-6"></nav>
                    </div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                         <img id="catalog-logo" src="https://placehold.co/160x60/cccccc/969696?text=Sua+Logo" alt="Logo da loja" class="h-14 object-contain">
                    </div>
                    <div class="w-1/3 flex justify-end items-center gap-4">
                        <a href="#" id="search-icon-wrapper" class="relative text-slate-600"><i data-feather="search"></i></a>
                        <a href="#" id="cart-button" class="relative text-slate-600">
                            <i data-feather="shopping-cart"></i>
                            <span class="cart-count absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="display: none;">0</span>
                        </a>
                    </div>
                </div>
            </header>

            <!-- Conteúdo Principal -->
            <main class="relative z-0 bg-slate-50">
                <div id="catalog-banner" class="h-64 md:h-96 bg-slate-200 bg-cover bg-center flex items-center justify-center">
                    <!-- Conteúdo do banner (texto, etc) pode ser adicionado aqui -->
                </div>
                <div class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                     <div class="catalog-filters-container text-center mb-8">
                        <h3 id="filter-title" class="text-2xl font-bold mb-4 text-slate-800">Nossos Produtos</h3>
                        <div id="size-filter-bubbles" class="filter-bubbles"></div>
                    </div>
                    <div id="catalog-product-grid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        <!-- Os cards de produto serão inseridos aqui pelo catalogo.js -->
                    </div>
                    <div id="infinite-scroll-loader" class="loading-indicator col-span-full py-12" style="display: none;"><div class="spinner"></div></div>
                </div>
            </main>

            <!-- Rodapé -->
            <footer class="text-center py-12 bg-slate-800 text-white">
                <!-- O conteúdo do rodapé será preenchido pelo catalogo.js -->
            </footer>
        </div>
        <div id="product-detail-wrapper" class="view">
            <!-- A visualização de detalhes do produto será carregada aqui -->
        </div>
    `;

    // Garante que os ícones sejam renderizados após a criação do HTML
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // IMPORTANTE: A linha que carregava o catalogo.js foi removida.
    // A responsabilidade agora é do index.html.
}

/**
 * Aplica as configurações de pré-visualização salvas no localStorage.
 * Esta função é chamada apenas quando a URL contém `?preview=true`.
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
        if (logoToShow) {
            logoImg.src = logoToShow;
        } else if (settings.logoDesktop) {
            logoImg.src = settings.logoDesktop; // Fallback para o de desktop
        }
    }

    // --- Ícones ---
    const iconColor = settings.headerIconColor;
    document.querySelectorAll('#cart-button i, #catalog-menu-toggle i, #search-icon-wrapper i').forEach(icon => {
        icon.style.color = iconColor;
    });
    const cartIcon = document.querySelector('#cart-button i');
    if (cartIcon) {
        cartIcon.setAttribute('data-feather', settings.useBagIcon ? 'shopping-bag' : 'shopping-cart');
    }

    // --- Menu e Navegação ---
    const nav = document.getElementById('theme-navigation-desktop');
    if (nav) {
        nav.style.justifyContent = settings.menuAlignment;
        if (settings.menuIsSticky) {
            headerWrapper.classList.add('sticky', 'top-0', 'z-40', 'w-full');
        } else {
            headerWrapper.classList.remove('sticky', 'top-0', 'z-40', 'w-full');
        }
    }

    // --- Corpo da Loja ---
    document.querySelector('main').style.backgroundColor = settings.bodyBgColor;
    const banner = document.getElementById('catalog-banner');
    if (banner) {
        const isMobile = window.innerWidth < 768;
        const bannerToShow = isMobile ? settings.bannerMobile : settings.bannerDesktop;
        if (bannerToShow) {
            banner.style.backgroundImage = `url(${bannerToShow})`;
        } else if (settings.bannerDesktop) {
            banner.style.backgroundImage = `url(${settings.bannerDesktop})`; // Fallback
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

    // Re-renderiza os ícones com as novas configurações
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}
