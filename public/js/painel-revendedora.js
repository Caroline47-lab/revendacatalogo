<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel da Revendedora - Sistema de Gestão</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <script src="https://unpkg.com/feather-icons"></script>

    <style>
        :root {
            --primary-color: #DB1472;
            --secondary-color: #F8B81F;
            --text-color: #334155;
            --text-light: #64748b;
            --bg-color: #f8fafc;
            --card-bg: #ffffff;
            --border-color: #e2e8f0;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --font-sans: 'Inter', sans-serif;
            --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --border-radius: 0.75rem;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: var(--font-sans);
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.5;
            overflow-x: hidden;
        }
        
        .view { display: none; }
        .view.active { display: block; }

        .app-container { display: flex; min-height: 100vh; position: relative; }
        .sidebar { width: 250px; background-color: var(--card-bg); border-right: 1px solid var(--border-color); padding: 2rem 1rem; display: flex; flex-direction: column; transition: transform 0.3s ease-in-out; z-index: 1100; }
        .sidebar-header { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 2rem; text-align: center; }
        .nav-menu { list-style: none; flex-grow: 1; }
        .nav-item a { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 0.5rem; text-decoration: none; color: var(--text-light); font-weight: 500; transition: background-color 0.2s, color 0.2s; cursor: pointer; }
        .nav-item a:hover { background-color: #f1f5f9; color: var(--text-color); }
        .nav-item a.active { background-color: var(--primary-color); color: white; }
        .sidebar-footer { font-size: 0.8rem; color: #94a3b8; text-align: center; margin-top: 1rem; }
        
        .main-content { flex-grow: 1; padding: 2rem; overflow-y: auto; }
        .page { display: none; }
        .page.active { display: block; animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-header h1 { font-size: 1.75rem; font-weight: 700; }
        
        .mobile-header-controls { display: none; }
        #menu-toggle-revendedor { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.5rem; cursor: pointer; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.6rem 1.25rem; border-radius: 0.5rem; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; text-decoration: none; }
        .btn:disabled { background-color: #cbd5e1; cursor: not-allowed; }
        .btn-primary { background-color: var(--primary-color); color: white; }
        .btn-primary:hover:not(:disabled) { opacity: 0.9; }
        .btn-secondary { background-color: #334155; color: white; }
        .btn-secondary:hover:not(:disabled) { opacity: 0.9; }
        .btn-success { background-color: var(--success-color); color: white; }
        .btn-success:hover:not(:disabled) { opacity: 0.9; }
        
        .table-container { background-color: var(--card-bg); border-radius: var(--border-radius); box-shadow: var(--shadow); overflow-x: auto; }
        .product-table { width: 100%; border-collapse: collapse; }
        .product-table th, .product-table td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
        .product-table th { background-color: #f8fafc; font-size: 0.8rem; text-transform: uppercase; color: var(--text-light); }
        .product-table td { font-size: 0.9rem; vertical-align: middle; }
        .product-table .actions-cell { display: flex; gap: 0.5rem; }
        .product-image { width: 40px; height: 40px; object-fit: cover; border-radius: 0.25rem; }
        
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--primary-color); }
        input:checked + .slider:before { transform: translateX(20px); }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: none; justify-content: center; align-items: center; z-index: 1000; overflow-y: auto; padding: 2rem 0; }
        .modal-overlay.active { display: flex; }
        .modal-content { background: var(--card-bg); padding: 2rem; border-radius: var(--border-radius); width: 90%; max-width: 600px; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25); margin: auto; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .modal-header h3 { font-size: 1.25rem; }
        .modal-close-btn { background: none; border: none; cursor: pointer; color: var(--text-light); }
        .modal-footer { margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; }

        #toast { position: fixed; bottom: -100px; left: 50%; transform: translateX(-50%); background-color: #333; color: white; padding: 1rem 1.5rem; border-radius: 0.5rem; transition: bottom 0.5s ease; z-index: 2000; box-shadow: var(--shadow); }
        
        .page-controls { margin-bottom: 1.5rem; }
        .search-input, .form-group select, .form-group input { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: 0.5rem; font-size: 0.9rem; background-color: var(--card-bg); transition: border-color 0.2s, box-shadow 0.2s; }
        .search-input:focus, .form-group select:focus, .form-group input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(219, 20, 114, 0.2); }
        
        .settings-section { background-color: var(--card-bg); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow); margin-bottom: 2rem; }
        .settings-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input[type="color"] { padding: 0.25rem; height: 48px; }
        .form-group textarea { min-height: 100px; resize: vertical; }
        .logo-preview { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color); margin-top: 1rem; }
        .banner-preview { display: flex; gap: 1rem; background-color: #f1f5f9; border: 2px dashed var(--border-color); padding: 1rem; border-radius: var(--border-radius); min-height: 150px; align-items: center; justify-content: center; }
        .banner-preview img { max-width: 100%; max-height: 120px; object-fit: cover; border-radius: 0.5rem; }
        
        .loading-indicator { text-align: center; padding: 2rem; display: none; }
        .loading-indicator.visible { display: block; }
        .spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: var(--primary-color); animation: spin 1s ease infinite; margin: auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        .tag-selection-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
        .tag-selection-grid label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        
        /* ESTILOS DA PÁGINA DE PROMOÇÕES */
        .promo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .promo-card { background-color: var(--card-bg); border-radius: var(--border-radius); box-shadow: var(--shadow); padding: 1.5rem; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
        .promo-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
        .promo-card-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .promo-card-icon { color: var(--primary-color); }
        .promo-card-title { font-size: 1.1rem; font-weight: 700; flex-grow: 1; }
        .promo-card-desc { color: var(--text-light); font-size: 0.9rem; margin-bottom: 1.5rem; flex-grow: 1; }
        .promo-card-footer { margin-top: auto; }

        @media (max-width: 768px) {
            .sidebar { position: fixed; top: 0; left: 0; height: 100%; transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); box-shadow: 5px 0 15px rgba(0,0,0,0.1); }
            .main-content { padding: 1rem; width: 100%; }
            .mobile-header-controls { display: flex; align-items: center; gap: 1rem; }
            .page-header h1 { font-size: 1.5rem; }
            .product-table thead { display: none; }
            .product-table, .product-table tbody, .product-table tr, .product-table td { display: block; width: 100%; }
            .product-table tr { margin-bottom: 1rem; border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden; }
            .product-table td { text-align: right; padding-left: 50%; position: relative; border-bottom: 1px solid var(--border-color); }
            .product-table tr td:last-child { border-bottom: none; }
            .product-table td:before { content: attr(data-label); position: absolute; left: 0.75rem; width: 45%; padding-right: 1rem; text-align: left; font-weight: 600; color: var(--text-color); }
            .product-table .actions-cell { justify-content: flex-end; }
        }
    </style>
</head>
<body>

    <div id="revendedor-view" class="view active">
        <div class="app-container">
            <aside class="sidebar">
                <div class="sidebar-header">Painel Revenda</div>
                <ul class="nav-menu" id="revendedor-nav">
                    <li class="nav-item"><a class="nav-link active" data-page="reseller-products"><i data-feather="tag"></i> Produtos</a></li>
                    <li class="nav-item"><a class="nav-link" data-page="reseller-promotions"><i data-feather="gift"></i> Promoções</a></li>
                    <li class="nav-item"><a class="nav-link" data-page="reseller-showcase"><i data-feather="star"></i> Organizar Vitrine</a></li>
                    <li class="nav-item"><a class="nav-link" data-page="reseller-sales"><i data-feather="dollar-sign"></i> Vendas</a></li>
                    <li class="nav-item"><a class="nav-link" data-page="reseller-appearance"><i data-feather="layout"></i> Aparência</a></li>
                    <li class="nav-item" style="border-top: 1px solid var(--border-color); margin-top: 1rem; padding-top: 1rem;"><a href="catalogo/index.html" target="_blank" id="view-catalog-btn" class="nav-link" style="color: var(--primary-color);"><i data-feather="eye"></i> Ver Catálogo</a></li>
                </ul>
                <div class="sidebar-footer">
                     <a href="index.html" class="btn btn-danger" style="width: 100%; margin-bottom: 1rem;">
                        <i data-feather="log-out"></i> Sair
                    </a>
                    <p>&copy; 2025 - Catálogo de Revenda</p>
                </div>
            </aside>
            <main class="main-content">
                 <div class="page-header">
                    <div class="mobile-header-controls">
                        <button id="menu-toggle-revendedor"><i data-feather="menu"></i></button>
                    </div>
                    <h1 id="revendedor-page-title">Meus Produtos</h1>
                </div>
                <section id="reseller-products" class="page active">
                    <div class="page-controls" style="background-color: var(--card-bg); padding: 1rem; border-radius: var(--border-radius); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <h3 style="font-size: 1.1rem; font-weight: 600;">Gerenciar Preços</h3>
                        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                            <input type="number" id="mass-margin-input" class="search-input" placeholder="Margem de Lucro (%)" style="width: 180px;">
                            <button id="apply-mass-margin" class="btn btn-primary">Aplicar em Massa</button>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="product-table">
                            <thead><tr><th>Imagem</th><th>Nome</th><th>Preço Base</th><th>Sua Margem (%)</th><th>Preço Final</th><th>Ativar no Catálogo</th><th>Ações</th></tr></thead>
                            <tbody id="reseller-products-table-body"></tbody>
                        </table>
                    </div>
                    <div id="reseller-product-list-loader" class="loading-indicator">
                        <div class="spinner"></div>
                    </div>
                </section>
                
                <!-- PÁGINA DE PROMOÇÕES REFEITA -->
                <section id="reseller-promotions" class="page">
                    <div class="settings-section">
                        <h2><i data-feather="zap" style="margin-right: 0.5rem;"></i> Ofertas por Urgência e Escassez</h2>
                        <div class="promo-grid">
                            <div class="promo-card">
                                <div class="promo-card-header"><i data-feather="clock" class="promo-card-icon"></i><h3 class="promo-card-title">Flash Sales</h3></div>
                                <p class="promo-card-desc">Crie promoções relâmpago com um cronômetro regressivo para gerar urgência.</p>
                                <div class="promo-card-footer"><button class="btn btn-primary" data-modal-target="flash-sale-modal">Criar Oferta</button></div>
                            </div>
                            <div class="promo-card">
                                <div class="promo-card-header"><i data-feather="package" class="promo-card-icon"></i><h3 class="promo-card-title">Estoque Limitado</h3></div>
                                <p class="promo-card-desc">Mostre um aviso de "Últimas Unidades" para produtos com baixo estoque.</p>
                                <div class="promo-card-footer"><button class="btn btn-primary" data-modal-target="stock-limit-modal">Configurar</button></div>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <h2><i data-feather="tag" style="margin-right: 0.5rem;"></i> Ofertas por Volume e Valor</h2>
                        <div class="promo-grid">
                            <div class="promo-card">
                                <div class="promo-card-header"><i data-feather="shopping-bag" class="promo-card-icon"></i><h3 class="promo-card-title">Leve Mais, Pague Menos</h3></div>
                                <p class="promo-card-desc">Configure ofertas como 2x1, 3x2 ou descontos progressivos por quantidade.</p>
                                <div class="promo-card-footer"><button class="btn btn-primary" data-modal-target="buy-more-pay-less-modal">Criar Oferta</button></div>
                            </div>
                            <div class="promo-card">
                                <div class="promo-card-header"><i data-feather="truck" class="promo-card-icon"></i><h3 class="promo-card-title">Frete Grátis</h3></div>
                                <p class="promo-card-desc">Ofereça frete grátis a partir de um valor mínimo de compra.</p>
                                <div class="promo-card-footer"><button class="btn btn-primary" data-modal-target="free-shipping-modal">Configurar</button></div>
                            </div>
                        </div>
                    </div>
                     <div class="settings-section">
                        <h2><i data-feather="user-check" style="margin-right: 0.5rem;"></i> Ofertas Personalizadas</h2>
                        <div class="promo-grid">
                            <div class="promo-card">
                                <div class="promo-card-header"><i data-feather="award" class="promo-card-icon"></i><h3 class="promo-card-title">Primeira Compra</h3></div>
                                <p class="promo-card-desc">Crie um cupom de desconto especial para atrair novos clientes.</p>
                                <div class="promo-card-footer"><button class="btn btn-primary" data-modal-target="first-purchase-modal">Criar Cupom</button></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="reseller-showcase" class="page">
                    <div class="settings-section">
                        <h2><i data-feather="award"></i> Produtos em Destaque</h2>
                        <p style="color: var(--text-light); margin-bottom: 1.5rem;">Selecione os produtos que aparecerão com destaque no topo do seu catálogo.</p>
                        <div class="placeholder-card" style="padding: 2rem; text-align: center;">Funcionalidade em desenvolvimento.</div>
                    </div>
                    <div class="settings-section">
                        <h2><i data-feather="tag"></i> Tags dos Produtos</h2>
                        <p style="color: var(--text-light); margin-bottom: 1.5rem;">Adicione tags como "Lançamento" ou "Últimas Peças" aos seus produtos. Elas aparecerão no seu catálogo.</p>
                        <div class="placeholder-card" style="padding: 2rem; text-align: center;">Funcionalidade em desenvolvimento.</div>
                    </div>
                </section>
                <section id="reseller-sales" class="page">
                    <div class="page-header">
                        <h1>Minhas Vendas</h1>
                        <button class="btn btn-success" id="show-new-sale-modal-btn"><i data-feather="plus"></i> Lançar Nova Venda</button>
                    </div>
                    <div class="table-container">
                        <table class="product-table">
                            <thead><tr><th>Data</th><th>Itens</th><th>Valor Total</th><th>Status</th><th>Ações</th></tr></thead>
                            <tbody id="sales-history-body"></tbody>
                        </table>
                    </div>
                </section>
                <section id="reseller-appearance" class="page">
                    <div class="settings-section"><h2>Identidade Visual</h2><div class="form-grid"><div class="form-group"><label for="logo-upload">Logo da Marca</label><input type="file" id="logo-upload" accept="image/*"><img id="logo-preview" class="logo-preview" src="https://placehold.co/100x100/e2e8f0/94a3b8?text=Logo" alt="Prévia da logo"></div><div class="form-group"><label for="brand-name-input">Nome da Marca</label><input type="text" id="brand-name-input" placeholder="Ex: Maria Modas"></div><div class="form-group"><label for="primary-color-input">Cor Primária</label><input type="color" id="primary-color-input" value="#DB1472"></div><div class="form-group"><label for="secondary-color-input">Cor de Destaque</label><input type="color" id="secondary-color-input" value="#F8B81F"></div></div></div>
                    <div class="settings-section"><h2>Informações do Catálogo</h2><div class="form-grid"><div class="form-group"><label for="contact-phone-input">Contato (WhatsApp)</label><input type="tel" id="contact-phone-input" placeholder="(XX) 9XXXX-XXXX"></div><div class="form-group"><label for="instagram-input">Instagram</label><input type="text" id="instagram-input" placeholder="@seunome"></div></div><div class="form-group" style="margin-top: 1.5rem;"><label for="description-textarea">Descrição Curta</label><textarea id="description-textarea" placeholder="Fale um pouco sobre sua loja..."></textarea></div></div>
                    <div class="settings-section"><h2>Link do Catálogo</h2><div class="form-grid" style="grid-template-columns: 2fr 1fr; align-items: flex-end;"><div class="form-group"><label for="catalog-url-name">Nome da Loja na URL</label><input type="text" id="catalog-url-name" placeholder="ex: joana-modas"></div><button class="btn btn-primary" id="generate-link-btn">Gerar e Copiar Link</button></div></div>
                    <div class="settings-section"><h2>Banners do Catálogo</h2><p style="color: var(--text-light); margin-bottom: 1rem;">Envie imagens para os banners que aparecerão no topo do seu catálogo.</p><div class="banner-option"><h3 style="font-weight: 600; margin-bottom: 0.5rem;">Banner Principal (Desktop e Mobile)</h3><div class="form-grid"><div class="form-group"><label>Imagem para Desktop (1900x400px)</label><input type="file" class="banner-upload" data-banner-id="desktop-main" accept="image/*"><div class="banner-preview mt-2"><img id="banner-preview-desktop-main" src="https://placehold.co/600x200/e2e8f0/94a3b8?text=Banner+Desktop" alt="Prévia Banner Desktop"></div></div><div class="form-group"><label>Imagem para Mobile (700x800px)</label><input type="file" class="banner-upload" data-banner-id="mobile-main" accept="image/*"><div class="banner-preview mt-2"><img id="banner-preview-mobile-main" src="https://placehold.co/300x200/e2e8f0/94a3b8?text=Banner+Mobile" alt="Prévia Banner Mobile"></div></div></div></div></div>
                    <div class="settings-section"><h2>Mensagens da Barra Superior</h2><div class="form-grid"><div class="form-group"><label for="top-bar-msg-1">Mensagem 1</label><input type="text" id="top-bar-msg-1"></div><div class="form-group"><label for="top-bar-msg-2">Mensagem 2</label><input type="text" id="top-bar-msg-2"></div><div class="form-group"><label for="top-bar-msg-3">Mensagem 3</label><input type="text" id="top-bar-msg-3"></div></div></div>
                    <div class="modal-footer" style="justify-content: flex-start;"><button id="save-settings-btn" class="btn btn-success"><i data-feather="save"></i> Salvar Alterações</button></div>
                </section>
            </main>
        </div>
    </div>
    
    <!-- MODAIS DE PROMOÇÕES -->
    <div id="flash-sale-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header"><h3>Criar Flash Sale</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div>
            <div class="form-group"><label for="flash-sale-product">Selecione o Produto</label><select id="flash-sale-product"></select></div>
            <div class="form-group"><label for="flash-sale-discount">Desconto (%)</label><input type="number" id="flash-sale-discount" placeholder="Ex: 25"></div>
            <div class="form-group"><label for="flash-sale-end-date">Data e Hora de Término</label><input type="datetime-local" id="flash-sale-end-date"></div>
            <div class="modal-footer"><button id="save-flash-sale-btn" class="btn btn-success">Ativar Flash Sale</button></div>
        </div>
    </div>
    <div id="stock-limit-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header"><h3>Configurar Alerta de Estoque Limitado</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div>
            <div class="form-group"><label for="stock-limit-threshold">Mostrar alerta quando o estoque for menor que:</label><input type="number" id="stock-limit-threshold" value="5" placeholder="Ex: 5"></div>
            <div class="form-group"><label for="stock-limit-message">Mensagem a ser exibida</label><input type="text" id="stock-limit-message" value="Últimas unidades!"></div>
            <div class="modal-footer"><button id="save-stock-limit-btn" class="btn btn-success">Salvar Configuração</button></div>
        </div>
    </div>
    <div id="buy-more-pay-less-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header"><h3>Criar Leve Mais, Pague Menos</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div>
            <div class="form-group"><label for="bmpl-product">Selecione o Produto</label><select id="bmpl-product"></select></div>
            <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="form-group"><label for="bmpl-buy-qty">Leve (Qtd)</label><input type="number" id="bmpl-buy-qty" placeholder="3"></div>
                <div class="form-group"><label for="bmpl-pay-qty">Pague (Qtd)</label><input type="number" id="bmpl-pay-qty" placeholder="2"></div>
            </div>
            <div class="modal-footer"><button id="save-bmpl-btn" class="btn btn-success">Ativar Oferta</button></div>
        </div>
    </div>
    <div id="free-shipping-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header"><h3>Configurar Frete Grátis</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div>
            <div class="form-group"><label for="free-shipping-min-value">Valor mínimo para frete grátis (R$)</label><input type="number" id="free-shipping-min-value" placeholder="Ex: 299.90"></div>
            <div class="modal-footer"><button id="save-free-shipping-btn" class="btn btn-success">Salvar Configuração</button></div>
        </div>
    </div>
    <div id="first-purchase-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header"><h3>Cupom de Primeira Compra</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div>
            <div class="form-group"><label for="first-purchase-code">Código do Cupom</label><input type="text" id="first-purchase-code" value="BEMVINDA10"></div>
            <div class="form-group"><label for="first-purchase-discount">Desconto (%)</label><input type="number" id="first-purchase-discount" value="10"></div>
            <div class="modal-footer"><button id="save-first-purchase-btn" class="btn btn-success">Ativar Cupom</button></div>
        </div>
    </div>

    <!-- MODAIS GENÉRICOS -->
    <div id="reseller-product-edit-modal" class="modal-overlay">
        <div class="modal-content"><div class="modal-header"><h3 id="modal-reseller-product-name">Editar Margem</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div><div class="modal-body"><p style="margin-bottom: 1rem; color: var(--text-light);">Defina sua margem de lucro para este produto.</p><label for="reseller-margin-input" style="font-weight: 600;">Margem de Lucro (%)</label><input type="number" id="reseller-margin-input" class="search-input" style="width: 100%; margin-top: 0.5rem;" placeholder="Ex: 30"></div><div class="modal-footer"><button id="save-reseller-margin-btn" class="btn btn-success">Salvar</button></div></div>
    </div>
    <div id="reseller-tags-modal" class="modal-overlay">
        <div class="modal-content"><div class="modal-header"><h3 id="modal-tags-product-name">Editar Tags</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div><div class="modal-body"><p style="margin-bottom: 1rem; color: var(--text-light);">Selecione as tags para este produto.</p><div id="tags-selection-container" class="tag-selection-grid"></div></div><div class="modal-footer"><button id="save-reseller-tags-btn" class="btn btn-success">Salvar Tags</button></div></div>
    </div>
    <div id="new-sale-modal" class="modal-overlay">
        <div class="modal-content"><div class="modal-header"><h3>Lançar Nova Venda</h3><button class="modal-close-btn"><i data-feather="x"></i></button></div><div class="form-grid" style="grid-template-columns: 2fr 1fr 1fr auto; align-items: flex-end;"><div class="form-group"><label for="sale-product-select">Produto</label><select id="sale-product-select"></select></div><div class="form-group"><label for="sale-variation-select">Variação</label><select id="sale-variation-select"></select></div><div class="form-group"><label for="sale-quantity-input">Qtd.</label><input type="number" id="sale-quantity-input" value="1" min="1"></div><button class="btn btn-primary" id="add-sale-item-btn" style="height: 48px;"><i data-feather="plus"></i></button></div><div class="table-container" style="margin-top: 1.5rem;"><table class="product-table"><thead><tr><th>Produto</th><th>Qtd.</th><th>Subtotal</th><th></th></tr></thead><tbody id="sale-items-body"></tbody></table></div><div class="modal-footer"><h3 style="margin-right: auto;">Total: <span id="sale-total">R$ 0,00</span></h3><button class="btn btn-success" id="save-sale-btn">Salvar Venda</button></div></div>
    </div>
    <div id="toast"></div>

    <script src="js/servicos.js"></script>
    <script src="js/painel-revendedora.js"></script>
</body>
</html>

