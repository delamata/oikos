(function () {
  'use strict';

  var MESES_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  var MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  // Fallback só — a lista de verdade vem de celula_hierarquia (banco),
  // ver currentCelulaList().
  var celOrder = ['Otavio e Jô', 'Claudio e Renata', 'Pr.Paulo', 'Josivan e Celia', 'Janaina'];

  // Hierarquia de posições dentro da igreja, da chegada (Visitante) até liderança sênior.
  var posicaoOrder = ['Visitante', 'Frequentador Assíduo', 'Membro', 'Líder em Treinamento', 'Anfitrião', 'Anjo da Guarda', 'Líder', 'Discipulador', 'Obreiro', 'Pastor de Rede', 'Pastor'];
  var posicaoColor = {
    'Visitante': '#8A63C9', 'Frequentador Assíduo': '#149C88', 'Membro': '#1B2344',
    'Líder em Treinamento': '#7FA8E8', 'Anfitrião': '#5B8FE0', 'Anjo da Guarda': '#C77DBB',
    'Líder': '#3B5FDD', 'Discipulador': '#6B3FA0', 'Obreiro': '#0E7A68',
    'Pastor de Rede': '#A1780F', 'Pastor': '#B0281E',
  };
  // Posições "além de Visitante/FA" — usadas nos KPIs de Liderança e Membros da rede.
  var POSICOES_LIDERANCA = ['Líder em Treinamento', 'Anfitrião', 'Anjo da Guarda', 'Líder', 'Discipulador', 'Obreiro', 'Pastor de Rede', 'Pastor'];
  var POSICOES_REDE = ['Membro'].concat(POSICOES_LIDERANCA);
  var POSICOES_POTENCIAIS = ['Visitante', 'Frequentador Assíduo'];

  var CIVIL_ORDER = ['Casado (a)', 'Solteiro (a)', 'Viuvo (a)', 'Divorciado(a)', 'Amasiado (a)'];
  var CIVIL_LABELS = { 'Casado (a)': 'Casado(a)', 'Solteiro (a)': 'Solteiro(a)', 'Viuvo (a)': 'Viúvo(a)', 'Divorciado(a)': 'Divorciado(a)', 'Amasiado (a)': 'Amasiado(a)' };

  // Tipo de cadastro. Cada tipo é contado pelo próprio nome — nunca
  // "tudo que não é Adulto", senão Jovens caem junto com Kids.
  var TIPO_OPTIONS = [
    { v: 'Adultos', label: 'Adultos' },
    { v: 'Jovens', label: 'Jovens' },
    { v: 'Kids e Juvenis', label: 'Kids e Juvenis' },
  ];

  function contaTipo(pessoas, tipo) {
    return pessoas.filter(function (p) { return p.tipo === tipo; }).length;
  }

  // "3 adultos · 1 jovem · 2 kids/juvenis" — só os tipos que aparecem.
  function tipoResumo(pessoas) {
    var a = contaTipo(pessoas, 'Adultos'), j = contaTipo(pessoas, 'Jovens'), k = contaTipo(pessoas, 'Kids e Juvenis');
    var partes = [];
    if (a) partes.push(a + (a === 1 ? ' adulto' : ' adultos'));
    if (j) partes.push(j + (j === 1 ? ' jovem' : ' jovens'));
    if (k) partes.push(k + ' kids/juvenis');
    return partes.length ? partes.join(' · ') : 'ninguém na seleção';
  }

  function tipoFilterOptions(atual) {
    return opt('', 'Todos os tipos', atual === '') + TIPO_OPTIONS.map(function (o) { return opt(o.v, o.label, atual === o.v); }).join('');
  }

  // Jornada da pessoa na igreja (members.status_pessoa) — separada da
  // função ministerial (members.funcao). Ver add_hierarquia_status.sql.
  var STATUS_OPTIONS = [
    { v: 'Visitante', label: 'Visitante' },
    { v: 'Frequentador Assíduo', label: 'Frequentador Assíduo (FA)' },
    { v: 'Membro', label: 'Membro' },
  ];
  // Uma pessoa ocupa uma função por vez; subir de Líder para
  // Discipulador troca a função, não acumula.
  var FUNCOES_MINISTERIAIS = ['Anfitrião', 'Líder em Treinamento', 'Anjo da Guarda', 'Líder', 'Discipulador', 'Obreiro', 'Pastor de Rede', 'Pastor'];
  var FUNCAO_OPTIONS = FUNCOES_MINISTERIAIS.map(function (f) { return { v: f, label: f }; });

  // `posicao` continua sendo o rótulo único usado por telas, gráficos e
  // RLS: a função quando existe, senão o status (igual ao gatilho do banco).
  function posicaoDe(status, funcao) {
    return funcao || status || 'Visitante';
  }

  function statusDeMembro(p) {
    if (!p) return 'Visitante';
    if (p.status_pessoa) return p.status_pessoa;
    return (p.posicao === 'Visitante' || p.posicao === 'Frequentador Assíduo') ? p.posicao : 'Membro';
  }

  function funcaoDeMembro(p) {
    if (!p) return '';
    if (p.funcao) return p.funcao;
    return ['Visitante', 'Frequentador Assíduo', 'Membro'].indexOf(p.posicao) < 0 ? p.posicao : '';
  }

  function posicaoOptions() {
    return posicaoOrder.map(function (p) { return { v: p, label: p }; });
  }

  // Situação da pessoa na rede. Só 'ativo' entra nas contagens e nos
  // relatórios por célula — todo o resto zera o campo `active`:
  // inativo (continua cadastrado, mas não participa hoje),
  // transferências (não contam como "perdido") e perdido (saiu e não
  // quer mais participar de nenhuma igreja).
  var SITUACAO_OPTIONS = [
    { v: 'ativo', label: 'Ativo' },
    { v: 'inativo', label: 'Inativo' },
    { v: 'transferido_celula', label: 'Transferido — outra célula' },
    { v: 'transferido_rede', label: 'Transferido — outra rede' },
    { v: 'transferido_igreja', label: 'Transferido — outra igreja' },
    { v: 'perdido', label: 'Perdido' },
  ];
  var SITUACAO_LABELS = SITUACAO_OPTIONS.reduce(function (m, o) { m[o.v] = o.label; return m; }, {});

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }

  // ---------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------
  var sb = null;

  function supabaseConfigured() {
    var url = window.SUPABASE_URL, key = window.SUPABASE_ANON_KEY;
    return !!(url && key && url.indexOf('COLE_AQUI') === -1 && key.indexOf('COLE_AQUI') === -1);
  }

  var novoFormDefaults = { nome: '', tipo: 'Adultos', celula: 'Otavio e Jô', status: 'Visitante', funcao: '', supervisorId: '', batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)', nasc: '', tel: '', maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não', situacao: 'ativo', saidaDetalhe: '', conjugeId: '', conjugeNome: '', conjugeQuery: '' };
  // Campos que o cônjuge herda de quem foi salvo: onde a pessoa é
  // contada (célula), se é contada (situação) e o nível de acesso
  // (posição). O "Admin" mora em profiles.is_admin e é espelhado à
  // parte, pela function sincronizar_acesso_conjuge().
  var CAMPOS_HERDADOS_CONJUGE = ['celula', 'posicao', 'funcao', 'status_pessoa', 'situacao_saida', 'active'];
  var publicFormDefaults = { nome: '', tipo: 'Adultos', celula: '', nasc: '', tel: '' };
  // modo: 'novo' (cadastra a pessoa agora) ou 'existente' (já cadastrada, só recebe posição/login)
  // tipoLogin: 'senha' (Edge Function cria o usuário) ou 'google'
  // (grava um convite; a pessoa entra com Google e vincula sozinha).
  var adminLiderFormDefaults = { modo: 'novo', nome: '', posicao: 'Líder', celula: '', memberId: '', query: '', criarLogin: true, tipoLogin: 'senha', email: '', senha: '' };

  // Link de frequência da célula: index.html?frequencia=CODIGO — o líder
  // lança a presença sem login (ver supabase/add_frequencia_link.sql).
  function urlTokenFrequencia() {
    try {
      var m = window.location.search.match(/[?&]frequencia=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  function urlWantsCadastroPublico() {
    try { return /[?&]cadastro(=|&|$)/.test(window.location.search); } catch (e) { return false; }
  }

  var state = {
    q: '',
    filters: { tipo: '', celula: '', posicao: '', batizado: '', encontro: '' },
    sort: { key: 'idade', dir: 1 },
    selected: null,
    tab: 'home',
    sidebarOpen: false,
    // Início: Pastor/Admin podem recortar a rede por Obreiro e Discipulador
    homeFilters: { obreiro: '', discipulador: '' },
    trilhoFilters: { celula: '', curso: '' },

    // autenticação (Supabase Auth)
    session: false,         // false = deslogado; objeto = logado
    loginForm: { email: '', senha: '' },
    loginError: null,
    loginLoading: false,
    showLoginForm: false,   // sem sessão: mostra o formulário de login em vez do Cadastro de Membros público

    // Cadastro de Membros sem login (versão limitada — ver members_publico)
    membersPublicos: [],
    membersPublicosStatus: 'idle',
    anonFilters: { q: '', tipo: '', celula: '', posicao: '' },

    // vínculo login → cadastro (profiles)
    profile: null,          // null = ainda verificando; false = sem vínculo; objeto = vinculado
    profileStatus: 'idle',
    meuPerfil: null,        // meu_perfil(): { is_full, celula, posicao, member_id }
    meuNome: '',
    meuConjugeId: null,     // meu_conjuge_id(): o casal divide a mesma rede
    directory: [],          // members_directory, usado só na tela de vínculo
    directoryStatus: 'idle',
    selfLinkQuery: '',
    selfLinkSaving: false,
    selfLinkError: null,

    // auto-cadastro de quem entrou por login social e não tinha convite
    socialForm: Object.assign({}, publicFormDefaults),
    socialSaving: false,
    socialError: null,

    // hierarquia célula → discipulador/obreiro (só Pastor/Admin edita)
    celulaHierarquia: [],
    hierarquiaStatus: 'idle',
    hierarquiaSaving: false,

    // aba Administração: criar célula / criar liderança + login
    adminCelulaForm: { nome: '', discipuladorId: '', obreiroId: '' },
    adminCelulaSaving: false,
    adminCelulaError: null,
    adminCelulaSalvo: false,
    // editar célula existente: { original, nome, discipuladorId, obreiroId }
    adminCelulaEdit: null,
    adminCelulaEditSaving: false,
    adminCelulaEditError: null,
    adminCelulaEditSalvo: null,
    adminLinkSaving: false,
    adminLinkCopiado: false,

    adminLiderForm: Object.assign({}, adminLiderFormDefaults),
    adminLiderSaving: false,
    adminLiderError: null,
    adminLiderSalvo: false,
    // Dados do último e-mail autorizado, pra montar o aviso que o admin
    // manda pra pessoa (o app não envia e-mail nenhum sozinho).
    adminLiderConvite: null,
    adminConviteCopiado: false,

    // frequência por link (sem login)
    fpToken: urlTokenFrequencia(),
    fpStatus: 'idle',             // idle | loading | ok | error
    fpErro: null,
    fpCelula: '',
    fpData: '',
    fpPessoas: [],                // [{ id, nome, status, presente }]
    fpMarcados: {},
    fpJaLancado: false,
    fpSaving: false,
    fpSalvo: null,                // { presentes, total } depois de salvar
    fpVisitante: null,            // { nome, tel } com o formulário aberto
    fpVisitanteSaving: false,

    // "Já sou líder" (sem login): pedido de acesso de liderança
    lidAberto: false,
    lidForm: { etapa: 'inicio', nome: '', funcao: 'Líder', celula: '', tel: '', email: '' },
    lidSaving: false,
    lidErro: null,
    lidResultado: null,           // { titulo, texto } depois de enviar
    solicitacoes: [],             // pedidos pendentes (só acesso total vê)
    adminSolicitacaoId: null,     // pedido que está sendo liberado agora

    // cadastro público (sem login)
    isPublicCadastro: urlWantsCadastroPublico(),
    publicForm: Object.assign({}, publicFormDefaults),
    publicSaving: false,
    publicError: null,
    publicSalvo: false,
    celulasPublicas: [],
    celulasPublicasStatus: 'idle',

    // membros (Supabase)
    members: [],
    membersStatus: 'idle',  // idle | loading | ok | error
    lastMembersSync: null,

    // novo cadastro / edição de membro
    novoForm: Object.assign({}, novoFormDefaults),
    novoSalvo: false,
    novoSaving: false,
    novoError: null,
    novoEditId: null,
    novoEditOriginal: null,



    // frequência das células (lançamento semanal do líder)
    freqTab: 'lancar',            // lancar | historico | painel
    // Célula e culto são lançamentos separados, cada um com a sua data.
    freqModo: 'celula',           // celula | culto
    freqCelula: '',
    freqData: '',                 // data do encontro da célula
    freqCultoData: '',            // data do culto
    freqEncontro: null,           // linha de celula_encontros da célula+data
    freqCulto: null,              // linha de cultos da data escolhida
    freqEncontroStatus: 'idle',
    freqPresencas: {},            // member_id -> presente na célula
    freqPresencasCulto: {},       // member_id -> presente no culto
    freqJaLancadas: {},           // quem já tinha linha salva (pra não sobrescrever created_by)
    freqJaLancadasCulto: {},
    freqEncontros: [],            // view frequencia_encontros (resumo por encontro)
    freqCultos: [],               // view frequencia_cultos (resumo por culto/célula)
    freqPlanilha: [],             // histórico importado da planilha (totais por célula/data)
    freqEncontrosStatus: 'idle',
    freqSaving: false,
    freqSalvo: false,
    freqErro: null,
    freqBusca: '',
    freqVisitante: null,          // { nome, tel, convidadoPor } com o form aberto
    freqVisitanteSaving: false,
    freqVisitanteErro: null,
    freqVisitanteDuplicado: null,
    freqPainel: { periodo: '8', celula: '', discipulador: '', obreiro: '' },
    freqHistoricoPessoaId: '',
    freqHistoricoPessoa: null,

    // Oikos IA (só para acesso total)
    iaPergunta: '',
    iaConversa: [],
    iaCarregando: false,
    iaErro: null,

    // movimentações (Supabase)
    movimentacoes: [],
    movStatus: 'idle',
    movFilters: { celula: '', campo: '' },
    movLista: 'fora',             // qual lista está aberta: fora da contagem | inativos
    novaNota: '',
  };

  function setState(patch) {
    var partial = typeof patch === 'function' ? patch(state) : patch;
    state = Object.assign({}, state, partial);
    render();
  }

  function data() {
    return state.members || [];
  }

  // ---------------------------------------------------------------------
  // Helpers ported from the original component
  // ---------------------------------------------------------------------
  function numOrZero(v) {
    var t = (v == null ? '' : String(v)).trim();
    if (!t || /^n[aã]o$/i.test(t)) return 0;
    var digits = t.replace(/\D/g, '');
    if (!digits) return 0;
    var n = parseInt(digits, 10);
    return isNaN(n) ? 0 : n;
  }

  function celulaLabel(c) {
    var m = { 'Otavio e Jô': 'Otávio e Jô', 'Claudio e Renata': 'Claudio e Renata', 'Pr.Paulo': 'Pr. Paulo', 'Josivan e Celia': 'Josivan e Célia', 'Janaina': 'Janaína', 'Discipulador': 'Discipulado' };
    return m[c] || c;
  }

  // Lista de células vem do banco (celula_hierarquia, cadastrada pela
  // aba Administração) — celOrder só serve de fallback antes do
  // primeiro carregamento ou se a migração add_admin_area.sql ainda
  // não rodou nesse projeto.
  function currentCelulaList() {
    return (state.celulaHierarquia && state.celulaHierarquia.length)
      ? state.celulaHierarquia.map(function (h) { return h.celula; })
      : celOrder;
  }

  // Discipulador, Obreiro, Pastor e Pastor de Rede são liderança sênior
  // e não pertencem a uma célula específica — todo o resto precisa.
  var POSICOES_SEM_CELULA = ['Discipulador', 'Obreiro', 'Pastor', 'Pastor de Rede'];
  function celulaObrigatoria(posicao) {
    return POSICOES_SEM_CELULA.indexOf(posicao) < 0;
  }
  // Posições que a aba Administração pode cadastrar como "nova liderança".
  var POSICOES_ADMIN_LIDERANCA = ['Líder', 'Discipulador', 'Obreiro', 'Pastor de Rede', 'Pastor'];
  // Quem pode responder por um discipulador na tabela de hierarquia —
  // normalmente um Obreiro, mas também pode ser direto um Pastor de
  // Rede ou Pastor.
  var POSICOES_OBREIRO_OU_ACIMA = ['Obreiro', 'Pastor de Rede', 'Pastor'];

  // members_nome_nasc_unique (supabase/add_unique_nome_nasc.sql) barra
  // cadastro duplicado (mesmo nome + mesma data de nascimento) direto
  // no banco — aqui só troca o erro cru do Postgres por uma mensagem
  // que a pessoa entende.
  function friendlyMemberInsertError(err) {
    if (!err) return null;
    if (err.code === '23505' || /members_nome_nasc_unique|duplicate key/i.test(err.message || '')) {
      return 'Já existe uma pessoa cadastrada com esse nome e essa data de nascimento.';
    }
    return err.message;
  }

  function celulaLabelOrRaw(campo, v) {
    if (v == null) return '—';
    if (campo === 'celula') return celulaLabel(v);
    if (campo === 'situacao_saida') return SITUACAO_LABELS[v] || v;
    return v;
  }

  function setF(key, val) { setState(function (s) { var f = Object.assign({}, s.filters); f[key] = val; return { filters: f }; }); }
  function setAnonF(key, val) { setState(function (s) { var f = Object.assign({}, s.anonFilters); f[key] = val; return { anonFilters: f }; }); }
  function setTF(key, val) { setState(function (s) { var f = Object.assign({}, s.trilhoFilters); f[key] = val; return { trilhoFilters: f }; }); }
  function setNF(key, val) { setState(function (s) { var f = Object.assign({}, s.novoForm); f[key] = val; return { novoForm: f, novoSalvo: false }; }); }

  function ageFromIso(iso) {
    if (!iso) return null;
    var b = new Date(iso + 'T00:00:00');
    var now = new Date();
    var a = now.getFullYear() - b.getFullYear();
    var md = now.getMonth() - b.getMonth();
    if (md < 0 || (md === 0 && now.getDate() < b.getDate())) a--;
    return (a >= 0 && a < 120) ? a : null;
  }

  // ---------------------------------------------------------------------
  // Autenticação (Supabase Auth)
  // ---------------------------------------------------------------------
  function applySession(newSession) {
    // Evita re-render (e perda de foco/digitação em andamento) quando a
    // verificação de sessão não muda nada do que já está na tela: o estado
    // inicial já é "deslogado", então o caso comum (ninguém logado ainda)
    // não deve disparar setState nenhum.
    if (newSession === state.session) return;
    if (!newSession && !state.session) return;
    setState({ session: newSession });
    if (newSession) { loadProfile(); }
  }

  function checkSession() {
    if (!sb) return;
    sb.auth.getSession().then(function (res) {
      applySession((res.data && res.data.session) || false);
    });
    sb.auth.onAuthStateChange(function (_event, session) {
      applySession(session || false);
    });
  }

  function doLogin() {
    var emailEl = document.getElementById('login-email');
    var senhaEl = document.getElementById('login-senha');
    var email = (emailEl && emailEl.value || '').trim();
    var senha = senhaEl && senhaEl.value || '';
    if (!email || !senha) return;
    setState({ loginLoading: true, loginError: null, loginForm: { email: email, senha: '' } });
    sb.auth.signInWithPassword({ email: email, password: senha }).then(function (res) {
      if (res.error) { setState({ loginLoading: false, loginError: res.error.message }); return; }
      setState({ loginLoading: false, loginForm: { email: '', senha: '' }, session: res.data.session });
      loadProfile();
    });
  }

  function loginComGoogle() {
    if (!sb) return;
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
  }

  function doLogout() {
    sb.auth.signOut().then(function () {
      setState({ session: false, members: [], movimentacoes: [], profile: null, meuPerfil: null, meuNome: '', meuConjugeId: null, directory: [], celulaHierarquia: [], showLoginForm: false, tab: 'home', homeFilters: { obreiro: '', discipulador: '' } });
    });
  }

  // Alterna entre a tela pública (Cadastro de Membros sem login) e o
  // formulário de login, quando não há sessão nenhuma.
  function pedirLogin() { setState({ showLoginForm: true }); }
  function voltarDoLogin() { setState({ showLoginForm: false }); }

  // ---------------------------------------------------------------------
  // Vínculo login → cadastro (profiles) e hierarquia célula → discipulador/obreiro
  // ---------------------------------------------------------------------
  function afterLinked() {
    loadMembers(); loadMovimentacoes(); loadCelulaHierarquia(); loadFrequencia(); loadSolicitacoesLideranca();
  }

  function loadProfile() {
    if (!sb || !state.session) return;
    setState({ profileStatus: 'loading' });
    sb.from('profiles').select('*').eq('user_id', state.session.user.id).maybeSingle().then(function (res) {
      if (res.error) { console.warn('Erro ao carregar perfil:', res.error.message); setState({ profileStatus: 'error' }); return; }
      if (res.data) {
        setState({ profile: res.data, profileStatus: 'ok' });
        afterLinked();
        loadMeuPerfil(res.data.member_id);
        return;
      }
      // Sem vínculo ainda: pode ser alguém que um admin convidou por
      // e-mail (Administração → Convidar por Google). aceitar_convite()
      // confere o e-mail já verificado pelo provedor e vincula sozinho.
      sb.rpc('aceitar_convite').then(function (conv) {
        if (!conv.error && conv.data) { loadProfile(); return; }
        setState({ profile: false, profileStatus: 'ok' });
        // Quem entrou por e-mail/senha escolhe o próprio nome na lista
        // (fluxo de sempre). Quem entrou por login social sem convite
        // não pode fazer isso — só criar o próprio cadastro novo.
        if (!isSocialSession()) loadDirectory();
      });
    });
  }

  // Posição/célula de quem está logado, direto de meu_perfil(). Não dá
  // pra tirar isso de `members`: a RLS esconde a própria linha de quem
  // não tem célula (Discipulador, Obreiro), e sem ela o Início não sabe
  // qual rede mostrar. O nome vem de members_directory, que é aberta.
  function loadMeuPerfil(memberId) {
    if (!sb) return;
    sb.rpc('meu_perfil').then(function (res) {
      var row = res.data && (Array.isArray(res.data) ? res.data[0] : res.data);
      if (res.error || !row) return;
      setState({ meuPerfil: row });
    });
    // Cônjuge enxerga a mesma rede (supabase/add_rede_conjuge.sql). Se a
    // migração ainda não rodou, a RPC falha e o Início segue sem cônjuge.
    sb.rpc('meu_conjuge_id').then(function (res) {
      if (!res.error && res.data) setState({ meuConjugeId: res.data });
    });
    if (!memberId) return;
    sb.from('members_directory').select('id, nome').eq('id', memberId).maybeSingle().then(function (res) {
      if (!res.error && res.data) setState({ meuNome: res.data.nome });
    });
  }

  // Provedor da sessão atual: 'email' (login com senha) ou social
  // ('google', etc). Decide qual tela de vínculo aparece.
  function isSocialSession() {
    var u = state.session && state.session.user;
    var provider = u && u.app_metadata && u.app_metadata.provider;
    return !!provider && provider !== 'email';
  }

  function loadDirectory() {
    if (!sb) return;
    setState({ directoryStatus: 'loading' });
    sb.from('members_directory').select('*').order('nome').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar diretório:', res.error.message); setState({ directoryStatus: 'error' }); return; }
      setState({ directory: res.data, directoryStatus: 'ok' });
    });
  }

  function setSelfLinkQuery(v) { setState({ selfLinkQuery: v }); }

  function selfLink(memberId) {
    if (!sb || !state.session || !memberId) return;
    setState({ selfLinkSaving: true, selfLinkError: null });
    sb.from('profiles').insert({ user_id: state.session.user.id, member_id: memberId }).select().single().then(function (res) {
      if (res.error) { setState({ selfLinkSaving: false, selfLinkError: res.error.message }); return; }
      setState({ selfLinkSaving: false, profile: res.data });
      afterLinked();
    });
  }

  // Auto-cadastro de quem entrou por login social sem convite: só pode
  // criar um cadastro NOVO pra si mesma (sempre Visitante) e vincular a
  // ele — nunca escolher alguém que já existe na lista.
  function setSocialField(key, val) {
    setState(function (s) { var f = Object.assign({}, s.socialForm); f[key] = val; return { socialForm: f, socialError: null }; });
  }

  function submitAutoCadastroSocial() {
    if (!sb || !state.session) return;
    var f = state.socialForm;
    var nascEl = document.getElementById('social-nasc');
    var nasc = nascEl ? nascEl.value : '';
    if (!f.nome.trim() || !f.celula || !nasc || !f.tel.trim()) {
      setState({ socialError: 'Preencha todos os campos antes de enviar.' });
      return;
    }
    setState({ socialSaving: true, socialError: null });
    var row = {
      nome: f.nome.trim(), tipo: f.tipo, celula: f.celula, nasc: nasc, tel: f.tel.trim(),
      posicao: 'Visitante', batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)',
      maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não',
      situacao_saida: 'ativo', active: true,
    };
    sb.from('members').insert(row).select().single().then(function (res) {
      if (res.error) { setState({ socialSaving: false, socialError: friendlyMemberInsertError(res.error) }); return; }
      sb.from('profiles').insert({ user_id: state.session.user.id, member_id: res.data.id }).select().single().then(function (p) {
        if (p.error) { setState({ socialSaving: false, socialError: p.error.message }); return; }
        setState({ socialSaving: false, socialForm: Object.assign({}, publicFormDefaults), profile: p.data });
        afterLinked();
      });
    });
  }

  function loadCelulaHierarquia() {
    if (!sb) return;
    setState({ hierarquiaStatus: 'loading' });
    // Sem order(), o Postgres pode devolver as linhas em ordem diferente
    // a cada busca — a tabela reordenava sozinha depois de cada troca de
    // discipulador/obreiro, dando a impressão de que a linha errada foi
    // alterada.
    sb.from('celula_hierarquia').select('*').order('celula').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar hierarquia:', res.error.message); setState({ hierarquiaStatus: 'error' }); return; }
      setState({ celulaHierarquia: res.data, hierarquiaStatus: 'ok' });
    });
  }

  // Editar célula existente (nome, discipulador, obreiro). Passa pela
  // function editar_celula() (supabase/add_editar_celula.sql) porque
  // renomear precisa mover as pessoas da célula junto, numa transação só.
  function abrirEdicaoCelula(h) {
    setState({
      adminCelulaEdit: { original: h.celula, nome: h.celula, discipuladorId: h.discipulador_id || '', obreiroId: h.obreiro_id || '' },
      adminCelulaEditError: null, adminCelulaEditSalvo: null,
    });
    var el = document.getElementById('admincelula-edit-nome');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
  }

  function setAdminCelulaEdit(key, val) {
    setState(function (s) {
      var e = Object.assign({}, s.adminCelulaEdit);
      e[key] = val;
      return { adminCelulaEdit: e, adminCelulaEditError: null };
    });
  }

  function cancelarEdicaoCelula() {
    setState({ adminCelulaEdit: null, adminCelulaEditError: null });
  }

  // ---- Link de frequência da célula (sem login) ----
  function linkFrequenciaUrl(token) {
    return window.location.origin + window.location.pathname + '?frequencia=' + encodeURIComponent(token);
  }

  function gerarLinkFrequencia(celula) {
    if (!sb) return;
    setState({ adminLinkSaving: true, adminCelulaEditError: null });
    sb.rpc('gerar_token_frequencia', { p_celula: celula }).then(function (res) {
      if (res.error) {
        var msg = res.error.message || 'Não foi possível gerar o link.';
        if (res.error.code === 'PGRST202' || /could not find the function/i.test(msg)) {
          msg = 'Falta rodar supabase/add_frequencia_link.sql no SQL Editor do Supabase.';
        }
        setState({ adminLinkSaving: false, adminCelulaEditError: msg });
        return;
      }
      setState({ adminLinkSaving: false, adminLinkCopiado: false });
      loadCelulaHierarquia();
    });
  }

  function copiarLinkFrequencia(token) {
    var url = linkFrequenciaUrl(token);
    try {
      navigator.clipboard.writeText(url).then(function () { setState({ adminLinkCopiado: true }); });
    } catch (e) {
      window.prompt('Copie o link da frequência:', url);
    }
  }

  function compartilharLinkFrequencia(celula, token) {
    var texto = 'Lançamento de frequência da célula ' + celulaLabel(celula) + ':\n' + linkFrequenciaUrl(token) +
      '\n\nAbra o link no celular, marque quem esteve no encontro e toque em Salvar. Não precisa de login — guarde o link.';
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
  }

  function salvarEdicaoCelula() {
    var e = state.adminCelulaEdit;
    if (!sb || !e) return;
    var nome = (e.nome || '').trim();
    if (!nome) { setState({ adminCelulaEditError: 'Digite o nome da célula.' }); return; }
    setState({ adminCelulaEditSaving: true, adminCelulaEditError: null });
    sb.rpc('editar_celula', {
      p_celula: e.original, p_novo_nome: nome,
      p_discipulador_id: e.discipuladorId || null, p_obreiro_id: e.obreiroId || null,
    }).then(function (res) {
      if (res.error) {
        var msg = res.error.message || 'Não foi possível salvar.';
        if (res.error.code === 'PGRST202' || /could not find the function/i.test(msg)) {
          msg = 'Falta rodar supabase/add_editar_celula.sql no SQL Editor do Supabase.';
        }
        setState({ adminCelulaEditSaving: false, adminCelulaEditError: msg });
        return;
      }
      var renomeou = nome !== e.original;
      setState(function (s) {
        var patch = { adminCelulaEditSaving: false, adminCelulaEdit: null, adminCelulaEditSalvo: 'Célula "' + nome + '" atualizada.' };
        // Filtros e formulário que apontavam pro nome antigo seguem a célula.
        if (renomeou && s.filters.celula === e.original) patch.filters = Object.assign({}, s.filters, { celula: nome });
        if (renomeou && s.novoForm.celula === e.original) patch.novoForm = Object.assign({}, s.novoForm, { celula: nome });
        return patch;
      });
      loadCelulaHierarquia();
      if (renomeou) { loadMembers(); loadMovimentacoes(); }
    });
  }

  // ---------------------------------------------------------------------
  // Administração: nova célula, nova liderança (+ login inicial)
  // ---------------------------------------------------------------------
  function setAdminCelulaField(key, val) {
    setState(function (s) { var f = Object.assign({}, s.adminCelulaForm); f[key] = val; return { adminCelulaForm: f, adminCelulaError: null, adminCelulaSalvo: false }; });
  }

  function criarCelula() {
    if (!sb) return;
    var f = state.adminCelulaForm;
    var nome = (f.nome || '').trim();
    if (!nome) { setState({ adminCelulaError: 'Digite o nome da célula.' }); return; }
    setState({ adminCelulaSaving: true, adminCelulaError: null });
    sb.from('celula_hierarquia').insert({
      celula: nome,
      discipulador_id: f.discipuladorId || null,
      obreiro_id: f.obreiroId || null,
    }).then(function (res) {
      if (res.error) { setState({ adminCelulaSaving: false, adminCelulaError: res.error.message }); return; }
      setState({ adminCelulaSaving: false, adminCelulaSalvo: true, adminCelulaForm: { nome: '', discipuladorId: '', obreiroId: '' } });
      loadCelulaHierarquia();
    });
  }

  function setAdminLiderField(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.adminLiderForm);
      f[key] = val;
      // Digitar de novo na busca invalida a pessoa selecionada antes.
      if (key === 'query') f.memberId = '';
      return { adminLiderForm: f, adminLiderError: null, adminLiderSalvo: false };
    });
  }

  function setAdminLiderModo(modo) {
    setState({ adminLiderForm: Object.assign({}, adminLiderFormDefaults, { modo: modo }), adminLiderError: null, adminLiderSalvo: false });
  }

  function pickAdminLiderExistente(member) {
    setState(function (s) {
      var f = Object.assign({}, s.adminLiderForm);
      f.memberId = member.id; f.nome = member.nome;
      // Só mantém a posição atual se já for uma das opções de liderança
      // que essa tela oferece — senão o select mostraria "Líder" (1ª
      // opção) enquanto o estado teria um valor que nem aparece nele.
      f.posicao = POSICOES_ADMIN_LIDERANCA.indexOf(member.posicao) >= 0 ? member.posicao : 'Líder';
      f.celula = member.celula || ''; f.query = member.nome;
      return { adminLiderForm: f, adminLiderError: null, adminLiderSalvo: false };
    });
  }

  function submitAdminLider() {
    if (!sb) return;
    var f = state.adminLiderForm;
    var precisaCelula = celulaObrigatoria(f.posicao);
    // E-mail/senha ficam sem binding de estado (mesmo padrão do login) —
    // campos type=email/password perdem o cursor se forem controlados.
    var emailEl = document.getElementById('adminlider-email');
    var senhaEl = document.getElementById('adminlider-senha');
    var email = ((emailEl && emailEl.value) || '').trim();
    var senha = (senhaEl && senhaEl.value) || '';

    if (f.modo === 'novo' && !f.nome.trim()) { setState({ adminLiderError: 'Digite o nome da pessoa.' }); return; }
    if (f.modo === 'existente' && !f.memberId) { setState({ adminLiderError: 'Selecione a pessoa já cadastrada.' }); return; }
    if (precisaCelula && !f.celula) { setState({ adminLiderError: 'Selecione a célula.' }); return; }
    if (f.posicao === 'Líder' && f.celula) {
      var h = (state.celulaHierarquia || []).filter(function (x) { return x.celula === f.celula; })[0];
      if (!h || !h.discipulador_id) {
        setState({ adminLiderError: 'Essa célula ainda não tem discipulador responsável. Defina um em "Nova Célula" (ou na tabela abaixo) antes de cadastrar o líder.' });
        return;
      }
    }
    var tipoLogin = f.tipoLogin || 'senha';
    if (f.criarLogin) {
      if (!email) { setState({ adminLiderError: 'Digite o e-mail de login.' }); return; }
      if (tipoLogin === 'senha' && (!senha || senha.length < 6)) { setState({ adminLiderError: 'A senha inicial precisa ter pelo menos 6 caracteres.' }); return; }
    }

    setState({ adminLiderSaving: true, adminLiderError: null });

    // Mensagem de erro de sb.functions.invoke(): quando a function responde
    // (mesmo com erro), dá pra ler o corpo JSON via error.context.json().
    // Quando a chamada nem chega numa function de verdade (não publicada,
    // nome errado, etc.), o supabase-js só devolve "Failed to send a
    // request to the Edge Function" — aí a gente troca por uma explicação
    // que dá pra agir.
    var edgeFunctionErrorMessage = function (raw) {
      if (raw && raw.context && typeof raw.context.json === 'function') {
        return raw.context.json().then(function (body) { return (body && body.error) || raw.message || 'Não foi possível criar o login.'; })
          .catch(function () { return raw.message || 'Não foi possível criar o login.'; });
      }
      var msg = (raw && raw.message) || '';
      if (/failed to send a request/i.test(msg)) {
        return Promise.resolve('Não consegui falar com a Edge Function "admin-create-user". Ela provavelmente ainda não foi publicada no seu projeto Supabase (ou o nome está diferente) — veja "Criar login com senha inicial" no README. O cadastro da pessoa já foi salvo; assim que publicar a function, é só clicar em Cadastrar de novo pra criar o login.');
      }
      return Promise.resolve(msg || 'Não foi possível criar o login.');
    };

    var afterMember = function (memberId) {
      // Trava o formulário em "pessoa já cadastrada" apontando pra quem
      // acabou de ser criado — se a criação do login falhar (ex: Edge
      // Function fora do ar) e o usuário tentar de novo, evita cadastrar
      // a mesma pessoa duas vezes; só tenta o login de novo.
      setState(function (s) {
        return { adminLiderForm: Object.assign({}, s.adminLiderForm, { modo: 'existente', memberId: memberId, nome: f.nome, query: f.nome }) };
      });
      if (!f.criarLogin) {
        setState({ adminLiderSaving: false, adminLiderSalvo: true, adminLiderForm: Object.assign({}, adminLiderFormDefaults), adminLiderConvite: null });
        loadMembers(); loadCelulaHierarquia(); concluirSolicitacaoPendente();
        return;
      }
      // Convite por Google: só grava o e-mail autorizado. Quando a
      // pessoa entrar com o Google desse e-mail, aceitar_convite()
      // vincula sozinho — sem Edge Function, sem senha.
      if (tipoLogin === 'google') {
        var nomeConvidado = f.nome;
        sb.from('member_invites').upsert({ email: email.toLowerCase(), member_id: memberId }, { onConflict: 'email' }).then(function (res) {
          if (res.error) { setState({ adminLiderSaving: false, adminLiderError: res.error.message }); return; }
          setState({
            adminLiderSaving: false, adminLiderSalvo: true,
            adminLiderForm: Object.assign({}, adminLiderFormDefaults),
            // Guardado só pra montar o aviso que o admin manda — o app
            // não envia e-mail nenhum pra pessoa.
            adminLiderConvite: { nome: nomeConvidado, email: email.toLowerCase() },
            adminConviteCopiado: false,
          });
          loadMembers(); loadCelulaHierarquia(); concluirSolicitacaoPendente();
        });
        return;
      }
      sb.functions.invoke('admin-create-user', { body: { email: email, password: senha, member_id: memberId } }).then(function (res) {
        if (res.error) {
          edgeFunctionErrorMessage(res.error).then(function (msg) { setState({ adminLiderSaving: false, adminLiderError: msg }); });
          return;
        }
        if (res.data && res.data.error) { setState({ adminLiderSaving: false, adminLiderError: res.data.error }); return; }
        setState({ adminLiderSaving: false, adminLiderSalvo: true, adminLiderForm: Object.assign({}, adminLiderFormDefaults), adminLiderConvite: null });
        loadMembers(); loadCelulaHierarquia(); concluirSolicitacaoPendente();
      });
    };

    if (f.modo === 'existente') {
      sb.from('members').update({
        posicao: f.posicao, funcao: f.posicao, status_pessoa: 'Membro',
        celula: precisaCelula ? (f.celula || null) : null,
      }).eq('id', f.memberId).then(function (res) {
        if (res.error) { setState({ adminLiderSaving: false, adminLiderError: friendlyMemberInsertError(res.error) }); return; }
        afterMember(f.memberId);
      });
    } else {
      var row = {
        nome: f.nome.trim(), tipo: 'Adultos', posicao: f.posicao,
        funcao: f.posicao, status_pessoa: 'Membro',
        celula: precisaCelula ? (f.celula || null) : null,
        batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)',
        nasc: null, tel: '',
        maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não',
        situacao_saida: 'ativo', active: true,
      };
      sb.from('members').insert(row).select().single().then(function (res) {
        if (res.error) { setState({ adminLiderSaving: false, adminLiderError: friendlyMemberInsertError(res.error) }); return; }
        afterMember(res.data.id);
      });
    }
  }

  // ---------------------------------------------------------------------
  // Cadastro público (sem login)
  // ---------------------------------------------------------------------
  function setPublicField(key, val) { setState(function (s) { var f = Object.assign({}, s.publicForm); f[key] = val; return { publicForm: f, publicError: null }; }); }

  // Quem não está logado não lê celula_hierarquia pela sessão normal —
  // a policy "hierarquia_select_anon" (add_admin_area.sql) libera isso
  // especificamente pra essa tela.
  function loadCelulasPublicas() {
    if (!sb) return;
    setState({ celulasPublicasStatus: 'loading' });
    sb.from('celula_hierarquia').select('celula').order('celula').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar células:', res.error.message); setState({ celulasPublicasStatus: 'error' }); return; }
      setState({ celulasPublicas: res.data.map(function (r) { return r.celula; }), celulasPublicasStatus: 'ok' });
    });
  }

  // ---------------------------------------------------------------------
  // "Já sou líder" (tela pública, sem login) — a pessoa se identifica e
  // deixa uma SOLICITAÇÃO de acesso; quem libera é o administrador
  // (supabase/add_solicitacoes_lideranca.sql). Nada aqui grava função de
  // liderança em members: sem login, só dá para criar o pedido.
  // ---------------------------------------------------------------------
  var FUNCOES_SOLICITACAO = [
    { v: 'Líder', label: 'Líder de célula' },
    { v: 'Discipulador', label: 'Discipulador' },
    { v: 'Obreiro', label: 'Obreiro / Pastor de Rede' },
    { v: 'Pastor', label: 'Pastor' },
  ];
  // Quem aparece na lista de cada função (Obreiro e Pastor de Rede são a mesma função).
  var POSICOES_DA_FUNCAO = {
    'Discipulador': ['Discipulador'],
    'Obreiro': ['Obreiro', 'Pastor de Rede'],
    'Pastor': ['Pastor'],
  };
  var lidFormDefaults = { etapa: 'inicio', nome: '', funcao: 'Líder', celula: '', tel: '', email: '' };

  // Cadastro novo de liderança precisa de e-mail: é com ele que o admin
  // cria o login. Devolve o e-mail limpo, ou null se inválido.
  function emailValido(txt) {
    var e = String(txt || '').trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
  }

  function abrirSolicitacaoLideranca() {
    setState({ lidAberto: true, lidForm: Object.assign({}, lidFormDefaults), lidErro: null, lidResultado: null, lidSaving: false });
    loadCelulasPublicas();
    loadMembersPublicos();
  }

  function fecharSolicitacaoLideranca() { setState({ lidAberto: false, lidErro: null }); }

  function setLidField(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.lidForm);
      f[key] = val;
      return { lidForm: f, lidErro: null };
    });
  }

  function setLidEtapa(etapa) {
    setState(function (s) { return { lidForm: Object.assign({}, s.lidForm, { etapa: etapa }), lidErro: null }; });
  }

  function erroSolicitacao(err) {
    var msg = (err && err.message) || 'Não foi possível enviar agora.';
    if ((err && err.code === '42P01') || /relation .*solicitacoes_lideranca|could not find the table|schema cache/i.test(msg)) {
      return 'Falta rodar supabase/add_solicitacoes_lideranca.sql no Supabase.';
    }
    return msg;
  }

  function enviarSolicitacao(row, resultado) {
    if (!sb) return;
    setState({ lidSaving: true, lidErro: null });
    // Sem .select(): quem não tem login pode criar o pedido, mas não lê a tabela.
    sb.from('solicitacoes_lideranca').insert(row).then(function (res) {
      if (res.error) { setState({ lidSaving: false, lidErro: erroSolicitacao(res.error) }); return; }
      setState(function (s) {
        return { lidSaving: false, lidResultado: resultado, lidForm: Object.assign({}, s.lidForm, { etapa: 'enviado' }) };
      });
    });
  }

  function continuarSolicitacao() {
    var f = state.lidForm;
    var nome = (f.nome || '').trim();
    if (nome.length < 3) { setState({ lidErro: 'Digite seu nome completo.' }); return; }

    if (f.funcao !== 'Líder') { setLidEtapa('lista'); return; }

    if (!f.celula) { setState({ lidErro: 'Escolha a célula que você lidera.' }); return; }
    var email = emailValido(f.email);
    if (!email) { setState({ lidErro: 'Digite um e-mail válido — é com ele que o seu acesso será criado.' }); return; }
    // Valida o nome contra o cadastro (a mesma lista pública de nomes).
    var alvo = normalizarNome(nome);
    var achado = (state.membersPublicos || []).filter(function (p) { return normalizarNome(p.nome) === alvo; })[0] || null;
    enviarSolicitacao({
      nome: achado ? achado.nome : nome, funcao: 'Líder', celula: f.celula, telefone: (f.tel || '').trim() || null, email: email,
      member_id: achado ? achado.id : null, ja_cadastrado: !!achado,
    }, achado
      ? { titulo: 'Você já está cadastrado(a)', texto: 'Encontramos o seu nome no Oikos' + (achado.celula ? ' (célula ' + celulaLabel(achado.celula) + ')' : '') + '. Procure o administrador do sistema para liberar o seu acesso — o seu pedido já foi enviado para ele.' }
      : { titulo: 'Pedido enviado', texto: 'Recebemos seus dados como líder da célula ' + celulaLabel(f.celula) + '. Procure o administrador do sistema para liberar o seu acesso.' });
  }

  function escolherNomeNaLista(pessoa) {
    var f = state.lidForm;
    var rotulo = (FUNCOES_SOLICITACAO.filter(function (o) { return o.v === f.funcao; })[0] || {}).label || f.funcao;
    enviarSolicitacao({
      nome: pessoa.nome, funcao: f.funcao, celula: null, telefone: (f.tel || '').trim() || null,
      member_id: pessoa.id, ja_cadastrado: true,
    }, { titulo: 'Encontramos o seu cadastro', texto: pessoa.nome + ', você já está no Oikos como ' + rotulo + '. Seu pedido foi enviado: procure o administrador do sistema para liberar o seu acesso à rede.' });
  }

  function enviarCadastroNovoLideranca() {
    var f = state.lidForm;
    var nome = (f.nome || '').trim();
    if (nome.length < 3) { setState({ lidErro: 'Digite seu nome completo.' }); return; }
    var email = emailValido(f.email);
    if (!email) { setState({ lidErro: 'Digite um e-mail válido — é com ele que o seu acesso será criado.' }); return; }
    var rotulo = (FUNCOES_SOLICITACAO.filter(function (o) { return o.v === f.funcao; })[0] || {}).label || f.funcao;
    enviarSolicitacao({
      nome: nome, funcao: f.funcao, celula: null, telefone: (f.tel || '').trim() || null, email: email,
      member_id: null, ja_cadastrado: false,
    }, { titulo: 'Cadastro enviado', texto: 'Recebemos o seu cadastro como ' + rotulo + '. Procure o administrador do sistema para liberar o seu acesso à rede.' });
  }

  // ---- Lado do administrador: solicitações pendentes ----
  function loadSolicitacoesLideranca() {
    if (!sb) return;
    sb.from('solicitacoes_lideranca').select('*').eq('status', 'pendente').order('criado_em', { ascending: false }).then(function (res) {
      // Sem acesso total a RLS nega — é esperado, só não mostra nada.
      setState({ solicitacoes: res.error ? [] : (res.data || []) });
    });
  }

  // Preenche o formulário de Nova Liderança com o pedido; o admin só
  // confere, completa o login e salva.
  function liberarSolicitacao(s) {
    var membro = s.member_id ? memberById(s.member_id) : null;
    setState({
      adminSolicitacaoId: s.id,
      adminLiderForm: Object.assign({}, adminLiderFormDefaults, {
        modo: membro ? 'existente' : 'novo',
        memberId: membro ? membro.id : '',
        nome: membro ? membro.nome : s.nome,
        query: membro ? membro.nome : '',
        posicao: s.funcao,
        celula: s.funcao === 'Líder' ? (s.celula || (membro && membro.celula) || '') : '',
      }),
      adminLiderError: null, adminLiderSalvo: false,
    });
    // O campo de e-mail do login não guarda estado (é lido da tela ao
    // salvar): preenche direto nele com o e-mail do pedido.
    var campoEmail = document.getElementById('adminlider-email');
    if (campoEmail && s.email) campoEmail.value = s.email;
    var alvo = document.getElementById('admin-nova-lideranca');
    if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resolverSolicitacao(id, status, depois) {
    sb.from('solicitacoes_lideranca').update({ status: status, resolvido_em: new Date().toISOString(), resolvido_por: meuUserId() }).eq('id', id).then(function (res) {
      if (res.error) console.warn('Solicitação:', res.error.message);
      loadSolicitacoesLideranca();
      if (depois) depois();
    });
  }

  function recusarSolicitacao(s) {
    if (!window.confirm('Recusar o pedido de ' + s.nome + '?')) return;
    resolverSolicitacao(s.id, 'recusada');
    if (state.adminSolicitacaoId === s.id) setState({ adminSolicitacaoId: null });
  }

  // Chamado quando a Nova Liderança é salva: se veio de um pedido, ele
  // passa a aprovado.
  function concluirSolicitacaoPendente() {
    var id = state.adminSolicitacaoId;
    if (!id) return;
    setState({ adminSolicitacaoId: null });
    resolverSolicitacao(id, 'aprovada');
  }

  function irParaCadastroPublico() { setState({ isPublicCadastro: true }); loadCelulasPublicas(); }
  function voltarParaLogin() { setState({ isPublicCadastro: false, publicSalvo: false, publicError: null, showLoginForm: true }); }

  // Cadastro de Membros sem login (versão limitada): lê a view
  // members_publico (add_public_cadastro_view.sql) — só nome, célula,
  // tipo, posição e idade, nunca telefone/nascimento exato/etc.
  function loadMembersPublicos() {
    if (!sb) return;
    setState({ membersPublicosStatus: 'loading' });
    sb.from('members_publico').select('*').order('nome').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar cadastro público:', res.error.message); setState({ membersPublicosStatus: 'error' }); return; }
      setState({ membersPublicos: res.data, membersPublicosStatus: 'ok' });
    });
  }

  function submitPublico() {
    if (!sb) return;
    var f = state.publicForm;
    var nascEl = document.getElementById('pub-nasc');
    var nasc = nascEl ? nascEl.value : '';
    if (!f.nome.trim() || !f.celula || !nasc || !f.tel.trim()) {
      setState({ publicError: 'Preencha todos os campos antes de enviar.' });
      return;
    }
    setState({ publicSaving: true, publicError: null });
    var row = {
      nome: f.nome.trim(), tipo: f.tipo, celula: f.celula, nasc: nasc, tel: f.tel.trim(),
      posicao: 'Visitante', batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)',
      maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não',
      situacao_saida: 'ativo', active: true,
    };
    sb.from('members').insert(row).then(function (res) {
      if (res.error) { setState({ publicSaving: false, publicError: friendlyMemberInsertError(res.error) }); return; }
      setState({ publicSaving: false, publicSalvo: true, publicForm: Object.assign({}, publicFormDefaults) });
    });
  }

  // ---------------------------------------------------------------------
  // Membros (Supabase)
  // ---------------------------------------------------------------------
  function mapMemberRow(row) {
    return Object.assign({}, row, { idade: ageFromIso(row.nasc) });
  }

  function loadMembers() {
    if (!sb) return;
    setState({ membersStatus: 'loading' });
    sb.from('members').select('*').order('nome').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar membros:', res.error.message); setState({ membersStatus: 'error' }); return; }
      setState({ members: res.data.map(mapMemberRow), membersStatus: 'ok', lastMembersSync: new Date().toISOString() });
    });
  }

  function novoFormToRow(f) {
    var posicao = posicaoDe(f.status, f.funcao);
    return {
      nome: f.nome.trim(), tipo: f.tipo, celula: celulaObrigatoria(posicao) ? (f.celula || null) : null,
      posicao: posicao, status_pessoa: f.status, funcao: f.funcao || null,
      supervisor_id: f.supervisorId || null,
      batizado: f.batizado, encontro: f.encontro, civil: f.civil,
      nasc: f.nasc || null, tel: f.tel.trim(),
      maturidade: f.maturidade, ctl: f.ctl, seminario: f.seminario, ceifeiros: f.ceifeiros,
      situacao_saida: f.situacao, saida_detalhe: (f.saidaDetalhe || '').trim() || null,
      active: f.situacao === 'ativo',
      // Só casado tem cônjuge — mudar o estado civil desfaz o vínculo.
      conjuge_id: f.civil === 'Casado (a)' ? (f.conjugeId || null) : null,
    };
  }

  var MOVIMENTACAO_CAMPOS = ['celula', 'posicao', 'status_pessoa', 'funcao', 'batizado', 'encontro', 'situacao_saida'];

  var MOVIMENTACAO_LABELS = {
    celula: 'Célula', posicao: 'Posição', status_pessoa: 'Status', funcao: 'Função',
    batizado: 'Batismo', encontro: 'Encontro com Deus', situacao_saida: 'Situação', nota: 'Nota',
  };

  function startEditMembro(p) {
    var conjuge = p.conjuge_id ? memberById(p.conjuge_id) : null;
    setState({
      tab: 'novo', selected: null,
      novoForm: {
        nome: p.nome, tipo: p.tipo, celula: p.celula,
        status: statusDeMembro(p), funcao: funcaoDeMembro(p), supervisorId: p.supervisor_id || '',
        batizado: p.batizado, encontro: p.encontro, civil: p.civil,
        nasc: p.nasc || '', tel: p.tel || '',
        maturidade: p.maturidade, ctl: p.ctl, seminario: p.seminario, ceifeiros: p.ceifeiros,
        situacao: p.situacao_saida || 'ativo', saidaDetalhe: p.saida_detalhe || '',
        conjugeId: p.conjuge_id || '', conjugeNome: conjuge ? conjuge.nome : '', conjugeQuery: '',
      },
      novoEditId: p.id,
      novoEditOriginal: p,
      novoSalvo: false, novoError: null,
    });
  }

  function memberById(id) {
    return (state.members || []).filter(function (m) { return m.id === id; })[0] || null;
  }

  function pickConjuge(m) {
    setState(function (s) {
      var f = Object.assign({}, s.novoForm, { conjugeId: m.id, conjugeNome: m.nome, conjugeQuery: '' });
      return { novoForm: f, novoSalvo: false };
    });
  }

  function limparConjuge() {
    setState(function (s) {
      var f = Object.assign({}, s.novoForm, { conjugeId: '', conjugeNome: '', conjugeQuery: '' });
      return { novoForm: f, novoSalvo: false };
    });
  }

  // Mantém o vínculo nos dois sentidos e replica célula, posição e
  // situação pro cônjuge, mais o "Admin" (que vive em profiles e só a
  // function sincronizar_acesso_conjuge pode copiar). Quem foi
  // desvinculado fica solto (conjuge_id = null).
  function sincronizarConjuge(memberId, row, conjugeAnteriorId, done) {
    var novoId = row.conjuge_id || null;
    var tarefas = [];

    if (conjugeAnteriorId && conjugeAnteriorId !== novoId) {
      tarefas.push(function (next) {
        sb.from('members').update({ conjuge_id: null }).eq('id', conjugeAnteriorId).then(function () { next(); });
      });
    }

    if (novoId) {
      tarefas.push(function (next) {
        var anterior = memberById(novoId);
        var patch = { conjuge_id: memberId };
        CAMPOS_HERDADOS_CONJUGE.forEach(function (campo) { patch[campo] = row[campo]; });
        sb.from('members').update(patch).eq('id', novoId).then(function () {
          // Registra em Movimentações o que mudou no cônjuge por herança.
          var movs = !anterior ? [] : MOVIMENTACAO_CAMPOS
            .filter(function (campo) { return patch[campo] !== undefined && anterior[campo] !== patch[campo]; })
            .map(function (campo) {
              return { member_id: novoId, campo: campo, valor_anterior: anterior[campo], valor_novo: patch[campo] };
            });
          if (movs.length) sb.from('movimentacoes').insert(movs).then(function () { next(); });
          else next();
        });
      });

      // Espelha o "Admin" (profiles.is_admin). A function ignora quem
      // não tem acesso total, então pra um líder comum isso é um no-op.
      tarefas.push(function (next) {
        sb.rpc('sincronizar_acesso_conjuge', { p_member_id: memberId }).then(function () { next(); });
      });
    }

    var i = 0;
    var proxima = function () {
      if (i >= tarefas.length) { done(); return; }
      tarefas[i++](proxima);
    };
    proxima();
  }

  function cancelEditMembro() {
    setState({ novoEditId: null, novoEditOriginal: null, novoForm: Object.assign({}, novoFormDefaults), novoSalvo: false, novoError: null });
  }

  function submitNovoMembro() {
    var f = state.novoForm;
    if (!f.nome.trim() || !sb) return;
    // Regra da hierarquia: Anfitrião é sempre um Membro com célula
    // (o banco também barra, aqui é só pra avisar antes de enviar).
    if (f.funcao === 'Anfitrião' && f.status !== 'Membro') {
      setState({ novoError: 'Anfitrião precisa estar como Membro. Ajuste o status antes de salvar.' });
      return;
    }
    setState({ novoSaving: true, novoError: null });
    var nascEl = document.getElementById('novo-nasc');
    var row = novoFormToRow(Object.assign({}, f, { nasc: nascEl ? nascEl.value : f.nasc }));

    if (state.novoEditId) {
      var original = state.novoEditOriginal;
      sb.from('members').update(row).eq('id', state.novoEditId).select().single().then(function (res) {
        if (res.error) { setState({ novoSaving: false, novoError: friendlyMemberInsertError(res.error) }); return; }
        var movs = MOVIMENTACAO_CAMPOS.filter(function (campo) { return original[campo] !== row[campo]; })
          .map(function (campo) { return { member_id: state.novoEditId, campo: campo, valor_anterior: original[campo], valor_novo: row[campo] }; });
        var afterSave = function () {
          sincronizarConjuge(state.novoEditId, row, original.conjuge_id || null, function () {
            setState({
              novoSaving: false, novoSalvo: true, tab: 'cadastro',
              novoEditId: null, novoEditOriginal: null, novoForm: Object.assign({}, novoFormDefaults),
              selected: mapMemberRow(res.data),
            });
            loadMembers(); loadMovimentacoes();
          });
        };
        if (movs.length) sb.from('movimentacoes').insert(movs).then(function () { afterSave(); });
        else afterSave();
      });
    } else {
      sb.from('members').insert(row).select().single().then(function (res) {
        if (res.error) { setState({ novoSaving: false, novoError: friendlyMemberInsertError(res.error) }); return; }
        sincronizarConjuge(res.data.id, row, null, function () {
          setState({ novoSaving: false, novoSalvo: true, novoForm: Object.assign({}, novoFormDefaults) });
          loadMembers(); loadMovimentacoes();
        });
      });
    }
  }

  // ---------------------------------------------------------------------
  // Frequência das células (supabase/add_frequencia.sql)
  //
  // Um encontro por célula/data (celula_encontros) + a presença de cada
  // pessoa nele (presencas_celula). A presença no CULTO da semana não
  // ganha tabela nova: vai pra cultos/presencas_culto, as mesmas que a
  // tela "Presença no Culto" já usa.
  // ---------------------------------------------------------------------
  function hojeIso() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function isoMenosDias(dias) {
    var d = new Date();
    d.setDate(d.getDate() - dias);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function meuMemberId() {
    return (state.meuPerfil && state.meuPerfil.member_id) || (state.profile && state.profile.member_id) || null;
  }

  function meuUserId() {
    return (state.session && state.session.user && state.session.user.id) || null;
  }

  // Erro típico de quem ainda não rodou a migração do módulo.
  function erroFrequencia(err, fallback) {
    var msg = (err && err.message) || fallback || 'Não foi possível concluir.';
    if ((err && err.code === 'PGRST202') || /could not find the (function|table)|relation .* does not exist|schema cache/i.test(msg)) {
      return 'Falta rodar supabase/add_frequencia.sql no SQL Editor do Supabase.';
    }
    return msg;
  }

  // Célula que já vem escolhida: a do líder logado, senão a primeira que
  // ele enxerga (Pastor/admin caem na primeira da lista).
  function celulaPadraoFrequencia() {
    var minha = state.meuPerfil && state.meuPerfil.celula;
    var lista = currentCelulaList();
    if (minha && lista.indexOf(minha) >= 0) return minha;
    var comPessoas = (state.members || []).filter(function (p) { return p.celula; });
    if (!minha && comPessoas.length) {
      var doEscopo = lista.filter(function (c) { return comPessoas.some(function (p) { return p.celula === c; }); });
      if (doEscopo.length) return doEscopo[0];
    }
    return minha || lista[0] || '';
  }

  function loadFrequencia() {
    if (!sb) return;
    setState({ freqEncontrosStatus: 'loading' });
    var desde = isoMenosDias(365);
    sb.from('frequencia_encontros').select('*').gte('data', desde).order('data', { ascending: false }).then(function (res) {
      if (res.error) {
        console.warn('Erro ao carregar frequência:', res.error.message);
        setState({ freqEncontrosStatus: 'error', freqErro: erroFrequencia(res.error) });
        return;
      }
      setState({ freqEncontros: res.data || [], freqEncontrosStatus: 'ok' });
    });
    sb.from('frequencia_cultos').select('*').gte('data', desde).order('data', { ascending: false }).then(function (res) {
      if (res.error) { console.warn('Erro ao carregar cultos:', res.error.message); return; }
      setState({ freqCultos: res.data || [] });
    });
    // Histórico da planilha antiga (totais por célula/data). Não recebe
    // lançamentos novos, então carrega inteiro — são poucas linhas.
    sb.from('frequencia_planilha').select('*').order('data', { ascending: false }).then(function (res) {
      if (res.error) { console.warn('Histórico da planilha indisponível:', res.error.message); return; }
      setState({ freqPlanilha: res.data || [] });
    });
  }

  // ---- Lançamento da CÉLULA (celula_encontros + presencas_celula) ----
  function abrirEncontroFrequencia(celula, data) {
    if (!sb || !celula || !data) { setState({ freqEncontro: null, freqPresencas: {}, freqJaLancadas: {} }); return; }
    setState({ freqEncontroStatus: 'loading', freqSalvo: false, freqErro: null });
    sb.from('celula_encontros').select('*').eq('celula', celula).eq('data', data).maybeSingle().then(function (res) {
      if (res.error) { setState({ freqEncontroStatus: 'error', freqErro: erroFrequencia(res.error) }); return; }
      var enc = res.data;
      if (!enc) {
        setState({ freqEncontro: null, freqPresencas: {}, freqJaLancadas: {}, freqEncontroStatus: 'ok' });
        return;
      }
      sb.from('presencas_celula').select('member_id, presente').eq('encontro_id', enc.id).then(function (pres) {
        var mapa = {}, existentes = {};
        (pres.data || []).forEach(function (r) { mapa[r.member_id] = r.presente; existentes[r.member_id] = true; });
        setState({ freqEncontro: enc, freqPresencas: mapa, freqJaLancadas: existentes, freqEncontroStatus: 'ok' });
      });
    });
  }

  // ---- Lançamento do CULTO (cultos + presencas_culto), com data própria ----
  function abrirCultoFrequencia(data) {
    if (!sb || !data) { setState({ freqCulto: null, freqPresencasCulto: {}, freqJaLancadasCulto: {} }); return; }
    setState({ freqEncontroStatus: 'loading', freqSalvo: false, freqErro: null });
    sb.from('cultos').select('*').eq('data', data).eq('tipo', 'Culto').maybeSingle().then(function (res) {
      if (res.error) { setState({ freqEncontroStatus: 'error', freqErro: erroFrequencia(res.error) }); return; }
      var culto = res.data;
      if (!culto) {
        setState({ freqCulto: null, freqPresencasCulto: {}, freqJaLancadasCulto: {}, freqEncontroStatus: 'ok' });
        return;
      }
      sb.from('presencas_culto').select('member_id, presente').eq('culto_id', culto.id).then(function (pres) {
        var mapa = {}, existentes = {};
        (pres.data || []).forEach(function (r) { mapa[r.member_id] = r.presente; existentes[r.member_id] = true; });
        setState({ freqCulto: culto, freqPresencasCulto: mapa, freqJaLancadasCulto: existentes, freqEncontroStatus: 'ok' });
      });
    });
  }

  // Abre o lançamento certo para o modo atual (célula ou culto).
  function abrirLancamentoAtual() {
    if (state.freqModo === 'culto') abrirCultoFrequencia(state.freqCultoData);
    else abrirEncontroFrequencia(state.freqCelula, state.freqData);
  }

  // Domingo mais recente — data provável do último culto.
  function domingoAnterior() {
    var d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function setFreqModo(modo) {
    var patch = { freqModo: modo, freqSalvo: false, freqErro: null };
    if (modo === 'culto' && !state.freqCultoData) patch.freqCultoData = domingoAnterior();
    setState(patch);
    abrirLancamentoAtual();
  }

  function setFreqCelula(celula) {
    setState({ freqCelula: celula, freqSalvo: false });
    abrirLancamentoAtual();
  }

  function setFreqData(data) {
    var patch = { freqSalvo: false };
    patch[state.freqModo === 'culto' ? 'freqCultoData' : 'freqData'] = data;
    setState(patch);
    abrirLancamentoAtual();
  }

  function toggleFreqPresenca(memberId) {
    setState(function (s) {
      var chave = s.freqModo === 'culto' ? 'freqPresencasCulto' : 'freqPresencas';
      var m = Object.assign({}, s[chave]);
      m[memberId] = !m[memberId];
      var patch = { freqSalvo: false };
      patch[chave] = m;
      return patch;
    });
  }

  function marcarTodosFreq(valor, ids) {
    setState(function (s) {
      var chave = s.freqModo === 'culto' ? 'freqPresencasCulto' : 'freqPresencas';
      var m = Object.assign({}, s[chave]);
      ids.forEach(function (id) { m[id] = valor; });
      var patch = { freqSalvo: false };
      patch[chave] = m;
      return patch;
    });
  }

  // Cria o encontro da célula na primeira vez que se lança naquela data.
  function garantirEncontro(done) {
    if (state.freqEncontro) { done(state.freqEncontro); return; }
    sb.from('celula_encontros').insert({
      celula: state.freqCelula, data: state.freqData, lider_id: meuMemberId(), created_by: meuUserId(),
    }).select().single().then(function (ins) {
      if (ins.error) { setState({ freqSaving: false, freqErro: erroFrequencia(ins.error) }); return; }
      setState({ freqEncontro: ins.data });
      done(ins.data);
    });
  }

  // Idem para o culto: acha o da data escolhida, ou cria.
  function garantirCulto(done) {
    if (state.freqCulto) { done(state.freqCulto); return; }
    var data = state.freqCultoData;
    sb.from('cultos').select('*').eq('data', data).eq('tipo', 'Culto').maybeSingle().then(function (res) {
      if (res.data) { setState({ freqCulto: res.data }); done(res.data); return; }
      sb.from('cultos').insert({ data: data, tipo: 'Culto', created_by: meuUserId() }).select().single().then(function (ins) {
        if (ins.error) { setState({ freqSaving: false, freqErro: erroFrequencia(ins.error) }); return; }
        setState({ freqCulto: ins.data });
        done(ins.data);
      });
    });
  }

  function salvarFrequencia(ids) {
    if (!sb) return;
    if (state.freqModo === 'culto') { salvarFrequenciaCulto(ids); return; }
    if (!state.freqCelula || !state.freqData) { setState({ freqErro: 'Escolha a célula e a data do encontro.' }); return; }
    setState({ freqSaving: true, freqErro: null, freqSalvo: false });
    garantirEncontro(function (enc) {
      var uid = meuUserId();
      var linhas = ids.map(function (id) {
        var linha = {
          encontro_id: enc.id, member_id: id,
          presente: !!state.freqPresencas[id],
          updated_by: uid, updated_at: new Date().toISOString(),
        };
        // created_by só na primeira vez — não sobrescreve quem lançou antes.
        if (!state.freqJaLancadas[id]) linha.created_by = uid;
        return linha;
      });
      sb.from('presencas_celula').upsert(linhas, { onConflict: 'encontro_id,member_id' }).then(function (res) {
        if (res.error) { setState({ freqSaving: false, freqErro: erroFrequencia(res.error) }); return; }
        finalizarSalvarFrequencia(ids, 'freqJaLancadas');
      });
    });
  }

  function salvarFrequenciaCulto(ids) {
    if (!state.freqCultoData) { setState({ freqErro: 'Escolha a data do culto.' }); return; }
    setState({ freqSaving: true, freqErro: null, freqSalvo: false });
    garantirCulto(function (culto) {
      var uid = meuUserId();
      var linhas = ids.map(function (id) {
        var linha = { culto_id: culto.id, member_id: id, presente: !!state.freqPresencasCulto[id] };
        if (!state.freqJaLancadasCulto[id]) linha.created_by = uid;
        return linha;
      });
      sb.from('presencas_culto').upsert(linhas, { onConflict: 'culto_id,member_id' }).then(function (res) {
        if (res.error) { setState({ freqSaving: false, freqErro: erroFrequencia(res.error) }); return; }
        finalizarSalvarFrequencia(ids, 'freqJaLancadasCulto');
      });
    });
  }

  function finalizarSalvarFrequencia(ids, chave) {
    var jaLancadas = Object.assign({}, state[chave]);
    ids.forEach(function (id) { jaLancadas[id] = true; });
    var patch = { freqSaving: false, freqSalvo: true };
    patch[chave] = jaLancadas;
    setState(patch);
    loadFrequencia();
  }

  // Apaga o lançamento aberto: o encontro inteiro da célula, ou a
  // presença desta célula naquele culto. Some da tela e dos indicadores.
  function excluirLancamentoFrequencia() {
    if (!sb) return;
    var noCulto = state.freqModo === 'culto';
    var alvo = noCulto ? state.freqCulto : state.freqEncontro;
    if (!alvo) return;
    var quando = dataLabelIso(noCulto ? state.freqCultoData : state.freqData);
    var texto = noCulto
      ? 'Apagar a presença da célula ' + celulaLabel(state.freqCelula) + ' no culto de ' + quando + '?'
      : 'Apagar o lançamento da célula ' + celulaLabel(state.freqCelula) + ' em ' + quando + '?';
    if (!window.confirm(texto + ' Isso não tem volta.')) return;
    setState({ freqSaving: true, freqErro: null });

    if (!noCulto) {
      sb.from('celula_encontros').delete().eq('id', alvo.id).then(function (res) {
        if (res.error) { setState({ freqSaving: false, freqErro: erroFrequencia(res.error) }); return; }
        setState({ freqSaving: false, freqEncontro: null, freqPresencas: {}, freqJaLancadas: {}, freqSalvo: false });
        loadFrequencia();
      });
      return;
    }
    // No culto apaga só as pessoas desta célula — o culto é da igreja toda.
    var ids = (state.members || []).filter(function (p) { return p.celula === state.freqCelula; }).map(function (p) { return p.id; });
    sb.from('presencas_culto').delete().eq('culto_id', alvo.id).in('member_id', ids).then(function (res) {
      if (res.error) { setState({ freqSaving: false, freqErro: erroFrequencia(res.error) }); return; }
      setState({ freqSaving: false, freqPresencasCulto: {}, freqJaLancadasCulto: {}, freqSalvo: false });
      abrirCultoFrequencia(state.freqCultoData);
      loadFrequencia();
    });
  }

  // ---- Visitante lançado na hora, direto da tela de frequência ----
  function abrirVisitanteFrequencia() {
    setState({ freqVisitante: { nome: '', tel: '', convidadoPor: '' }, freqVisitanteErro: null, freqVisitanteDuplicado: null });
  }

  function fecharVisitanteFrequencia() {
    setState({ freqVisitante: null, freqVisitanteErro: null, freqVisitanteDuplicado: null });
  }

  function setVisitanteFrequencia(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.freqVisitante);
      f[key] = val;
      return { freqVisitante: f, freqVisitanteErro: null, freqVisitanteDuplicado: null };
    });
  }

  function normalizarNome(nome) {
    return String(nome || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function salvarVisitanteFrequencia() {
    if (!sb) return;
    var f = state.freqVisitante || {};
    var nome = (f.nome || '').trim();
    if (!nome) { setState({ freqVisitanteErro: 'Digite o nome do visitante.' }); return; }

    // Evita cadastro duplicado: se já existe alguém com esse nome no que
    // o usuário enxerga, oferece usar o cadastro que já está lá.
    var alvo = normalizarNome(nome);
    var jaExiste = (state.members || []).filter(function (p) { return normalizarNome(p.nome) === alvo; })[0];
    if (jaExiste && !f.confirmarNovo) {
      setState({ freqVisitanteDuplicado: jaExiste });
      return;
    }

    setState({ freqVisitanteSaving: true, freqVisitanteErro: null });
    sb.from('members').insert({
      nome: nome, tipo: 'Adultos', celula: state.freqCelula, posicao: 'Visitante',
      tel: (f.tel || '').trim() || null,
      convidado_por_id: f.convidadoPor || null,
      primeira_visita: state.freqData,
      batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)',
      maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não',
      situacao_saida: 'ativo', active: true, created_by: meuUserId(),
    }).select().single().then(function (res) {
      if (res.error) {
        setState({ freqVisitanteSaving: false, freqVisitanteErro: erroFrequencia(res.error, friendlyMemberInsertError(res.error)) });
        return;
      }
      var novo = mapMemberRow(res.data);
      setState(function (s) {
        var pres = Object.assign({}, s.freqPresencas);
        pres[novo.id] = true;   // quem acabou de ser lançado veio à célula
        return {
          members: s.members.concat([novo]),
          freqPresencas: pres,
          freqVisitante: null, freqVisitanteSaving: false, freqVisitanteDuplicado: null,
          freqSalvo: false,
        };
      });
    });
  }

  function usarCadastroExistenteFrequencia(member) {
    setState(function (s) {
      var pres = Object.assign({}, s.freqPresencas);
      pres[member.id] = true;
      return { freqPresencas: pres, freqVisitante: null, freqVisitanteDuplicado: null, freqSalvo: false };
    });
  }

  // ---- Histórico de uma pessoa (todas as células que ela frequentou) ----
  function loadHistoricoPessoa(memberId) {
    if (!sb || !memberId) { setState({ freqHistoricoPessoa: null, freqHistoricoPessoaId: '' }); return; }
    setState({ freqHistoricoPessoaId: memberId, freqHistoricoPessoa: 'loading' });
    sb.from('presencas_celula').select('presente, celula_encontros(celula, data)').eq('member_id', memberId).then(function (res) {
      if (res.error) { setState({ freqHistoricoPessoa: [], freqErro: erroFrequencia(res.error) }); return; }
      var linhas = (res.data || []).map(function (r) {
        return { presente: r.presente, celula: r.celula_encontros && r.celula_encontros.celula, data: r.celula_encontros && r.celula_encontros.data };
      }).filter(function (r) { return r.data; }).sort(function (a, b) { return b.data.localeCompare(a.data); });
      setState({ freqHistoricoPessoa: linhas });
    });
  }

  function setFreqPainel(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.freqPainel);
      f[key] = val;
      if (key === 'obreiro') f.discipulador = '';
      return { freqPainel: f };
    });
  }

  function setFreqTab(tab) {
    setState({ freqTab: tab, freqSalvo: false });
  }

  // ---------------------------------------------------------------------
  // Frequência por link (sem login) — index.html?frequencia=CODIGO
  //
  // Nada aqui lê ou escreve tabela direto: tudo passa pelas functions
  // frequencia_publica_*, que conferem o código e só deixam mexer na
  // célula daquele link.
  // ---------------------------------------------------------------------
  function abrirFrequenciaPublica(dataIso) {
    if (!sb) return;
    var token = state.fpToken;
    var data = dataIso || state.fpData || hojeIso();
    setState({ fpStatus: 'loading', fpErro: null, fpData: data, fpSalvo: null });
    sb.rpc('frequencia_publica_abrir', { p_token: token, p_data: data }).then(function (res) {
      if (res.error || !res.data) {
        setState({ fpStatus: 'error', fpErro: erroLinkFrequencia(res.error) });
        return;
      }
      var pessoas = res.data.pessoas || [];
      var marcados = {};
      pessoas.forEach(function (p) { if (p.presente) marcados[p.id] = true; });
      setState({
        fpStatus: 'ok', fpCelula: res.data.celula, fpPessoas: pessoas,
        fpMarcados: marcados, fpJaLancado: !!res.data.ja_lancado,
      });
    });
  }

  function erroLinkFrequencia(err) {
    var msg = (err && err.message) || 'Não foi possível abrir a frequência.';
    if (/link inv/i.test(msg)) return 'Este link não vale mais. Peça um link novo ao seu pastor ou discipulador.';
    if ((err && err.code === 'PGRST202') || /could not find the function/i.test(msg)) {
      return 'Falta rodar supabase/add_frequencia_link.sql no Supabase.';
    }
    if (/data fora do per/i.test(msg)) return 'Escolha uma data de até 90 dias atrás, e não no futuro.';
    return msg;
  }

  function toggleFrequenciaPublica(id) {
    setState(function (s) {
      var m = Object.assign({}, s.fpMarcados);
      m[id] = !m[id];
      return { fpMarcados: m, fpSalvo: null };
    });
  }

  function marcarTodosPublico(valor) {
    setState(function (s) {
      var m = {};
      if (valor) s.fpPessoas.forEach(function (p) { m[p.id] = true; });
      return { fpMarcados: m, fpSalvo: null };
    });
  }

  function salvarFrequenciaPublica() {
    if (!sb) return;
    var presentes = state.fpPessoas.filter(function (p) { return state.fpMarcados[p.id]; }).map(function (p) { return p.id; });
    setState({ fpSaving: true, fpErro: null });
    sb.rpc('frequencia_publica_salvar', { p_token: state.fpToken, p_data: state.fpData, p_presentes: presentes }).then(function (res) {
      if (res.error) { setState({ fpSaving: false, fpErro: erroLinkFrequencia(res.error) }); return; }
      setState({
        fpSaving: false, fpJaLancado: true,
        fpSalvo: { presentes: (res.data && res.data.presentes) || presentes.length, total: (res.data && res.data.total) || state.fpPessoas.length },
      });
    });
  }

  function abrirVisitantePublico() { setState({ fpVisitante: { nome: '', tel: '' }, fpErro: null }); }
  function fecharVisitantePublico() { setState({ fpVisitante: null }); }
  function setVisitantePublico(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.fpVisitante);
      f[key] = val;
      return { fpVisitante: f };
    });
  }

  function salvarVisitantePublico() {
    if (!sb) return;
    var f = state.fpVisitante || {};
    if (!(f.nome || '').trim()) { setState({ fpErro: 'Digite o nome do visitante.' }); return; }
    setState({ fpVisitanteSaving: true, fpErro: null });
    sb.rpc('frequencia_publica_visitante', {
      p_token: state.fpToken, p_nome: f.nome, p_tel: f.tel || '', p_data: state.fpData,
    }).then(function (res) {
      if (res.error) { setState({ fpVisitanteSaving: false, fpErro: erroLinkFrequencia(res.error) }); return; }
      setState(function (s) {
        var pessoas = s.fpPessoas.concat([{ id: res.data, nome: (f.nome || '').trim(), status: 'Visitante', presente: true }])
          .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
        var marcados = Object.assign({}, s.fpMarcados);
        marcados[res.data] = true;
        return { fpPessoas: pessoas, fpMarcados: marcados, fpVisitante: null, fpVisitanteSaving: false, fpSalvo: null };
      });
    });
  }

  // ---------------------------------------------------------------------
  // Oikos IA — perguntas em linguagem natural sobre os dados do Oikos.
  //
  // O app só manda a pergunta. Quem calcula os números é a Edge Function
  // oikos-ia, usando o token de quem perguntou (a RLS continua valendo),
  // e só os números agregados vão para o modelo — nunca o banco.
  // ---------------------------------------------------------------------
  var IA_SUGESTOES = [
    'Frequência das células esta semana',
    'Visitantes do mês',
    'Células com queda de frequência',
    'Crescimento de membros',
    'Pessoas sem frequência recente',
    'Células que ainda não lançaram presença',
  ];

  function setIaPergunta(v) { setState({ iaPergunta: v }); }

  function perguntarIA(texto) {
    if (!sb) return;
    var pergunta = String(texto == null ? state.iaPergunta : texto).trim();
    if (!pergunta || state.iaCarregando) return;
    setState({ iaCarregando: true, iaPergunta: '', iaErro: null });
    sb.functions.invoke('oikos-ia', { body: { pergunta: pergunta } }).then(function (res) {
      var erro = null, resposta = null;
      if (res.error) {
        erro = 'Não consegui falar com o Oikos IA. Publique a Edge Function "oikos-ia" no seu projeto Supabase (veja o README).';
        if (res.error.context && typeof res.error.context.json === 'function') {
          res.error.context.json().then(function (body) {
            registrarRespostaIA(pergunta, null, (body && body.error) || erro);
          }).catch(function () { registrarRespostaIA(pergunta, null, erro); });
          return;
        }
      } else if (res.data && res.data.error) {
        erro = res.data.error;
      } else {
        resposta = (res.data && res.data.resposta) || 'Não existem informações suficientes no Oikos para responder essa pergunta.';
      }
      registrarRespostaIA(pergunta, resposta, erro);
    });
  }

  function registrarRespostaIA(pergunta, resposta, erro) {
    setState(function (s) {
      return {
        iaCarregando: false,
        iaConversa: s.iaConversa.concat([{ pergunta: pergunta, resposta: resposta, erro: erro }]),
      };
    });
  }

  function limparConversaIA() { setState({ iaConversa: [], iaErro: null }); }

  // ---------------------------------------------------------------------
  // Movimentações (Supabase)
  // ---------------------------------------------------------------------
  function loadMovimentacoes() {
    if (!sb) return;
    setState({ movStatus: 'loading' });
    sb.from('movimentacoes').select('*, members(nome, celula)').order('data', { ascending: false }).limit(300).then(function (res) {
      if (res.error) { console.warn('Erro ao carregar movimentações:', res.error.message); setState({ movStatus: 'error' }); return; }
      setState({ movimentacoes: res.data, movStatus: 'ok' });
    });
  }

  function setMF(key, val) { setState(function (s) { var f = Object.assign({}, s.movFilters); f[key] = val; return { movFilters: f }; }); }

  function setNota(val) { setState({ novaNota: val }); }

  function registrarNota(memberId) {
    var texto = (state.novaNota || '').trim();
    if (!texto || !sb) return;
    sb.from('movimentacoes').insert({ member_id: memberId, campo: 'nota', observacao: texto }).then(function (res) {
      if (res.error) { console.warn('Erro ao registrar nota:', res.error.message); return; }
      setState({ novaNota: '' });
      loadMovimentacoes();
    });
  }

  // ---------------------------------------------------------------------
  // Share / export
  // ---------------------------------------------------------------------
  function openPrintable(html) {
    var w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function printableShell(title, subtitle, bodyHtml) {
    var tag = String.fromCharCode(60) + 'script' + String.fromCharCode(62);
    var closeTag = String.fromCharCode(60) + '/script' + String.fromCharCode(62);
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escHtml(title) + '</title>'
      + '<style>body{font-family:Arial,sans-serif;color:#14243a;margin:32px}'
      + 'h1{font-family:Georgia,serif;font-size:20px;margin:0 0 2px}'
      + '.sub{font-size:12px;color:#6b7c93;margin-bottom:18px}'
      + '.kpis{display:flex;gap:16px;margin-bottom:20px}'
      + '.kpi{border:1px solid #ddd;border-radius:8px;padding:10px 14px;flex:1}'
      + '.kpi b{display:block;font-size:20px}'
      + 'table{width:100%;border-collapse:collapse;font-size:12px}'
      + 'th{text-align:left;text-transform:uppercase;letter-spacing:.05em;font-size:10px;color:#6b7c93;border-bottom:1px solid #ddd;padding:8px 10px}'
      + 'td{padding:7px 10px;border-bottom:1px solid #eee}'
      + 'tr:nth-child(even){background:#fafbfd}</style></head><body>'
      + '<h1>' + escHtml(title) + '</h1>'
      + '<div class="sub">' + escHtml(subtitle) + '</div>'
      + bodyHtml
      + tag + 'window.onload = function(){ window.print(); };' + closeTag
      + '</body></html>';
  }

  function shareListWhatsapp(title, rows, nomeKey, nascKey) {
    var lines = ['*' + title + '*', ''];
    rows.forEach(function (r) { lines.push('• ' + r[nomeKey] + ' — ' + (r[nascKey] || '—')); });
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  // Autorizar um e-mail não envia nada pra pessoa — quem avisa é o
  // admin. Esta é a mensagem pronta pra isso.
  function textoConviteAcesso(nome, email) {
    var link = window.location.origin + window.location.pathname;
    return [
      'Oi' + (nome ? ' ' + nome.split(/\s+/)[0] : '') + '! Liberei seu acesso ao Sistema OIKOS.',
      '',
      'Para entrar:',
      '1. Abra ' + link,
      '2. Clique em *Entrar* e depois em *Continuar com Google*',
      '3. Use exatamente esta conta Google: ' + email,
      '',
      'Só esse e-mail funciona — se entrar com outro, o acesso não é reconhecido.',
    ].join('\n');
  }

  function compartilharConviteWhatsapp(nome, email) {
    window.open('https://wa.me/?text=' + encodeURIComponent(textoConviteAcesso(nome, email)), '_blank');
  }

  function copiarConvite(nome, email) {
    var texto = textoConviteAcesso(nome, email);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(function () {
        setState({ adminConviteCopiado: true });
      }, function () { window.prompt('Copie a mensagem:', texto); });
      return;
    }
    window.prompt('Copie a mensagem:', texto);
  }

  function shareMembrosWhatsapp() {
    var all = data().filter(function (p) { return p.active !== false; });
    var grupos = { 'Membro': 'Membros', 'Visitante': 'Visitantes', 'Frequentador Assíduo': 'Frequentadores' };
    var byCelula = {};
    all.forEach(function (p) {
      if (!grupos[p.posicao]) return;
      var c = byCelula[p.celula] || (byCelula[p.celula] = { Membros: [], Visitantes: [], Frequentadores: [] });
      c[grupos[p.posicao]].push(p.nome);
    });
    var lines = ['*Membros, Visitantes e Frequentadores por Célula*', ''];
    currentCelulaList().filter(function (c) { return byCelula[c]; }).forEach(function (cel) {
      var g = byCelula[cel];
      lines.push('*' + celulaLabel(cel) + '*');
      lines.push('Membros (' + g.Membros.length + '): ' + (g.Membros.join(', ') || '—'));
      lines.push('Frequentadores (' + g.Frequentadores.length + '): ' + (g.Frequentadores.join(', ') || '—'));
      lines.push('Visitantes (' + g.Visitantes.length + '): ' + (g.Visitantes.join(', ') || '—'));
      lines.push('');
    });
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  function trilhoFilterLabel(vals) {
    var tf = vals.trilhoFilters || {};
    var courseLabels = { maturidade: 'Maturidade', ctl: 'CTL', seminario: 'Seminário Pastoral', ceifeiros: 'Ceifeiros' };
    var bits = [];
    if (tf.celula) bits.push('Célula: ' + celulaLabel(tf.celula));
    if (tf.curso) bits.push('Curso: ' + (courseLabels[tf.curso] || tf.curso));
    return bits.length ? bits.join(' · ') : 'Todos os líderes/células e cursos';
  }

  function shareTrilhoWhatsapp() {
    var vals = computeVals();
    var label = trilhoFilterLabel(vals);
    var rows = vals.trilhoRows || [];
    var lines = ['*Trilho do Vencedor*', label, rows.length + ' pessoas (adultos e jovens)', ''];
    rows.slice(0, 40).forEach(function (r) { lines.push('• ' + r.nome + ' (' + r.celulaLabel + ') — ' + r.cursosLabel); });
    if (rows.length > 40) lines.push('… e mais ' + (rows.length - 40) + ' pessoas');
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  function downloadTrilhoPdf() {
    var vals = computeVals();
    var rows = vals.trilhoRows || [];
    var label = trilhoFilterLabel(vals);
    var rowsHtml = rows.map(function (r) {
      return '<tr><td>' + escHtml(r.nome) + '</td><td>' + escHtml(r.celulaLabel) + '</td><td>' + escHtml(r.cursosLabel) + '</td></tr>';
    }).join('');
    var body = '<table><thead><tr><th>Nome</th><th>Célula</th><th>Cursos concluídos</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>';
    var subtitle = label + ' · ' + rows.length + ' pessoas (adultos e jovens) · gerado em ' + new Date().toLocaleString('pt-BR');
    openPrintable(printableShell('Trilho do Vencedor', subtitle, body));
  }

  // ---------------------------------------------------------------------
  // Computed values (ported from renderVals())
  // ---------------------------------------------------------------------
  function computeVals() {
    var allPessoas = data();
    var all = allPessoas.filter(function (p) { return p.active !== false; });
    var f = state.filters;
    var q = state.q.trim().toLowerCase();

    var filtered = all.filter(function (p) {
      if (f.tipo && p.tipo !== f.tipo) return false;
      if (f.celula && p.celula !== f.celula) return false;
      if (f.posicao && p.posicao !== f.posicao) return false;
      if (f.batizado && p.batizado !== f.batizado) return false;
      if (f.encontro && p.encontro !== f.encontro) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });

    var total = filtered.length;
    var pct = function (n) { return total ? Math.round(n / total * 100) : 0; };
    var kids = contaTipo(filtered, 'Kids e Juvenis');
    var jovens = contaTipo(filtered, 'Jovens');
    var batN = filtered.filter(function (p) { return p.batizado === 'Sim'; }).length;
    var encN = filtered.filter(function (p) { return p.encontro === 'Sim'; }).length;
    var lideranca = filtered.filter(function (p) { return POSICOES_LIDERANCA.indexOf(p.posicao) >= 0; }).length;
    var potenciais = filtered.filter(function (p) { return POSICOES_POTENCIAIS.indexOf(p.posicao) >= 0; }).length;
    var pessoasRede = filtered.filter(function (p) { return POSICOES_REDE.indexOf(p.posicao) >= 0; });
    var membrosRede = pessoasRede.length;
    var batPct = pct(batN), encPct = pct(encN);

    // "Total" = todo mundo na seleção menos os visitantes; estes têm o
    // próprio quadro "Visitantes".
    var naoVisitante = filtered.filter(function (p) { return p.posicao !== 'Visitante'; });
    var visitantesFiltrados = filtered.filter(function (p) { return p.posicao === 'Visitante'; });
    var faFiltrados = filtered.filter(function (p) { return p.posicao === 'Frequentador Assíduo'; });

    var k = {
      total: naoVisitante.length,
      adultosKidsLabel: tipoResumo(naoVisitante),
      totalVisitantes: visitantesFiltrados.length,
      visitantesLabel: tipoResumo(visitantesFiltrados),
      totalFA: faFiltrados.length,
      faLabel: tipoResumo(faFiltrados),
      totalKids: kids,
      totalJovens: jovens,
      batPct: batPct, batLabel: batN + ' de ' + total + ' pessoas',
      encPct: encPct, encLabel: encN + ' de ' + total + ' pessoas',
      lideranca: lideranca, potenciais: potenciais, membrosRede: membrosRede,
      membrosRedeLabel: tipoResumo(pessoasRede),
      adultosMembros: contaTipo(pessoasRede, 'Adultos'),
      principal: totalPrincipal(contaTipo(pessoasRede, 'Adultos'), kids, faFiltrados.length),
      faltamBat: filtered.filter(function (p) { return p.batizado === 'Não'; }).length,
      faltamEnc: filtered.filter(function (p) { return p.encontro === 'Não'; }).length,
    };


    // Estado civil bars
    var civilOrder = CIVIL_ORDER;
    var civilLabels = CIVIL_LABELS;
    var civilCounts = {};
    filtered.forEach(function (p) { civilCounts[p.civil] = (civilCounts[p.civil] || 0) + 1; });
    var civilMax = Math.max(1, Object.values(civilCounts).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var civilBars = civilOrder.filter(function (c) { return civilCounts[c]; }).map(function (c) {
      return { label: civilLabels[c] || c, n: civilCounts[c], w: Math.round(civilCounts[c] / civilMax * 100) + '%' };
    });

    // Posição bars
    var posColor = posicaoColor;
    var posCounts = {};
    filtered.forEach(function (p) { posCounts[p.posicao] = (posCounts[p.posicao] || 0) + 1; });
    // Inclui qualquer valor de posição fora da lista atual (ex: registro
    // antigo ainda não migrado) em vez de escondê-lo silenciosamente —
    // assim a soma das barras nunca fica menor que o total real.
    var posExtras = Object.keys(posCounts).filter(function (p) { return posicaoOrder.indexOf(p) < 0; }).sort();
    var posOrder = posicaoOrder.concat(posExtras);
    var posMax = Math.max(1, Object.values(posCounts).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var posBars = posOrder.filter(function (p) { return posCounts[p]; }).map(function (p) {
      var active = f.posicao === p;
      return {
        label: p, n: posCounts[p], w: Math.round(posCounts[p] / posMax * 100) + '%',
        color: posColor[p] || '#94a3b8',
        bg: active ? '#eaf1fa' : 'transparent',
        weight: active ? 700 : 500,
        onClick: function () { setF('posicao', active ? '' : p); },
      };
    });

    // Célula bars
    var celStats = {};
    filtered.forEach(function (p) {
      var c = celStats[p.celula] || (celStats[p.celula] = { n: 0, bat: 0 });
      c.n++; if (p.batizado === 'Sim') c.bat++;
    });
    var celMax = Math.max(1, Object.values(celStats).map(function (c) { return c.n; }).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var celulaBars = currentCelulaList().filter(function (c) { return celStats[c]; }).map(function (c) {
      var st = celStats[c];
      var active = f.celula === c;
      return {
        label: celulaLabel(c), n: st.n,
        batPct: Math.round(st.bat / st.n * 100),
        totalW: Math.round(st.n / celMax * 100) + '%',
        batW: Math.round(st.bat / st.n * 100) + '%',
        bg: active ? '#eaf1fa' : 'transparent',
        weight: active ? 700 : 500,
        onClick: function () { setF('celula', active ? '' : c); },
      };
    });

    // Membros · FAs · Visitantes por célula (stacked)
    var perfilOrder = ['Membro', 'Frequentador Assíduo', 'Visitante'];
    var perfilLabels = { 'Membro': 'Membros', 'Frequentador Assíduo': 'Freq. Assíduos', 'Visitante': 'Visitantes' };
    var perfilColor = { 'Membro': '#1B2344', 'Frequentador Assíduo': '#149C88', 'Visitante': '#8A63C9' };
    var perfCelStats = {};
    filtered.forEach(function (p) {
      if (perfilOrder.indexOf(p.posicao) < 0) return;
      var c = perfCelStats[p.celula] || (perfCelStats[p.celula] = { total: 0, byPerfil: {} });
      c.total++; c.byPerfil[p.posicao] = (c.byPerfil[p.posicao] || 0) + 1;
    });
    var perfCelMax = Math.max(1, Object.values(perfCelStats).map(function (c) { return c.total; }).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var perfilBars = currentCelulaList().filter(function (cel) { return perfCelStats[cel]; }).map(function (cel) {
      var st = perfCelStats[cel];
      var segs = perfilOrder.filter(function (p) { return st.byPerfil[p]; }).map(function (p) {
        return {
          w: Math.round(st.byPerfil[p] / st.total * 100) + '%',
          color: perfilColor[p],
          title: st.byPerfil[p] + ' ' + perfilLabels[p],
          onClick: function () {
            setState(function (s2) {
              var newFilters = Object.assign({}, s2.filters, { celula: cel, posicao: s2.filters.posicao === p ? '' : p });
              return { filters: newFilters };
            });
          },
        };
      });
      var summary = perfilOrder.filter(function (p) { return st.byPerfil[p]; }).map(function (p) { return st.byPerfil[p] + ' ' + perfilLabels[p]; }).join(' · ');
      return { label: celulaLabel(cel), summary: summary, totalW: Math.round(st.total / perfCelMax * 100) + '%', segs: segs };
    });

    // People table
    var badge = function (v, kind) {
      if (v === 'Sim') return kind === 'bat' ? ['#dcf3ef', '#0E7A68'] : ['#e4eefa', '#2E4FC7'];
      if (v === 'Não') return ['#f1e8f7', '#6B3FA0'];
      return ['#eef2f7', '#8a99ab'];
    };
    var sort = state.sort;
    var adultosTabela = filtered.filter(function (p) { return !(p.idade != null && p.idade >= 3 && p.idade <= 12) && p.posicao !== 'Visitante'; });
    var sorted = adultosTabela.slice().sort(function (a, b) {
      if (sort.key === 'idade') return ((a.idade == null ? 999 : a.idade) - (b.idade == null ? 999 : b.idade)) * sort.dir;
      return a.nome.localeCompare(b.nome, 'pt') * sort.dir;
    });
    var nascLabel = function (iso) {
      if (!iso) return '—';
      var d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    };
    var people = sorted.map(function (p) {
      var bb = badge(p.batizado, 'bat'), eb = badge(p.encontro, 'enc');
      return {
        nome: p.nome, numeroLabel: p.numero != null ? String(p.numero) : '—', celulaLabel: celulaLabel(p.celula), posicao: p.posicao,
        batizado: p.batizado, encontro: p.encontro,
        idadeLabel: p.idade != null ? String(p.idade) : '—',
        nascLabel: nascLabel(p.nasc),
        batBg: bb[0], batFg: bb[1], encBg: eb[0], encFg: eb[1],
        onSelect: function () { setState({ selected: p }); },
      };
    });

    // Visitantes
    var visitantes = filtered
      .filter(function (p) { return p.posicao === 'Visitante'; })
      .sort(function (a, b) { return (a.idade == null ? 999 : a.idade) - (b.idade == null ? 999 : b.idade); })
      .map(function (p) {
        var bb = badge(p.batizado, 'bat'), eb = badge(p.encontro, 'enc');
        return {
          nome: p.nome, numeroLabel: p.numero != null ? String(p.numero) : '—', celulaLabel: celulaLabel(p.celula), posicao: p.posicao,
          batizado: p.batizado, encontro: p.encontro,
          idadeLabel: p.idade != null ? String(p.idade) : '—',
          nascLabel: nascLabel(p.nasc),
          batBg: bb[0], batFg: bb[1], encBg: eb[0], encFg: eb[1],
          onSelect: function () { setState({ selected: p }); },
        };
      });

    // Crianças 3-12 anos
    var kids3a12 = filtered
      .filter(function (p) { return p.idade != null && p.idade >= 3 && p.idade <= 12; })
      .sort(function (a, b) { return b.idade - a.idade; })
      .map(function (p) {
        var eb = badge(p.encontro, 'enc'), bb = badge(p.batizado, 'bat');
        return {
          nome: p.nome, numeroLabel: p.numero != null ? String(p.numero) : '—', idade: p.idade,
          celulaLabel: celulaLabel(p.celula), encontro: p.encontro, encBg: eb[0], encFg: eb[1],
          batizado: p.batizado, batBg: bb[0], batFg: bb[1], nascLabel: nascLabel(p.nasc),
          onSelect: function () { setState({ selected: p }); },
        };
      });

    // Detail
    var s = state.selected;
    var sel = null;
    if (s) {
      var initials = s.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
      var nascLabelSel = '—';
      if (s.nasc) { var d2 = new Date(s.nasc); nascLabelSel = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
      var historico = (state.movimentacoes || []).filter(function (m) { return m.member_id === s.id; }).map(function (m) {
        var campoLabel = MOVIMENTACAO_LABELS[m.campo] || m.campo;
        var desc = m.campo === 'nota' ? m.observacao : (celulaLabelOrRaw(m.campo, m.valor_anterior) + ' → ' + celulaLabelOrRaw(m.campo, m.valor_novo));
        return { data: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }), campoLabel: campoLabel, desc: desc };
      });
      sel = {
        id: s.id, nome: s.nome, posicao: s.posicao, tipo: s.tipo, initials: initials, fields: [
          { label: 'Nº de matrícula', value: s.numero != null ? String(s.numero) : '—' },
          { label: 'Célula', value: celulaLabel(s.celula) },
          { label: 'Status', value: statusDeMembro(s) },
          { label: 'Função ministerial', value: funcaoDeMembro(s) || '—' },
          { label: 'Supervisor', value: (s.supervisor_id && memberById(s.supervisor_id) ? memberById(s.supervisor_id).nome : '—') },
          { label: 'Idade', value: s.idade != null ? s.idade + ' anos' : '—' },
          { label: 'Nascimento', value: nascLabelSel },
          { label: 'Estado civil', value: s.civil },
          { label: 'Cônjuge', value: (s.conjuge_id && memberById(s.conjuge_id) ? memberById(s.conjuge_id).nome : '—') },
          { label: 'Batizado', value: s.batizado },
          { label: 'Encontro com Deus', value: s.encontro },
          { label: 'Telefone', value: s.tel || '—' },
        ],
        onEdit: function () { startEditMembro(s); },
        historico: historico,
        novaNota: state.novaNota,
        onNota: function (e) { setNota(e.target.value); },
        registrarNota: function () { registrarNota(s.id); },
      };
    }

    var syncLabelMap = {
      idle: { text: 'Carregando…', color: '#6b7c93', dot: '#c3cfde' },
      loading: { text: 'Carregando…', color: '#6b7c93', dot: '#5B8FE0' },
      ok: { text: state.lastMembersSync ? 'Atualizado ' + new Date(state.lastMembersSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Atualizado', color: '#0E7A68', dot: '#149C88' },
      error: { text: 'Erro ao carregar membros', color: '#6B3FA0', dot: '#6B3FA0' },
    };
    var sync = syncLabelMap[state.membersStatus] || syncLabelMap.idle;

    var isHome = state.tab === 'home';
    var isCadastro = state.tab === 'cadastro';
    var isFreq = state.tab === 'freq';
    var isIa = state.tab === 'ia';
    var isTrilho = state.tab === 'trilho';
    var isNovo = state.tab === 'novo';
    var isMov = state.tab === 'mov';
    var isHierarquia = state.tab === 'hierarquia';

    // ---- Acesso total (Pastor/Pastor de Rede/admin) — só reflete a UI;
    // quem garante de verdade é a RLS no Supabase. ----
    var meuMembro = (state.profile && allPessoas.filter(function (p) { return p.id === state.profile.member_id; })[0]) || null;
    var souFull = !!(state.profile && (state.profile.is_admin || (state.meuPerfil && state.meuPerfil.is_full) || (meuMembro && ['Pastor', 'Pastor de Rede'].indexOf(meuMembro.posicao) >= 0)));

    // ---- Hierarquia célula → discipulador/obreiro (só Pastor/Admin edita) ----
    // Quem responde por um discipulador pode ser um Obreiro, mas também
    // pode pular direto pra Pastor de Rede ou Pastor, dependendo do
    // tamanho da rede.
    var discipuladores = allPessoas.filter(function (p) { return p.posicao === 'Discipulador' && p.active !== false; }).map(function (p) { return { v: p.id, label: p.nome }; });
    var obreiros = allPessoas.filter(function (p) { return POSICOES_OBREIRO_OU_ACIMA.indexOf(p.posicao) >= 0 && p.active !== false; }).map(function (p) { return { v: p.id, label: p.nome + ' (' + p.posicao + ')' }; });
    var nomeMembro = function (id) { var m = id && memberById(id); return m ? m.nome : ''; };
    var hierarquiaRows = currentCelulaList().map(function (c) {
      var row = (state.celulaHierarquia || []).filter(function (h) { return h.celula === c; })[0] || {};
      return {
        celula: c, celulaLabelText: celulaLabel(c),
        pessoas: all.filter(function (p) { return p.celula === c; }).length,
        discipuladorNome: nomeMembro(row.discipulador_id), obreiroNome: nomeMembro(row.obreiro_id),
        token: row.token_frequencia || '',
        editando: !!(state.adminCelulaEdit && state.adminCelulaEdit.original === c),
        onEditar: function () { abrirEdicaoCelula({ celula: c, discipulador_id: row.discipulador_id, obreiro_id: row.obreiro_id }); },
      };
    });

    // ---- Administração: nova liderança (busca de pessoa já cadastrada + aviso de discipulador faltando) ----
    var alf = state.adminLiderForm;
    var adminLiderBusca = (alf.modo === 'existente' && alf.query.trim())
      ? allPessoas.filter(function (p) { return p.nome.toLowerCase().indexOf(alf.query.trim().toLowerCase()) >= 0; }).slice(0, 20)
      : [];
    var adminLiderCelulaInfo = (state.celulaHierarquia || []).filter(function (h) { return h.celula === alf.celula; })[0] || null;
    var adminLiderSemDiscipulador = alf.posicao === 'Líder' && !!alf.celula && (!adminLiderCelulaInfo || !adminLiderCelulaInfo.discipulador_id);

    // ---- Busca de cônjuge no formulário de cadastro (só adultos, e nunca a própria pessoa) ----
    var nf = state.novoForm;
    var conjugeQ = (nf.conjugeQuery || '').trim().toLowerCase();
    var conjugeBusca = (nf.civil === 'Casado (a)' && !nf.conjugeId && conjugeQ)
      ? allPessoas.filter(function (p) {
        return p.id !== state.novoEditId && p.tipo !== 'Kids e Juvenis' && p.nome.toLowerCase().indexOf(conjugeQ) >= 0;
      }).slice(0, 20)
      : [];

    // ---- Movimentações ----
    var mf = state.movFilters;
    var movRows = (state.movimentacoes || []).filter(function (m) {
      if (mf.celula && (!m.members || m.members.celula !== mf.celula)) return false;
      if (mf.campo && m.campo !== mf.campo) return false;
      return true;
    }).map(function (m) {
      var campoLabel = MOVIMENTACAO_LABELS[m.campo] || m.campo;
      var desc = m.campo === 'nota' ? (m.observacao || '') : (celulaLabelOrRaw(m.campo, m.valor_anterior) + ' → ' + celulaLabelOrRaw(m.campo, m.valor_novo));
      return {
        dataLabel: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        nome: (m.members && m.members.nome) || '—',
        celulaLabel: (m.members && m.members.celula) ? celulaLabel(m.members.celula) : '—',
        campo: m.campo, campoLabel: campoLabel, desc: desc,
      };
    });
    var movCelulaOptions = currentCelulaList().map(function (c) { return { v: c, label: celulaLabel(c) }; });

    // ---- Perdidos por célula (não conta transferidos) ----
    var pessoasSairam = allPessoas.filter(function (p) { return p.active === false; });
    var perdidosPorCelula = {};
    pessoasSairam.forEach(function (p) {
      if (p.situacao_saida !== 'perdido') return;
      perdidosPorCelula[p.celula] = (perdidosPorCelula[p.celula] || 0) + 1;
    });
    var perdidosRows = currentCelulaList().filter(function (c) { return perdidosPorCelula[c]; }).map(function (c) {
      return { celula: celulaLabel(c), qtd: perdidosPorCelula[c] };
    });
    var totalPerdidos = pessoasSairam.filter(function (p) { return p.situacao_saida === 'perdido'; }).length;
    var porNome = function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); };
    var linhaFora = function (p) {
      return {
        nome: p.nome, numeroLabel: p.numero != null ? String(p.numero) : '—',
        celulaLabel: celulaLabel(p.celula), posicao: p.posicao,
        situacaoLabel: SITUACAO_LABELS[p.situacao_saida] || p.situacao_saida || '—',
        detalhe: p.saida_detalhe || '—',
        onSelect: function () { setState({ selected: p }); },
      };
    };
    // Inativos ganham lista própria (dá pra abrir a ficha e editar);
    // "Fora da contagem" fica com transferidos e perdidos.
    var inativosRows = pessoasSairam.filter(function (p) { return p.situacao_saida === 'inativo'; }).sort(porNome).map(linhaFora);
    var sairamRows = pessoasSairam.filter(function (p) { return p.situacao_saida !== 'inativo'; }).sort(porNome).map(linhaFora);

    // ---- Trilho (Maturidade / CTL / Seminário Pastoral) ----
    var tf = state.trilhoFilters;
    var trilhoCourses = [
      { key: 'ceifeiros', label: 'Ceifeiros', color: '#5B8FE0' },
      { key: 'maturidade', label: 'Maturidade', color: '#149C88' },
      { key: 'ctl', label: 'CTL', color: '#3B5FDD' },
      { key: 'seminario', label: 'Seminário Pastoral', color: '#6B3FA0' },
    ];
    var trilhoPop = all.filter(function (p) {
      if (p.tipo !== 'Adultos' && p.tipo !== 'Jovens') return false;
      if (tf.celula && p.celula !== tf.celula) return false;
      if (tf.curso && p[tf.curso] !== 'Sim') return false;
      return true;
    });
    var trilhoCelulaOptions = currentCelulaList().filter(function (c) { return all.some(function (p) { return p.celula === c; }); }).map(function (c) { return { v: c, label: celulaLabel(c) }; });
    var trilhoKpis = trilhoCourses.map(function (c) {
      var done = trilhoPop.filter(function (p) { return p[c.key] === 'Sim'; }).length;
      var pctv = trilhoPop.length ? Math.round(done / trilhoPop.length * 100) : 0;
      return { label: c.label, color: c.color, done: done, total: trilhoPop.length, pct: pctv };
    });
    var trilhoCelStats = {};
    trilhoPop.forEach(function (p) {
      var c = trilhoCelStats[p.celula] || (trilhoCelStats[p.celula] = { n: 0, maturidade: 0, ctl: 0, seminario: 0, ceifeiros: 0 });
      c.n++;
      if (p.maturidade === 'Sim') c.maturidade++;
      if (p.ctl === 'Sim') c.ctl++;
      if (p.seminario === 'Sim') c.seminario++;
      if (p.ceifeiros === 'Sim') c.ceifeiros++;
    });
    var trilhoCelMax = Math.max(1, currentCelulaList().filter(function (c) { return trilhoCelStats[c]; }).map(function (cel) {
      var st = trilhoCelStats[cel];
      return st.maturidade + st.ctl + st.seminario + st.ceifeiros;
    }).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var trilhoStackedBars = currentCelulaList().filter(function (cel) { return trilhoCelStats[cel]; }).map(function (cel) {
      var st = trilhoCelStats[cel];
      var volTotal = st.maturidade + st.ctl + st.seminario + st.ceifeiros;
      var segs = trilhoCourses.filter(function (c) { return st[c.key] > 0; }).map(function (c) {
        return { w: Math.round(st[c.key] / trilhoCelMax * 100) + '%', color: c.color, title: st[c.key] + ' ' + c.label };
      });
      var summary = trilhoCourses.filter(function (c) { return st[c.key] > 0; }).map(function (c) { return st[c.key] + ' ' + c.label; }).join(' · ');
      var active = tf.celula === cel;
      return {
        label: celulaLabel(cel), n: st.n, volTotal: volTotal, summary: summary,
        totalW: Math.round(volTotal / trilhoCelMax * 100) + '%',
        segs: segs, bg: active ? '#eaf1fa' : 'transparent', weight: active ? 700 : 600,
        onClick: function () { setTF('celula', active ? '' : cel); },
      };
    });

    return {
      session: state.session,
      logout: function () { doLogout(); },
      userEmail: (state.session && state.session.user && state.session.user.email) || '',
      totalAll: all.length,
      sync: sync,
      onRefresh: function () { loadMembers(); },
      isCadastro: isCadastro,
      tabCadastroColor: isCadastro ? '#1B2344' : '#8a99ab',
      tabCadastroBorder: isCadastro ? '#1B2344' : 'transparent',
      isHome: isHome,
      goHome: function () { setState({ tab: 'home', sidebarOpen: false }); },
      isIa: isIa,
      goIa: function () { setState({ tab: 'ia', sidebarOpen: false }); },
      iaPergunta: state.iaPergunta,
      iaConversa: state.iaConversa,
      iaCarregando: state.iaCarregando,
      iaSugestoes: IA_SUGESTOES,
      onIaPergunta: function (e) { setIaPergunta(e.target.value); },
      enviarIa: function (e) { if (e && e.preventDefault) e.preventDefault(); perguntarIA(); },
      perguntarSugestao: function (texto) { return function () { perguntarIA(texto); }; },
      limparIa: function () { limparConversaIA(); },
      isFreq: isFreq,
      goFreq: function () {
        var celula = state.freqCelula || celulaPadraoFrequencia();
        setState({
          tab: 'freq', sidebarOpen: false, freqCelula: celula,
          freqData: state.freqData || hojeIso(),
          freqCultoData: state.freqCultoData || domingoAnterior(),
          freqSalvo: false, freqErro: null,
        });
        if (state.freqEncontrosStatus === 'idle') loadFrequencia();
        abrirLancamentoAtual();
      },
      goCadastro: function () { setState({ tab: 'cadastro', sidebarOpen: false }); },
      goTrilho: function () { setState({ tab: 'trilho', sidebarOpen: false }); },
      goNovo: function () {
        setState(function (s) {
          var patch = { tab: 'novo', novoSalvo: false, novoError: null, sidebarOpen: false };
          // A célula padrão do formulário pode ter sido renomeada/removida.
          var lista = currentCelulaList();
          if (!s.novoEditId && lista.length && lista.indexOf(s.novoForm.celula) < 0) {
            patch.novoForm = Object.assign({}, s.novoForm, { celula: lista[0] });
          }
          return patch;
        });
      },
      goMov: function () { setState({ tab: 'mov', sidebarOpen: false }); },
      goHierarquia: function () { setState({ tab: 'hierarquia', sidebarOpen: false }); },
      sidebarOpen: state.sidebarOpen,
      openSidebar: function () { setState({ sidebarOpen: true }); },
      closeSidebar: function () { setState({ sidebarOpen: false }); },
      isTrilho: isTrilho, isNovo: isNovo, isMov: isMov, isHierarquia: isHierarquia,
      souFull: souFull,
      tabTrilhoColor: isTrilho ? '#1B2344' : '#8a99ab',
      tabTrilhoBorder: isTrilho ? '#1B2344' : 'transparent',
      tabNovoColor: isNovo ? '#1B2344' : '#8a99ab',
      tabNovoBorder: isNovo ? '#1B2344' : 'transparent',
      tabMovColor: isMov ? '#1B2344' : '#8a99ab',
      tabMovBorder: isMov ? '#1B2344' : 'transparent',
      tabHierarquiaColor: isHierarquia ? '#1B2344' : '#8a99ab',
      tabHierarquiaBorder: isHierarquia ? '#1B2344' : 'transparent',
      hierarquiaRows: hierarquiaRows, discipuladores: discipuladores, obreiros: obreiros,
      hierarquiaStatus: state.hierarquiaStatus, hierarquiaSaving: state.hierarquiaSaving,
      adminCelulaForm: state.adminCelulaForm, adminCelulaSaving: state.adminCelulaSaving,
      adminCelulaError: state.adminCelulaError, adminCelulaSalvo: state.adminCelulaSalvo,
      onAdminCelula: function (key) { return function (e) { setAdminCelulaField(key, e.target.value); }; },
      criarCelula: function (e) { if (e && e.preventDefault) e.preventDefault(); criarCelula(); },
      adminCelulaEdit: state.adminCelulaEdit, adminCelulaEditSaving: state.adminCelulaEditSaving,
      adminCelulaEditError: state.adminCelulaEditError, adminCelulaEditSalvo: state.adminCelulaEditSalvo,
      adminCelulaEditPessoas: state.adminCelulaEdit ? all.filter(function (p) { return p.celula === state.adminCelulaEdit.original; }).length : 0,
      adminLinkSaving: state.adminLinkSaving, adminLinkCopiado: state.adminLinkCopiado,
      adminLinkToken: state.adminCelulaEdit
        ? ((state.celulaHierarquia || []).filter(function (h) { return h.celula === state.adminCelulaEdit.original; })[0] || {}).token_frequencia || ''
        : '',
      linkFrequenciaUrl: linkFrequenciaUrl,
      gerarLinkFrequencia: function () { if (state.adminCelulaEdit) gerarLinkFrequencia(state.adminCelulaEdit.original); },
      copiarLinkFrequencia: function (token) { return function () { copiarLinkFrequencia(token); }; },
      compartilharLinkFrequencia: function (token) { return function () { compartilharLinkFrequencia(state.adminCelulaEdit.original, token); }; },
      onAdminCelulaEdit: function (key) { return function (e) { setAdminCelulaEdit(key, e.target.value); }; },
      salvarEdicaoCelula: function (e) { if (e && e.preventDefault) e.preventDefault(); salvarEdicaoCelula(); },
      cancelarEdicaoCelula: function () { cancelarEdicaoCelula(); },
      adminLiderForm: alf, adminLiderSaving: state.adminLiderSaving,
      adminLiderError: state.adminLiderError, adminLiderSalvo: state.adminLiderSalvo,
      adminLiderBusca: adminLiderBusca, adminLiderSemDiscipulador: adminLiderSemDiscipulador,
      posicoesAdminLideranca: POSICOES_ADMIN_LIDERANCA.map(function (p) { return { v: p, label: p }; }),
      onAdminLider: function (key) { return function (e) { setAdminLiderField(key, e.target.value); }; },
      setAdminLiderModo: function (modo) { return function () { setAdminLiderModo(modo); }; },
      pickAdminLiderExistente: function (m) { return function () { pickAdminLiderExistente(m); }; },
      submitAdminLider: function (e) { if (e && e.preventDefault) e.preventDefault(); submitAdminLider(); },
      solicitacoes: state.solicitacoes,
      adminSolicitacaoId: state.adminSolicitacaoId,
      liberarSolicitacao: function (s) { return function () { liberarSolicitacao(s); }; },
      recusarSolicitacao: function (s) { return function () { recusarSolicitacao(s); }; },
      adminLiderConvite: state.adminLiderConvite,
      adminConviteCopiado: state.adminConviteCopiado,
      conviteTexto: state.adminLiderConvite ? textoConviteAcesso(state.adminLiderConvite.nome, state.adminLiderConvite.email) : '',
      compartilharConvite: function () { if (state.adminLiderConvite) compartilharConviteWhatsapp(state.adminLiderConvite.nome, state.adminLiderConvite.email); },
      copiarConvite: function () { if (state.adminLiderConvite) copiarConvite(state.adminLiderConvite.nome, state.adminLiderConvite.email); },
      fecharConvite: function () { setState({ adminLiderConvite: null, adminConviteCopiado: false }); },
      novoForm: state.novoForm, novoSalvo: state.novoSalvo, novoSaving: state.novoSaving, novoError: state.novoError,
      isEditingMembro: !!state.novoEditId,
      cancelEditMembro: function () { cancelEditMembro(); },
      onNF: function (key) { return function (e) { setNF(key, e.target.value); }; },
      submitNovoMembro: function () { submitNovoMembro(); },
      conjugeBusca: conjugeBusca,
      pickConjuge: function (m) { return function () { pickConjuge(m); }; },
      limparConjuge: function () { limparConjuge(); },
      celulaOptionsForm: currentCelulaList().map(function (c) { return { v: c, label: celulaLabel(c) }; }),
      // Quem pode ser supervisor: quem tem função ministerial (menos a
      // própria pessoa, que não supervisiona a si mesma).
      supervisorOptions: allPessoas.filter(function (p) {
        return p.active !== false && p.id !== state.novoEditId && FUNCOES_MINISTERIAIS.indexOf(funcaoDeMembro(p)) >= 3;
      }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); })
        .map(function (p) { return { v: p.id, label: p.nome + ' (' + funcaoDeMembro(p) + ')' }; }),
      movRows: movRows, movStatus: state.movStatus, movFilters: mf, movCelulaOptions: movCelulaOptions,
      movLista: state.movLista,
      setMovLista: function (lista) { return function () { setState({ movLista: lista }); }; },
      limparMovFiltros: function () { setState({ movFilters: { celula: '', campo: '' } }); },
      perdidosRows: perdidosRows, totalPerdidos: totalPerdidos, sairamRows: sairamRows, inativosRows: inativosRows,
      onMFCelula: function (e) { setMF('celula', e.target.value); },
      onMFCampo: function (e) { setMF('campo', e.target.value); },
      trilhoKpis: trilhoKpis, trilhoStackedBars: trilhoStackedBars, trilhoCourses: trilhoCourses,
      trilhoFilters: tf,
      trilhoCelulaOptions: trilhoCelulaOptions,
      onTCelula: function (e) { setTF('celula', e.target.value); },
      onTCurso: function (e) { setTF('curso', e.target.value); },
      clearTFilters: function () { setState({ trilhoFilters: { celula: '', curso: '' } }); },
      downloadTrilhoPdf: function () { downloadTrilhoPdf(); },
      shareTrilhoWhatsapp: function () { shareTrilhoWhatsapp(); },
      trilhoRows: trilhoPop.map(function (p) {
        var done = trilhoCourses.filter(function (c) { return p[c.key] === 'Sim'; }).map(function (c) { return c.label; });
        return { nome: p.nome, celulaLabel: celulaLabel(p.celula), cursosLabel: done.length ? done.join(', ') : '—' };
      }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); }),
      q: state.q,
      filters: f,
      k: k, civilBars: civilBars, posBars: posBars, celulaBars: celulaBars, perfilBars: perfilBars, people: people, visitantes: visitantes, kids3a12: kids3a12,
      selected: !!s, sel: sel,
      sortNomeArrow: sort.key === 'nome' ? (sort.dir === 1 ? '↑' : '↓') : '',
      sortIdadeArrow: sort.key === 'idade' ? (sort.dir === 1 ? '↑' : '↓') : '',
      onSearch: function (e) { setState({ q: e.target.value }); },
      onTipo: function (e) { setF('tipo', e.target.value); },
      onCelula: function (e) { setF('celula', e.target.value); },
      onPosicao: function (e) { setF('posicao', e.target.value); },
      onBatizado: function (e) { setF('batizado', e.target.value); },
      onEncontro: function (e) { setF('encontro', e.target.value); },
      clearFilters: function () { setState({ q: '', filters: { tipo: '', celula: '', posicao: '', batizado: '', encontro: '' } }); },
      shareMembrosWhatsapp: function () { shareMembrosWhatsapp(); },
      shareAdultosWhatsapp: function () { shareListWhatsapp('Adultos — Nome e Nascimento', people, 'nome', 'nascLabel'); },
      shareVisitantesWhatsapp: function () { shareListWhatsapp('Visitantes — Nome e Nascimento', visitantes, 'nome', 'nascLabel'); },
      shareKidsWhatsapp: function () { shareListWhatsapp('Crianças — Nome e Nascimento', kids3a12, 'nome', 'nascLabel'); },
      sortNome: function () { setState(function (st) { return { sort: { key: 'nome', dir: st.sort.key === 'nome' ? -st.sort.dir : 1 } }; }); },
      sortIdade: function () { setState(function (st) { return { sort: { key: 'idade', dir: st.sort.key === 'idade' ? -st.sort.dir : 1 } }; }); },
      closeDetail: function () { setState({ selected: null }); },
      stop: function (e) { e.stopPropagation(); },
    };
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  var callbacks = {};
  var cbSeq = 0;
  function cb(fn, ev) {
    var id = 'c' + (cbSeq++);
    callbacks[id] = fn;
    return 'data-cb="' + id + '" data-ev="' + (ev || 'click') + '"';
  }

  function opt(value, label, selected) {
    return '<option value="' + escHtml(value) + '"' + (selected ? ' selected' : '') + '>' + escHtml(label) + '</option>';
  }

  var whatsappIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#149C88" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.9 12.6 8.2 8.2 0 0 1-13-9.8A8.1 8.1 0 0 1 12 3.8Zm-3.4 4a1 1 0 0 0-.8.4c-.3.4-1 1.2-1 2.7 0 1.6 1 3.1 1.2 3.3.1.2 2 3.2 5 4.4 2.4 1 2.9.8 3.4.8.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4l-2-1c-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.8-1-2.4-.2-.6-.4-.5-.6-.5h-.4Z"/></svg>';

  var googleIcon = '<svg width="16" height="16" viewBox="0 0 48 48"><path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.8-1.5 4.6-4.4 6.4l6.7 5.2C42.2 35.2 45 30.1 45 24Z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46Z"/><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.7-4.5l-7.1-5.5C2.8 17 2 20.4 2 24s.8 7 2.3 10l7.2-5.5Z"/><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8.1 6.9 4.3 14l7.1 5.5c1.9-5.3 6.8-8.9 12.6-8.9Z"/></svg>';

  var NAV_ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"></path><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"></path>',
    cadastro: '<circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7"></path>',
    freq: '<path d="M9 11.5 11 13.5 15.5 9"></path><rect x="3" y="4.5" width="18" height="16" rx="2.5"></rect><path d="M8 2.5v4"></path><path d="M16 2.5v4"></path>',
    trilho: '<path d="M5 3v18"></path><path d="M5 4h11l-2 4 2 4H5"></path>',
    mov: '<path d="M4 7h4l3 10h6"></path><path d="M4 17h4l3-10h6"></path><path d="m17 4 3 3-3 3"></path><path d="m17 14 3 3-3 3"></path>',
    novo: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path>',
    ia: '<path d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.6 10.4 11.2 6 9.6 10.4 8 12 3.5Z"></path><path d="M18 15.5 18.8 18l2.2.8-2.2.8-.8 2.4-.8-2.4-2.2-.8 2.2-.8.8-2.5Z"></path><path d="M5.5 14 6 16l2 .7-2 .7-.5 2-.5-2-2-.7 2-.7.5-2Z"></path>',
    hierarquia: '<circle cx="12" cy="4.5" r="2"></circle><circle cx="5" cy="18" r="2"></circle><circle cx="19" cy="18" r="2"></circle><path d="M12 6.5v4"></path><path d="M12 10.5 6 16"></path><path d="M12 10.5 18 16"></path>',
  };

  function navIcon(key) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto">' + NAV_ICONS[key] + '</svg>';
  }

  var lockIcon = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto;opacity:.7"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

  function sideNavItem(iconKey, label, active, onClick, locked) {
    var bg = active ? 'rgba(255,255,255,.14)' : 'transparent';
    var color = locked ? 'rgba(255,255,255,.4)' : (active ? '#fff' : 'rgba(255,255,255,.7)');
    var borderColor = active ? '#149C88' : 'transparent';
    return '<button ' + cb(onClick) + (locked ? ' title="Faça login para acessar"' : '') + ' style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:10px 12px;border:none;border-left:3px solid ' + borderColor + ';border-radius:0 9px 9px 0;background:' + bg + ';color:' + color + ';font-size:13.5px;font-weight:600;cursor:pointer">' +
      navIcon(iconKey) + '<span style="flex:1">' + escHtml(label) + '</span>' + (locked ? lockIcon : '') + '</button>';
  }

  function sidebarHtml(vals) {
    var items = vals.anonMode
      ? [
        { icon: 'home', label: 'Início', active: false, onClick: vals.pedirLogin, show: true, locked: true },
        { icon: 'cadastro', label: 'Cadastro de Membros', active: true, onClick: function () {}, show: true, locked: false },
        { icon: 'freq', label: 'Frequência', active: false, onClick: vals.pedirLogin, show: true, locked: true },
        { icon: 'trilho', label: 'Trilho do Vencedor', active: false, onClick: vals.pedirLogin, show: true, locked: true },
        { icon: 'mov', label: 'Movimentações', active: false, onClick: vals.pedirLogin, show: true, locked: true },
        { icon: 'novo', label: '+ Novo Cadastro', active: false, onClick: vals.pedirLogin, show: true, locked: true },
      ]
      : [
        { icon: 'home', label: 'Início', active: vals.isHome, onClick: vals.goHome, show: true },
        { icon: 'cadastro', label: 'Cadastro de Membros', active: vals.isCadastro, onClick: vals.goCadastro, show: true },
        { icon: 'freq', label: 'Frequência', active: vals.isFreq, onClick: vals.goFreq, show: true },
        { icon: 'trilho', label: 'Trilho do Vencedor', active: vals.isTrilho, onClick: vals.goTrilho, show: true },
        { icon: 'mov', label: 'Movimentações', active: vals.isMov, onClick: vals.goMov, show: true },
        { icon: 'ia', label: 'Oikos IA', active: vals.isIa, onClick: vals.goIa, show: vals.souFull },
        { icon: 'novo', label: '+ Novo Cadastro', active: vals.isNovo, onClick: vals.goNovo, show: true },
        { icon: 'hierarquia', label: 'Administração', active: vals.isHierarquia, onClick: vals.goHierarquia, show: vals.souFull },
      ];
    var footer = vals.anonMode
      ? '<div style="display:flex;align-items:baseline;gap:8px;padding:4px 2px 0">' +
        '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:22px;color:#fff;line-height:1">' + vals.totalAll + '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.62);font-weight:500">pessoas cadastradas</div>' +
        '</div>' +
        '<button ' + cb(vals.pedirLogin) + ' style="margin-top:12px;width:100%;padding:9px 12px;border:none;border-radius:9px;background:#149C88;color:#fff;font-size:13px;font-weight:700;cursor:pointer">Entrar</button>' +
        '<button ' + cb(vals.irParaCadastroPublico) + ' style="margin-top:10px;width:100%;padding:0;border:none;background:none;color:rgba(255,255,255,.62);font-size:11.5px;font-weight:600;cursor:pointer">Sou visitante, quero me cadastrar</button>'
      : '<button ' + cb(vals.onRefresh) + ' title="Sincronizar agora com a planilha" style="display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);border-radius:20px;padding:7px 12px;cursor:pointer;width:100%">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:' + vals.sync.dot + '"></span>' +
        '<span style="font-size:11.5px;color:#fff;font-weight:600">' + escHtml(vals.sync.text) + '</span>' +
        '</button>' +
        '<div style="display:flex;align-items:baseline;gap:8px;padding:12px 2px 0">' +
        '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:22px;color:#fff;line-height:1">' + vals.totalAll + '</div>' +
        '<div style="font-size:11px;color:rgba(255,255,255,.62);font-weight:500">pessoas cadastradas</div>' +
        '</div>' +
        '<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.14)">' +
        '<div style="font-size:12px;color:#fff;font-weight:600;overflow-wrap:anywhere">' + escHtml(vals.userEmail) + '</div>' +
        '<button ' + cb(vals.logout) + ' style="border:none;background:none;padding:0;color:#8fd6c6;font-size:11.5px;font-weight:600;cursor:pointer;margin-top:3px">Sair</button>' +
        '</div>';
    return '' +
      '<aside class="sidebar' + (vals.sidebarOpen ? ' sidebar-open' : '') + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:36px;width:auto">' +
      '<button ' + cb(vals.closeSidebar) + ' class="sidebar-close-btn" style="border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;line-height:1">✕</button>' +
      '</div>' +
      '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.14)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:21px;color:#fff;line-height:1.25;letter-spacing:.01em">Sistema OIKOS</div>' +
      '<div style="font-size:11px;color:rgba(255,255,255,.55);font-weight:600;margin-top:2px">Videira SCS</div>' +
      '</div>' +
      '<nav style="display:flex;flex-direction:column;gap:3px;margin-top:22px">' +
      items.filter(function (it) { return it.show; }).map(function (it) { return sideNavItem(it.icon, it.label, it.active, it.onClick, it.locked); }).join('') +
      '</nav>' +
      '<div style="margin-top:auto;padding-top:18px">' +
      footer +
      '</div>' +
      '</aside>' +
      '<div class="sidebar-backdrop' + (vals.sidebarOpen ? ' show' : '') + '" ' + cb(vals.closeSidebar) + '></div>';
  }

  function mobileTopbarHtml(vals) {
    return '<div class="mobile-topbar">' +
      '<button ' + cb(vals.openSidebar) + ' style="border:none;background:#eef2f7;width:36px;height:36px;border-radius:9px;cursor:pointer;color:#1B2344;font-size:17px;line-height:1">☰</button>' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:15px;color:#1B2344">Sistema OIKOS</div>' +
      '</div>';
  }

  // Mesmo cartão dos indicadores do Início (home-card / home-kpi).
  function kpiCard(label, value, sub, opts) {
    opts = opts || {};
    var cor = !opts.gradient && opts.valueColor ? ' style="color:' + opts.valueColor + '"' : '';
    return '<div class="home-card home-kpi ui-kpi' + (opts.gradient ? ' home-kpi-destaque' : '') + '">' +
      '<div class="ui-kpi-label">' + escHtml(label) + '</div>' +
      '<div class="home-kpi-value"' + cor + '>' + value + (opts.pct ? '<span class="ui-kpi-pct">%</span>' : '') + '</div>' +
      (sub ? '<div class="home-kpi-sub">' + escHtml(sub) + '</div>' : '') +
      '</div>';
  }

  function cadastroHtml(vals) {
    var html = '<div>';

    // Filter bar
    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<div style="position:relative;flex:1;min-width:230px">' +
      '<svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4-4"></path></svg>' +
      '<input type="text" id="search-input" placeholder="Buscar por nome…" value="' + escHtml(vals.q) + '" ' + cb(vals.onSearch, 'input') + ' style="width:100%;padding:10px 12px 10px 36px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:14px;color:#14243a;outline:none">' +
      '</div>' +
      '<select ' + cb(vals.onTipo, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      tipoFilterOptions(vals.filters.tipo) +
      '</select>' +
      '<select ' + cb(vals.onCelula, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as células', vals.filters.celula === '') +
      vals.celulaOptionsForm.map(function (o) { return opt(o.v, o.label, vals.filters.celula === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onPosicao, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as posições', vals.filters.posicao === '') +
      posicaoOptions().map(function (o) { return opt(o.v, o.label, vals.filters.posicao === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onBatizado, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Batismo: todos', vals.filters.batizado === '') + opt('Sim', 'Batizado: Sim', vals.filters.batizado === 'Sim') + opt('Não', 'Batizado: Não', vals.filters.batizado === 'Não') +
      '</select>' +
      '<select ' + cb(vals.onEncontro, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Encontro: todos', vals.filters.encontro === '') + opt('Sim', 'Encontro: Sim', vals.filters.encontro === 'Sim') + opt('Não', 'Encontro: Não', vals.filters.encontro === 'Não') +
      '</select>' +
      '<button ' + cb(vals.clearFilters) + ' style="padding:10px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#6b7c93;font-weight:600;cursor:pointer">Limpar</button>' +
      '<button ' + cb(vals.shareMembrosWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:10px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' Enviar via WhatsApp</button>' +
      '</div>';

    // KPI row
    html += '<div class="home-kpis" style="margin:0 0 16px">' +
      homeKpi('rede', vals.k.principal.valor, 'Total de Membros - Adultos e Kids', vals.k.principal.sub) +
      homeKpi('adultos', vals.k.adultosMembros, 'Total de Adultos', 'membros adultos') +
      homeKpi('fa', vals.k.totalFA, 'Frequentadores Assíduos', vals.k.faLabel) +
      homeKpi('visit', vals.k.totalVisitantes, 'Visitantes', vals.k.visitantesLabel) +
      homeKpi('jovens', vals.k.totalJovens, 'Jovens', 'jovens na seleção') +
      homeKpi('kids', vals.k.totalKids, 'Kids e Juvenis', 'Kids e Juvenis na seleção') +
      '</div>';

    // Charts grid
    html += '<div class="grid-2a" style="margin-bottom:16px">' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">Jornada espiritual</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Batismo e Encontro com Deus na seleção atual</div>' +
      '<div class="home-rings">' +
      homeRing(vals.k.batPct, '#149C88', 'Batizados', '<b style="color:#6B3FA0">' + vals.k.faltamBat + '</b> ainda não batizados') +
      homeRing(vals.k.encPct, '#3B5FDD', 'Encontro', '<b style="color:#6B3FA0">' + vals.k.faltamEnc + '</b> ainda não fizeram') +
      '</div></div>' +

      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">Estado civil</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Distribuição da seleção</div>' +
      '<div style="display:flex;flex-direction:column;gap:11px">' +
      vals.civilBars.map(function (b) {
        return '<div style="display:grid;grid-template-columns:96px 1fr 34px;align-items:center;gap:10px">' +
          '<div style="font-size:12.5px;color:#334">' + escHtml(b.label) + '</div>' +
          '<div style="height:16px;background:#eef2f7;border-radius:5px;overflow:hidden"><div style="height:100%;width:' + b.w + ';background:linear-gradient(90deg,#3B5FDD,#5B8FE0);border-radius:5px"></div></div>' +
          '<div style="font-size:12.5px;font-weight:600;color:#1B2344;text-align:right">' + b.n + '</div></div>';
      }).join('') +
      '</div></div></div>';

    // Posição + Células
    html += '<div class="grid-2b" style="margin-bottom:16px">' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">Composição por posição</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Clique para filtrar</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      vals.posBars.map(function (b) {
        return '<div ' + cb(b.onClick) + ' style="display:grid;grid-template-columns:132px 1fr 30px;align-items:center;gap:10px;cursor:pointer;padding:3px 4px;border-radius:7px;background:' + b.bg + '">' +
          '<div style="font-size:12.5px;color:#334;font-weight:' + b.weight + '">' + escHtml(b.label) + '</div>' +
          '<div style="height:16px;background:#eef2f7;border-radius:5px;overflow:hidden"><div style="height:100%;width:' + b.w + ';background:' + b.color + ';border-radius:5px"></div></div>' +
          '<div style="font-size:12.5px;font-weight:600;color:#1B2344;text-align:right">' + b.n + '</div></div>';
      }).join('') +
      '</div></div>' +

      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Comparativo de células</div>' +
      '<div style="font-size:11px;color:#6b7c93;display:flex;gap:12px"><span><b style="color:#149C88">■</b> batizados</span><span><b style="color:#c9d4e2">■</b> a batizar</span></div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Tamanho e % de batizados · clique para filtrar</div>' +
      '<div style="display:flex;flex-direction:column;gap:13px">' +
      vals.celulaBars.map(function (c) {
        return '<div ' + cb(c.onClick) + ' style="cursor:pointer;padding:4px 5px;border-radius:8px;background:' + c.bg + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">' +
          '<div style="font-size:13px;color:#14243a;font-weight:' + c.weight + '">' + escHtml(c.label) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93"><b style="color:#1B2344">' + c.n + '</b> pessoas · ' + c.batPct + '% batiz.</div>' +
          '</div>' +
          '<div style="height:20px;background:#eef2f7;border-radius:6px;overflow:hidden;display:flex;width:' + c.totalW + '">' +
          '<div style="height:100%;width:' + c.batW + ';background:linear-gradient(90deg,#0E7A68,#149C88)"></div>' +
          '<div style="height:100%;flex:1;background:#c9d4e2"></div>' +
          '</div></div>';
      }).join('') +
      '</div></div></div>';

    // Membros · FAs · Visitantes por célula
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04);margin-bottom:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Membros · Frequentadores · Visitantes por célula</div>' +
      '<div style="font-size:11px;color:#6b7c93;display:flex;gap:14px"><span><b style="color:#1B2344">■</b> Membros</span><span><b style="color:#149C88">■</b> Freq. Assíduos</span><span><b style="color:#8A63C9">■</b> Visitantes</span></div>' +
      '</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Composição de cada célula por perfil · clique num segmento para filtrar</div>' +
      '<div style="display:flex;flex-direction:column;gap:13px">' +
      vals.perfilBars.map(function (c) {
        return '<div style="padding:2px 5px">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">' +
          '<div style="font-size:13px;color:#14243a;font-weight:600">' + escHtml(c.label) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93">' + escHtml(c.summary) + '</div></div>' +
          '<div style="height:20px;background:#eef2f7;border-radius:6px;overflow:hidden;display:flex;width:' + c.totalW + '">' +
          c.segs.map(function (s) {
            return '<div ' + cb(s.onClick) + ' title="' + escHtml(s.title) + '" style="height:100%;width:' + s.w + ';background:' + s.color + ';cursor:pointer"></div>';
          }).join('') +
          '</div></div>';
      }).join('') +
      '</div></div>';

    // People table
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Adultos <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.people.length + ' na seleção</span></div>' +
      '<button ' + cb(vals.shareAdultosWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' WhatsApp</button>' +
      '<div style="font-size:12px;color:#6b7c93">Clique numa linha para ver a ficha</div></div>' +
      '<div class="table-scroll" style="max-height:440px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nº</th>' +
      '<th ' + cb(vals.sortNome) + ' style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;cursor:pointer;border-bottom:1px solid #e2e9f2">Nome ' + vals.sortNomeArrow + '</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Posição</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Batismo</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Encontro</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nascimento</th>' +
      '<th ' + cb(vals.sortIdade) + ' style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;cursor:pointer;border-bottom:1px solid #e2e9f2">Idade ' + vals.sortIdadeArrow + '</th>' +
      '</tr></thead><tbody>' +
      vals.people.map(function (p) { return personRow(p); }).join('') +
      '</tbody></table></div></div>';

    // Visitantes table
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-top:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Visitantes <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.visitantes.length + ' na seleção</span></div>' +
      '<button ' + cb(vals.shareVisitantesWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' WhatsApp</button>' +
      '<div style="font-size:12px;color:#6b7c93">Clique numa linha para ver a ficha</div></div>' +
      '<div class="table-scroll" style="max-height:340px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nº</th>' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Posição</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Batismo</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Encontro</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nascimento</th>' +
      '<th style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Idade</th>' +
      '</tr></thead><tbody>' +
      vals.visitantes.map(function (p) { return personRow(p); }).join('') +
      '</tbody></table></div></div>';

    // Crianças 3-12
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-top:16px">' +
      '<div style="padding:18px 22px 14px"><div style="display:flex;align-items:baseline">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Crianças e pré-adolescentes <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· 3 a 12 anos · ' + vals.kids3a12.length + ' pessoas</span></div>' +
      '<button ' + cb(vals.shareKidsWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer;margin-left:auto">' + whatsappIcon + ' WhatsApp</button>' +
      '<div style="font-size:12px;color:#6b7c93;margin-left:16px">Clique numa linha para ver a ficha</div>' +
      '</div></div>' +
      '<div class="table-scroll" style="max-height:340px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:right;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nº</th>' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Batismo</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Encontro</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nascimento</th>' +
      '<th style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Idade</th>' +
      '</tr></thead><tbody>' +
      vals.kids3a12.map(function (k) {
        return '<tr ' + cb(k.onSelect) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 12px;text-align:right;color:#8a99ab;font-variant-numeric:tabular-nums">' + escHtml(k.numeroLabel) + '</td>' +
          '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(k.nome) + '</td>' +
          '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(k.celulaLabel) + '</td>' +
          '<td style="padding:11px 12px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:' + k.batBg + ';color:' + k.batFg + '">' + escHtml(k.batizado) + '</span></td>' +
          '<td style="padding:11px 12px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:' + k.encBg + ';color:' + k.encFg + '">' + escHtml(k.encontro) + '</span></td>' +
          '<td style="padding:11px 12px;text-align:center;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(k.nascLabel) + '</td>' +
          '<td style="padding:11px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + k.idade + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    if (vals.selected) html += detailDrawerHtml(vals);

    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------
  // Cadastro de Membros sem login (versão limitada) — lê members_publico
  // (só nome, célula, tipo, posição, idade), nunca a tabela members.
  // ---------------------------------------------------------------------
  function anonCadastroVals() {
    var all = state.membersPublicos || [];
    var f = state.anonFilters;
    var q = (f.q || '').trim().toLowerCase();
    var filtered = all.filter(function (p) {
      if (f.tipo && p.tipo !== f.tipo) return false;
      if (f.celula && p.celula !== f.celula) return false;
      if (f.posicao && p.posicao !== f.posicao) return false;
      if (q && !p.nome.toLowerCase().includes(q)) return false;
      return true;
    });

    var pessoasRede = filtered.filter(function (p) { return POSICOES_REDE.indexOf(p.posicao) >= 0; });
    var membrosRede = pessoasRede.length;
    var totalFA = filtered.filter(function (p) { return p.posicao === 'Frequentador Assíduo'; }).length;
    var totalVisitantes = filtered.filter(function (p) { return p.posicao === 'Visitante'; }).length;
    var totalKids = filtered.filter(function (p) { return p.idade != null && p.idade >= 3 && p.idade <= 12; }).length;
    var totalJovens = contaTipo(filtered, 'Jovens');

    var posCounts = {};
    filtered.forEach(function (p) { posCounts[p.posicao] = (posCounts[p.posicao] || 0) + 1; });
    var posExtras = Object.keys(posCounts).filter(function (p) { return posicaoOrder.indexOf(p) < 0; }).sort();
    var posMax = Math.max(1, Object.values(posCounts).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var posBars = posicaoOrder.concat(posExtras).filter(function (p) { return posCounts[p]; }).map(function (p) {
      var active = f.posicao === p;
      return {
        label: p, n: posCounts[p], w: Math.round(posCounts[p] / posMax * 100) + '%',
        color: posicaoColor[p] || '#94a3b8', bg: active ? '#eaf1fa' : 'transparent', weight: active ? 700 : 500,
        onClick: function () { setAnonF('posicao', active ? '' : p); },
      };
    });

    var perfilOrder = ['Membro', 'Frequentador Assíduo', 'Visitante'];
    var perfilLabels = { 'Membro': 'Membros', 'Frequentador Assíduo': 'Freq. Assíduos', 'Visitante': 'Visitantes' };
    var perfilColor = { 'Membro': '#1B2344', 'Frequentador Assíduo': '#149C88', 'Visitante': '#8A63C9' };
    var perfCelStats = {};
    filtered.forEach(function (p) {
      if (perfilOrder.indexOf(p.posicao) < 0) return;
      var c = perfCelStats[p.celula] || (perfCelStats[p.celula] = { total: 0, byPerfil: {} });
      c.total++; c.byPerfil[p.posicao] = (c.byPerfil[p.posicao] || 0) + 1;
    });
    var perfCelMax = Math.max(1, Object.values(perfCelStats).map(function (c) { return c.total; }).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var celulaListPublica = (state.celulasPublicas && state.celulasPublicas.length) ? state.celulasPublicas : celOrder;
    var perfilBars = celulaListPublica.filter(function (cel) { return perfCelStats[cel]; }).map(function (cel) {
      var st = perfCelStats[cel];
      var segs = perfilOrder.filter(function (p) { return st.byPerfil[p]; }).map(function (p) {
        return { w: Math.round(st.byPerfil[p] / st.total * 100) + '%', color: perfilColor[p], title: st.byPerfil[p] + ' ' + perfilLabels[p] };
      });
      var summary = perfilOrder.filter(function (p) { return st.byPerfil[p]; }).map(function (p) { return st.byPerfil[p] + ' ' + perfilLabels[p]; }).join(' · ');
      return { label: celulaLabel(cel), summary: summary, totalW: Math.round(st.total / perfCelMax * 100) + '%', segs: segs };
    });

    var sorted = filtered.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
    var rows = sorted.map(function (p) {
      return { nome: p.nome, celulaLabel: celulaLabel(p.celula), posicao: p.posicao, idadeLabel: p.idade != null ? String(p.idade) : '—' };
    });

    return {
      q: f.q, filters: f,
      onSearch: function (e) { setAnonF('q', e.target.value); },
      onTipo: function (e) { setAnonF('tipo', e.target.value); },
      onCelula: function (e) { setAnonF('celula', e.target.value); },
      onPosicao: function (e) { setAnonF('posicao', e.target.value); },
      celulaOptions: celulaListPublica.map(function (c) { return { v: c, label: celulaLabel(c) }; }),
      membrosRede: membrosRede, membrosRedeLabel: tipoResumo(pessoasRede),
      adultosMembros: contaTipo(pessoasRede, 'Adultos'),
      principal: totalPrincipal(contaTipo(pessoasRede, 'Adultos'), totalKids, totalFA),
      totalFA: totalFA, totalVisitantes: totalVisitantes, totalKids: totalKids, totalJovens: totalJovens,
      posBars: posBars, perfilBars: perfilBars, rows: rows,
      loading: state.membersPublicosStatus === 'loading' && !all.length,
    };
  }

  function anonCadastroHtml(vals) {
    var html = '<div>';
    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<div style="position:relative;flex:1;min-width:230px">' +
      '<svg style="position:absolute;left:12px;top:50%;transform:translateY(-50%)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4-4"></path></svg>' +
      '<input type="text" placeholder="Buscar por nome…" value="' + escHtml(vals.q) + '" ' + cb(vals.onSearch, 'input') + ' style="width:100%;padding:10px 12px 10px 36px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:14px;color:#14243a;outline:none">' +
      '</div>' +
      '<select ' + cb(vals.onTipo, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      tipoFilterOptions(vals.filters.tipo) +
      '</select>' +
      '<select ' + cb(vals.onCelula, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as células', vals.filters.celula === '') +
      vals.celulaOptions.map(function (o) { return opt(o.v, o.label, vals.filters.celula === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onPosicao, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as posições', vals.filters.posicao === '') +
      posicaoOptions().map(function (o) { return opt(o.v, o.label, vals.filters.posicao === o.v); }).join('') +
      '</select>' +
      '</div>';

    html += '<div class="home-kpis" style="margin:0 0 16px">' +
      homeKpi('rede', vals.principal.valor, 'Total de Membros - Adultos e Kids', vals.principal.sub) +
      homeKpi('adultos', vals.adultosMembros, 'Total de Adultos', 'membros adultos') +
      homeKpi('fa', vals.totalFA, 'Frequentadores Assíduos', 'na seleção') +
      homeKpi('visit', vals.totalVisitantes, 'Visitantes', 'na seleção') +
      homeKpi('jovens', vals.totalJovens, 'Jovens', 'jovens na seleção') +
      homeKpi('kids', vals.totalKids, 'Kids e Juvenis', 'Kids e Juvenis na seleção') +
      '</div>';

    html += '<div class="grid-2b" style="margin-bottom:16px">' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">Composição por posição</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Clique para filtrar</div>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      vals.posBars.map(function (b) {
        return '<div ' + cb(b.onClick) + ' style="display:grid;grid-template-columns:132px 1fr 30px;align-items:center;gap:10px;cursor:pointer;padding:3px 4px;border-radius:7px;background:' + b.bg + '">' +
          '<div style="font-size:12.5px;color:#334;font-weight:' + b.weight + '">' + escHtml(b.label) + '</div>' +
          '<div style="height:16px;background:#eef2f7;border-radius:5px;overflow:hidden"><div style="height:100%;width:' + b.w + ';background:' + b.color + ';border-radius:5px"></div></div>' +
          '<div style="font-size:12.5px;font-weight:600;color:#1B2344;text-align:right">' + b.n + '</div></div>';
      }).join('') +
      (vals.posBars.length ? '' : '<div style="font-size:12.5px;color:#8a99ab">Nada na seleção atual.</div>') +
      '</div></div>' +

      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Membros · Frequentadores · Visitantes por célula</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Composição de cada célula por perfil</div>' +
      '<div style="display:flex;flex-direction:column;gap:13px">' +
      vals.perfilBars.map(function (c) {
        return '<div style="padding:2px 5px">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">' +
          '<div style="font-size:13px;color:#14243a;font-weight:600">' + escHtml(c.label) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93">' + escHtml(c.summary) + '</div></div>' +
          '<div style="height:20px;background:#eef2f7;border-radius:6px;overflow:hidden;display:flex;width:' + c.totalW + '">' +
          c.segs.map(function (s) { return '<div title="' + escHtml(s.title) + '" style="height:100%;width:' + s.w + ';background:' + s.color + '"></div>'; }).join('') +
          '</div></div>';
      }).join('') +
      (vals.perfilBars.length ? '' : '<div style="font-size:12.5px;color:#8a99ab">Nada na seleção atual.</div>') +
      '</div></div></div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Pessoas <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.rows.length + ' na seleção</span></div>' +
      '<div style="font-size:12px;color:#6b7c93">Faça login para ver mais detalhes (telefone, nascimento, histórico)</div></div>' +
      '<div class="table-scroll" style="max-height:520px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Posição</th>' +
      '<th style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Idade</th>' +
      '</tr></thead><tbody>' +
      vals.rows.map(function (p) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(p.nome) + '</td>' +
          '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(p.celulaLabel) + '</td>' +
          '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(p.posicao) + '</td>' +
          '<td style="padding:11px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(p.idadeLabel) + '</td></tr>';
      }).join('') +
      (vals.rows.length ? '' : '<tr><td colspan="4" style="padding:20px 22px;color:#8a99ab;font-size:12.5px">' + (vals.loading ? 'Carregando…' : 'Nada na seleção atual.') + '</td></tr>') +
      '</tbody></table></div></div>';

    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------
  // Início — resumo da rede de quem está logado. Pastor/Admin veem tudo e
  // podem recortar por Obreiro e Discipulador; os demais veem só as
  // células sob a responsabilidade deles. Quem garante o limite de
  // verdade é a RLS (pode_ver_celula); aqui só decide o recorte e os
  // títulos da tela.
  // ---------------------------------------------------------------------
  function setHomeFiltro(key, val) {
    setState(function (s) {
      var f = Object.assign({}, s.homeFilters);
      f[key] = val;
      // Outro obreiro pode não ter o discipulador que estava escolhido.
      if (key === 'obreiro') f.discipulador = '';
      return { homeFilters: f };
    });
  }

  function abrirCadastroDaCelula(celula) {
    setState({ tab: 'cadastro', q: '', filters: { tipo: '', celula: celula || '', posicao: '', batizado: '', encontro: '' }, sidebarOpen: false });
  }

  function homeVals(vals) {
    var todos = data();
    var ativos = todos.filter(function (p) { return p.active !== false; });
    var hier = state.celulaHierarquia || [];
    var hf = state.homeFilters;
    // A própria linha em `members` pode não vir (RLS), então meu_perfil()
    // é a fonte da posição/célula; `members` só completa se estiver lá.
    var mp = state.meuPerfil;
    var meuRow = (state.profile && memberById(state.profile.member_id)) || null;
    var meu = mp
      ? { id: mp.member_id, posicao: mp.posicao, celula: mp.celula, nome: (meuRow && meuRow.nome) || state.meuNome }
      : meuRow;
    var primeiroNome = function (nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; };
    var nomeDe = function (id) { var m = memberById(id); return m ? m.nome : ''; };
    var pct = function (n, d) { return d ? Math.round(n / d * 100) : 0; };
    // Casal divide a mesma rede (add_rede_conjuge.sql): filtrar pela Simone
    // mostra as células em que o André é o discipulador, e vice-versa.
    var mesmoCasal = function (idNaCelula, idFiltro) {
      if (!idNaCelula || !idFiltro) return false;
      if (idNaCelula === idFiltro) return true;
      var m = memberById(idFiltro);
      return !!(m && m.conjuge_id === idNaCelula);
    };
    var nomeCasal = function (id) {
      var m = memberById(id);
      if (!m) return '';
      var c = m.conjuge_id && memberById(m.conjuge_id);
      return c ? primeiroNome(m.nome) + ' & ' + primeiroNome(c.nome) : m.nome;
    };

    // Recorte: null = toda a rede; lista = só essas células.
    var celulas = null;
    var escopoTitulo = 'Toda a rede', escopoSub = 'Visão geral de todas as células';
    if (vals.souFull) {
      if (hf.obreiro || hf.discipulador) {
        celulas = hier.filter(function (h) {
          if (hf.obreiro && !mesmoCasal(h.obreiro_id, hf.obreiro)) return false;
          if (hf.discipulador && !mesmoCasal(h.discipulador_id, hf.discipulador)) return false;
          return true;
        }).map(function (h) { return h.celula; });
        escopoTitulo = 'Rede de ' + nomeCasal(hf.discipulador || hf.obreiro);
        escopoSub = hf.discipulador && hf.obreiro ? 'Discipulador sob ' + nomeDe(hf.obreiro) : (hf.discipulador ? 'Células discipuladas' : 'Células sob esse obreiro');
      }
    } else if (meu) {
      // Mesma regra do pode_ver_celula(): a célula é da minha rede se eu
      // OU meu cônjuge formos o discipulador ou obreiro dela; fora isso,
      // vale a própria célula.
      var casal = [meu.id, state.meuConjugeId].filter(Boolean);
      var doCasal = function (id) { return !!id && casal.indexOf(id) >= 0; };
      var daRede = hier.filter(function (h) { return doCasal(h.discipulador_id) || doCasal(h.obreiro_id); });
      if (daRede.length) {
        celulas = daRede.map(function (h) { return h.celula; });
        if (meu.celula && celulas.indexOf(meu.celula) < 0) celulas.push(meu.celula);
        var viaConjuge = daRede.some(function (h) { return !(h.discipulador_id === meu.id || h.obreiro_id === meu.id); });
        var discipula = daRede.some(function (h) { return doCasal(h.discipulador_id); });
        escopoTitulo = 'Sua rede';
        escopoSub = viaConjuge ? 'Rede de discipulado do casal' : (discipula ? 'Células que você discipula' : 'Células sob sua supervisão');
      } else if (meu.posicao === 'Discipulador' || meu.posicao === 'Obreiro') {
        celulas = [];
        escopoTitulo = 'Sua rede'; escopoSub = 'Nenhuma célula vinculada';
      } else if (meu.celula) {
        celulas = [meu.celula];
        escopoTitulo = 'Sua célula'; escopoSub = celulaLabel(meu.celula);
      }
    }

    var ordemCelulas = currentCelulaList();
    var listaCelulas = celulas
      ? ordemCelulas.filter(function (c) { return celulas.indexOf(c) >= 0; }).concat(celulas.filter(function (c) { return ordemCelulas.indexOf(c) < 0; }))
      : ordemCelulas;
    var pessoas = celulas ? ativos.filter(function (p) { return celulas.indexOf(p.celula) >= 0; }) : ativos;
    var total = pessoas.length;
    var conta = function (fn) { return pessoas.filter(fn).length; };

    var pessoasRede = pessoas.filter(function (p) { return POSICOES_REDE.indexOf(p.posicao) >= 0; });
    var membrosRede = pessoasRede.length;
    var naoVisit = pessoas.filter(function (p) { return p.posicao !== 'Visitante'; });
    var fa = pessoas.filter(function (p) { return p.posicao === 'Frequentador Assíduo'; });
    var visit = pessoas.filter(function (p) { return p.posicao === 'Visitante'; });
    var kids = contaTipo(pessoas, 'Kids e Juvenis');
    var jovens = contaTipo(pessoas, 'Jovens');
    var batN = conta(function (p) { return p.batizado === 'Sim'; });
    var encN = conta(function (p) { return p.encontro === 'Sim'; });
    var lideres = conta(function (p) { return p.posicao === 'Líder'; });

    var posCounts = {};
    pessoas.forEach(function (p) { posCounts[p.posicao] = (posCounts[p.posicao] || 0) + 1; });
    var posicoes = posicaoOrder.concat(Object.keys(posCounts).filter(function (p) { return posicaoOrder.indexOf(p) < 0; }))
      .filter(function (p) { return posCounts[p]; })
      .map(function (p) { return { label: p, n: posCounts[p], pct: pct(posCounts[p], total), color: posicaoColor[p] || '#94a3b8' }; });

    var civilCounts = {};
    pessoas.forEach(function (p) { civilCounts[p.civil] = (civilCounts[p.civil] || 0) + 1; });
    var civilMax = Math.max(1, CIVIL_ORDER.reduce(function (m, c) { return Math.max(m, civilCounts[c] || 0); }, 0));
    var civil = CIVIL_ORDER.filter(function (c) { return civilCounts[c]; }).map(function (c) {
      return { label: CIVIL_LABELS[c], n: civilCounts[c], w: Math.round(civilCounts[c] / civilMax * 100) + '%' };
    });

    var hierDe = function (c) { return hier.filter(function (h) { return h.celula === c; })[0] || {}; };
    var cells = listaCelulas.map(function (c) {
      var ps = ativos.filter(function (p) { return p.celula === c; });
      var n = ps.length;
      var qtd = function (pos) { return ps.filter(function (p) { return p.posicao === pos; }).length; };
      var m = qtd('Membro'), f = qtd('Frequentador Assíduo'), v = qtd('Visitante');
      var lid = n - m - f - v;
      var nomesLideres = ps.filter(function (p) { return p.posicao === 'Líder'; }).map(function (p) { return primeiroNome(p.nome); });
      return {
        label: celulaLabel(c), n: n,
        lideres: nomesLideres.length ? nomesLideres.join(' & ') : '',
        discipulador: (function (n) { return n.indexOf(' & ') >= 0 ? n : primeiroNome(n); })(nomeCasal(hierDe(c).discipulador_id)),
        batPct: pct(ps.filter(function (p) { return p.batizado === 'Sim'; }).length, n),
        segs: [
          { n: m, color: '#1B2344', label: 'membros' },
          { n: lid, color: '#5B8FE0', label: 'liderança' },
          { n: f, color: '#149C88', label: 'FA' },
          { n: v, color: '#8A63C9', label: 'visit.' },
        ].filter(function (s) { return s.n; }).map(function (s) { return Object.assign(s, { w: pct(s.n, n) + '%' }); }),
        onClick: function () { abrirCadastroDaCelula(c); },
      };
    });

    // Pastor/Admin: quanto cada discipulador carrega (clique filtra por ele).
    var porDiscipulador = [];
    if (vals.souFull && !hf.discipulador) {
      var grupos = {};
      hier.forEach(function (h) {
        if (hf.obreiro && !mesmoCasal(h.obreiro_id, hf.obreiro)) return;
        var k = h.discipulador_id || '';
        (grupos[k] || (grupos[k] = [])).push(h.celula);
      });
      porDiscipulador = Object.keys(grupos).map(function (id) {
        var cs = grupos[id];
        var ps = ativos.filter(function (p) { return cs.indexOf(p.celula) >= 0; });
        var nome = id ? nomeDe(id) : '';
        return {
          id: id, nome: (id && nomeCasal(id)) || 'Sem discipulador definido', semDiscipulador: !id,
          initials: nome ? nome.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() : '?',
          celulas: cs.length, pessoas: ps.length,
          batPct: pct(ps.filter(function (p) { return p.batizado === 'Sim'; }).length, ps.length),
          onClick: id ? function () { setHomeFiltro('discipulador', id); } : null,
        };
      }).sort(function (a, b) { return (a.semDiscipulador - b.semDiscipulador) || (b.pessoas - a.pessoas); });
    }

    var hoje = new Date();
    var mesAtual = hoje.getMonth() + 1;
    var aniversariantes = pessoas.filter(function (p) { return p.nasc && Number(p.nasc.slice(5, 7)) === mesAtual; })
      .map(function (p) {
        var dia = Number(p.nasc.slice(8, 10));
        return {
          dia: dia, mes: MES_ABREV[mesAtual - 1], nome: p.nome, celulaLabel: p.celula ? celulaLabel(p.celula) : p.posicao,
          idade: hoje.getFullYear() - Number(p.nasc.slice(0, 4)),
          hoje: dia === hoje.getDate(), passou: dia < hoje.getDate(),
        };
      })
      .sort(function (a, b) { return a.dia - b.dia; });

    var discipuladorOptions = hf.obreiro
      ? vals.discipuladores.filter(function (d) { return hier.some(function (h) { return mesmoCasal(h.obreiro_id, hf.obreiro) && mesmoCasal(h.discipulador_id, d.v); }); })
      : vals.discipuladores;

    var dataLabel = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return {
      saudacao: (hoje.getHours() < 12 ? 'Bom dia' : (hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite')) + (meu ? ', ' + primeiroNome(meu.nome) : ''),
      dataLabel: dataLabel.charAt(0).toUpperCase() + dataLabel.slice(1),
      papel: state.profile && state.profile.is_admin ? 'Administrador' : (meu ? meu.posicao : ''),
      escopoTitulo: escopoTitulo, escopoSub: escopoSub,
      souFull: vals.souFull, filtros: hf, filtrando: !!(hf.obreiro || hf.discipulador),
      obreiroOptions: vals.obreiros, discipuladorOptions: discipuladorOptions,
      onObreiro: function (e) { setHomeFiltro('obreiro', e.target.value); },
      onDiscipulador: function (e) { setHomeFiltro('discipulador', e.target.value); },
      limparFiltros: function () { setState({ homeFilters: { obreiro: '', discipulador: '' } }); },
      carregando: !todos.length && state.membersStatus !== 'ok' && state.membersStatus !== 'error',
      semRede: !!celulas && !celulas.length,
      total: total, nCelulas: listaCelulas.length, lideres: lideres,
      kpis: {
        membrosRede: membrosRede, membrosRedeSub: tipoResumo(pessoasRede),
        adultosMembros: contaTipo(pessoasRede, 'Adultos'),
        principal: totalPrincipal(contaTipo(pessoasRede, 'Adultos'), kids, fa.length),
        fa: fa.length, faSub: tipoResumo(fa),
        visit: visit.length, visitSub: tipoResumo(visit),
        kids: kids, jovens: jovens, naoVisit: naoVisit.length,
      },
      batPct: pct(batN, total), faltamBat: total - batN,
      encPct: pct(encN, total), faltamEnc: total - encN,
      posicoes: posicoes, civil: civil, cells: cells,
      porDiscipulador: porDiscipulador, aniversariantes: aniversariantes, mesLabel: MESES_PT[mesAtual - 1].toLowerCase(),
      verCadastro: function () { abrirCadastroDaCelula(''); },
    };
  }

  var HOME_ICONS = {
    rede: '<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"></path><circle cx="10" cy="8" r="3.5"></circle><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35"></path><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8"></path>',
    fa: '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"></path>',
    visit: '<circle cx="10" cy="8" r="3.5"></circle><path d="M3.5 20v-1.5A3.5 3.5 0 0 1 7 15h6"></path><path d="M18 14v6"></path><path d="M15 17h6"></path>',
    adultos: '<circle cx="12" cy="7.5" r="3.8"></circle><path d="M5 20.5v-1a7 7 0 0 1 14 0v1"></path>',
    trocas: '<path d="M4 8h12"></path><path d="m13 5 3 3-3 3"></path><path d="M20 16H8"></path><path d="m11 13-3 3 3 3"></path>',
    transferidos: '<path d="M3 12h12"></path><path d="m11 7 5 5-5 5"></path><path d="M20 5v14"></path>',
    perdidos: '<circle cx="12" cy="12" r="8.5"></circle><path d="m9.2 14.8 5.6-5.6"></path><path d="m9.2 9.2 5.6 5.6"></path>',
    inativos: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>',
    jovens: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z"></path>',
    kids: '<circle cx="12" cy="12" r="8.5"></circle><path d="M8.5 14a4 4 0 0 0 7 0"></path><path d="M9 9.5h.01"></path><path d="M15 9.5h.01"></path>',
  };

  function homeIcon(key, color, bg) {
    return '<div class="home-kpi-icon" style="background:' + bg + ';color:' + color + '"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + HOME_ICONS[key] + '</svg></div>';
  }

  // Cor do ícone de cada quadro (fundo do cartão é branco em todos).
  var KPI_CORES = {
    rede: ['#1B2344', '#e9ecf5'],
    adultos: ['#2E4FC7', '#e6ecfb'],
    fa: ['#0E7A68', '#e0f4ef'],
    visit: ['#6B3FA0', '#efe8f8'],
    jovens: ['#C2410C', '#fdebdd'],
    kids: ['#3B6FD4', '#e8f0fc'],
    trocas: ['#2E4FC7', '#e6ecfb'],
    transferidos: ['#0E7A68', '#e0f4ef'],
    perdidos: ['#B0281E', '#fbe7e5'],
    inativos: ['#A1780F', '#fdf1da'],
  };

  // Quadro branco: ícone no canto superior esquerdo, números e textos
  // centralizados.
  function homeKpi(icon, value, label, sub) {
    var cor = KPI_CORES[icon] || ['#2E4FC7', '#e6ecfb'];
    return '<div class="home-card home-kpi">' +
      homeIcon(icon, cor[0], cor[1]) +
      '<div class="home-kpi-texto"><div class="home-kpi-value">' + value + '</div>' +
      '<div class="home-kpi-label">' + escHtml(label) + '</div>' +
      '<div class="home-kpi-sub">' + escHtml(sub) + '</div></div></div>';
  }

  // Primeiro quadro: soma de Adultos (só membros) + Kids e Juvenis + FAs,
  // com a conta aberta embaixo.
  function totalPrincipal(adultos, kids, fas) {
    return { valor: adultos + kids + fas, sub: adultos + ' adultos · ' + kids + ' kids/juvenis · ' + fas + ' FAs' };
  }

  function homeRing(pctv, color, label, sub) {
    var r = 42, circ = 2 * Math.PI * r;
    return '<div class="home-ring">' +
      '<div style="position:relative;width:112px;height:112px">' +
      '<svg width="112" height="112" viewBox="0 0 108 108" style="transform:rotate(-90deg)">' +
      '<circle cx="54" cy="54" r="' + r + '" fill="none" stroke="#edf1f7" stroke-width="11"></circle>' +
      (pctv > 0 ? '<circle cx="54" cy="54" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - pctv / 100)).toFixed(1) + '"></circle>' : '') +
      '</svg>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<div class="home-ring-value">' + pctv + '%</div>' +
      '<div class="home-ring-label">' + escHtml(label) + '</div></div></div>' +
      '<div class="home-card-sub" style="text-align:center">' + sub + '</div></div>';
  }

  function homeHtml(v) {
    var html = '<div class="home">';

    // Destaque: saudação, recorte atual e (Pastor/Admin) filtros
    html += '<section class="home-hero">' +
      '<div class="home-hero-top">' +
      '<div>' +
      '<div class="home-brand">Sistema OIKOS</div>' +
      '<div class="home-hello">' + escHtml(v.saudacao) + '</div>' +
      '<div class="home-sub">' + escHtml(v.dataLabel) + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
      (v.papel ? '<span class="home-chip">' + escHtml(v.papel) + '</span>' : '') +
      '<span class="home-chip home-chip-soft">' + escHtml(v.escopoTitulo) + ' · ' + escHtml(v.escopoSub) + '</span>' +
      '</div></div>' +
      (v.souFull
        ? '<div class="home-filters">' +
          '<div class="home-filter"><label for="home-obreiro">Obreiro</label>' +
          '<select id="home-obreiro" ' + cb(v.onObreiro, 'change') + '>' + opt('', 'Todos', !v.filtros.obreiro) +
          v.obreiroOptions.map(function (o) { return opt(o.v, o.label, v.filtros.obreiro === o.v); }).join('') + '</select></div>' +
          '<div class="home-filter"><label for="home-discipulador">Discipulador</label>' +
          '<select id="home-discipulador" ' + cb(v.onDiscipulador, 'change') + '>' + opt('', 'Todos', !v.filtros.discipulador) +
          v.discipuladorOptions.map(function (o) { return opt(o.v, o.label, v.filtros.discipulador === o.v); }).join('') + '</select></div>' +
          (v.filtrando ? '<button class="home-clear" ' + cb(v.limparFiltros) + '>Limpar filtros</button>' : '') +
          '</div>'
        : '') +
      '</div>' +
      '<div class="home-hero-stats">' +
      '<div class="home-hero-stat"><b>' + v.total + '</b><span>pessoas ativas</span></div>' +
      '<div class="home-hero-stat"><b>' + v.nCelulas + '</b><span>' + (v.nCelulas === 1 ? 'célula' : 'células') + '</span></div>' +
      '<div class="home-hero-stat"><b>' + v.lideres + '</b><span>' + (v.lideres === 1 ? 'líder' : 'líderes') + '</span></div>' +
      '<div class="home-hero-stat"><b>' + v.batPct + '%</b><span>batizados</span></div>' +
      '</div>' +
      '</section>';

    if (v.carregando) {
      return html + '<div class="home-card" style="margin-top:16px;color:#7b8aa0;font-size:13px">Carregando dados da rede…</div></div>';
    }
    if (v.semRede) {
      // Avisa, mas mantém o resto da tela no lugar (zerado) em vez de sumir.
      html += '<div class="home-card home-empty">' +
        '<div class="home-card-title">Nenhuma célula vinculada' + (v.souFull ? ' a esse filtro' : ' a você ainda') + '</div>' +
        '<div class="home-card-sub" style="margin-top:6px">' + (v.souFull
          ? 'Defina o discipulador e o obreiro de cada célula em Administração.'
          : 'Peça a um Pastor ou administrador para definir, em Administração, quais células estão sob a sua responsabilidade.') +
        '</div></div>';
    }

    html += '<div class="home-kpis">' +
      homeKpi('rede', v.kpis.principal.valor, 'Total de Membros - Adultos e Kids', v.kpis.principal.sub) +
      homeKpi('adultos', v.kpis.adultosMembros, 'Total de Adultos', 'membros adultos') +
      homeKpi('fa', v.kpis.fa, 'Frequentadores Assíduos', v.kpis.faSub) +
      homeKpi('visit', v.kpis.visit, 'Visitantes', v.kpis.visitSub) +
      homeKpi('jovens', v.kpis.jovens, 'Jovens', 'jovens no recorte') +
      homeKpi('kids', v.kpis.kids, 'Kids e Juvenis', 'Kids e Juvenis no recorte') +
      '</div>';

    html += '<div class="home-grid3">' +
      '<div class="home-card">' +
      '<div class="home-card-title">Jornada espiritual</div>' +
      '<div class="home-card-sub">Batismo e Encontro com Deus</div>' +
      '<div class="home-rings">' +
      homeRing(v.batPct, '#149C88', 'Batizados', '<b style="color:#6B3FA0">' + v.faltamBat + '</b> ainda não batizados') +
      homeRing(v.encPct, '#3B5FDD', 'Encontro', '<b style="color:#6B3FA0">' + v.faltamEnc + '</b> ainda não fizeram') +
      '</div></div>' +

      '<div class="home-card">' +
      '<div class="home-card-title">Composição por posição</div>' +
      '<div class="home-card-sub">' + v.total + ' pessoas no recorte</div>' +
      '<div class="home-stack">' + v.posicoes.map(function (p) {
        return '<div title="' + escHtml(p.label + ': ' + p.n) + '" style="width:' + p.pct + '%;background:' + p.color + '"></div>';
      }).join('') + '</div>' +
      '<div class="home-legend">' + v.posicoes.map(function (p) {
        return '<div class="home-legend-row"><span class="home-dot" style="background:' + p.color + '"></span>' +
          '<span style="flex:1">' + escHtml(p.label) + '</span><b>' + p.n + '</b><span class="home-muted" style="width:36px;text-align:right">' + p.pct + '%</span></div>';
      }).join('') + '</div></div>' +

      '<div class="home-card">' +
      '<div class="home-card-title">Estado civil</div>' +
      '<div class="home-card-sub">Distribuição do recorte</div>' +
      '<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">' + v.civil.map(function (c) {
        return '<div><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="color:#44546a">' + escHtml(c.label) + '</span><b style="color:#14243a">' + c.n + '</b></div>' +
          '<div class="home-bar"><div style="width:' + c.w + '"></div></div></div>';
      }).join('') + (v.civil.length ? '' : '<div class="home-card-sub">Sem dados.</div>') +
      '</div></div>' +
      '</div>';

    html += '<div class="home-section">' +
      '<div><div class="home-section-title">' + (v.nCelulas === 1 ? 'Célula' : 'Células') + '</div>' +
      '<div class="home-card-sub">Clique numa célula para abrir o cadastro dela</div></div>' +
      '<button class="home-link" ' + cb(v.verCadastro) + '>Ver cadastro completo →</button>' +
      '</div>' +
      '<div class="home-cells">' + v.cells.map(function (c) {
        return '<button class="home-card home-cell" ' + cb(c.onClick) + '>' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
          '<div style="min-width:0"><div class="home-cell-name">' + escHtml(c.label) + '</div>' +
          '<div class="home-card-sub">' + (c.lideres ? 'Líder: ' + escHtml(c.lideres) : 'Sem líder cadastrado') + '</div></div>' +
          '<div style="text-align:right"><div class="home-cell-total">' + c.n + '</div><div class="home-muted" style="font-size:11px">' + (c.n === 1 ? 'pessoa' : 'pessoas') + '</div></div>' +
          '</div>' +
          '<div class="home-stack" style="margin-top:14px;height:8px">' + c.segs.map(function (s) {
            return '<div style="width:' + s.w + ';background:' + s.color + '"></div>';
          }).join('') + '</div>' +
          '<div class="home-cell-legend">' + c.segs.map(function (s) {
            return '<span><span class="home-dot" style="background:' + s.color + '"></span>' + s.n + ' ' + s.label + '</span>';
          }).join('') + (c.segs.length ? '' : '<span>Nenhuma pessoa ativa</span>') + '</div>' +
          '<div class="home-cell-foot">' +
          '<span class="home-pill">' + c.batPct + '% batizados</span>' +
          (v.souFull && c.discipulador ? '<span class="home-muted">Disc. ' + escHtml(c.discipulador) + '</span>' : '') +
          '</div></button>';
      }).join('') +
      (v.cells.length ? '' : '<div class="home-card home-card-sub">Nenhuma célula neste recorte.</div>') +
      '</div>';

    var temDisc = v.porDiscipulador.length > 0;
    html += '<div class="' + (temDisc ? 'home-grid2' : '') + '" style="margin-top:14px">';
    if (temDisc) {
      html += '<div class="home-card">' +
        '<div class="home-card-title">Rede por discipulador</div>' +
        '<div class="home-card-sub">Clique para ver só a rede de um discipulador</div>' +
        '<div style="margin-top:10px">' + v.porDiscipulador.map(function (d) {
          return '<div class="home-row' + (d.onClick ? '' : ' home-row-static') + '"' + (d.onClick ? ' ' + cb(d.onClick) : '') + '>' +
            '<div style="display:flex;align-items:center;gap:12px;min-width:0">' +
            '<div class="home-avatar' + (d.semDiscipulador ? ' home-avatar-vazio' : '') + '">' + escHtml(d.initials) + '</div>' +
            '<div style="min-width:0"><div style="font-weight:700;font-size:13.5px;color:#14243a">' + escHtml(d.nome) + '</div>' +
            '<div class="home-card-sub">' + d.celulas + (d.celulas === 1 ? ' célula' : ' células') + ' · ' + d.pessoas + ' pessoas</div></div></div>' +
            '<div style="display:flex;align-items:center;gap:10px"><span class="home-pill">' + d.batPct + '% batiz.</span>' +
            (d.onClick ? '<span class="home-muted">›</span>' : '') + '</div></div>';
        }).join('') + '</div></div>';
    }
    html += '<div class="home-card">' +
      '<div class="home-card-title">Aniversariantes de ' + escHtml(v.mesLabel) + '</div>' +
      '<div class="home-card-sub">' + v.aniversariantes.length + (v.aniversariantes.length === 1 ? ' pessoa' : ' pessoas') + ' no recorte</div>' +
      '<div class="home-bdays">' + v.aniversariantes.map(function (a) {
        return '<div class="home-bday' + (a.passou ? ' home-bday-passou' : '') + '">' +
          '<div class="home-bday-date' + (a.hoje ? ' home-bday-hoje' : '') + '"><b>' + a.dia + '</b><span>' + a.mes + '</span></div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;color:#14243a">' + escHtml(a.nome) + '</div>' +
          '<div class="home-card-sub">' + escHtml(a.celulaLabel) + '</div></div>' +
          (a.hoje ? '<span class="home-pill home-pill-hoje">Hoje · ' + a.idade + ' anos</span>' : '<span class="home-muted" style="font-size:12px">' + a.idade + ' anos</span>') +
          '</div>';
      }).join('') + (v.aniversariantes.length ? '' : '<div class="home-card-sub" style="padding:8px 0">Ninguém faz aniversário neste mês.</div>') +
      '</div></div>';
    html += '</div>';

    html += '</div>';
    return html;
  }

  // ---------------------------------------------------------------------
  // Frequência — telas (Lançar / Histórico / Painel)
  // ---------------------------------------------------------------------

  // Casal divide a mesma rede: um filtro por uma pessoa também vale pelo
  // cônjuge dela (mesma regra do pode_ver_celula no banco).
  function mesmoResponsavel(idNaCelula, idFiltro) {
    if (!idNaCelula || !idFiltro) return false;
    if (idNaCelula === idFiltro) return true;
    var m = memberById(idFiltro);
    return !!(m && m.conjuge_id === idNaCelula);
  }

  // Células em que a pessoa logada pode lançar/consultar frequência —
  // espelha a RLS: acesso total vê todas; discipulador/obreiro (e o
  // cônjuge) veem as suas; líder vê a própria.
  function celulasDoUsuario(souFull) {
    var lista = currentCelulaList();
    if (souFull) return lista;
    var hier = state.celulaHierarquia || [];
    var ids = [meuMemberId(), state.meuConjugeId].filter(Boolean);
    var minhas = hier.filter(function (h) {
      return ids.indexOf(h.discipulador_id) >= 0 || ids.indexOf(h.obreiro_id) >= 0;
    }).map(function (h) { return h.celula; });
    var minha = state.meuPerfil && state.meuPerfil.celula;
    if (minha && minhas.indexOf(minha) < 0) minhas.push(minha);
    return lista.filter(function (c) { return minhas.indexOf(c) >= 0; });
  }

  function dataLabelIso(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function frequenciaVals(vals) {
    var ativos = data().filter(function (p) { return p.active !== false; });
    var hier = state.celulaHierarquia || [];
    var celulas = celulasDoUsuario(vals.souFull);
    var celulaAtual = state.freqCelula;
    var busca = (state.freqBusca || '').trim().toLowerCase();
    var noCulto = state.freqModo === 'culto';

    var daCelula = ativos.filter(function (p) { return p.celula === celulaAtual; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
    var ids = daCelula.map(function (p) { return p.id; });
    var visiveis = busca ? daCelula.filter(function (p) { return p.nome.toLowerCase().indexOf(busca) >= 0; }) : daCelula;
    var marcados = noCulto ? state.freqPresencasCulto : state.freqPresencas;

    var statusCor = {
      'Visitante': ['#f1e8f7', '#6B3FA0'],
      'Frequentador Assíduo': ['#dcf3ef', '#0E7A68'],
      'Membro': ['#e4eefa', '#2E4FC7'],
    };
    var pessoas = visiveis.map(function (p) {
      var st = statusDeMembro(p);
      var cor = statusCor[st] || ['#eef2f7', '#5a6b80'];
      return {
        id: p.id, nome: p.nome,
        status: st === 'Frequentador Assíduo' ? 'FA' : st, statusBg: cor[0], statusFg: cor[1],
        funcao: funcaoDeMembro(p),
        presente: !!marcados[p.id],
        onToggle: function () { toggleFreqPresenca(p.id); },
      };
    });
    var presentes = ids.filter(function (id) { return marcados[id]; }).length;

    // ---- Painel / histórico ----
    var pf = state.freqPainel;
    var desde = isoMenosDias(Number(pf.periodo || 8) * 7);
    var hierDe = function (c) { return hier.filter(function (h) { return h.celula === c; })[0] || {}; };
    var noFiltro = function (celula, dataIso) {
      if (dataIso < desde) return false;
      if (pf.celula && celula !== pf.celula) return false;
      if (pf.obreiro && !mesmoResponsavel(hierDe(celula).obreiro_id, pf.obreiro)) return false;
      if (pf.discipulador && !mesmoResponsavel(hierDe(celula).discipulador_id, pf.discipulador)) return false;
      return true;
    };
    var encontros = (state.freqEncontros || []).filter(function (e) { return noFiltro(e.celula, e.data); });
    var cultos = (state.freqCultos || []).filter(function (c) { return noFiltro(c.celula, c.data); });
    var planilha = (state.freqPlanilha || []).filter(function (r) { return noFiltro(r.celula, r.data); });

    var soma = function (lista, campo) {
      return lista.reduce(function (acc, r) { return acc + Number(r[campo] || 0); }, 0);
    };
    var totalPessoas = soma(encontros, 'pessoas'), totalPresentes = soma(encontros, 'presentes');
    var cultoPessoas = soma(cultos, 'pessoas'), cultoPresentes = soma(cultos, 'presentes');

    var porCelula = {};
    var linhaDe = function (c) {
      return porCelula[c] || (porCelula[c] = { celula: c, encontros: 0, pessoas: 0, presentes: 0, visitantes: 0, cultos: 0, cultoPessoas: 0, cultoPresentes: 0 });
    };
    encontros.forEach(function (e) {
      var r = linhaDe(e.celula);
      r.encontros++; r.pessoas += Number(e.pessoas || 0); r.presentes += Number(e.presentes || 0);
      r.visitantes += Number(e.visitantes || 0);
    });
    cultos.forEach(function (c) {
      var r = linhaDe(c.celula);
      r.cultos++; r.cultoPessoas += Number(c.pessoas || 0); r.cultoPresentes += Number(c.presentes || 0);
    });
    var painelCelulas = Object.keys(porCelula).map(function (c) {
      var r = porCelula[c];
      return {
        celulaLabel: celulaLabel(c), encontros: r.encontros, pessoas: r.pessoas,
        presentes: r.presentes, ausentes: r.pessoas - r.presentes, visitantes: r.visitantes,
        culto: r.cultoPresentes,
        pctCelula: r.pessoas ? Math.round(r.presentes / r.pessoas * 100) : 0,
        pctCulto: r.cultoPessoas ? Math.round(r.cultoPresentes / r.cultoPessoas * 100) : 0,
      };
    }).sort(function (a, b) { return b.pessoas - a.pessoas; });

    // Células que ainda não lançaram a célula desta semana
    var inicioSemana = isoMenosDias(7);
    var semLancamento = celulas.filter(function (c) {
      return !(state.freqEncontros || []).some(function (e) { return e.celula === c && e.data >= inicioSemana; });
    }).map(celulaLabel);

    var abrirCelula = function (celula, dataIso) {
      return function () {
        setState({ freqTab: 'lancar', freqModo: 'celula', freqCelula: celula, freqData: dataIso });
        abrirEncontroFrequencia(celula, dataIso);
      };
    };
    var abrirCulto = function (celula, dataIso) {
      return function () {
        setState({ freqTab: 'lancar', freqModo: 'culto', freqCelula: celula, freqCultoData: dataIso });
        abrirCultoFrequencia(dataIso);
      };
    };

    var historico = encontros.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).map(function (e) {
      return {
        dataLabel: dataLabelIso(e.data), celulaLabel: celulaLabel(e.celula),
        pessoas: Number(e.pessoas || 0), presentes: Number(e.presentes || 0), visitantes: Number(e.visitantes || 0),
        pct: Number(e.pessoas) ? Math.round(Number(e.presentes) / Number(e.pessoas) * 100) : 0,
        onClick: abrirCelula(e.celula, e.data),
      };
    });
    var historicoCultos = cultos.slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).map(function (c) {
      return {
        dataLabel: dataLabelIso(c.data), celulaLabel: celulaLabel(c.celula),
        pessoas: Number(c.pessoas || 0), presentes: Number(c.presentes || 0),
        pct: Number(c.pessoas) ? Math.round(Number(c.presentes) / Number(c.pessoas) * 100) : 0,
        onClick: abrirCulto(c.celula, c.data),
      };
    });

    // Histórico da planilha: totais, sem pessoa a pessoa. Fica separado
    // para não se misturar com os lançamentos feitos no Oikos.
    var planilhaLinhas = planilha.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).map(function (r) {
      return {
        dataLabel: dataLabelIso(r.data), celulaLabel: celulaLabel(r.celula),
        membros: Number(r.membros || 0), fas: Number(r.fas || 0),
        visitantes: Number(r.visitantes || 0), kids: Number(r.kids || 0),
        total: Number(r.total != null ? r.total : (r.membros + r.fas + r.visitantes + r.kids)),
        rodizio: !!r.rodizio,
      };
    });
    var planilhaPorCelula = {};
    planilha.forEach(function (r) {
      var c = planilhaPorCelula[r.celula] || (planilhaPorCelula[r.celula] = { celula: r.celula, registros: 0, pessoas: 0 });
      c.registros++;
      c.pessoas += Number(r.total != null ? r.total : (r.membros + r.fas + r.visitantes + r.kids));
    });
    var planilhaResumo = Object.keys(planilhaPorCelula).map(function (c) {
      var r = planilhaPorCelula[c];
      return {
        celulaLabel: celulaLabel(c), registros: r.registros, pessoas: r.pessoas,
        media: r.registros ? Math.round(r.pessoas / r.registros) : 0,
      };
    }).sort(function (a, b) { return b.pessoas - a.pessoas; });

    var histPessoa = state.freqHistoricoPessoa;
    var lancamentoExiste = noCulto ? !!state.freqCulto : !!state.freqEncontro;
    return {
      souFull: vals.souFull,
      tab: state.freqTab,
      setTab: function (t) { return function () { setFreqTab(t); }; },
      modo: state.freqModo,
      setModo: function (m) { return function () { setFreqModo(m); }; },
      celula: celulaAtual, celulaLabelText: celulaLabel(celulaAtual),
      celulaOptions: celulas.map(function (c) { return { v: c, label: celulaLabel(c) }; }),
      travadoNaCelula: celulas.length === 1,
      data: noCulto ? state.freqCultoData : state.freqData,
      dataLabel: dataLabelIso(noCulto ? state.freqCultoData : state.freqData),
      onCelula: function (e) { setFreqCelula(e.target.value); },
      onData: function (e) { setFreqData(e.target.value); },
      busca: state.freqBusca,
      onBusca: function (e) { setState({ freqBusca: e.target.value }); },
      pessoas: pessoas, totalPessoas: daCelula.length, presentes: presentes,
      lancamentoExiste: lancamentoExiste,
      carregando: state.freqEncontroStatus === 'loading',
      salvando: state.freqSaving, salvo: state.freqSalvo, erro: state.freqErro,
      salvar: function () { salvarFrequencia(ids); },
      excluir: function () { excluirLancamentoFrequencia(); },
      marcarTodos: function (valor) { return function () { marcarTodosFreq(valor, ids); }; },
      visitante: state.freqVisitante, visitanteSaving: state.freqVisitanteSaving,
      visitanteErro: state.freqVisitanteErro, visitanteDuplicado: state.freqVisitanteDuplicado,
      abrirVisitante: function () { abrirVisitanteFrequencia(); },
      fecharVisitante: function () { fecharVisitanteFrequencia(); },
      onVisitante: function (key) { return function (e) { setVisitanteFrequencia(key, e.target.value); }; },
      salvarVisitante: function (e) { if (e && e.preventDefault) e.preventDefault(); salvarVisitanteFrequencia(); },
      usarExistente: function () { usarCadastroExistenteFrequencia(state.freqVisitanteDuplicado); },
      forcarNovoVisitante: function () { setVisitanteFrequencia('confirmarNovo', true); salvarVisitanteFrequencia(); },
      convidadoPorOptions: daCelula.map(function (p) { return { v: p.id, label: p.nome }; }),
      painel: pf,
      onPainel: function (key) { return function (e) { setFreqPainel(key, e.target.value); }; },
      discipuladores: vals.discipuladores, obreiros: vals.obreiros,
      painelCelulas: painelCelulas, semLancamento: semLancamento,
      kpis: {
        encontros: encontros.length, pessoas: totalPessoas, presentes: totalPresentes,
        ausentes: totalPessoas - totalPresentes,
        pctCelula: totalPessoas ? Math.round(totalPresentes / totalPessoas * 100) : 0,
        cultos: cultos.length, culto: cultoPresentes,
        pctCulto: cultoPessoas ? Math.round(cultoPresentes / cultoPessoas * 100) : 0,
        visitantes: soma(encontros, 'visitantes'), fas: soma(encontros, 'fas'), membros: soma(encontros, 'membros'),
      },
      historico: historico, historicoCultos: historicoCultos,
      planilhaLinhas: planilhaLinhas, planilhaResumo: planilhaResumo,
      historicoStatus: state.freqEncontrosStatus,
      pessoaOptions: ativos.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); }).map(function (p) { return { v: p.id, label: p.nome }; }),
      pessoaId: state.freqHistoricoPessoaId,
      onPessoa: function (e) { loadHistoricoPessoa(e.target.value); },
      histPessoaCarregando: histPessoa === 'loading',
      histPessoa: Array.isArray(histPessoa) ? histPessoa.map(function (r) {
        return { dataLabel: dataLabelIso(r.data), celulaLabel: celulaLabel(r.celula), presente: r.presente };
      }) : [],
    };
  }

  function freqToggle(ativo, label, cbAttr) {
    var bg = ativo ? '#149C88' : '#eef2f7';
    var fg = ativo ? '#fff' : '#8a99ab';
    return '<button type="button" ' + cbAttr + ' aria-pressed="' + (ativo ? 'true' : 'false') + '" style="min-width:76px;padding:10px 12px;border:none;border-radius:999px;background:' + bg + ';color:' + fg + ';font-size:12.5px;font-weight:700;cursor:pointer">' + label + '</button>';
  }

  function freqVisitanteHtml(v) {
    var f = v.visitante;
    var dup = v.visitanteDuplicado;
    return '<div class="home-card" style="margin-bottom:14px">' +
      '<div class="home-card-title">Adicionar visitante</div>' +
      '<div class="home-card-sub">Entra no cadastro do Oikos como Visitante da célula ' + escHtml(v.celulaLabelText) + ', já marcado como presente.</div>' +
      (v.visitanteErro ? adminBanner('error', v.visitanteErro) : '') +
      (dup
        ? '<div style="background:#faf1de;color:#a1780f;border-radius:12px;padding:12px 14px;font-size:12.5px;font-weight:600;margin:12px 0">' +
          'Já existe <b>' + escHtml(dup.nome) + '</b> cadastrado' + (dup.celula ? ' na célula ' + escHtml(celulaLabel(dup.celula)) : '') + '.' +
          '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
          (dup.celula === v.celula
            ? '<button type="button" ' + cb(v.usarExistente) + ' style="padding:8px 14px;border:none;border-radius:999px;background:#149C88;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Usar esse cadastro</button>'
            : '') +
          '<button type="button" ' + cb(v.forcarNovoVisitante) + ' style="padding:8px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#4a5b70;cursor:pointer">É outra pessoa, cadastrar mesmo assim</button>' +
          '</div></div>'
        : '') +
      '<form ' + cb(v.salvarVisitante, 'submit') + ' style="display:flex;flex-direction:column;gap:12px;margin-top:12px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome</label>' +
      '<input type="text" id="freq-visitante-nome" value="' + escHtml(f.nome) + '" ' + cb(v.onVisitante('nome'), 'input') + ' placeholder="Nome do visitante" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div class="grid-form2">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone (opcional)</label>' +
      '<input type="text" id="freq-visitante-tel" value="' + escHtml(f.tel) + '" ' + cb(v.onVisitante('tel'), 'input') + ' placeholder="(00) 00000-0000" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      optionalSelectField('Quem convidou (opcional)', cb(v.onVisitante('convidadoPor'), 'change'), v.convidadoPorOptions, f.convidadoPor, 'Não informado') +
      '</div>' +
      '<div style="font-size:12px;color:#7b8aa0">Data da visita: ' + escHtml(v.dataLabel) + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="submit"' + (v.visitanteSaving ? ' disabled' : '') + ' style="padding:10px 18px;border:none;border-radius:999px;background:#1B2344;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer">' + (v.visitanteSaving ? 'Salvando…' : 'Adicionar visitante') + '</button>' +
      '<button type="button" ' + cb(v.fecharVisitante) + ' style="padding:10px 16px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:13px;color:#6b7c93;font-weight:600;cursor:pointer">Cancelar</button>' +
      '</div></form></div>';
  }

  function freqLancarHtml(v) {
    var noCulto = v.modo === 'culto';
    var html = '';
    if (!v.celulaOptions.length) {
      return '<div class="home-card home-empty">' +
        '<div class="home-card-title">Nenhuma célula vinculada a você</div>' +
        '<div class="home-card-sub" style="margin-top:6px">Peça a um Pastor ou administrador para definir sua célula em Administração.</div></div>';
    }

    // Célula e culto acontecem em dias diferentes: cada um tem a sua data
    // e o seu lançamento.
    var botaoModo = function (modo, label) {
      var ativo = v.modo === modo;
      return '<button type="button" ' + cb(v.setModo(modo)) + ' style="flex:1;padding:11px 12px;border:none;border-radius:11px;background:' + (ativo ? '#fff' : 'transparent') + ';color:' + (ativo ? '#14243a' : '#6b7c93') + ';font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:' + (ativo ? '0 2px 8px rgba(20,36,58,.12)' : 'none') + '">' + label + '</button>';
    };
    html += '<div style="display:flex;gap:4px;padding:4px;background:#e6ecf4;border-radius:14px;margin-bottom:14px">' +
      botaoModo('celula', 'Encontro da célula') + botaoModo('culto', 'Culto') + '</div>';

    html += '<div class="home-card" style="margin-bottom:14px">' +
      '<div class="grid-form2">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">' + (noCulto ? 'Data do culto' : 'Data do encontro') + '</label>' +
      '<input type="date" id="freq-data" value="' + escHtml(v.data) + '" ' + cb(v.onData, 'change') + ' style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      (v.travadoNaCelula
        ? '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Célula</label>' +
          '<div style="margin-top:5px;padding:10px 12px;border:1px solid #e6ecf4;border-radius:11px;background:#f7f9fc;font-size:14px;font-weight:700">' + escHtml(v.celulaLabelText) + '</div></div>'
        : selectField('Célula', cb(v.onCelula, 'change'), v.celulaOptions, v.celula)) +
      '</div>' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;color:#4a5b70">' +
      '<span><b style="color:#0E7A68">' + v.presentes + '</b> de ' + v.totalPessoas + (noCulto ? ' no culto' : ' na célula') + '</span>' +
      '<span class="home-muted">' + (v.lancamentoExiste ? 'Já registrado — dá para corrigir e salvar de novo' : 'Ainda não lançado') + '</span>' +
      '</div>' +
      (noCulto ? '<div class="home-card-sub" style="margin-top:8px">Marque quem da célula ' + escHtml(v.celulaLabelText) + ' esteve no culto desta data.</div>' : '') +
      '</div>';

    if (v.erro) html += adminBanner('error', v.erro);
    if (v.salvo) html += adminBanner('ok', noCulto ? 'Presença no culto registrada com sucesso.' : 'Frequência registrada com sucesso.');

    if (v.visitante) html += freqVisitanteHtml(v);

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">' +
      '<input type="text" id="freq-busca" value="' + escHtml(v.busca) + '" ' + cb(v.onBusca, 'input') + ' placeholder="Buscar pessoa…" style="flex:1;min-width:180px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:14px">' +
      '<button type="button" ' + cb(v.marcarTodos(true)) + ' style="padding:9px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#1B2344;cursor:pointer">Marcar todos</button>' +
      '<button type="button" ' + cb(v.marcarTodos(false)) + ' style="padding:9px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#6b7c93;cursor:pointer">Limpar</button>' +
      (noCulto ? '' : '<button type="button" ' + cb(v.abrirVisitante) + ' style="padding:9px 14px;border:none;border-radius:999px;background:#149C88;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">+ Visitante</button>') +
      '</div>';

    html += '<div class="home-card" style="padding:6px 10px">' +
      '<div class="freq-linha freq-cab freq-linha-1col">' +
      '<div>Pessoa</div><div style="text-align:center">' + (noCulto ? 'Culto' : 'Presente') + '</div>' +
      '</div>' +
      v.pessoas.map(function (p) {
        return '<div class="freq-linha freq-linha-1col">' +
          '<div style="min-width:0"><div class="freq-nome">' + escHtml(p.nome) + '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-top:3px">' +
          '<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:' + p.statusBg + ';color:' + p.statusFg + '">' + escHtml(p.status) + '</span>' +
          (p.funcao ? '<span style="font-size:10.5px;color:#8a99ab;font-weight:600">' + escHtml(p.funcao) + '</span>' : '') +
          '</div></div>' +
          '<div style="text-align:center">' + freqToggle(p.presente, p.presente ? 'Sim' : 'Não', cb(p.onToggle)) + '</div>' +
          '</div>';
      }).join('') +
      (v.pessoas.length ? '' : '<div style="padding:18px 8px;font-size:12.5px;color:#8a99ab">' + (v.carregando ? 'Carregando…' : 'Ninguém nesta célula ainda.') + '</div>') +
      '</div>';

    html += '<div class="freq-salvar">' +
      '<button type="button" ' + cb(v.salvar) + (v.salvando ? ' disabled' : '') + ' style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#1B2344,#2a4290);color:#fff;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 10px 24px -12px rgba(27,35,68,.8)">' +
      (v.salvando ? 'Salvando…' : (noCulto ? 'Salvar presença no culto' : 'Salvar frequência da célula')) + '</button>' +
      (v.lancamentoExiste
        ? '<button type="button" ' + cb(v.excluir) + ' style="width:100%;margin-top:8px;padding:10px;border:none;background:none;color:#a02020;font-size:12.5px;font-weight:700;cursor:pointer">Apagar este lançamento</button>'
        : '') +
      '</div>';
    return html;
  }

  function freqFiltrosHtml(v) {
    return '<div class="home-card" style="margin-bottom:14px">' +
      '<div class="grid-form4">' +
      selectField('Período', cb(v.onPainel('periodo'), 'change'), [
        { v: '1', label: 'Esta semana' }, { v: '4', label: 'Últimas 4 semanas' },
        { v: '8', label: 'Últimas 8 semanas' }, { v: '12', label: 'Últimas 12 semanas' },
        { v: '52', label: 'Último ano' },
      ], String(v.painel.periodo)) +
      optionalSelectField('Célula', cb(v.onPainel('celula'), 'change'), v.celulaOptions, v.painel.celula, 'Todas') +
      optionalSelectField('Discipulador', cb(v.onPainel('discipulador'), 'change'), v.discipuladores, v.painel.discipulador, 'Todos') +
      optionalSelectField('Obreiro/Rede', cb(v.onPainel('obreiro'), 'change'), v.obreiros, v.painel.obreiro, 'Todos') +
      '</div></div>';
  }

  function freqPainelHtml(v) {
    var k = v.kpis;
    var html = freqFiltrosHtml(v);
    html += '<div class="home-kpis" style="margin-top:0;margin-bottom:14px">' +
      kpiCard('Presentes na célula', k.presentes, k.pctCelula + '% de ' + k.pessoas + ' lançamentos', { gradient: true }) +
      kpiCard('Ausentes na célula', k.ausentes, 'no período', { valueColor: '#B0281E' }) +
      kpiCard('Presentes no culto', k.culto, k.pctCulto + '% dos lançados no culto', { valueColor: '#2E4FC7' }) +
      kpiCard('Encontros lançados', k.encontros, k.cultos + ' cultos lançados', { valueColor: '#0E7A68' }) +
      '</div>';
    html += '<div class="home-kpis" style="margin-top:0;margin-bottom:14px">' +
      kpiCard('Membros', k.membros, 'presenças lançadas na célula', { valueColor: '#1B2344' }) +
      kpiCard('Frequentadores Assíduos', k.fas, 'presenças lançadas na célula', { valueColor: '#149C88' }) +
      kpiCard('Visitantes', k.visitantes, 'presenças lançadas na célula', { valueColor: '#6B3FA0' }) +
      '</div>';

    // Cobrança de quem não lançou é assunto de quem supervisiona a rede
    // inteira — só Pastor/Pastor de Rede/admin veem.
    if (v.souFull && v.semLancamento.length) {
      html += '<div class="home-card home-empty" style="margin-bottom:14px">' +
        '<div class="home-card-title">Sem lançamento de célula nesta semana</div>' +
        '<div class="home-card-sub" style="margin-top:6px">' + escHtml(v.semLancamento.join(' · ')) + '</div></div>';
    }

    if (v.planilhaResumo.length) {
      html += '<div class="home-card" style="margin-bottom:14px">' +
        '<div class="home-card-title">Histórico da planilha, no mesmo período</div>' +
        '<div class="home-card-sub">Totais do formulário antigo. Ficam à parte porque não têm presença pessoa a pessoa, então não entram nos percentuais acima.</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">' +
        v.planilhaResumo.map(function (r) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:#f7f9fc">' +
            '<span style="font-size:13px;font-weight:700;color:#14243a">' + escHtml(r.celulaLabel) + '</span>' +
            '<span style="font-size:12px;color:#6b7c93">' + r.registros + ' encontros · <b style="color:#14243a">' + r.pessoas + '</b> pessoas · média ' + r.media + '</span>' +
            '</div>';
        }).join('') +
        '</div></div>';
    }

    var th = function (label, align) {
      return '<th style="text-align:' + align + ';padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
    };
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="padding:18px 22px 6px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Frequência por célula</div></div>' +
      '<div class="table-scroll"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      th('Célula', 'left') + th('Encontros', 'right') + th('Pessoas', 'right') + th('Presentes', 'right') +
      th('Ausentes', 'right') + th('% célula', 'right') + th('Culto', 'right') + th('% culto', 'right') + th('Visitantes', 'right') +
      '</tr></thead><tbody>' +
      v.painelCelulas.map(function (r) {
        var td = function (val, extra) { return '<td style="padding:11px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums' + (extra || '') + '">' + val + '</td>'; };
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 12px;font-weight:700;color:#14243a">' + escHtml(r.celulaLabel) + '</td>' +
          td(r.encontros) + td(r.pessoas) + td(r.presentes) + td(r.ausentes) +
          td(r.pctCelula + '%', ';font-weight:700;color:#0E7A68') + td(r.culto) + td(r.pctCulto + '%') + td(r.visitantes) +
          '</tr>';
      }).join('') +
      (v.painelCelulas.length ? '' : '<tr><td colspan="9" style="padding:18px 22px;color:#8a99ab;font-size:12.5px">Nenhum lançamento no período escolhido.</td></tr>') +
      '</tbody></table></div></div>';
    return html;
  }

  function freqTabelaHistorico(titulo, subtitulo, linhas, colunaExtra, vazio) {
    var th = function (label, align) {
      return '<th style="text-align:' + align + ';padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
    };
    return '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-bottom:14px">' +
      '<div style="padding:18px 22px 6px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">' + escHtml(titulo) + '</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-top:2px">' + escHtml(subtitulo) + '</div></div>' +
      '<div class="table-scroll" style="max-height:340px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      th('Data', 'left') + th('Célula', 'left') + th('Presentes', 'right') + th('Pessoas', 'right') + th('%', 'right') +
      (colunaExtra ? th(colunaExtra, 'right') : '') +
      '</tr></thead><tbody>' +
      linhas.map(function (r) {
        var td = function (val) { return '<td style="padding:11px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + val + '</td>'; };
        return '<tr ' + cb(r.onClick) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 12px;font-weight:700;color:#14243a">' + escHtml(r.dataLabel) + '</td>' +
          '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(r.celulaLabel) + '</td>' +
          td(r.presentes) + td(r.pessoas) + td(r.pct + '%') + (colunaExtra ? td(r.visitantes) : '') +
          '</tr>';
      }).join('') +
      (linhas.length ? '' : '<tr><td colspan="' + (colunaExtra ? 6 : 5) + '" style="padding:18px 22px;color:#8a99ab;font-size:12.5px">' + escHtml(vazio) + '</td></tr>') +
      '</tbody></table></div></div>';
  }

  function freqHistoricoHtml(v) {
    var carregando = v.historicoStatus === 'loading';
    var html = freqFiltrosHtml(v);
    html += freqTabelaHistorico('Encontros de célula', 'Clique numa linha para abrir aquele lançamento.', v.historico, 'Visitantes',
      carregando ? 'Carregando…' : 'Nenhum encontro de célula no período escolhido.');
    html += freqTabelaHistorico('Cultos', 'Presença da célula no culto, por data de culto.', v.historicoCultos, '',
      carregando ? 'Carregando…' : 'Nenhuma presença de culto lançada no período escolhido.');

    // Histórico da planilha antiga: totais por encontro, sem pessoa a
    // pessoa (era assim que o formulário coletava).
    if (v.planilhaLinhas.length) {
      var thP = function (label, align) {
        return '<th style="text-align:' + align + ';padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
      };
      html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-bottom:14px">' +
        '<div style="padding:18px 22px 6px">' +
        '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Histórico da planilha <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + v.planilhaLinhas.length + ' encontros</span></div>' +
        '<div style="font-size:12.5px;color:#6b7c93;margin-top:2px">Lançamentos feitos no formulário antigo, antes da aba Frequência. São totais por encontro — a planilha não registrava quem esteve presente.</div></div>' +
        '<div class="table-scroll" style="max-height:340px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
        '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
        thP('Data', 'left') + thP('Célula', 'left') + thP('Membros', 'right') + thP('FAs', 'right') +
        thP('Visitantes', 'right') + thP('Kids', 'right') + thP('Total', 'right') + thP('Tipo', 'right') +
        '</tr></thead><tbody>' +
        v.planilhaLinhas.map(function (r) {
          var td = function (val) { return '<td style="padding:11px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + val + '</td>'; };
          return '<tr style="border-bottom:1px solid #f0f4f9">' +
            '<td style="padding:11px 12px;font-weight:700;color:#14243a">' + escHtml(r.dataLabel) + '</td>' +
            '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(r.celulaLabel) + '</td>' +
            td(r.membros) + td(r.fas) + td(r.visitantes) + td(r.kids) +
            '<td style="padding:11px 12px;text-align:right;font-weight:700;color:#1B2344;font-variant-numeric:tabular-nums">' + r.total + '</td>' +
            '<td style="padding:11px 12px;text-align:right"><span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:' + (r.rodizio ? '#faf1de' : '#eef2f7') + ';color:' + (r.rodizio ? '#a1780f' : '#5a6b80') + '">' + (r.rodizio ? 'Ponte/Rodízio' : 'Célula') + '</span></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div></div>';
    }

    html += '<div class="home-card">' +
      '<div class="home-card-title">Histórico de uma pessoa</div>' +
      '<div class="home-card-sub">Todas as presenças de célula registradas para ela.</div>' +
      '<div style="margin-top:12px;max-width:340px">' +
      optionalSelectField('Pessoa', cb(v.onPessoa, 'change'), v.pessoaOptions, v.pessoaId, 'Escolha uma pessoa') +
      '</div>' +
      (v.pessoaId
        ? (v.histPessoaCarregando
          ? '<div class="home-card-sub" style="margin-top:12px">Carregando…</div>'
          : (v.histPessoa.length
            ? '<div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;max-height:280px;overflow:auto">' +
              v.histPessoa.map(function (r) {
                return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:#f7f9fc">' +
                  '<span style="font-size:12.5px;font-weight:600;color:#14243a">' + escHtml(r.dataLabel) + '</span>' +
                  '<span style="font-size:12px;color:#6b7c93;flex:1">' + escHtml(r.celulaLabel) + '</span>' +
                  '<span class="home-pill" style="background:' + (r.presente ? '#e0f4ef' : '#f7e2e2') + ';color:' + (r.presente ? '#0E7A68' : '#a02020') + '">' + (r.presente ? 'Presente' : 'Ausente') + '</span>' +
                  '</div>';
              }).join('') + '</div>'
            : '<div class="home-card-sub" style="margin-top:12px">Nenhuma presença registrada para essa pessoa.</div>'))
        : '') +
      '</div>';
    return html;
  }

  function frequenciaHtml(v) {
    var aba = function (chave, label) {
      var ativo = v.tab === chave;
      return '<button type="button" ' + cb(v.setTab(chave)) + ' style="padding:9px 16px;border:1px solid ' + (ativo ? '#1B2344' : '#d4deea') + ';border-radius:999px;background:' + (ativo ? '#1B2344' : '#fff') + ';color:' + (ativo ? '#fff' : '#4a5b70') + ';font-size:13px;font-weight:700;cursor:pointer">' + label + '</button>';
    };
    var html = '<div class="home"><div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 14px">' +
      aba('lancar', 'Lançar') + aba('historico', 'Histórico') + aba('painel', 'Painel') +
      '</div>';
    html += v.tab === 'painel' ? freqPainelHtml(v) : (v.tab === 'historico' ? freqHistoricoHtml(v) : freqLancarHtml(v));
    return html + '</div>';
  }

  // ---------------------------------------------------------------------
  // Oikos IA — tela
  // ---------------------------------------------------------------------

  // Markdown mínimo (negrito, listas, tabelas e títulos) — o suficiente
  // pra resposta ficar legível sem trazer biblioteca nenhuma.
  function iaTextoHtml(texto) {
    var linhas = String(texto || '').split('\n');
    var html = '', lista = null, tabela = null;
    var inline = function (t) {
      return escHtml(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
    };
    var fecharLista = function () {
      if (!lista) return;
      html += '<ul style="margin:8px 0 8px 18px;padding:0;display:flex;flex-direction:column;gap:5px">' +
        lista.map(function (i) { return '<li style="font-size:13.5px;line-height:1.55">' + inline(i) + '</li>'; }).join('') + '</ul>';
      lista = null;
    };
    var fecharTabela = function () {
      if (!tabela || !tabela.length) { tabela = null; return; }
      var cabecalho = tabela[0];
      var corpo = tabela.slice(1);
      html += '<div class="table-scroll" style="margin:10px 0"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="background:#f7f9fc">' +
        cabecalho.map(function (c) { return '<th style="text-align:left;padding:8px 12px;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:#7b8aa0;font-weight:700;border-bottom:1px solid #e6ecf4">' + inline(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        corpo.map(function (linha) {
          return '<tr style="border-bottom:1px solid #f0f4f9">' +
            linha.map(function (c) { return '<td style="padding:9px 12px;color:#14243a">' + inline(c) + '</td>'; }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div>';
      tabela = null;
    };

    linhas.forEach(function (linha) {
      var t = linha.trim();
      if (/^\|/.test(t)) {
        var celulas = t.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        if (celulas.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;  // separador
        (tabela || (tabela = [])).push(celulas);
        return;
      }
      fecharTabela();
      if (!t) { fecharLista(); return; }
      if (/^[-*•]\s+/.test(t)) { (lista || (lista = [])).push(t.replace(/^[-*•]\s+/, '')); return; }
      fecharLista();
      if (/^#{1,6}\s+/.test(t)) {
        html += '<div style="font-size:14.5px;font-weight:800;margin:12px 0 4px;color:#14243a">' + inline(t.replace(/^#{1,6}\s+/, '')) + '</div>';
        return;
      }
      html += '<p style="margin:8px 0;font-size:13.5px;line-height:1.6;color:#14243a">' + inline(t) + '</p>';
    });
    fecharLista(); fecharTabela();
    return html;
  }

  function oikosIaHtml(vals) {
    var html = '<div class="home">';

    html += '<div class="home-card" style="margin-top:16px">' +
      '<div class="home-card-title">Pergunte sobre a rede</div>' +
      '<div class="home-card-sub">As respostas saem só dos dados lançados no Oikos, dentro do que a sua permissão alcança. Sem dado, o Oikos IA diz que não sabe — não inventa.</div>' +
      '<form ' + cb(vals.enviarIa, 'submit') + ' style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">' +
      '<input type="text" id="ia-pergunta" value="' + escHtml(vals.iaPergunta) + '" ' + cb(vals.onIaPergunta, 'input') + ' placeholder="Ex: quais células caíram de frequência no último mês?" style="flex:1;min-width:220px;padding:12px 14px;border:1px solid #d4deea;border-radius:12px;font-size:14px;background:#fff">' +
      '<button type="submit"' + (vals.iaCarregando ? ' disabled' : '') + ' style="padding:12px 20px;border:none;border-radius:999px;background:linear-gradient(135deg,#1B2344,#2a4290);color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.iaCarregando ? 'Consultando…' : 'Perguntar') + '</button>' +
      '</form>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      vals.iaSugestoes.map(function (s) {
        return '<button type="button" ' + cb(vals.perguntarSugestao(s)) + ' style="padding:8px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#2E4FC7;cursor:pointer">' + escHtml(s) + '</button>';
      }).join('') +
      '</div></div>';

    if (vals.iaConversa.length) {
      html += '<div style="display:flex;justify-content:flex-end;margin:14px 0 0">' +
        '<button type="button" ' + cb(vals.limparIa) + ' style="border:none;background:none;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">Limpar conversa</button></div>';
    }

    html += vals.iaConversa.slice().reverse().map(function (item) {
      return '<div class="home-card" style="margin-top:12px">' +
        '<div style="font-size:13.5px;font-weight:800;color:#2E4FC7;margin-bottom:8px">' + escHtml(item.pergunta) + '</div>' +
        (item.erro
          ? '<div style="background:#f7e2e2;color:#a02020;border-radius:12px;padding:10px 14px;font-size:12.5px;font-weight:600">' + escHtml(item.erro) + '</div>'
          : iaTextoHtml(item.resposta)) +
        '</div>';
    }).join('');

    if (vals.iaCarregando) {
      html += '<div class="home-card" style="margin-top:12px;color:#7b8aa0;font-size:13px">Consultando os dados do Oikos…</div>';
    }

    return html + '</div>';
  }

  // Cabeçalho das demais telas, no mesmo padrão do destaque do Início.
  var PAGE_HEADERS = {
    cadastro: ['Cadastro de Membros', 'Pessoas, indicadores e gráficos da rede'],
    freq: ['Frequência', 'Lançamento semanal da célula e do culto'],
    ia: ['Oikos IA', 'Pergunte em português sobre os dados da rede'],
    trilho: ['Trilho do Vencedor', 'Ceifeiros, Maturidade, CTL e Seminário Pastoral'],
    mov: ['Movimentações', 'Histórico de mudanças, perdidos e inativos'],
    novo: ['Novo Cadastro', 'Preencha os dados da pessoa. Fica salvo no banco e soma aos totais e gráficos.'],
    editar: ['Editar Cadastro', 'Mudanças de célula, posição, batismo ou encontro ficam registradas em Movimentações.'],
    hierarquia: ['Administração', 'Células, liderança e quem responde por cada célula'],
    anon: ['Cadastro de Membros', 'Consulta pública · entre para ver telefone, nascimento e histórico'],
  };

  function pageHeaderHtml(vals) {
    var key = vals.anonMode ? 'anon'
      : vals.isNovo ? (vals.isEditingMembro ? 'editar' : 'novo')
      : vals.isFreq ? 'freq' : vals.isIa ? 'ia'
      : vals.isTrilho ? 'trilho'
      : vals.isMov ? 'mov' : vals.isHierarquia ? 'hierarquia' : 'cadastro';
    var h = PAGE_HEADERS[key];
    return '<section class="home-hero page-hero">' +
      '<div class="home-brand">Sistema OIKOS</div>' +
      '<div class="page-hero-title">' + escHtml(h[0]) + '</div>' +
      '<div class="home-sub">' + escHtml(h[1]) + '</div>' +
      '</section>';
  }

  function personRow(p) {
    return '<tr ' + cb(p.onSelect) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9">' +
      '<td style="padding:11px 12px;text-align:right;color:#8a99ab;font-variant-numeric:tabular-nums">' + escHtml(p.numeroLabel) + '</td>' +
      '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(p.nome) + '</td>' +
      '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(p.celulaLabel) + '</td>' +
      '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(p.posicao) + '</td>' +
      '<td style="padding:11px 12px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:' + p.batBg + ';color:' + p.batFg + '">' + escHtml(p.batizado) + '</span></td>' +
      '<td style="padding:11px 12px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:' + p.encBg + ';color:' + p.encFg + '">' + escHtml(p.encontro) + '</span></td>' +
      '<td style="padding:11px 12px;text-align:center;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(p.nascLabel) + '</td>' +
      '<td style="padding:11px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(p.idadeLabel) + '</td></tr>';
  }

  function detailDrawerHtml(vals) {
    var sel = vals.sel;
    return '<div ' + cb(vals.closeDetail) + ' style="position:fixed;inset:0;background:rgba(20,36,58,.34);z-index:40;display:flex;justify-content:flex-end">' +
      '<div ' + cb(vals.stop) + ' style="width:380px;max-width:92vw;height:100%;background:#fff;box-shadow:-8px 0 30px rgba(20,36,58,.2);overflow:auto;padding:26px 26px 40px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
      '<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(150deg,#149C88,#1B2344);color:#fff;display:flex;align-items:center;justify-content:center;font-family:\'Spectral\',serif;font-weight:700;font-size:20px">' + escHtml(sel.initials) + '</div>' +
      '<button ' + cb(vals.closeDetail) + ' style="border:none;background:#eef2f7;width:32px;height:32px;border-radius:8px;cursor:pointer;color:#6b7c93;font-size:16px">✕</button>' +
      '</div>' +
      '<h2 style="font-family:\'Spectral\',serif;font-weight:700;font-size:21px;margin:16px 0 3px;line-height:1.2">' + escHtml(sel.nome) + '</h2>' +
      '<div style="font-size:13px;color:#6b7c93;margin-bottom:14px">' + escHtml(sel.posicao) + ' · ' + escHtml(sel.tipo) + '</div>' +
      '<button ' + cb(sel.onEdit) + ' style="margin-bottom:16px;padding:9px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">Editar cadastro</button>' +
      '<div style="display:flex;flex-direction:column;gap:1px;background:#eef2f7;border-radius:12px;overflow:hidden">' +
      sel.fields.map(function (f) {
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 15px;background:#fff">' +
          '<div style="font-size:12.5px;color:#6b7c93">' + escHtml(f.label) + '</div>' +
          '<div style="font-size:13px;color:#14243a;font-weight:600;text-align:right">' + escHtml(f.value) + '</div></div>';
      }).join('') +
      '</div>' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:14px;margin:22px 0 10px">Histórico</div>' +
      (sel.historico.length
        ? '<div style="display:flex;flex-direction:column;gap:10px">' +
          sel.historico.map(function (h) {
            return '<div style="padding:10px 12px;background:#f5f8fc;border-radius:9px">' +
              '<div style="font-size:11px;color:#6b7c93;font-weight:600">' + escHtml(h.data) + ' · ' + escHtml(h.campoLabel) + '</div>' +
              '<div style="font-size:12.5px;color:#14243a;margin-top:2px">' + escHtml(h.desc) + '</div></div>';
          }).join('') +
          '</div>'
        : '<div style="font-size:12.5px;color:#6b7c93">Sem registros ainda.</div>') +
      '<div style="margin-top:14px;display:flex;gap:8px">' +
      '<input type="text" id="nota-input" value="' + escHtml(sel.novaNota) + '" ' + cb(sel.onNota, 'input') + ' placeholder="Adicionar nota…" style="flex:1;padding:9px 12px;border:1px solid #d4deea;border-radius:9px;font-size:13px">' +
      '<button ' + cb(sel.registrarNota) + ' style="padding:9px 14px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer">Adicionar</button>' +
      '</div>' +
      '</div></div>';
  }

  function selectField(label, cbAttr, options, current, placeholder) {
    return '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">' + escHtml(label) + '</label>' +
      '<select ' + cbAttr + (placeholder ? ' required' : '') + ' style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;background:#fff">' +
      (placeholder ? opt('', placeholder, current === '') : '') +
      options.map(function (o) { return opt(o.v, o.label, current === o.v); }).join('') +
      '</select></div>';
  }

  // Como selectField, mas a opção em branco nunca é "required" — pra
  // campos opcionais de verdade (ex: discipulador/obreiro responsável
  // ainda não definido).
  function optionalSelectField(label, cbAttr, options, current, emptyLabel) {
    return '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">' + escHtml(label) + '</label>' +
      '<select ' + cbAttr + ' style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;background:#fff">' +
      opt('', emptyLabel || 'Nenhum', current === '') +
      options.map(function (o) { return opt(o.v, o.label, current === o.v); }).join('') +
      '</select></div>';
  }

  function simNaoField(label, cbAttr, current) {
    return selectField(label, cbAttr, [{ v: 'Não', label: 'Não' }, { v: 'Sim', label: 'Sim' }], current);
  }

  // Vínculo de cônjuge — só aparece com estado civil "Casado (a)".
  // É opcional; ao salvar, o cônjuge herda célula e situação.
  function conjugeField(vals, f) {
    var selecionado = f.conjugeId
      ? '<div style="display:flex;align-items:center;gap:10px;margin-top:5px;padding:10px 12px;border:1px solid #d3e7dd;border-radius:9px;background:#f2f9f6">' +
        '<div style="flex:1;font-size:13.5px;font-weight:600;color:#237a5a">' + escHtml(f.conjugeNome || 'Cônjuge vinculado') + '</div>' +
        '<button type="button" ' + cb(vals.limparConjuge) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12px;font-weight:600;cursor:pointer">Remover</button>' +
        '</div>'
      : '<input type="text" id="novo-conjuge" value="' + escHtml(f.conjugeQuery || '') + '" ' + cb(vals.onNF('conjugeQuery'), 'input') + ' placeholder="Buscar pelo nome…" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box">' +
        (vals.conjugeBusca.length
          ? '<div style="margin-top:8px;max-height:160px;overflow:auto;display:flex;flex-direction:column;gap:5px">' +
            vals.conjugeBusca.map(function (m) {
              return '<button type="button" ' + cb(vals.pickConjuge(m)) + ' style="text-align:left;padding:8px 10px;border:1px solid #e2e9f2;border-radius:8px;background:#fff;cursor:pointer;font-size:12.5px">' +
                '<b style="color:#14243a">' + escHtml(m.nome) + '</b> <span style="color:#6b7c93">· ' + escHtml(m.posicao) + (m.celula ? ' · ' + escHtml(celulaLabel(m.celula)) : '') + '</span></button>';
            }).join('') + '</div>'
          : ((f.conjugeQuery || '').trim() ? '<div style="margin-top:8px;font-size:12.5px;color:#6b7c93">Ninguém encontrado.</div>' : ''));

    return '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Cônjuge <span style="font-weight:500;color:#8a99ab">(opcional)</span></label>' +
      selecionado +
      '<div style="font-size:11.5px;color:#8a99ab;margin-top:6px">Ao salvar, o cônjuge passa a ter a mesma célula, posição, situação e nível de acesso deste cadastro.</div></div>';
  }

  function novoHtml(vals) {
    var f = vals.novoForm;
    var editing = vals.isEditingMembro;
    // Título e explicação ficam no cabeçalho da página (pageHeaderHtml).
    var html = '<div style="max-width:720px;margin:18px auto 60px">';

    if (vals.novoSalvo && !editing) {
      html += '<div style="background:#e2f2ea;color:#237a5a;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;margin-bottom:16px">Pessoa cadastrada com sucesso.</div>';
    }
    if (vals.novoError) {
      html += '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:600;margin-bottom:16px">Erro: ' + escHtml(vals.novoError) + '</div>';
    }

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:24px;box-shadow:0 1px 2px rgba(20,36,58,.04);display:flex;flex-direction:column;gap:16px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
      '<input type="text" id="novo-nome" value="' + escHtml(f.nome) + '" ' + cb(vals.onNF('nome'), 'input') + ' placeholder="Nome da pessoa" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box" /></div>' +

      '<div class="grid-form2">' +
      selectField('Tipo de cadastro', cb(vals.onNF('tipo'), 'change'), TIPO_OPTIONS, f.tipo) +
      (celulaObrigatoria(posicaoDe(f.status, f.funcao))
        // Sem placeholder quando já tem uma célula válida (comportamento de sempre).
        // Com placeholder "Selecionar" (e required) quando está vazia — evita
        // salvar sem célula ao trocar a posição de liderança sênior pra uma
        // que exige célula no meio da edição.
        ? selectField('Célula', cb(vals.onNF('celula'), 'change'), vals.celulaOptionsForm, f.celula, f.celula ? undefined : 'Selecionar')
        : '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Célula</label>' +
          '<div style="margin-top:5px;padding:10px 12px;border:1px dashed #d4deea;border-radius:9px;font-size:12.5px;color:#8a99ab">Não se aplica a esta posição</div></div>') +
      '</div>' +

      // Jornada e função são coisas diferentes: a pessoa anda
      // Visitante → FA → Membro, e sobre isso pode receber uma função.
      '<div class="grid-form2">' +
      selectField('Status na igreja', cb(vals.onNF('status'), 'change'), STATUS_OPTIONS, f.status) +
      optionalSelectField('Função ministerial', cb(vals.onNF('funcao'), 'change'), FUNCAO_OPTIONS, f.funcao, 'Nenhuma') +
      '</div>' +
      (f.funcao === 'Anfitrião' && f.status !== 'Membro'
        ? '<div style="background:#faf1de;color:#a1780f;border-radius:12px;padding:10px 14px;font-size:12.5px;font-weight:600">Anfitrião precisa estar como Membro.</div>'
        : '') +
      '<div class="grid-form2">' +
      optionalSelectField('Supervisor direto (opcional)', cb(vals.onNF('supervisorId'), 'change'), vals.supervisorOptions, f.supervisorId, 'Nenhum') +
      selectField('Estado civil', cb(vals.onNF('civil'), 'change'), [
        { v: 'Solteiro (a)', label: 'Solteiro(a)' }, { v: 'Casado (a)', label: 'Casado(a)' }, { v: 'Amasiado (a)', label: 'Amasiado(a)' },
        { v: 'Divorciado(a)', label: 'Divorciado(a)' }, { v: 'Viuvo (a)', label: 'Viúvo(a)' }
      ], f.civil) +
      '</div>' +

      (f.civil === 'Casado (a)' ? conjugeField(vals, f) : '') +

      '<div class="grid-form2">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Data de nascimento</label>' +
      '<input type="date" id="novo-nasc" value="' + escHtml(f.nasc) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box" /></div>' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone de contato</label>' +
      '<input type="text" id="novo-tel" value="' + escHtml(f.tel) + '" ' + cb(vals.onNF('tel'), 'input') + ' placeholder="(00) 00000-0000" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box" /></div>' +
      '</div>' +

      '<div class="grid-form2">' +
      simNaoField('Foi batizado?', cb(vals.onNF('batizado'), 'change'), f.batizado) +
      simNaoField('Já fez o Encontro com Deus?', cb(vals.onNF('encontro'), 'change'), f.encontro) +
      '</div>' +

      '<div style="font-size:12px;color:#6b7c93;font-weight:600;margin-top:6px">Trilho do Vencedor</div>' +
      '<div class="grid-form4">' +
      simNaoField('Ceifeiros', cb(vals.onNF('ceifeiros'), 'change'), f.ceifeiros) +
      simNaoField('Maturidade', cb(vals.onNF('maturidade'), 'change'), f.maturidade) +
      simNaoField('CTL', cb(vals.onNF('ctl'), 'change'), f.ctl) +
      simNaoField('Seminário Pastoral', cb(vals.onNF('seminario'), 'change'), f.seminario) +
      '</div>' +

      (editing ? (
        '<div style="font-size:12px;color:#6b7c93;font-weight:600;margin-top:6px">Saída da rede</div>' +
        '<div class="grid-form2">' +
        selectField('Situação', cb(vals.onNF('situacao'), 'change'), SITUACAO_OPTIONS, f.situacao) +
        '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Detalhe (opcional)</label>' +
        '<input type="text" id="novo-saida-detalhe" value="' + escHtml(f.saidaDetalhe) + '" ' + cb(vals.onNF('saidaDetalhe'), 'input') + ' placeholder="Ex: célula/rede/igreja para onde foi" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box" /></div>' +
        '</div>'
      ) : '') +

      '<div style="display:flex;gap:10px;margin-top:8px">' +
      '<button ' + cb(vals.submitNovoMembro) + (vals.novoSaving ? ' disabled' : '') + ' style="flex:1;padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.novoSaving ? 'Salvando…' : (editing ? 'Salvar alterações' : 'Cadastrar pessoa')) + '</button>' +
      (editing ? '<button ' + cb(vals.cancelEditMembro) + ' style="padding:12px 18px;border:1px solid #d4deea;border-radius:9px;background:#fff;color:#6b7c93;font-size:14px;font-weight:600;cursor:pointer">Cancelar</button>' : '') +
      '</div>' +
      '</div></div>';

    return html;
  }

  function trilhoHtml(vals) {
    var courseValues = { ceifeiros: 'Ceifeiros', maturidade: 'Maturidade', ctl: 'CTL', seminario: 'Seminário Pastoral' };
    var html = '<div>';

    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<select ' + cb(vals.onTCelula, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os líderes / células', vals.trilhoFilters.celula === '') +
      vals.trilhoCelulaOptions.map(function (o) { return opt(o.v, o.label, vals.trilhoFilters.celula === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onTCurso, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os cursos', vals.trilhoFilters.curso === '') +
      Object.keys(courseValues).map(function (k2) { return opt(k2, courseValues[k2], vals.trilhoFilters.curso === k2); }).join('') +
      '</select>' +
      '<button ' + cb(vals.clearTFilters) + ' style="padding:10px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#6b7c93;font-weight:600;cursor:pointer">Limpar</button>' +
      '</div>';

    html += '<div class="grid-kpi4" style="margin-bottom:16px">' +
      vals.trilhoKpis.map(function (k) {
        return '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
          '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b7c93;font-weight:600">' + escHtml(k.label) + '</div>' +
          '<div style="display:flex;align-items:baseline;gap:6px;margin-top:6px"><div style="font-family:\'Spectral\',serif;font-weight:700;font-size:32px;color:' + k.color + ';line-height:1.1">' + k.pct + '</div><div style="font-size:13px;color:#6b7c93">%</div></div>' +
          '<div style="font-size:12px;color:#6b7c93;margin-top:2px">' + k.done + ' de ' + k.total + ' adultos e jovens concluíram</div></div>';
      }).join('') +
      '</div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04);margin-bottom:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Volume de pessoas por curso, por célula</div>' +
      '<div style="font-size:11px;color:#6b7c93;display:flex;gap:14px">' +
      vals.trilhoCourses.map(function (tc) { return '<span><b style="color:' + tc.color + '">■</b> ' + escHtml(tc.label) + '</span>'; }).join('') +
      '</div></div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Quantidade de adultos e jovens que concluíram cada curso, empilhado por célula · clique no nome para filtrar</div>' +
      '<div style="display:flex;flex-direction:column;gap:13px">' +
      vals.trilhoStackedBars.map(function (c) {
        return '<div ' + cb(c.onClick) + ' style="cursor:pointer;padding:4px 5px;border-radius:8px;background:' + c.bg + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">' +
          '<div style="font-size:13px;color:#14243a;font-weight:' + c.weight + '">' + escHtml(c.label) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93">' + escHtml(c.summary) + '</div></div>' +
          '<div style="height:20px;background:#eef2f7;border-radius:6px;overflow:hidden;display:flex;width:' + c.totalW + '">' +
          c.segs.map(function (s) { return '<div title="' + escHtml(s.title) + '" style="height:100%;width:' + s.w + ';background:' + s.color + '"></div>'; }).join('') +
          '</div></div>';
      }).join('') +
      '</div></div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Cursos por pessoa <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.trilhoRows.length + ' adultos e jovens</span></div>' +
      '<div style="display:flex;gap:8px">' +
      '<button ' + cb(vals.shareTrilhoWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' WhatsApp</button>' +
      '<button ' + cb(vals.downloadTrilhoPdf) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B2344" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg> Baixar PDF</button>' +
      '</div></div>' +
      '<div class="table-scroll" style="max-height:440px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Cursos concluídos</th>' +
      '</tr></thead><tbody>' +
      vals.trilhoRows.map(function (t) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(t.nome) + '</td>' +
          '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(t.celulaLabel) + '</td>' +
          '<td style="padding:11px 22px;color:#4a5b70">' + escHtml(t.cursosLabel) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    html += '</div>';
    return html;
  }

  // Tabela usada pelas duas listas de quem está fora da contagem
  // (Inativos e Transferidos/perdidos). A linha abre a ficha do membro.
  function foraDaContagemTabela(rows, vazioTexto) {
    var th = function (label, align, padding) {
      return '<th style="text-align:' + align + ';padding:9px ' + padding + ';font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
    };
    if (!rows.length) return '<div style="padding:20px 22px;font-size:12.5px;color:#6b7c93">' + escHtml(vazioTexto) + '</div>';
    return '<div class="table-scroll" style="max-height:300px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      th('Nº', 'right', '12px') + th('Nome', 'left', '22px') + th('Posição', 'left', '12px') +
      th('Situação', 'left', '12px') + th('Detalhe', 'left', '22px') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr ' + cb(r.onSelect) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:9px 12px;text-align:right;color:#8a99ab;font-variant-numeric:tabular-nums">' + escHtml(r.numeroLabel) + '</td>' +
          '<td style="padding:9px 22px;font-weight:600;color:#14243a">' + escHtml(r.nome) + ' <span style="font-weight:500;color:#6b7c93">· ' + escHtml(r.celulaLabel) + '</span></td>' +
          '<td style="padding:9px 12px;color:#4a5b70">' + escHtml(r.posicao) + '</td>' +
          '<td style="padding:9px 12px;color:#4a5b70">' + escHtml(r.situacaoLabel) + '</td>' +
          '<td style="padding:9px 22px;color:#4a5b70">' + escHtml(r.detalhe) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  // Movimentações: indicadores no topo, filtros, o histórico (que é o
  // conteúdo principal) e, no fim, as listas de quem está fora da
  // contagem — em abas, para uma tabela larga de cada vez em vez de duas
  // espremidas lado a lado.
  function movimentacoesHtml(vals) {
    var campoOptions = Object.keys(MOVIMENTACAO_LABELS).map(function (k) { return { v: k, label: MOVIMENTACAO_LABELS[k] }; });
    var filtrando = !!(vals.movFilters.celula || vals.movFilters.campo);
    var transferidos = vals.sairamRows.length - vals.totalPerdidos;
    var html = '<div class="home">';

    html += '<div class="home-kpis home-kpis-4">' +
      homeKpi('trocas', vals.movRows.length, 'Movimentações', filtrando ? 'no filtro atual' : 'registradas') +
      homeKpi('transferidos', transferidos < 0 ? 0 : transferidos, 'Transferidos', 'outra célula, rede ou igreja') +
      homeKpi('perdidos', vals.totalPerdidos, 'Perdidos', 'saíram e não seguem em outra igreja') +
      homeKpi('inativos', vals.inativosRows.length, 'Inativos', 'cadastrados, fora dos totais') +
      '</div>';

    // Perdidos por célula vira uma linha de etiquetas — só aparece quando
    // existe alguém, em vez de um cartão grande e vazio.
    if (vals.perdidosRows.length) {
      html += '<div class="home-card" style="margin-top:14px">' +
        '<div class="home-card-title">Perdidos por célula</div>' +
        '<div class="home-card-sub">Só quem saiu como "Perdido" — transferidos não entram nesta conta.</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
        vals.perdidosRows.map(function (r) {
          return '<span style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#fbe7e5;color:#B0281E;font-size:12.5px;font-weight:700">' +
            escHtml(r.celula) + '<b style="font-size:13px">' + r.qtd + '</b></span>';
        }).join('') +
        '</div></div>';
    }

    // ---- Histórico (conteúdo principal da tela) ----
    html += '<div class="home-section">' +
      '<div><div class="home-section-title">Histórico de movimentações</div>' +
      '<div class="home-card-sub">Toda mudança de célula, status, função, batismo, encontro e situação, além das notas.</div></div>' +
      '</div>';

    html += '<div class="home-card" style="margin-bottom:14px">' +
      '<div class="grid-form2">' +
      optionalSelectField('Célula', cb(vals.onMFCelula, 'change'), vals.movCelulaOptions, vals.movFilters.celula, 'Todas as células') +
      optionalSelectField('Tipo de mudança', cb(vals.onMFCampo, 'change'), campoOptions, vals.movFilters.campo, 'Todos os tipos') +
      '</div>' +
      (filtrando
        ? '<button type="button" ' + cb(vals.limparMovFiltros) + ' style="margin-top:12px;padding:8px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#6b7c93;cursor:pointer">Limpar filtros</button>'
        : '') +
      '</div>';

    var th = function (label, align, pad) {
      return '<th style="text-align:' + align + ';padding:10px ' + (pad || '12px') + ';font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
    };
    var corCampo = {
      celula: ['#e6ecfb', '#2E4FC7'], posicao: ['#efe8f8', '#6B3FA0'], status_pessoa: ['#e0f4ef', '#0E7A68'],
      funcao: ['#fdf1da', '#A1780F'], batizado: ['#dcf3ef', '#0E7A68'], encontro: ['#e4eefa', '#2E4FC7'],
      situacao_saida: ['#fbe7e5', '#B0281E'], nota: ['#eef2f7', '#5a6b80'],
    };
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div class="table-scroll" style="max-height:560px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      th('Data', 'left', '22px') + th('Pessoa', 'left') + th('Tipo', 'left') + th('Mudança', 'left', '22px') +
      '</tr></thead><tbody>' +
      vals.movRows.map(function (r) {
        var cor = corCampo[r.campo] || ['#eef2f7', '#5a6b80'];
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 22px;color:#6b7c93;font-variant-numeric:tabular-nums;white-space:nowrap">' + escHtml(r.dataLabel) + '</td>' +
          '<td style="padding:11px 12px;min-width:0"><div style="font-weight:700;color:#14243a">' + escHtml(r.nome) + '</div>' +
          '<div style="font-size:11.5px;color:#8a99ab">' + escHtml(r.celulaLabel) + '</div></td>' +
          '<td style="padding:11px 12px"><span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11.5px;font-weight:700;background:' + cor[0] + ';color:' + cor[1] + ';white-space:nowrap">' + escHtml(r.campoLabel) + '</span></td>' +
          '<td style="padding:11px 22px;color:#4a5b70">' + escHtml(r.desc) + '</td></tr>';
      }).join('') +
      (vals.movRows.length ? '' : '<tr><td colspan="4" style="padding:20px 22px;color:#8a99ab;font-size:12.5px">' +
        (vals.movStatus === 'loading' ? 'Carregando…' : (filtrando ? 'Nenhuma movimentação com esses filtros.' : 'Nenhuma movimentação registrada ainda.')) + '</td></tr>') +
      '</tbody></table></div></div>';

    // ---- Quem está fora da contagem: uma lista de cada vez ----
    var aba = function (chave, label, n) {
      var ativo = vals.movLista === chave;
      return '<button type="button" ' + cb(vals.setMovLista(chave)) + ' style="padding:9px 16px;border:1px solid ' + (ativo ? '#1B2344' : '#d4deea') + ';border-radius:999px;background:' + (ativo ? '#1B2344' : '#fff') + ';color:' + (ativo ? '#fff' : '#4a5b70') + ';font-size:13px;font-weight:700;cursor:pointer">' + label + ' · ' + n + '</button>';
    };
    var inativos = vals.movLista === 'inativos';
    html += '<div class="home-section">' +
      '<div><div class="home-section-title">Fora dos totais</div>' +
      '<div class="home-card-sub">' + (inativos
        ? 'Continuam cadastrados, mas não entram em nenhum total por célula.'
        : 'Transferidos e perdidos.') + ' Clique numa linha para abrir a ficha e editar.</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      aba('fora', 'Transferidos e perdidos', vals.sairamRows.length) +
      aba('inativos', 'Inativos', vals.inativosRows.length) +
      '</div></div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      (inativos
        ? foraDaContagemTabela(vals.inativosRows, 'Ninguém inativo no momento.')
        : foraDaContagemTabela(vals.sairamRows, 'Ninguém transferido ou perdido.')) +
      '</div>';

    // Mesma ficha da aba Cadastro, pra abrir/editar quem está fora da contagem.
    if (vals.selected) html += detailDrawerHtml(vals);

    html += '</div>';
    return html;
  }

  function loginHtml(vals) {
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:360px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      '<div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#0E7A68;font-weight:800;margin-bottom:6px">Sistema OIKOS</div>' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Entrar</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Acesso restrito aos líderes da Videira SCS.</div>' +
      (vals.loginError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">' + escHtml(vals.loginError) + '</div>' : '') +
      '<form ' + cb(vals.doLogin, 'submit') + ' style="display:flex;flex-direction:column;gap:12px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail</label>' +
      '<input type="email" id="login-email" value="' + escHtml(vals.loginForm.email) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Senha</label>' +
      '<input type="password" id="login-senha" value="' + escHtml(vals.loginForm.senha) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<button type="submit"' + (vals.loginLoading ? ' disabled' : '') + ' style="margin-top:4px;padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.loginLoading ? 'Entrando…' : 'Entrar') + '</button>' +
      '</form>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:16px 0 14px">' +
      '<div style="flex:1;height:1px;background:#e2e9f2"></div>' +
      '<div style="font-size:11px;color:#8a99ab;font-weight:600">ou</div>' +
      '<div style="flex:1;height:1px;background:#e2e9f2"></div>' +
      '</div>' +
      '<button ' + cb(vals.loginComGoogle) + ' style="display:flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:11px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13.5px;font-weight:600;color:#14243a;cursor:pointer">' +
      googleIcon + ' Continuar com Google</button>' +
      '<div style="margin-top:16px;text-align:center;display:flex;flex-direction:column;gap:8px">' +
      (vals.voltarDoLogin ? '<button ' + cb(vals.voltarDoLogin) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">← Ver cadastro sem entrar</button>' : '') +
      '<button ' + cb(vals.irParaCadastroPublico) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">Sou visitante, quero me cadastrar</button>' +
      '</div></div></div>';
  }

  // "Já sou líder" — mesmo cartão do cadastro público. Etapas: inicio
  // (nome + função [+ célula]) → lista (Discipulador/Obreiro/Pastor
  // clicam no próprio nome) → novo (não está na lista) → enviado.
  function solicitacaoLiderancaHtml(v) {
    var f = v.lidForm;
    var campo = 'width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box';
    var rotuloFuncao = (FUNCOES_SOLICITACAO.filter(function (o) { return o.v === f.funcao; })[0] || {}).label || f.funcao;
    var corpo = '';
    // type=text + inputmode=email: com type=email o cursor pula a cada
    // tecla, porque a tela é redesenhada enquanto se digita.
    var campoEmail = '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail</label>' +
      '<input type="text" inputmode="email" autocomplete="email" autocapitalize="none" id="lid-email" value="' + escHtml(f.email) + '" ' + cb(v.onLid('email'), 'input') + ' placeholder="seuemail@gmail.com" style="' + campo + '">' +
      '<div style="font-size:11.5px;color:#8a99ab;margin-top:4px">É com ele que o administrador vai criar o seu acesso.</div></div>';

    var titulo = function (t, sub) {
      return '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">' + escHtml(t) + '</div>' +
        '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:18px">' + escHtml(sub) + '</div>';
    };
    var erro = v.lidErro
      ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">' + escHtml(v.lidErro) + '</div>'
      : '';
    var botao = function (texto, extra) {
      return '<button ' + (extra || 'type="submit"') + (v.lidSaving ? ' disabled' : '') + ' style="width:100%;padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' +
        (v.lidSaving ? 'Enviando…' : escHtml(texto)) + '</button>';
    };

    if (f.etapa === 'enviado' && v.lidResultado) {
      corpo = titulo(v.lidResultado.titulo, 'Liderança da Videira SCS') +
        '<div style="background:#e2f2ea;color:#237a5a;border-radius:12px;padding:14px;font-size:13.5px;font-weight:600;line-height:1.5">' + escHtml(v.lidResultado.texto) + '</div>';
    } else if (f.etapa === 'lista') {
      var posicoes = POSICOES_DA_FUNCAO[f.funcao] || [];
      var lista = (v.membersPublicos || []).filter(function (p) { return posicoes.indexOf(p.posicao) >= 0; })
        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
      var plural = { 'Discipulador': 'discipuladores', 'Obreiro': 'obreiros e pastores de rede', 'Pastor': 'pastores' }[f.funcao] || 'líderes';
      corpo = titulo('Encontre o seu nome', 'Estes são os ' + plural + ' cadastrados. Toque no seu nome.') + erro +
        '<div style="display:flex;flex-direction:column;gap:6px;max-height:44vh;overflow:auto">' +
        lista.map(function (p) {
          return '<button type="button" ' + cb(v.escolher(p)) + (v.lidSaving ? ' disabled' : '') + ' style="text-align:left;padding:12px 14px;border:1px solid #e2e9f2;border-radius:11px;background:#fff;cursor:pointer;font-size:14px;font-weight:700;color:#14243a">' +
            escHtml(p.nome) + ' <span style="font-size:11.5px;font-weight:600;color:#8a99ab">· ' + escHtml(p.posicao) + '</span></button>';
        }).join('') +
        (lista.length ? '' : '<div style="font-size:12.5px;color:#8a99ab;padding:8px 2px">' + (v.membersPublicosStatus === 'loading' ? 'Carregando…' : 'Ninguém cadastrado com essa função ainda.') + '</div>') +
        '</div>' +
        '<button type="button" ' + cb(v.naoEstou) + ' style="width:100%;margin-top:14px;padding:11px;border:1px dashed #c9d6ea;border-radius:11px;background:#fff;font-size:13px;font-weight:700;color:#0E7A68;cursor:pointer">Meu nome não está na lista</button>' +
        '<div style="margin-top:12px;text-align:center"><button type="button" ' + cb(v.voltarInicio) + ' style="border:none;background:none;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">← Voltar</button></div>';
    } else if (f.etapa === 'novo') {
      corpo = titulo('Cadastro de ' + rotuloFuncao, 'Preencha seus dados. O administrador do sistema confere e libera o seu acesso à rede.') + erro +
        '<form ' + cb(v.enviarNovo, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
        '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
        '<input type="text" id="lid-nome" value="' + escHtml(f.nome) + '" ' + cb(v.onLid('nome'), 'input') + ' style="' + campo + '"></div>' +
        campoEmail +
        '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone (opcional)</label>' +
        '<input type="text" id="lid-tel" value="' + escHtml(f.tel) + '" ' + cb(v.onLid('tel'), 'input') + ' placeholder="(00) 00000-0000" style="' + campo + '"></div>' +
        botao('Enviar cadastro') +
        '</form>' +
        '<div style="margin-top:12px;text-align:center"><button type="button" ' + cb(v.voltarInicio) + ' style="border:none;background:none;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">← Voltar</button></div>';
    } else {
      var celulaOpts = (v.celulasPublicas || []).map(function (c) { return { v: c, label: celulaLabel(c) }; });
      corpo = titulo('Já sou líder', 'Conte quem você é e qual a sua função na rede.') + erro +
        '<form ' + cb(v.continuar, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
        '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
        '<input type="text" id="lid-nome" value="' + escHtml(f.nome) + '" ' + cb(v.onLid('nome'), 'input') + ' placeholder="Seu nome" style="' + campo + '"></div>' +
        selectField('Sua função', cb(v.onLid('funcao'), 'change'), FUNCOES_SOLICITACAO, f.funcao) +
        (f.funcao === 'Líder'
          ? campoEmail +
            '<div class="grid-form2">' +
            selectField('Célula que você lidera', cb(v.onLid('celula'), 'change'), celulaOpts, f.celula, 'Selecionar') +
            '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone (opcional)</label>' +
            '<input type="text" id="lid-tel" value="' + escHtml(f.tel) + '" ' + cb(v.onLid('tel'), 'input') + ' placeholder="(00) 00000-0000" style="' + campo + '"></div>' +
            '</div>'
          : '') +
        botao(f.funcao === 'Líder' ? 'Enviar' : 'Continuar') +
        '</form>';
    }

    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:460px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      corpo +
      '<div style="margin-top:18px;padding-top:14px;border-top:1px solid #eef2f7;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
      '<button type="button" ' + cb(v.fechar) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">← Sou visitante</button>' +
      '<button type="button" ' + cb(v.entrar) + ' style="border:none;background:none;padding:0;color:#2E4FC7;font-size:12.5px;font-weight:700;cursor:pointer">Já tenho acesso, quero entrar</button>' +
      '</div></div></div>';
  }

  // Tela do link de frequência — mesmo formato do cadastro público.
  function frequenciaPublicaHtml(vals) {
    var cartao = function (conteudo) {
      return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
        '<div style="width:100%;max-width:460px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
        '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
        conteudo + '</div></div>';
    };

    if (vals.fpStatus === 'loading' || vals.fpStatus === 'idle') {
      return cartao('<div style="font-size:13px;color:#6b7c93">Abrindo a frequência da sua célula…</div>');
    }
    if (vals.fpStatus === 'error') {
      return cartao(
        '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Não deu para abrir</div>' +
        '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:10px 12px;font-size:12.5px;font-weight:600;margin-top:12px">' + escHtml(vals.fpErro || '') + '</div>');
    }

    var marcados = vals.fpPessoas.filter(function (p) { return vals.fpMarcados[p.id]; }).length;
    var corpo =
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Frequência da célula</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:18px">' + escHtml(celulaLabel(vals.fpCelula)) + ' · marque quem esteve no encontro e salve.</div>' +
      (vals.fpErro ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">' + escHtml(vals.fpErro) + '</div>' : '') +
      (vals.fpSalvo
        ? '<div style="background:#e2f2ea;color:#237a5a;border-radius:9px;padding:12px 14px;font-size:13px;font-weight:600;margin-bottom:14px">Frequência registrada com sucesso — ' + vals.fpSalvo.presentes + ' de ' + vals.fpSalvo.total + ' presentes.</div>'
        : '') +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Data do encontro</label>' +
      '<input type="date" id="fp-data" value="' + escHtml(vals.fpData) + '" ' + cb(vals.onFpData, 'change') + ' style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin:14px 0 6px">' +
      '<div style="font-size:12.5px;color:#4a5b70"><b style="color:#0E7A68">' + marcados + '</b> de ' + vals.fpPessoas.length + ' presentes' +
      (vals.fpJaLancado ? ' <span style="color:#8a99ab">· já lançado, dá para corrigir</span>' : '') + '</div>' +
      '<div style="display:flex;gap:6px">' +
      '<button type="button" ' + cb(vals.marcarTodosFp(true)) + ' style="padding:7px 12px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12px;font-weight:600;color:#1B2344;cursor:pointer">Todos</button>' +
      '<button type="button" ' + cb(vals.marcarTodosFp(false)) + ' style="padding:7px 12px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12px;font-weight:600;color:#6b7c93;cursor:pointer">Limpar</button>' +
      '</div></div>' +
      '<div style="border:1px solid #e6ecf4;border-radius:12px;padding:4px 10px;max-height:46vh;overflow:auto">' +
      vals.fpPessoas.map(function (p) {
        var presente = !!vals.fpMarcados[p.id];
        return '<div class="freq-linha freq-linha-1col">' +
          '<div style="min-width:0"><div class="freq-nome">' + escHtml(p.nome) + '</div>' +
          (p.status && p.status !== 'Membro' ? '<div style="font-size:10.5px;color:#8a99ab;font-weight:600;margin-top:2px">' + escHtml(p.status === 'Frequentador Assíduo' ? 'FA' : p.status) + '</div>' : '') +
          '</div>' +
          '<div style="text-align:center">' + freqToggle(presente, presente ? 'Sim' : 'Não', cb(vals.onFpToggle(p.id))) + '</div>' +
          '</div>';
      }).join('') +
      (vals.fpPessoas.length ? '' : '<div style="padding:16px 4px;font-size:12.5px;color:#8a99ab">Ninguém cadastrado nesta célula ainda.</div>') +
      '</div>';

    if (vals.fpVisitante) {
      corpo += '<div style="border:1px solid #e6ecf4;border-radius:12px;padding:14px;margin-top:12px;background:#f7f9fc">' +
        '<div style="font-size:13px;font-weight:700;color:#14243a;margin-bottom:10px">Novo visitante</div>' +
        '<input type="text" id="fp-visitante-nome" value="' + escHtml(vals.fpVisitante.nome) + '" ' + cb(vals.onFpVisitante('nome'), 'input') + ' placeholder="Nome do visitante" style="width:100%;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box">' +
        '<input type="text" id="fp-visitante-tel" value="' + escHtml(vals.fpVisitante.tel) + '" ' + cb(vals.onFpVisitante('tel'), 'input') + ' placeholder="Telefone (opcional)" style="width:100%;margin-top:8px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box">' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
        '<button type="button" ' + cb(vals.salvarFpVisitante) + (vals.fpVisitanteSaving ? ' disabled' : '') + ' style="padding:9px 14px;border:none;border-radius:999px;background:#149C88;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">' + (vals.fpVisitanteSaving ? 'Salvando…' : 'Adicionar') + '</button>' +
        '<button type="button" ' + cb(vals.fecharFpVisitante) + ' style="padding:9px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;font-weight:600;color:#6b7c93;cursor:pointer">Cancelar</button>' +
        '</div></div>';
    } else {
      corpo += '<button type="button" ' + cb(vals.abrirFpVisitante) + ' style="width:100%;margin-top:12px;padding:10px;border:1px dashed #c9d6ea;border-radius:12px;background:#fff;font-size:13px;font-weight:700;color:#0E7A68;cursor:pointer">+ Adicionar visitante</button>';
    }

    corpo += '<button type="button" ' + cb(vals.salvarFp) + (vals.fpSaving ? ' disabled' : '') + ' style="width:100%;margin-top:14px;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#1B2344,#2a4290);color:#fff;font-size:15px;font-weight:800;cursor:pointer">' +
      (vals.fpSaving ? 'Salvando…' : 'Salvar frequência') + '</button>';
    return cartao(corpo);
  }

  function cadastroPublicoHtml(vals) {
    var f = vals.publicForm;
    var celulaOpts = (vals.celulasPublicas || []).map(function (c) { return { v: c, label: celulaLabel(c) }; });
    var celulaPlaceholder = vals.celulasPublicasStatus === 'loading' ? 'Carregando…' : 'Selecionar';
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:460px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Seja bem-vindo(a)!</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Preencha seus dados para se cadastrar na Videira SCS.</div>' +
      (vals.publicSalvo
        ? '<div style="background:#e2f2ea;color:#237a5a;border-radius:9px;padding:14px;font-size:13.5px;font-weight:600">Cadastro recebido, obrigado! Em breve alguém da célula vai entrar em contato.</div>'
        : (
          (vals.publicError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">Erro: ' + escHtml(vals.publicError) + '</div>' : '') +
          '<form ' + cb(vals.submitPublico, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
          '<input type="text" id="pub-nome" required value="' + escHtml(f.nome) + '" ' + cb(vals.onPF('nome'), 'input') + ' placeholder="Seu nome" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '<div class="grid-form2">' +
          selectField('Tipo', cb(vals.onPF('tipo'), 'change'), TIPO_OPTIONS, f.tipo) +
          selectField('Célula que você frequenta', cb(vals.onPF('celula'), 'change'), celulaOpts, f.celula, celulaPlaceholder) +
          '</div>' +
          '<div class="grid-form2">' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Data de nascimento</label>' +
          '<input type="date" id="pub-nasc" required value="' + escHtml(f.nasc) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone</label>' +
          '<input type="text" id="pub-tel" required value="' + escHtml(f.tel) + '" ' + cb(vals.onPF('tel'), 'input') + ' placeholder="(00) 00000-0000" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '</div>' +
          '<button type="submit"' + (vals.publicSaving ? ' disabled' : '') + ' style="padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.publicSaving ? 'Enviando…' : 'Cadastrar') + '</button>' +
          '</form>'
        )) +
      '<div style="margin-top:16px;text-align:center">' +
      '<button ' + cb(vals.abrirLideranca) + ' style="border:none;background:none;padding:0;color:#2E4FC7;font-size:12.5px;font-weight:700;cursor:pointer">Já sou líder</button>' +
      '<div style="margin-top:8px"><button ' + cb(vals.voltarParaLogin) + ' style="border:none;background:none;padding:0;color:#8a99ab;font-size:12px;font-weight:600;cursor:pointer">Já tenho acesso, quero entrar</button></div>' +
      '</div></div></div>';
  }

  function carregandoHtml() {
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><div style="font-size:13px;color:#6b7c93">Carregando…</div></div>';
  }

  function selfLinkHtml(vals) {
    var q = (vals.selfLinkQuery || '').toLowerCase();
    var results = (vals.directory || []).filter(function (m) { return !q || m.nome.toLowerCase().indexOf(q) >= 0; }).slice(0, 30);
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:440px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:19px;margin-bottom:4px">Qual desses é você?</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Selecione seu nome no cadastro para vincular ao seu login. Se você ainda não está cadastrado, peça para um líder te cadastrar primeiro.</div>' +
      (vals.selfLinkError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">Erro: ' + escHtml(vals.selfLinkError) + '</div>' : '') +
      '<input type="text" id="selflink-q" value="' + escHtml(vals.selfLinkQuery) + '" ' + cb(vals.onQuery, 'input') + ' placeholder="Buscar por nome…" style="width:100%;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box;margin-bottom:12px">' +
      (vals.directoryStatus === 'loading'
        ? '<div style="font-size:12.5px;color:#6b7c93">Carregando…</div>'
        : '<div style="max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:6px">' +
          results.map(function (m) {
            return '<button ' + cb(vals.onPick(m.id)) + (vals.selfLinkSaving ? ' disabled' : '') + ' style="text-align:left;padding:10px 12px;border:1px solid #e2e9f2;border-radius:9px;background:#fff;cursor:pointer;font-size:13.5px">' +
              '<b style="color:#14243a">' + escHtml(m.nome) + '</b> <span style="color:#6b7c93">· ' + escHtml(celulaLabel(m.celula)) + '</span></button>';
          }).join('') +
          (results.length === 0 ? '<div style="font-size:12.5px;color:#6b7c93">Ninguém encontrado.</div>' : '') +
          '</div>') +
      '<div style="margin-top:16px;text-align:center">' +
      '<button ' + cb(vals.logout) + ' style="border:none;background:none;padding:0;color:#6B3FA0;font-size:11.5px;font-weight:600;cursor:pointer">Sair</button>' +
      '</div></div></div>';
  }

  // Quem entrou por login social e não tinha convite de um admin: não
  // pode escolher um nome que já existe (isso daria acesso aos dados de
  // outra pessoa) — só criar o próprio cadastro, sempre como Visitante.
  function autoCadastroSocialHtml(vals) {
    var f = vals.socialForm;
    var celulaOpts = (vals.celulasPublicas || []).map(function (c) { return { v: c, label: celulaLabel(c) }; });
    var celulaPlaceholder = vals.celulasPublicasStatus === 'loading' ? 'Carregando…' : 'Selecionar';
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:460px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Complete seu cadastro</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Entrou como <b>' + escHtml(vals.userEmail) + '</b>. Preencha seus dados para concluir o seu cadastro. Se você já é líder e deveria ter acesso, peça para um administrador convidar esse e-mail.</div>' +
      (vals.socialError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">Erro: ' + escHtml(vals.socialError) + '</div>' : '') +
      '<form ' + cb(vals.submitSocial, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
      '<input type="text" id="social-nome" required value="' + escHtml(f.nome) + '" ' + cb(vals.onSF('nome'), 'input') + ' placeholder="Seu nome" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div class="grid-form2">' +
      selectField('Tipo', cb(vals.onSF('tipo'), 'change'), TIPO_OPTIONS, f.tipo) +
      selectField('Célula que você frequenta', cb(vals.onSF('celula'), 'change'), celulaOpts, f.celula, celulaPlaceholder) +
      '</div>' +
      '<div class="grid-form2">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Data de nascimento</label>' +
      '<input type="date" id="social-nasc" required value="' + escHtml(f.nasc) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Telefone</label>' +
      '<input type="text" id="social-tel" required value="' + escHtml(f.tel) + '" ' + cb(vals.onSF('tel'), 'input') + ' placeholder="(00) 00000-0000" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '</div>' +
      '<button type="submit"' + (vals.socialSaving ? ' disabled' : '') + ' style="padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.socialSaving ? 'Salvando…' : 'Concluir cadastro') + '</button>' +
      '</form>' +
      '<div style="margin-top:16px;text-align:center">' +
      '<button ' + cb(vals.logout) + ' style="border:none;background:none;padding:0;color:#6B3FA0;font-size:11.5px;font-weight:600;cursor:pointer">Sair</button>' +
      '</div></div></div>';
  }

  function adminCard(title, subtitle, inner) {
    return '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:22px 24px;box-shadow:0 1px 2px rgba(20,36,58,.04);margin-bottom:16px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">' + escHtml(title) + '</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">' + escHtml(subtitle) + '</div>' +
      inner + '</div>';
  }

  function adminBanner(kind, text) {
    var bg = kind === 'ok' ? '#e2f2ea' : (kind === 'warn' ? '#faf1de' : '#f7e2e2');
    var fg = kind === 'ok' ? '#237a5a' : (kind === 'warn' ? '#a1780f' : '#a02020');
    return '<div style="background:' + bg + ';color:' + fg + ';border-radius:9px;padding:10px 14px;font-size:12.5px;font-weight:600;margin-bottom:14px">' + escHtml(text) + '</div>';
  }

  // Depois de autorizar um e-mail: o app não avisa ninguém, então
  // entrega a mensagem pronta pro admin mandar.
  function conviteProntoHtml(vals) {
    var c = vals.adminLiderConvite;
    return '<div style="background:#e2f2ea;border:1px solid #b9ded0;border-radius:11px;padding:14px 16px;margin-bottom:14px">' +
      '<div style="font-size:13px;font-weight:700;color:#237a5a">Acesso liberado para ' + escHtml(c.email) + '</div>' +
      '<div style="font-size:12px;color:#3f6b5b;margin-top:5px">Falta avisar a pessoa — o sistema não manda e-mail. Use a mensagem pronta abaixo:</div>' +
      '<pre style="white-space:pre-wrap;background:#fff;border:1px solid #d3e7dd;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#14243a;margin:10px 0 0;font-family:inherit">' + escHtml(vals.conviteTexto) + '</pre>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      '<button type="button" ' + cb(vals.compartilharConvite) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #149C88;border-radius:9px;background:#fff;font-size:12.5px;color:#0E7A68;font-weight:700;cursor:pointer">' + whatsappIcon + ' Enviar por WhatsApp</button>' +
      '<button type="button" ' + cb(vals.copiarConvite) + ' style="padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#4a5b70;font-weight:600;cursor:pointer">' + (vals.adminConviteCopiado ? 'Copiado!' : 'Copiar mensagem') + '</button>' +
      '<button type="button" ' + cb(vals.fecharConvite) + ' style="padding:8px 14px;border:none;background:none;font-size:12.5px;color:#6b7c93;font-weight:600;cursor:pointer">Fechar</button>' +
      '</div></div>';
  }

  function adminNovaCelulaHtml(vals) {
    var f = vals.adminCelulaForm;
    var body = '' +
      (vals.adminCelulaSalvo ? adminBanner('ok', 'Célula criada com sucesso.') : '') +
      (vals.adminCelulaError ? adminBanner('error', vals.adminCelulaError) : '') +
      '<form ' + cb(vals.criarCelula, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome da célula</label>' +
      '<input type="text" id="admincelula-nome" value="' + escHtml(f.nome) + '" ' + cb(vals.onAdminCelula('nome'), 'input') + ' placeholder="Ex: Família Esperança" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div class="grid-form2">' +
      optionalSelectField('Discipulador responsável', cb(vals.onAdminCelula('discipuladorId'), 'change'), vals.discipuladores, f.discipuladorId, 'Nenhum ainda') +
      optionalSelectField('Obreiro/Pastor responsável', cb(vals.onAdminCelula('obreiroId'), 'change'), vals.obreiros, f.obreiroId, 'Nenhum ainda') +
      '</div>' +
      '<button type="submit"' + (vals.adminCelulaSaving ? ' disabled' : '') + ' style="align-self:flex-start;padding:10px 18px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer">' + (vals.adminCelulaSaving ? 'Criando…' : 'Criar célula') + '</button>' +
      '</form>';
    return adminCard('Nova Célula', 'Cadastre uma célula nova pra ela aparecer nos formulários de cadastro (interno e público).', body);
  }

  function adminNovaLiderancaHtml(vals) {
    var f = vals.adminLiderForm;
    var modoBtn = function (modo, label) {
      var active = f.modo === modo;
      return '<button type="button" ' + cb(vals.setAdminLiderModo(modo)) + ' style="padding:8px 14px;border:1px solid ' + (active ? '#1B2344' : '#d4deea') + ';border-radius:8px;background:' + (active ? '#1B2344' : '#fff') + ';color:' + (active ? '#fff' : '#4a5b70') + ';font-size:12.5px;font-weight:600;cursor:pointer">' + label + '</button>';
    };
    var pessoaBlock = f.modo === 'novo'
      ? '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
        '<input type="text" id="adminlider-nome" value="' + escHtml(f.nome) + '" ' + cb(vals.onAdminLider('nome'), 'input') + ' placeholder="Nome da pessoa" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>'
      : '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Buscar pessoa já cadastrada</label>' +
        '<input type="text" id="adminlider-busca" value="' + escHtml(f.query) + '" ' + cb(vals.onAdminLider('query'), 'input') + ' placeholder="Nome da pessoa" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box">' +
        (f.memberId
          ? '<div style="margin-top:8px;font-size:12.5px;color:#237a5a;font-weight:600">Selecionada: ' + escHtml(f.nome) + '</div>'
          : (vals.adminLiderBusca.length
            ? '<div style="margin-top:8px;max-height:160px;overflow:auto;display:flex;flex-direction:column;gap:5px">' +
              vals.adminLiderBusca.map(function (m) {
                return '<button type="button" ' + cb(vals.pickAdminLiderExistente(m)) + ' style="text-align:left;padding:8px 10px;border:1px solid #e2e9f2;border-radius:8px;background:#fff;cursor:pointer;font-size:12.5px">' +
                  '<b style="color:#14243a">' + escHtml(m.nome) + '</b> <span style="color:#6b7c93">· ' + escHtml(m.posicao) + (m.celula ? ' · ' + escHtml(celulaLabel(m.celula)) : '') + '</span></button>';
              }).join('') + '</div>'
            : (f.query.trim() ? '<div style="margin-top:8px;font-size:12.5px;color:#6b7c93">Ninguém encontrado.</div>' : ''))) +
        '</div>';
    var body = '' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' + modoBtn('novo', 'Nova pessoa') + modoBtn('existente', 'Pessoa já cadastrada') + '</div>' +
      (vals.adminLiderSalvo && !vals.adminLiderConvite ? adminBanner('ok', 'Liderança cadastrada com sucesso.') : '') +
      (vals.adminLiderConvite ? conviteProntoHtml(vals) : '') +
      (vals.adminLiderError ? adminBanner('error', vals.adminLiderError) : '') +
      (vals.adminLiderSemDiscipulador ? adminBanner('warn', 'Essa célula ainda não tem discipulador responsável — defina um em "Nova Célula" ou na tabela abaixo antes de enviar.') : '') +
      '<form ' + cb(vals.submitAdminLider, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
      pessoaBlock +
      '<div class="grid-form2">' +
      selectField('Posição', cb(vals.onAdminLider('posicao'), 'change'), vals.posicoesAdminLideranca, f.posicao) +
      (celulaObrigatoria(f.posicao)
        ? selectField('Célula', cb(vals.onAdminLider('celula'), 'change'), vals.celulaOptionsForm, f.celula, 'Selecionar')
        : '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Célula</label>' +
          '<div style="margin-top:5px;padding:10px 12px;border:1px dashed #d4deea;border-radius:9px;font-size:12.5px;color:#8a99ab">Não se aplica a esta posição</div></div>') +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#14243a;font-weight:600;cursor:pointer">' +
      '<input type="checkbox"' + (f.criarLogin ? ' checked' : '') + ' ' + cb(function (e) { setAdminLiderField('criarLogin', e.target.checked); }, 'change') + '> Criar acesso de login agora' +
      '</label>' +
      (f.criarLogin
        ? '<div style="display:flex;gap:8px">' +
          ['senha', 'google'].map(function (tipo) {
            var ativo = (f.tipoLogin || 'senha') === tipo;
            var label = tipo === 'senha' ? 'Definir senha inicial' : 'Autorizar e-mail do Google';
            return '<button type="button" ' + cb(function () { setAdminLiderField('tipoLogin', tipo); }) + ' style="padding:7px 12px;border:1px solid ' + (ativo ? '#1B2344' : '#d4deea') + ';border-radius:8px;background:' + (ativo ? '#1B2344' : '#fff') + ';color:' + (ativo ? '#fff' : '#4a5b70') + ';font-size:12px;font-weight:600;cursor:pointer">' + label + '</button>';
          }).join('') +
          '</div>' +
          ((f.tipoLogin || 'senha') === 'google'
            ? '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail do Google</label>' +
              '<input type="email" id="adminlider-email" placeholder="pessoa@gmail.com" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box">' +
              '<div style="font-size:11.5px;color:#8a99ab;margin-top:6px">Quando a pessoa entrar com o Google usando esse e-mail, o acesso é vinculado sozinho — sem senha.</div>' +
              '<div style="background:#faf1de;color:#a1780f;border-radius:8px;padding:9px 11px;font-size:11.5px;font-weight:600;margin-top:8px">O sistema <b>não envia e-mail</b> pra pessoa. Ao salvar, aparece aqui uma mensagem pronta pra você mandar por WhatsApp.</div></div>'
            : '<div class="grid-form2">' +
              '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail de login</label>' +
              '<input type="email" id="adminlider-email" placeholder="pessoa@exemplo.com" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
              '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Senha inicial</label>' +
              '<input type="text" id="adminlider-senha" placeholder="mínimo 6 caracteres" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
              '</div>')
        : '') +
      '<button type="submit"' + (vals.adminLiderSaving ? ' disabled' : '') + ' style="align-self:flex-start;padding:10px 18px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer">' + (vals.adminLiderSaving ? 'Salvando…' : 'Cadastrar') + '</button>' +
      '</form>';
    return adminCard('Nova Liderança', 'Cadastre um novo Pastor, Obreiro, Discipulador ou Líder — e, se quiser, já crie o login dele.', body);
  }

  function adminEditarCelulaHtml(vals) {
    var e = vals.adminCelulaEdit;
    // Se quem responde hoje mudou de posição, ainda aparece como "(atual)"
    // — senão o select mostraria "Nenhum" e salvar apagaria o vínculo.
    var comAtual = function (lista, id) {
      if (!id || lista.some(function (o) { return o.v === id; })) return lista;
      var m = memberById(id);
      return [{ v: id, label: (m ? m.nome : 'Pessoa fora da sua lista') + ' (atual)' }].concat(lista);
    };
    var novoNome = (e.nome || '').trim();
    var renomeando = !!novoNome && novoNome !== e.original;
    var body = '' +
      (vals.adminCelulaEditError ? adminBanner('error', vals.adminCelulaEditError) : '') +
      (renomeando ? adminBanner('warn', 'Ao salvar, todas as pessoas desta célula (' + vals.adminCelulaEditPessoas + ' ativas, mais inativas e transferidas) passam para o nome "' + novoNome + '". Se a planilha de Presença por Célula usa o nome antigo, atualize lá também.') : '') +
      '<form ' + cb(vals.salvarEdicaoCelula, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome da célula</label>' +
      '<input type="text" id="admincelula-edit-nome" value="' + escHtml(e.nome) + '" ' + cb(vals.onAdminCelulaEdit('nome'), 'input') + ' style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div class="grid-form2">' +
      optionalSelectField('Discipulador responsável', cb(vals.onAdminCelulaEdit('discipuladorId'), 'change'), comAtual(vals.discipuladores, e.discipuladorId), e.discipuladorId, 'Nenhum') +
      optionalSelectField('Obreiro/Pastor responsável', cb(vals.onAdminCelulaEdit('obreiroId'), 'change'), comAtual(vals.obreiros, e.obreiroId), e.obreiroId, 'Nenhum') +
      '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="submit"' + (vals.adminCelulaEditSaving ? ' disabled' : '') + ' style="padding:10px 18px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer">' + (vals.adminCelulaEditSaving ? 'Salvando…' : 'Salvar alterações') + '</button>' +
      '<button type="button" ' + cb(vals.cancelarEdicaoCelula) + ' style="padding:10px 16px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#6b7c93;font-weight:600;cursor:pointer">Cancelar</button>' +
      '</div></form>';
    // Link que o líder usa para lançar a frequência sem login.
    var token = vals.adminLinkToken;
    body += '<div style="margin-top:18px;padding-top:16px;border-top:1px dashed #e6ecf4">' +
      '<div style="font-size:13.5px;font-weight:800;color:#14243a">Link de frequência (sem login)</div>' +
      '<div class="home-card-sub" style="margin-top:2px">O líder abre esse link no celular e lança a presença desta célula, sem precisar de conta. Gerar um link novo desativa o anterior.</div>' +
      (token
        ? '<div style="margin-top:10px;background:#f7f9fc;border:1px solid #e6ecf4;border-radius:10px;padding:10px 12px;font-size:11.5px;color:#4a5b70;overflow-wrap:anywhere">' + escHtml(vals.linkFrequenciaUrl(token)) + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
          '<button type="button" ' + cb(vals.compartilharLinkFrequencia(token)) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #149C88;border-radius:999px;background:#fff;font-size:12.5px;color:#0E7A68;font-weight:700;cursor:pointer">' + whatsappIcon + ' Enviar por WhatsApp</button>' +
          '<button type="button" ' + cb(vals.copiarLinkFrequencia(token)) + ' style="padding:8px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;color:#4a5b70;font-weight:600;cursor:pointer">' + (vals.adminLinkCopiado ? 'Copiado!' : 'Copiar link') + '</button>' +
          '<button type="button" ' + cb(vals.gerarLinkFrequencia) + (vals.adminLinkSaving ? ' disabled' : '') + ' style="padding:8px 14px;border:none;background:none;font-size:12.5px;color:#a02020;font-weight:700;cursor:pointer">Gerar link novo</button>' +
          '</div>'
        : '<button type="button" ' + cb(vals.gerarLinkFrequencia) + (vals.adminLinkSaving ? ' disabled' : '') + ' style="margin-top:10px;padding:9px 16px;border:none;border-radius:999px;background:#149C88;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">' + (vals.adminLinkSaving ? 'Gerando…' : 'Gerar link de frequência') + '</button>') +
      '</div>';
    return adminCard('Editar célula · ' + celulaLabel(e.original), 'Altere o nome e quem responde por ela. As pessoas continuam na célula.', body);
  }

  // Pedidos feitos em "Já sou líder" (tela pública). "Liberar acesso"
  // preenche a Nova Liderança logo abaixo; ao salvar, o pedido fica
  // aprovado sozinho.
  function adminSolicitacoesHtml(vals) {
    var lista = vals.solicitacoes || [];
    if (!lista.length) return '';
    var rotulo = function (fn) { return (FUNCOES_SOLICITACAO.filter(function (o) { return o.v === fn; })[0] || {}).label || fn; };
    var body = '<div style="display:flex;flex-direction:column;gap:10px">' +
      lista.map(function (s) {
        var ativo = vals.adminSolicitacaoId === s.id;
        return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;border:1px solid ' + (ativo ? '#3B5FDD' : '#e6ecf4') + ';border-radius:12px;background:' + (ativo ? '#eef3ff' : '#f7f9fc') + '">' +
          '<div style="min-width:0">' +
          '<div style="font-size:14px;font-weight:800;color:#14243a">' + escHtml(s.nome) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93;margin-top:2px">' + escHtml(rotulo(s.funcao)) +
          (s.celula ? ' · célula ' + escHtml(celulaLabel(s.celula)) : '') +
          (s.email ? ' · ' + escHtml(s.email) : '') +
          (s.telefone ? ' · ' + escHtml(s.telefone) : '') +
          ' · ' + escHtml(new Date(s.criado_em).toLocaleDateString('pt-BR')) + '</div>' +
          '<span style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;background:' + (s.ja_cadastrado ? '#e0f4ef' : '#fdf1da') + ';color:' + (s.ja_cadastrado ? '#0E7A68' : '#A1780F') + '">' +
          (s.ja_cadastrado ? 'Já está no cadastro' : 'Pessoa nova') + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:8px">' +
          (ativo
            ? '<span style="font-size:12px;color:#2E4FC7;font-weight:700;padding:8px 4px">Complete em "Nova Liderança" ↓</span>'
            : '<button type="button" ' + cb(vals.liberarSolicitacao(s)) + ' style="padding:8px 14px;border:none;border-radius:999px;background:#149C88;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Liberar acesso</button>') +
          '<button type="button" ' + cb(vals.recusarSolicitacao(s)) + ' style="padding:8px 14px;border:1px solid #d4deea;border-radius:999px;background:#fff;font-size:12.5px;color:#a02020;font-weight:600;cursor:pointer">Recusar</button>' +
          '</div></div>';
      }).join('') + '</div>';
    return adminCard('Pedidos de acesso · ' + lista.length,
      'Feitos em "Já sou líder", na tela de cadastro. "Liberar acesso" preenche a Nova Liderança abaixo — confira, crie o login e salve.', body);
  }

  function hierarquiaHtml(vals) {
    var html = '<div style="margin:18px 0 20px;font-size:12.5px;color:#6b7c93">Cadastre novas células e liderança, e defina quem é o discipulador e o obreiro responsável por cada célula. Isso controla o que cada líder vê nos relatórios.</div>';
    html += adminSolicitacoesHtml(vals);
    html += adminNovaCelulaHtml(vals);
    html += '<div id="admin-nova-lideranca">' + adminNovaLiderancaHtml(vals) + '</div>';
    html += '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin:20px 0 4px">Células cadastradas</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:12px">Clique em Editar para mudar o nome da célula ou quem responde por ela.</div>';
    if (vals.adminCelulaEditSalvo) html += adminBanner('ok', vals.adminCelulaEditSalvo);
    if (vals.adminCelulaEdit) html += adminEditarCelulaHtml(vals);
    var th = function (label, align, pad) {
      return '<th style="text-align:' + align + ';padding:10px ' + pad + ';font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">' + label + '</th>';
    };
    var naoDefinido = '<span style="color:#b08a2e;font-weight:600">Não definido</span>';
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div class="table-scroll"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      th('Célula', 'left', '22px') + th('Pessoas', 'right', '12px') + th('Discipulador responsável', 'left', '12px') + th('Obreiro/Pastor responsável', 'left', '12px') + th('', 'right', '22px') +
      '</tr></thead><tbody>' +
      vals.hierarquiaRows.map(function (r) {
        return '<tr style="border-bottom:1px solid #f0f4f9' + (r.editando ? ';background:#eef3ff' : '') + '">' +
          '<td style="padding:12px 22px;font-weight:700;color:#14243a">' + escHtml(r.celulaLabelText) + '</td>' +
          '<td style="padding:12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.pessoas + '</td>' +
          '<td style="padding:12px;color:#14243a">' + (r.discipuladorNome ? escHtml(r.discipuladorNome) : naoDefinido) + '</td>' +
          '<td style="padding:12px;color:#14243a">' + (r.obreiroNome ? escHtml(r.obreiroNome) : naoDefinido) + '</td>' +
          '<td style="padding:8px 22px;text-align:right">' +
          (r.editando
            ? '<span style="font-size:12px;color:#2E4FC7;font-weight:700">Editando…</span>'
            : '<button type="button" ' + cb(r.onEditar) + ' style="padding:7px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:700;cursor:pointer">Editar</button>') +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
    return html;
  }

  function naoConfiguradoHtml() {
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">' +
      '<div style="max-width:420px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:19px;margin-bottom:8px">Supabase não configurado</div>' +
      '<div style="font-size:13px;color:#6b7c93">Preencha <code>config.js</code> com a URL e a anon key do seu projeto Supabase (veja <code>supabase/schema.sql</code> e <code>supabase/seed.sql</code>) para ativar o login e o cadastro.</div>' +
      '</div></div>';
  }

  // Campos "não controlados" (sem data-cb de evento; lidos direto do DOM
  // só na hora de enviar o formulário — ver submitNovoMembro(), doLogin(),
  // etc.) — necessário pra type=date/email/password não perderem o
  // cursor/valor a cada tecla. Só que como o app inteiro re-renderiza
  // (root.innerHTML) a cada mudança de QUALQUER campo da tela, digitar
  // num campo vizinho controlado (ex: Telefone) recria esses inputs do
  // zero e apaga o que a pessoa tinha digitado neles (ex: Data de
  // nascimento). Por isso preservamos o valor atual antes de trocar o
  // HTML e devolvemos ele depois.
  var UNCONTROLLED_FIELD_IDS = ['login-email', 'login-senha', 'novo-nasc', 'pub-nasc', 'social-nasc', 'adminlider-email', 'adminlider-senha'];

  function render() {
    var root = document.getElementById('app');
    var active = document.activeElement;
    var focusInfo = null;
    if (active && root.contains(active) && active.id) {
      focusInfo = { id: active.id, start: active.selectionStart, end: active.selectionEnd };
    }
    var uncontrolledValues = {};
    UNCONTROLLED_FIELD_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) uncontrolledValues[id] = el.value;
    });
    callbacks = {};
    cbSeq = 0;

    var html;
    if (!supabaseConfigured()) {
      html = naoConfiguradoHtml();
    } else if (state.fpToken) {
      // Link de frequência: não passa por login nenhum.
      html = frequenciaPublicaHtml({
        fpStatus: state.fpStatus, fpErro: state.fpErro, fpCelula: state.fpCelula,
        fpData: state.fpData, fpPessoas: state.fpPessoas, fpMarcados: state.fpMarcados,
        fpJaLancado: state.fpJaLancado, fpSaving: state.fpSaving, fpSalvo: state.fpSalvo,
        fpVisitante: state.fpVisitante, fpVisitanteSaving: state.fpVisitanteSaving,
        onFpData: function (e) { abrirFrequenciaPublica(e.target.value); },
        onFpToggle: function (id) { return function () { toggleFrequenciaPublica(id); }; },
        marcarTodosFp: function (valor) { return function () { marcarTodosPublico(valor); }; },
        salvarFp: function () { salvarFrequenciaPublica(); },
        abrirFpVisitante: function () { abrirVisitantePublico(); },
        fecharFpVisitante: function () { fecharVisitantePublico(); },
        onFpVisitante: function (key) { return function (e) { setVisitantePublico(key, e.target.value); }; },
        salvarFpVisitante: function () { salvarVisitantePublico(); },
      });
    } else if (state.isPublicCadastro && state.lidAberto) {
      html = solicitacaoLiderancaHtml({
        lidForm: state.lidForm, lidSaving: state.lidSaving, lidErro: state.lidErro, lidResultado: state.lidResultado,
        celulasPublicas: state.celulasPublicas, membersPublicos: state.membersPublicos,
        membersPublicosStatus: state.membersPublicosStatus,
        onLid: function (key) { return function (e) { setLidField(key, e.target.value); }; },
        continuar: function (e) { if (e && e.preventDefault) e.preventDefault(); continuarSolicitacao(); },
        escolher: function (p) { return function () { escolherNomeNaLista(p); }; },
        naoEstou: function () { setLidEtapa('novo'); },
        voltarInicio: function () { setLidEtapa('inicio'); },
        enviarNovo: function (e) { if (e && e.preventDefault) e.preventDefault(); enviarCadastroNovoLideranca(); },
        fechar: function () { fecharSolicitacaoLideranca(); },
        entrar: function () { fecharSolicitacaoLideranca(); voltarParaLogin(); },
      });
    } else if (state.isPublicCadastro) {
      html = cadastroPublicoHtml({
        abrirLideranca: function () { abrirSolicitacaoLideranca(); },
        publicForm: state.publicForm, publicSaving: state.publicSaving, publicError: state.publicError, publicSalvo: state.publicSalvo,
        celulasPublicas: state.celulasPublicas, celulasPublicasStatus: state.celulasPublicasStatus,
        onPF: function (key) { return function (e) { setPublicField(key, e.target.value); }; },
        submitPublico: function (e) { if (e && e.preventDefault) e.preventDefault(); submitPublico(); },
        voltarParaLogin: function () { voltarParaLogin(); },
      });
    } else if (!state.session && state.showLoginForm) {
      html = loginHtml({
        loginForm: state.loginForm, loginError: state.loginError, loginLoading: state.loginLoading,
        doLogin: function (e) { if (e && e.preventDefault) e.preventDefault(); doLogin(); },
        loginComGoogle: function () { loginComGoogle(); },
        irParaCadastroPublico: function () { irParaCadastroPublico(); },
        voltarDoLogin: function () { voltarDoLogin(); },
      });
    } else if (!state.session) {
      // Sem login: só a versão limitada de Cadastro de Membros (ver
      // members_publico) — as outras abas ficam trancadas até entrar.
      var anonVals = anonCadastroVals();
      anonVals.anonMode = true;
      anonVals.sidebarOpen = state.sidebarOpen;
      anonVals.openSidebar = function () { setState({ sidebarOpen: true }); };
      anonVals.closeSidebar = function () { setState({ sidebarOpen: false }); };
      anonVals.pedirLogin = function () { pedirLogin(); setState({ sidebarOpen: false }); };
      anonVals.irParaCadastroPublico = function () { irParaCadastroPublico(); setState({ sidebarOpen: false }); };
      anonVals.totalAll = (state.membersPublicos || []).length;
      html = '<div class="app-shell">' +
        sidebarHtml(anonVals) +
        '<main class="main-content">' +
        mobileTopbarHtml(anonVals) +
        pageHeaderHtml(anonVals) +
        anonCadastroHtml(anonVals) +
        '</main></div>';
    } else if (state.profile === null || state.profileStatus === 'loading') {
      html = carregandoHtml();
    } else if (state.profile === false && isSocialSession()) {
      // Login social sem convite de admin: só pode criar o próprio
      // cadastro (nunca escolher alguém que já existe na lista).
      html = autoCadastroSocialHtml({
        socialForm: state.socialForm, socialSaving: state.socialSaving, socialError: state.socialError,
        celulasPublicas: state.celulasPublicas, celulasPublicasStatus: state.celulasPublicasStatus,
        userEmail: (state.session && state.session.user && state.session.user.email) || '',
        onSF: function (key) { return function (e) { setSocialField(key, e.target.value); }; },
        submitSocial: function (e) { if (e && e.preventDefault) e.preventDefault(); submitAutoCadastroSocial(); },
        logout: function () { doLogout(); },
      });
    } else if (state.profile === false) {
      html = selfLinkHtml({
        directory: state.directory, directoryStatus: state.directoryStatus,
        selfLinkQuery: state.selfLinkQuery, selfLinkSaving: state.selfLinkSaving, selfLinkError: state.selfLinkError,
        onQuery: function (e) { setSelfLinkQuery(e.target.value); },
        onPick: function (id) { return function () { selfLink(id); }; },
        logout: function () { doLogout(); },
      });
    } else {
      var vals = computeVals();
      html = '<div class="app-shell">' +
        sidebarHtml(vals) +
        '<main class="main-content">' +
        mobileTopbarHtml(vals) +
        (vals.isHome ? homeHtml(homeVals(vals)) : pageHeaderHtml(vals)) +
        (vals.isCadastro ? cadastroHtml(vals) : '') +
        (vals.isFreq ? frequenciaHtml(frequenciaVals(vals)) : '') +
        (vals.isIa ? (vals.souFull ? oikosIaHtml(vals)
          : '<div class="home-card home-empty">' +
            '<div class="home-card-title">Oikos IA é restrito</div>' +
            '<div class="home-card-sub" style="margin-top:6px">Disponível para Pastor, Pastor de Rede e administradores.</div></div>') : '') +
        (vals.isTrilho ? trilhoHtml(vals) : '') +
        (vals.isMov ? movimentacoesHtml(vals) : '') +
        (vals.isNovo ? novoHtml(vals) : '') +
        (vals.isHierarquia ? hierarquiaHtml(vals) : '') +
        '</main></div>';
    }
    root.innerHTML = html;
    UNCONTROLLED_FIELD_IDS.forEach(function (id) {
      if (!uncontrolledValues[id]) return;
      var el = document.getElementById(id);
      if (el) el.value = uncontrolledValues[id];
    });
    if (focusInfo) {
      var el = document.getElementById(focusInfo.id);
      if (el) {
        el.focus();
        if (typeof focusInfo.start === 'number' && el.setSelectionRange) {
          try { el.setSelectionRange(focusInfo.start, focusInfo.end); } catch (e) {}
        }
      }
    }
  }

  function handleEvt(e) {
    var el = e.target.closest('[data-cb]');
    if (!el) return;
    var evType = el.getAttribute('data-ev') || 'click';
    if (evType !== e.type) return;
    var fn = callbacks[el.getAttribute('data-cb')];
    if (fn) fn(e);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('app');
    root.addEventListener('click', handleEvt);
    root.addEventListener('change', handleEvt);
    root.addEventListener('input', handleEvt);
    root.addEventListener('submit', handleEvt);
    if (supabaseConfigured()) {
      sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      if (state.fpToken) { abrirFrequenciaPublica(); render(); return; }
      checkSession();
      loadCelulasPublicas();
      // Sem sessão, a tela padrão é o Cadastro de Membros público — já
      // carrega os dados dele. Se acabar logado, esse fetch só fica sem
      // uso (a policy de anon nem devolveria nada de graça caro).
      if (!state.isPublicCadastro) loadMembersPublicos();
    }
    render();
  });
})();
