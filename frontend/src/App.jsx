import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMapsLibrary, MapControl, ControlPosition, Pin } from '@vis.gl/react-google-maps';
import { supabase } from './supabaseClient'; // A conexão real com seu banco!
import './App.css';
import logoCampinasAcessivel from './assets/logo-campinas-acessivel-05.png';

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

// --- MODAL DE LOGIN E CADASTRO REAL ---
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

        {/* CRIAR CONTA */}
        {/* <button 
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
        </button> */}

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

// --- NOVO: MODAL DE CRITÉRIOS DE ACESSIBILIDADE ---
function ModalCriterios({ setModalCriteriosAberto }) {
  // Agora começa nativamente na aba "Detalhes"
  const [abaAtiva, setAbaAtiva] = useState('Detalhes'); 

  const dadosCriterios = {
    'Física': [
      { titulo: 'Módulo de Referência (M.R.)', texto: 'Garantir que todos os espaços tenham pelo menos 0,80 m x 1,20 m para o posicionamento de uma cadeira de rodas em áreas de espera ou uso.' },
      { titulo: 'Área de manobra', texto: 'Espaço livre para rotação de 360° (círculo com diâmetro de 1,50 m) em locais onde a mudança de direção é necessária.' },
      { titulo: 'Elevadores', texto: 'Presença de elevadores funcionando para espaços que tenham escadas. Caso o espaço seja de um único andar e não possua escadas essa condição é marcada como respeitada.' },
      { titulo: 'Rampas e desníveis', texto: 'Inclinação máxima de de 5%, com piso antiderrapante e guia de balizamento.' },
      { titulo: 'Maçanetas tipo alavanca', texto: 'Instaladas entre 0,80 m e 1,10 m de altura, permitindo abertura com o dorso da mão ou sem necessidade de torção de pulso.' },
      { titulo: 'Transferência em sanitários', texto: 'Espaço livre e barras de apoio fixas ou articuladas (diâmetro de 30 mm a 45 mm) junto ao vaso sanitário.' },
      { titulo: 'Altura de comandos', texto: 'Interruptores, tomadas e alarmes situados em faixas de alcance manual confortáveis, entre 0,40 m e 1,20 m do piso.' }
    ],
    'Visual': [
      { titulo: 'Piso tátil de alerta', texto: 'Textura de "bolinhas" instalada em locais de perigo, como início e fim de escadas, rampas e frente a portas de elevadores.' },
      { titulo: 'Piso tátil direcional', texto: 'Textura de "linhas" que indica o caminho seguro em áreas amplas e sem referências de parede (linhas-guia).' },
      { titulo: 'Contraste de luminância', texto: 'Diferença mínima de 30 pontos (LRV) entre mobiliários, sinalização e o plano de fundo, facilitando o acesso por quem tem baixa visão.' },
      { titulo: 'Sinalização em Braille', texto: 'Informações táteis em corrimãos, placas de portas e botões de elevadores.' },
      { titulo: 'Mapas táteis', texto: 'Dispositivos que permitem a compreensão da planta do local através do toque, posicionados na entrada dos edifícios.' },
      { titulo: 'Proteção de mobiliários suspensos', texto: 'Elementos suspensos (como telefones ou vasos) entre 0,60 m e 2,10 m devem ser detectáveis por bengala longa.' },
      { titulo: 'Sinais sonoros', texto: 'Alarmes de emergência e avisos de pavimentos em elevadores que complementem a informação visual.' }
    ],
    'Auditiva': [
      { titulo: 'Sinalização de emergência', texto: 'Dispositivos luminosos do tipo flash que acompanham os alarmes sonoros em caso de incêndio ou sinistro presente em todas as áreas.' },
      { titulo: 'Símbolo internacional de surdez', texto: 'Identificação nítida de postos de atendimento e equipamentos que possuem recursos para deficientes auditivos.' },
      { titulo: 'Sistemas de amplificação', texto: 'Presença de sistemas assistivos de audição ou anéis de indução magnética em auditórios e guichês. Caso o espaço não possua auditórios ou guichês essa condição é marcada como respeitada.' },
      { titulo: 'Atendimento em LIBRAS', texto: 'Disponibilidade de intérpretes ou sistemas de videochamada para conversas serem realizadas na Língua Brasileira de Sinais.' },
      { titulo: 'Legendas e Janela de LIBRAS', texto: 'Em museus ou salas de vídeo, o conteúdo multimídia deve possuir tradução visual e legendagem. Bibliotecas devem ter parte do acervo em audiolivros ou livros impressos em Braile.' },
      { titulo: 'Telefones com Teclado (TDD)', texto: 'Equipamentos que permitem a comunicação por texto para surdos.' },
      { titulo: 'Informação Visual Redundante', texto: 'Painéis eletrônicos de senhas ou informativos que substituem ou complementam chamadas por voz.' }
    ],
    'Intelectual': [
      { titulo: 'Linguagem simples', texto: 'Textos curtos, objetivos e de fácil leitura em placas de sinalização e mapas.' },
      { titulo: 'Presença sala de regulação sensorial', texto: 'Espaço com pelo menos 20 (vinte) metros quadrados para a cada 100 (cem) metros de área construída para permitir a devida descompreensão de visitantes.' },
      { titulo: 'Identificação por cores', texto: 'Uso de zoneamento por cores diferentes para identificar setores, pavimentos ou rotas de fluxo.' },
      { titulo: 'Apoio de serviço assistido', texto: 'Funcionários treinados para oferecer suporte na orientação e uso de equipamentos, como máquinas de autoatendimento.' },
      { titulo: 'Informação multimodal', texto: 'A mesma orientação deverá ser dada por mais de um canal (ex: voz, texto e imagem) para garantir que seja processada corretamente.' },
      { titulo: 'Disponibilização de "Guias de Visitação Prévia"', texto: 'presença de mapas simplificados logo na entrada, que mostram claramente onde estão os pontos de interesse, as saídas e as áreas de apoio (como banheiros e a sala de regulação sensorial).' }
    ]
  };

  // Nova lista com a ordem exata das abas
  const abas = ['Detalhes', 'Física', 'Visual', 'Auditiva', 'Intelectual'];
  // Ícone novo para os detalhes
  const icones = { 'Detalhes': 'ℹ️', 'Física': '♿', 'Visual': '👁️', 'Auditiva': '🦻', 'Intelectual': '🧠' };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}> 
        
        <h2 style={{ marginBottom: '15px' }}>Critérios de Avaliação</h2>
        
        {/* BOTÕES DAS ABAS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px', paddingBottom: '5px' }}>
          {abas.map(categoria => (
            <button
              key={categoria}
              onClick={() => setAbaAtiva(categoria)}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: abaAtiva === categoria ? '#3b5998' : 'transparent',
                color: abaAtiva === categoria ? 'white' : '#475569',
                border: abaAtiva === categoria ? '1px solid #3b5998' : '1px solid #cbd5e1', // Adiciona uma bordinha nas inativas para não sumirem no fundo branco
                transition: '0.2s'
              }}
            >
              {icones[categoria]} {categoria}
            </button>
          ))}
        </div>

        {/* CAIXA DE CONTEÚDO DINÂMICO COM O NOVO FUNDO #f8fafc */}
        <div style={{ 
          backgroundColor: '#f8fafc', // A cor de fundo que você gostou!
          borderRadius: '8px', 
          padding: '15px', // Espaçamento interno para o texto não colar nas bordas
          maxHeight: '40vh', 
          overflowY: 'auto', 
          fontSize: '0.85rem', 
          color: '#444', 
          lineHeight: '1.6' 
        }}>
          
          {/* Lógica: Se for 'Detalhes', mostra o parágrafo. Se não, mostra a lista. */}
          {abaAtiva === 'Detalhes' ? (
            <p style={{ margin: 0 }}>
              Para o projeto “Campinas Acessível” utilizamos como base a <a href="https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/NBR9050_20.pdf" target="_blank" rel="noopener noreferrer" style={{ color: '#3b5998', fontWeight: 'bold' }}>Norma Regulatória 9050:2020</a> para criar um checklist que cada lugar deve cumprir para receber o selo de adequado para cada tipo de deficiência. Assim, para receber o selo de aprovado no Projeto “Campinas Acessível”, o local deve ter, pelo menos, 5 (cinco) dos 7 (sete) itens listados abaixo.
            </p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {dadosCriterios[abaAtiva].map((item, index) => (
                <li key={index} style={{ marginBottom: '10px' }}>
                  <strong>{item.titulo}:</strong> {item.texto}
                </li>
              ))}
            </ul>
          )}

        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" className="btn-salvar" style={{ width: '100%' }} onClick={() => setModalCriteriosAberto(false)}>
            Entendi
          </button>
        </div>
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
  const [modalCriteriosAberto, setModalCriteriosAberto] = useState(false); // modal criterios

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
            <img src={logoCampinasAcessivel} alt="Logo Campinas Acessível" className="logo-img" />
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
              Login
            </button>
          )}
        </div>
      </header>

      <div className="main-content">
        <aside className={`sidebar ${menuAberto ? 'aberto' : ''}`}>
          <div className="filtros-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0 10px 0', width: '100%', gap: '10px' }}>
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
              {/* O TÍTULO E O NOVO BOTÃO LADO A LADO */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 className="filtro-label" style={{ margin: 0 }}>Acessibilidade</h4>
                <button 
                  onClick={() => setModalCriteriosAberto(true)}
                  style={{ background: 'none', border: 'none', color: '#3b5998', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', textDecoration: 'underline' }}
                >
                  ℹ️ Como classificamos?
                </button>
              </div>
              
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
            // Mudar a 'key' força o mapa a recarregar com o novo ID
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

          {/* O BOTÃO FLUTUANTE DE ABRIR/FECHAR*/}
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
      {modalCriteriosAberto && <ModalCriterios setModalCriteriosAberto={setModalCriteriosAberto} />}
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