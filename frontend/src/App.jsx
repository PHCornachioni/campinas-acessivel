import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMapsLibrary, MapControl, ControlPosition, Pin } from '@vis.gl/react-google-maps';
import { supabase } from './supabaseClient'; // A conexão real com seu banco!
import './App.css';

// --- DICIONÁRIO DE CORES E ÍCONES ---
const obterIconeMarcador = (tipo) => {
  switch (tipo) {
    case 'Teatro': return { emoji: '🎭', cor: '#8b5cf6' }; 
    case 'Centro Cultural': return { emoji: '🎨', cor: '#f59e0b' }; 
    case 'Museu': return { emoji: '🏛️', cor: '#10b981' }; 
    case 'Biblioteca': return { emoji: '📚', cor: '#3b82f6' }; 
    case 'Turismo': return { emoji: '📸', cor: '#ec4899' }; 
    case 'Cinema': return { emoji: '🍿', cor: '#ef4444' }; 
    default: return { emoji: '📍', cor: '#3b5998' }; 
  }
};

// --- COMPONENTE DO CARD (SIDEBAR) ---
function LocalCard({ local, onClick, isSelected }) {
  const config = obterIconeMarcador(local.tipo);

  return (
    <div 
      className="local-card" 
      onClick={() => onClick(local)} 
      style={{ 
        cursor: 'pointer', 
        backgroundColor: isSelected ? '#f8fafc' : 'white', 
        border: isSelected ? `2px solid ${config.cor}` : '1px solid #eaeaea', 
        borderLeft: `6px solid ${config.cor}`, 
        transition: 'all 0.2s' 
      }}
    >
      <div className="card-header">
        <h4>{config.emoji} {local.nome}</h4>
        <span className="categoria-tag" style={{ color: config.cor, backgroundColor: `${config.cor}20` }}>
          {local.tipo.toUpperCase()}
        </span>
      </div>
      <p className="card-endereco">📍 {local.endereco}</p>
      <div className="acessibilidade-badges">
        <span className={`badge ${local.acessibilidade_fisica ? 'tem' : 'nao-tem'}`}>♿ Física</span>
        <span className={`badge ${local.acessibilidade_visual ? 'tem' : 'nao-tem'}`}>👁️ Visual</span>
        <span className={`badge ${local.acessibilidade_auditiva ? 'tem' : 'nao-tem'}`}>🦻 Auditiva</span>
        <span className={`badge ${local.acessibilidade_intelectual ? 'tem' : 'nao-tem'}`}>🧠 Intelectual</span>
      </div>
    </div>
  );
}

// --- NOVO: MODAL DE LOGIN E CADASTRO REAL ---
function AuthModal({ setModalAberto }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Cria a conta no Supabase
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Conta criada com sucesso! Agora você já pode entrar.');
        setIsSignUp(false); // Volta para a tela de login
      } else {
        // Faz o login real no Supabase
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setModalAberto(false); // Fecha o modal após logar
      }
    } catch (error) {
      alert("Erro na autenticação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <h2>{isSignUp ? 'Criar Nova Conta' : 'Acesso da Administração'}</h2>
        
        <form onSubmit={handleAuth}>
          {/* Campo de E-mail */}
          <div className="form-group">
            <label htmlFor="auth-email">E-mail</label>
            <input 
              type="email" 
              id="auth-email"
              name="email"
              required 
              className="form-input" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          {/* Campo de Senha */}
          <div className="form-group">
            <label htmlFor="auth-password">Senha</label>
            <input 
              type="password" 
              id="auth-password"
              name="password"
              required 
              className="form-input" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>

          <button type="submit" className="btn-salvar" disabled={loading}>
            {loading ? 'Carregando...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
          </button>
        </form>

        {/* Transformado em botão sem borda para 100% de Acessibilidade via Teclado */}
        <button 
          type="button"
          onClick={() => setIsSignUp(!isSignUp)} 
          style={{ 
            background: 'none',
            border: 'none',
            cursor: 'pointer', 
            textAlign: 'center', 
            marginTop: '15px', 
            fontSize: '0.9rem', 
            color: '#3b5998',
            width: '100%',
            fontFamily: 'inherit'
          }}
        >
          {isSignUp ? 'Já tem uma conta? Clique aqui para entrar.' : 'Não tem conta? Crie uma agora para avaliar o sistema.'}
        </button>

        <button 
          type="button" 
          className="btn-cancelar" 
          onClick={() => setModalAberto(false)} 
          style={{ width: '100%', marginTop: '10px' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// --- COMPONENTE DO FORMULÁRIO COM AUTOCOMPLETAR ---
function FormularioCadastro({ novoLocal, setNovoLocal, salvarLocal, setModalAberto, modoEdicao }) {
  const inputRef = useRef(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;
    
    const autocomplete = new places.Autocomplete(inputRef.current, { 
      fields: ['geometry', 'name', 'formatted_address'], 
      componentRestrictions: { country: 'br' } 
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;
      
      setNovoLocal(prev => ({ 
        ...prev, 
        nome: place.name || prev.nome, 
        endereco: place.formatted_address || '', 
        latitude: place.geometry.location.lat(), 
        longitude: place.geometry.location.lng() 
      }));
    });
  }, [places]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{modoEdicao ? 'Editar Local' : 'Adicionar Novo Local'}</h2>
        <form onSubmit={salvarLocal}>
          <div className="form-group">
            <label>Buscar Local (Integração Google)</label>
            <input ref={inputRef} required className="form-input" placeholder="Digite o nome do local..." value={novoLocal.nome} onChange={(e) => setNovoLocal({...novoLocal, nome: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>Categoria</label>
            <select className="form-select" value={novoLocal.tipo} onChange={(e) => setNovoLocal({...novoLocal, tipo: e.target.value})}>
              <option value="Teatro">Teatro</option>
              <option value="Centro Cultural">Centro Cultural</option>
              <option value="Museu">Museu</option>
              <option value="Biblioteca">Biblioteca</option>
              <option value="Turismo">Turismo</option>
              <option value="Cinema">Cinema</option>
            </select>
          </div>

          <div className="form-group">
            <label>Endereço Completo</label>
            <input required className="form-input" value={novoLocal.endereco} onChange={(e) => setNovoLocal({...novoLocal, endereco: e.target.value})} />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Latitude</label>
              <input required className="form-input" value={novoLocal.latitude} onChange={(e) => setNovoLocal({...novoLocal, latitude: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Longitude</label>
              <input required className="form-input" value={novoLocal.longitude} onChange={(e) => setNovoLocal({...novoLocal, longitude: e.target.value})} />
            </div>
          </div>
          
          <div className="form-group">
            <label>Infraestrutura de Acessibilidade</label>
            <div className="checkbox-grid">
              <label className="checkbox-item"><input type="checkbox" checked={novoLocal.acessibilidade_fisica} onChange={(e) => setNovoLocal({...novoLocal, acessibilidade_fisica: e.target.checked})} />♿ Física</label>
              <label className="checkbox-item"><input type="checkbox" checked={novoLocal.acessibilidade_visual} onChange={(e) => setNovoLocal({...novoLocal, acessibilidade_visual: e.target.checked})} />👁️ Visual</label>
              <label className="checkbox-item"><input type="checkbox" checked={novoLocal.acessibilidade_auditiva} onChange={(e) => setNovoLocal({...novoLocal, acessibilidade_auditiva: e.target.checked})} />🦻 Auditiva</label>
              <label className="checkbox-item"><input type="checkbox" checked={novoLocal.acessibilidade_intelectual} onChange={(e) => setNovoLocal({...novoLocal, acessibilidade_intelectual: e.target.checked})} />🧠 Intelectual</label>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-cancelar" onClick={() => setModalAberto(false)}>Cancelar</button>
            <button type="submit" className="btn-salvar">{modoEdicao ? 'Atualizar Local' : 'Salvar Local'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL DO MAPA ---
function PainelMapa() {
  const [locais, setLocais] = useState([]);
  const [textoBusca, setTextoBusca] = useState('');
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const [filtrosAcesso, setFiltrosAcesso] = useState({ fisica: false, visual: false, auditiva: false, intelectual: false });
  const [localSelecionado, setLocalSelecionado] = useState(null);
  const [posicaoMapa, setPosicaoMapa] = useState({ lat: -22.9099, lng: -47.0626 }); 
  const [zoomMapa, setZoomMapa] = useState(13);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [authModalAberto, setAuthModalAberto] = useState(false);
  const [poiVisivel, setPoiVisivel] = useState(false); // Inicia como FALSO (Mapa Limpo)

  // O estado de segurança oficial do seu aplicativo
  const [session, setSession] = useState(null); 

  const [novoLocal, setNovoLocal] = useState({
    nome: '', tipo: 'Teatro', endereco: '', latitude: '', longitude: '',
    acessibilidade_fisica: false, acessibilidade_visual: false, acessibilidade_auditiva: false, acessibilidade_intelectual: false
  });

  // O "vigia" do Supabase que verifica se alguém está logado
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocalSelecionado(null);
  };

  const carregarLocais = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/locais`)
      .then(r => r.json())
      .then(d => setLocais(d))
      .catch(e => console.error(e));
  };

  useEffect(() => { carregarLocais(); }, []);

  const toggleCategoria = (cat) => setCategoriasAtivas(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  const togglePOIsPadroes = () => setPoiVisivel(prev => !prev);
  const toggleAcesso = (tipo) => setFiltrosAcesso(prev => ({ ...prev, [tipo]: !prev[tipo] }));
  const limparFiltros = () => { setTextoBusca(''); setCategoriasAtivas([]); setFiltrosAcesso({ fisica: false, visual: false, auditiva: false, intelectual: false }); };

  const selecionarE_Focar = (local) => {
    setLocalSelecionado(local);
    setPosicaoMapa({ lat: parseFloat(local.latitude), lng: parseFloat(local.longitude) });
    setZoomMapa(16); 
  };

  const irParaMinhaLocalizacao = () => {
    if (!navigator.geolocation) return alert("Sem suporte à geolocalização.");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosicaoMapa({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setZoomMapa(16); },
      () => alert("Erro de localização. Verifique as permissões."), { enableHighAccuracy: true }
    );
  };

  const abrirCadastro = () => {
    setNovoLocal({ nome: '', tipo: 'Teatro', endereco: '', latitude: '', longitude: '', acessibilidade_fisica: false, acessibilidade_visual: false, acessibilidade_auditiva: false, acessibilidade_intelectual: false });
    setModoEdicao(false);
    setModalAberto(true);
  };

  const abrirEdicao = (localParaEditar) => {
    setNovoLocal(localParaEditar);
    setModoEdicao(true);
    setModalAberto(true);
  };

  const salvarLocal = async (e) => {
    e.preventDefault();
    const url = modoEdicao ? `${import.meta.env.VITE_API_URL}/api/locais/${novoLocal.id}` : `${import.meta.env.VITE_API_URL}/api/locais`;
    const metodo = modoEdicao ? 'PUT' : 'POST';
    
    try {
      const resposta = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novoLocal) });
      if (resposta.ok) {
        alert(modoEdicao ? "Local atualizado com sucesso!" : "Local cadastrado com sucesso!");
        setModalAberto(false);
        carregarLocais(); 
        if (modoEdicao) setLocalSelecionado(null);
      } else {
        alert("Erro ao salvar no banco de dados.");
      }
    } catch (erro) { console.error("Erro:", erro); }
  };

  const excluirLocal = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este local?")) return;
    try {
      const resposta = await fetch(`${import.meta.env.VITE_API_URL}/api/locais/${id}`, { method: 'DELETE' });
      if (resposta.ok) { 
        alert("Local excluído!"); 
        setLocalSelecionado(null); 
        carregarLocais(); 
      }
    } catch (erro) { console.error("Erro:", erro); }
  };

  const locaisFiltrados = locais.filter((l) => {
    if (categoriasAtivas.length > 0 && !categoriasAtivas.includes(l.tipo)) return false;
    if (textoBusca && !l.nome.toLowerCase().includes(textoBusca.toLowerCase()) && !l.endereco.toLowerCase().includes(textoBusca.toLowerCase())) return false; 
    if (filtrosAcesso.fisica && !l.acessibilidade_fisica) return false;
    if (filtrosAcesso.visual && !l.acessibilidade_visual) return false;
    if (filtrosAcesso.auditiva && !l.acessibilidade_auditiva) return false;
    if (filtrosAcesso.intelectual && !l.acessibilidade_intelectual) return false;
    return true; 
  });

  return (
    <div className="app-container">
      <header className="global-header">
        <div className="logo-area">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="4" r="2" /> {/* <-- A cabeça chegou! */}
              <path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1a5 5 0 105.9 5.9h-2.07z"/>
            </svg>
          </div>
          <div className="logo-text">
            <h1>Campinas Acessível</h1>
            <p>Mapeamento Cultural</p>
          </div>
        </div>

        {/* LADO DIREITO DO CABEÇALHO (O botão de fechar saiu daqui) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', maxWidth: '50%' }}>
          {session ? (
            <>
              <button className="btn-novo-local" onClick={abrirCadastro}>+ Novo Local</button>
              
              {/* E-mail truncado e botão de sair lado a lado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.85rem', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', display: 'inline-block'
                }} title={session.user.email}>
                  {session.user.email}
                </span>
                <span style={{color: '#94a3b8'}}>|</span>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ffb3b3', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', padding: 0 }}>
                  Sair
                </button>
              </div>
            </>
          ) : (
            <button style={{background: 'white', color: '#3b5998', border: 'none', padding: '8px 15px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => setAuthModalAberto(true)}>
              Login / Cadastro
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <aside className={`sidebar ${menuAberto ? 'aberto' : ''}`}>
          <div className="filtros-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0 10px 0' }}>
              <h4 className="filtro-label" style={{ margin: 0 }}>Filtros Ativos</h4>
              <button onClick={limparFiltros} className="chip-limpar">✕ Limpar</button>
            </div>
            <input type="text" className="search-input" placeholder="🔍 Nome, rua, bairro..." value={textoBusca} onChange={(e) => setTextoBusca(e.target.value)} />
            
            <div className="filtro-grupo">
              <h4 className="filtro-label">Tipo de Local</h4>
              <div className="categorias-chips">
                {['Teatro', 'Centro Cultural', 'Museu', 'Biblioteca', 'Turismo', 'Cinema'].map(cat => {
                  const config = obterIconeMarcador(cat);
                  const ativo = categoriasAtivas.includes(cat);
                  return (
                    <button 
                      key={cat} 
                      className={`chip ${ativo ? 'ativo' : ''}`} 
                      onClick={() => toggleCategoria(cat)}
                    >
                      {config.emoji} {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filtro-grupo">
              <h4 className="filtro-label">Acessibilidade</h4>
              <div className="categorias-chips">
                {['fisica', 'visual', 'auditiva', 'intelectual'].map(tipo => (
                  <button key={tipo} className={`chip ${filtrosAcesso[tipo] ? 'ativo' : ''}`} onClick={() => toggleAcesso(tipo)}>
                    {tipo === 'fisica' && '♿ Física'} {tipo === 'visual' && '👁️ Visual'} {tipo === 'auditiva' && '🦻 Auditiva'} {tipo === 'intelectual' && '🧠 Intelectual'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="lista-locais">
            {locaisFiltrados.map(local => (
              <LocalCard key={local.id} local={local} onClick={selecionarE_Focar} isSelected={localSelecionado && localSelecionado.id === local.id} />
            ))}
          </div>
        </aside>

        <main className="map-container">
          <Map 
            // A MÁGICA DO REACT: Mudar a 'key' força o mapa a recarregar com o novo ID
            key={poiVisivel ? 'mapa-normal' : 'mapa-limpo'} 
            center={posicaoMapa} 
            zoom={zoomMapa} 
            onCameraChanged={(ev) => { setPosicaoMapa(ev.detail.center); setZoomMapa(ev.detail.zoom); }} 
            
            // Alterna entre os seus IDs
            mapId={poiVisivel ? import.meta.env.VITE_MAP_ID_NORMAL : import.meta.env.VITE_MAP_ID_LIMPO}
          >
            
            {locaisFiltrados.map((local) => {
              const config = obterIconeMarcador(local.tipo);
              const isSelected = localSelecionado && localSelecionado.id === local.id;
              
              return (
                <AdvancedMarker key={local.id} position={{ lat: parseFloat(local.latitude), lng: parseFloat(local.longitude) }} onClick={() => selecionarE_Focar(local)} zIndex={isSelected ? 100 : 1}>
                  <Pin background={config.cor} borderColor={'#ffffff'} glyph={config.emoji} scale={isSelected ? 1.3 : 1.0} />
                </AdvancedMarker>
              );
            })}

            {localSelecionado && (
              <InfoWindow position={{ lat: parseFloat(localSelecionado.latitude), lng: parseFloat(localSelecionado.longitude) }} onCloseClick={() => setLocalSelecionado(null)} pixelOffset={[0, -35]}>
                <div style={{ padding: '5px', maxWidth: '250px' }}>
                  <img src={`https://maps.googleapis.com/maps/api/streetview?size=250x120&location=${localSelecionado.latitude},${localSelecionado.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`} style={{ width: '100%', height: '120px', borderRadius: '8px', marginBottom: '10px', objectFit: 'cover' }} />
                  <h3 style={{ fontSize: '1rem', color: '#333', marginBottom: '5px' }}>{localSelecionado.nome}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>📍 {localSelecionado.endereco}</p>
                  
                  {/* NOVOS BADGES DIRETAMENTE NO POPUP */}
                  <div className="acessibilidade-badges" style={{ marginBottom: '15px' }}>
                    <span className={`badge ${localSelecionado.acessibilidade_fisica ? 'tem' : 'nao-tem'}`}>♿ Física</span>
                    <span className={`badge ${localSelecionado.acessibilidade_visual ? 'tem' : 'nao-tem'}`}>👁️ Visual</span>
                    <span className={`badge ${localSelecionado.acessibilidade_auditiva ? 'tem' : 'nao-tem'}`}>🦻 Auditiva</span>
                    <span className={`badge ${localSelecionado.acessibilidade_intelectual ? 'tem' : 'nao-tem'}`}>🧠 Intelectual</span>
                  </div>

                  <div className="acoes-popup">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${localSelecionado.latitude},${localSelecionado.longitude}`} target="_blank" rel="noreferrer" className="btn-rota">
                      ↗ Rota
                    </a>
                    
                    {session && (
                      <>
                        <button onClick={() => abrirEdicao(localSelecionado)} style={{background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}} title="Editar Local">
                          ✏️
                        </button>
                        <button onClick={() => excluirLocal(localSelecionado.id)} className="btn-excluir" title="Excluir Local">
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
          
          <MapControl position={ControlPosition.RIGHT_TOP}>
            {/* 4. --- CONTAINER PARA OS BOTÕES DIREITOS DO MAPA --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              
              {/* Botão de Localização (Seu botão original, apenas tirei os margins pra dar gap no pai) */}
              <button className="btn-minha-localizacao" onClick={irParaMinhaLocalizacao} title="Encontrar minha localização" style={{margin: 0}}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
              </button>

              {/* 5. --- O NOVO BOTÃO TOGGLE POI --- */}
              <button 
                className={`btn-toggle-poi ${poiVisivel ? 'ativo' : ''}`} // Classe 'ativo' muda a cor
                onClick={togglePOIsPadroes} 
                title={poiVisivel ? "Esconder locais padrão do Google" : "Mostrar locais padrão do Google"}
              >
                {/* Ícone muda de acordo com o estado 🏛️ */}
                {poiVisivel ? '🎯' : '🏛️'}
              </button>
            </div>
          </MapControl>

          {/* O BOTÃO FLUTUANTE DE ABRIR/FECHAR MENU AGORA FICA AQUI */}
          {!menuAberto ? (
            <button className="btn-abrir-menu" onClick={() => setMenuAberto(true)}>🔍 Filtros e Locais</button>
          ) : (
            <button className="btn-fechar-menu" onClick={() => setMenuAberto(false)}>✕</button>
          )}
        </main>
      </div>

      {authModalAberto && <AuthModal setModalAberto={setAuthModalAberto} />}
      
      {modalAberto && (
        <FormularioCadastro novoLocal={novoLocal} setNovoLocal={setNovoLocal} salvarLocal={salvarLocal} setModalAberto={setModalAberto} modoEdicao={modoEdicao} />
      )}
    </div>
  );
}

// O App envolve o Painel no APIProvider do Google
export default function App() {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <PainelMapa />
    </APIProvider>
  );
}