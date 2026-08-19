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

  function posicaoOptions() {
    return posicaoOrder.map(function (p) { return { v: p, label: p }; });
  }

  // Situação de saída da rede: transferências (não contam como "perdido")
  // e perdidos (saiu e não quer mais participar de nenhuma igreja).
  var SITUACAO_OPTIONS = [
    { v: 'ativo', label: 'Ativo' },
    { v: 'transferido_celula', label: 'Transferido — outra célula' },
    { v: 'transferido_rede', label: 'Transferido — outra rede' },
    { v: 'transferido_igreja', label: 'Transferido — outra igreja' },
    { v: 'perdido', label: 'Perdido' },
  ];
  var SITUACAO_LABELS = SITUACAO_OPTIONS.reduce(function (m, o) { m[o.v] = o.label; return m; }, {});

  var ATT_SHEET_ID = '1QgKeRKFm_jymG5WN6C_Kx904plvd0ss6YZCcw-4QTnU';
  var ATT_GID = '792733803';
  var ATT_CSV_URL = 'https://docs.google.com/spreadsheets/d/' + ATT_SHEET_ID + '/gviz/tq?tqx=out:csv&gid=' + ATT_GID;

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

  var novoFormDefaults = { nome: '', tipo: 'Adultos', celula: 'Otavio e Jô', posicao: 'Visitante', batizado: 'Não', encontro: 'Não', civil: 'Solteiro (a)', nasc: '', tel: '', maturidade: 'Não', ctl: 'Não', seminario: 'Não', ceifeiros: 'Não', situacao: 'ativo', saidaDetalhe: '' };
  var publicFormDefaults = { nome: '', tipo: 'Adultos', celula: '', nasc: '', tel: '' };
  // modo: 'novo' (cadastra a pessoa agora) ou 'existente' (já cadastrada, só recebe posição/login)
  var adminLiderFormDefaults = { modo: 'novo', nome: '', posicao: 'Líder', celula: '', memberId: '', query: '', criarLogin: true, email: '', senha: '' };

  function urlWantsCadastroPublico() {
    try { return /[?&]cadastro(=|&|$)/.test(window.location.search); } catch (e) { return false; }
  }

  var state = {
    q: '',
    filters: { tipo: '', celula: '', posicao: '', batizado: '', encontro: '' },
    sort: { key: 'idade', dir: 1 },
    selected: null,
    tab: 'cadastro',
    sidebarOpen: false,
    trilhoFilters: { celula: '', curso: '' },

    // autenticação (Supabase Auth)
    session: false,         // false = deslogado; objeto = logado
    loginForm: { email: '', senha: '' },
    loginError: null,
    loginLoading: false,

    // vínculo login → cadastro (profiles)
    profile: null,          // null = ainda verificando; false = sem vínculo; objeto = vinculado
    profileStatus: 'idle',
    directory: [],          // members_directory, usado só na tela de vínculo
    directoryStatus: 'idle',
    selfLinkQuery: '',
    selfLinkSaving: false,
    selfLinkError: null,

    // hierarquia célula → discipulador/obreiro (só Pastor/Admin edita)
    celulaHierarquia: [],
    hierarquiaStatus: 'idle',
    hierarquiaSaving: false,

    // aba Administração: criar célula / criar liderança + login
    adminCelulaForm: { nome: '', discipuladorId: '', obreiroId: '' },
    adminCelulaSaving: false,
    adminCelulaError: null,
    adminCelulaSalvo: false,

    adminLiderForm: Object.assign({}, adminLiderFormDefaults),
    adminLiderSaving: false,
    adminLiderError: null,
    adminLiderSalvo: false,

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

    // presença por célula (planilha Google — inalterado)
    presAtt: [],
    pFilters: { celula: '', ano: '', mes: '', mesTop: '' },
    syncStatusP: 'idle',
    lastSyncP: safeGet('presenca_lastSync'),
    sortP: { key: 'data', dir: -1 },

    // presença no culto (Supabase)
    cultos: [],
    cultosStatus: 'idle',
    presencasByCulto: {},     // culto_id -> { member_id: presente }
    presencasStatus: 'idle',
    cultoAtual: null,
    novoCultoData: new Date().toISOString().slice(0, 10),
    cultoFilters: { celula: '', q: '' },

    // movimentações (Supabase)
    movimentacoes: [],
    movStatus: 'idle',
    movFilters: { celula: '', campo: '' },
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

  function parseCSV(text) {
    var rows = [];
    var row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.length && r.some(function (v) { return v !== ''; }); });
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
  function setPF(key, val) { setState(function (s) { var f = Object.assign({}, s.pFilters); f[key] = val; return { pFilters: f }; }); }
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

  function doLogout() {
    sb.auth.signOut().then(function () {
      setState({ session: false, members: [], cultos: [], movimentacoes: [], profile: null, directory: [], celulaHierarquia: [] });
    });
  }

  // ---------------------------------------------------------------------
  // Vínculo login → cadastro (profiles) e hierarquia célula → discipulador/obreiro
  // ---------------------------------------------------------------------
  function afterLinked() {
    loadMembers(); loadCultos(); loadMovimentacoes(); syncAttendance(); loadCelulaHierarquia();
  }

  function loadProfile() {
    if (!sb || !state.session) return;
    setState({ profileStatus: 'loading' });
    sb.from('profiles').select('*').eq('user_id', state.session.user.id).maybeSingle().then(function (res) {
      if (res.error) { console.warn('Erro ao carregar perfil:', res.error.message); setState({ profileStatus: 'error' }); return; }
      setState({ profile: res.data || false, profileStatus: 'ok' });
      if (res.data) afterLinked(); else loadDirectory();
    });
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

  function setHierarquiaCampo(celula, campo, memberId) {
    if (!sb) return;
    setState({ hierarquiaSaving: true });
    var patch = {};
    patch[campo] = memberId || null;
    sb.from('celula_hierarquia').update(patch).eq('celula', celula).then(function (res) {
      if (res.error) { console.warn('Erro ao salvar hierarquia:', res.error.message); setState({ hierarquiaSaving: false }); return; }
      loadCelulaHierarquia();
      setState({ hierarquiaSaving: false });
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
    if (f.criarLogin) {
      if (!email) { setState({ adminLiderError: 'Digite o e-mail de login.' }); return; }
      if (!senha || senha.length < 6) { setState({ adminLiderError: 'A senha inicial precisa ter pelo menos 6 caracteres.' }); return; }
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
        setState({ adminLiderSaving: false, adminLiderSalvo: true, adminLiderForm: Object.assign({}, adminLiderFormDefaults) });
        loadMembers(); loadCelulaHierarquia();
        return;
      }
      sb.functions.invoke('admin-create-user', { body: { email: email, password: senha, member_id: memberId } }).then(function (res) {
        if (res.error) {
          edgeFunctionErrorMessage(res.error).then(function (msg) { setState({ adminLiderSaving: false, adminLiderError: msg }); });
          return;
        }
        if (res.data && res.data.error) { setState({ adminLiderSaving: false, adminLiderError: res.data.error }); return; }
        setState({ adminLiderSaving: false, adminLiderSalvo: true, adminLiderForm: Object.assign({}, adminLiderFormDefaults) });
        loadMembers(); loadCelulaHierarquia();
      });
    };

    if (f.modo === 'existente') {
      sb.from('members').update({ posicao: f.posicao, celula: precisaCelula ? (f.celula || null) : null }).eq('id', f.memberId).then(function (res) {
        if (res.error) { setState({ adminLiderSaving: false, adminLiderError: friendlyMemberInsertError(res.error) }); return; }
        afterMember(f.memberId);
      });
    } else {
      var row = {
        nome: f.nome.trim(), tipo: 'Adultos', posicao: f.posicao,
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

  function irParaCadastroPublico() { setState({ isPublicCadastro: true }); loadCelulasPublicas(); }
  function voltarParaLogin() { setState({ isPublicCadastro: false, publicSalvo: false, publicError: null }); }

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
    return {
      nome: f.nome.trim(), tipo: f.tipo, celula: celulaObrigatoria(f.posicao) ? (f.celula || null) : null, posicao: f.posicao,
      batizado: f.batizado, encontro: f.encontro, civil: f.civil,
      nasc: f.nasc || null, tel: f.tel.trim(),
      maturidade: f.maturidade, ctl: f.ctl, seminario: f.seminario, ceifeiros: f.ceifeiros,
      situacao_saida: f.situacao, saida_detalhe: (f.saidaDetalhe || '').trim() || null,
      active: f.situacao === 'ativo',
    };
  }

  var MOVIMENTACAO_CAMPOS = ['celula', 'posicao', 'batizado', 'encontro', 'situacao_saida'];

  function startEditMembro(p) {
    setState({
      tab: 'novo', selected: null,
      novoForm: {
        nome: p.nome, tipo: p.tipo, celula: p.celula, posicao: p.posicao,
        batizado: p.batizado, encontro: p.encontro, civil: p.civil,
        nasc: p.nasc || '', tel: p.tel || '',
        maturidade: p.maturidade, ctl: p.ctl, seminario: p.seminario, ceifeiros: p.ceifeiros,
        situacao: p.situacao_saida || 'ativo', saidaDetalhe: p.saida_detalhe || '',
      },
      novoEditId: p.id,
      novoEditOriginal: p,
      novoSalvo: false, novoError: null,
    });
  }

  function cancelEditMembro() {
    setState({ novoEditId: null, novoEditOriginal: null, novoForm: Object.assign({}, novoFormDefaults), novoSalvo: false, novoError: null });
  }

  function submitNovoMembro() {
    var f = state.novoForm;
    if (!f.nome.trim() || !sb) return;
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
          setState({
            novoSaving: false, novoSalvo: true, tab: 'cadastro',
            novoEditId: null, novoEditOriginal: null, novoForm: Object.assign({}, novoFormDefaults),
            selected: mapMemberRow(res.data),
          });
          loadMembers();
        };
        if (movs.length) sb.from('movimentacoes').insert(movs).then(function () { loadMovimentacoes(); afterSave(); });
        else afterSave();
      });
    } else {
      sb.from('members').insert(row).then(function (res) {
        if (res.error) { setState({ novoSaving: false, novoError: friendlyMemberInsertError(res.error) }); return; }
        setState({ novoSaving: false, novoSalvo: true, novoForm: Object.assign({}, novoFormDefaults) });
        loadMembers();
      });
    }
  }

  // ---------------------------------------------------------------------
  // Presença por célula (planilha Google — inalterado)
  // ---------------------------------------------------------------------
  function syncAttendance() {
    setState({ syncStatusP: 'loading' });
    fetch(ATT_CSV_URL + '&_t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (text) {
        var rows = parseCSV(text);
        if (!rows.length) throw new Error('Planilha vazia');
        var header = rows[0].map(function (h) { return h.trim(); });
        var norm = function (s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); };
        var findCol = function (needle) { return header.findIndex(function (h) { return norm(h).includes(norm(needle)); }); };
        var cLider = findCol('Nome do Lider'), cData = findCol('Data da Célula'),
          cTipo = findCol('Ponte ou'), cMembros = findCol('Qtde de membros'),
          cFA = findCol('Qtde de FA'), cVisit = findCol('Qtde de Visitantes'),
          cKidsVisit = findCol('Visitantes Kids'),
          cKids = header.findIndex(function (h, i) { return norm(h).includes('kids') && i !== cKidsVisit; }),
          cMes = findCol('Mês'), cAno = findCol('Ano');
        var records = rows.slice(1).map(function (r) {
          var celula = (r[cLider] || '').trim();
          var dataStr = (r[cData] || '').trim();
          if (!celula || !dataStr) return null;
          var m = dataStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          var iso = m ? (m[3] + '-' + String(+m[2]).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0')) : null;
          var mesNome = (r[cMes] || '').trim().toUpperCase();
          var ano = parseInt((r[cAno] || '').trim(), 10) || (m ? +m[3] : null);
          var mesIdx = MESES_PT.indexOf(mesNome);
          var membros = numOrZero(r[cMembros]);
          var fa = numOrZero(r[cFA]);
          var visit = numOrZero(r[cVisit]);
          var kids = numOrZero(r[cKids]);
          var kidsVisit = cKidsVisit >= 0 ? numOrZero(r[cKidsVisit]) : 0;
          return {
            celula: celula, dataIso: iso, dataLabel: dataStr,
            tipoRodizio: (r[cTipo] || '').trim(),
            membros: membros, fa: fa, visit: visit, kids: kids + kidsVisit,
            mesIdx: mesIdx >= 0 ? mesIdx : (m ? +m[2] - 1 : null),
            ano: ano,
            total: membros + fa + visit + kids + kidsVisit,
          };
        }).filter(Boolean);
        if (!records.length) throw new Error('Nenhum registro encontrado');
        var now = new Date().toISOString();
        safeSet('presenca_lastSync', now);
        setState({ presAtt: records, syncStatusP: 'ok', lastSyncP: now });
      })
      .catch(function (err) {
        console.warn('Sync de presença falhou:', err.message);
        setState({ syncStatusP: 'error' });
      });
  }

  // ---------------------------------------------------------------------
  // Presença no culto (Supabase, check-in por pessoa)
  // ---------------------------------------------------------------------
  function loadCultos() {
    if (!sb) return;
    setState({ cultosStatus: 'loading' });
    sb.from('cultos').select('*').order('data', { ascending: false }).then(function (res) {
      if (res.error) { console.warn('Erro ao carregar cultos:', res.error.message); setState({ cultosStatus: 'error' }); return; }
      setState({ cultos: res.data, cultosStatus: 'ok' });
      loadTodasPresencas();
    });
  }

  function loadTodasPresencas() {
    if (!sb) return;
    setState({ presencasStatus: 'loading' });
    sb.from('presencas_culto').select('culto_id, member_id, presente').then(function (res) {
      if (res.error) { console.warn('Erro ao carregar presenças:', res.error.message); setState({ presencasStatus: 'error' }); return; }
      var byCulto = {};
      res.data.forEach(function (r) {
        var m = byCulto[r.culto_id] || (byCulto[r.culto_id] = {});
        m[r.member_id] = r.presente;
      });
      setState({ presencasByCulto: byCulto, presencasStatus: 'ok' });
    });
  }

  function setCultoData(val) { setState({ novoCultoData: val }); }

  function abrirCulto(cultoId) { setState({ cultoAtual: cultoId }); }

  function criarCulto() {
    if (!sb) return;
    var dataEl = document.getElementById('culto-data-input');
    var data = dataEl ? dataEl.value : state.novoCultoData;
    if (!data) return;
    var existente = state.cultos.filter(function (c) { return c.data === data && c.tipo === 'Culto'; })[0];
    if (existente) { setState({ cultoAtual: existente.id, novoCultoData: data }); return; }
    sb.from('cultos').insert({ data: data }).select().single().then(function (res) {
      if (res.error) { console.warn('Erro ao criar culto:', res.error.message); return; }
      setState(function (s) { return { cultos: [res.data].concat(s.cultos), cultoAtual: res.data.id, novoCultoData: data }; });
    });
  }

  function togglePresenca(cultoId, memberId, presente) {
    setState(function (s) {
      var byCulto = Object.assign({}, s.presencasByCulto);
      var m = Object.assign({}, byCulto[cultoId]);
      m[memberId] = presente;
      byCulto[cultoId] = m;
      return { presencasByCulto: byCulto };
    });
    sb.from('presencas_culto').upsert({ culto_id: cultoId, member_id: memberId, presente: presente }, { onConflict: 'culto_id,member_id' }).then(function (res) {
      if (res.error) console.warn('Erro ao salvar presença:', res.error.message);
    });
  }

  function setCF(key, val) { setState(function (s) { var f = Object.assign({}, s.cultoFilters); f[key] = val; return { cultoFilters: f }; }); }

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

  function sharePresencaWhatsapp() {
    var vals = computeVals();
    var pf = vals.pFilters || {};
    var bits = [];
    if (pf.celula) bits.push('Célula: ' + celulaLabel(pf.celula));
    if (pf.ano) bits.push('Ano: ' + pf.ano);
    if (pf.mesTop !== '') bits.push('Mês: ' + MESES_PT[pf.mesTop]);
    var filterLabel = bits.length ? bits.join(' · ') : 'Todas as células, anos e meses';
    var lines = ['*Presença por Célula*', filterLabel, '', 'Encontros: ' + vals.pk.registros, 'Presença média: ' + vals.pk.media, 'FAs: ' + vals.pk.totalFA, 'Visitantes: ' + vals.pk.totalVisit, ''];
    (vals.freqPorLiderRows || []).forEach(function (r) { lines.push('• ' + r.celula + ' — Membros: ' + r.membros + ' · FAs: ' + r.fa + ' · Visitantes: ' + r.visit); });
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  function shareListWhatsapp(title, rows, nomeKey, nascKey) {
    var lines = ['*' + title + '*', ''];
    rows.forEach(function (r) { lines.push('• ' + r[nomeKey] + ' — ' + (r[nascKey] || '—')); });
    window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
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

  function shareFreqLiderWhatsapp() {
    var vals = computeVals();
    var rows = vals.freqPorLiderRows || [];
    var lines = ['*Frequência Média por Líder de Célula*', ''];
    rows.forEach(function (r) { lines.push('• ' + r.celula + ' — Membros: ' + r.membros + ' · FAs: ' + r.fa + ' · Visitantes: ' + r.visit); });
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
    var lines = ['*Trilho do Vencedor*', label, rows.length + ' adultos', ''];
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
    var subtitle = label + ' · ' + rows.length + ' adultos · gerado em ' + new Date().toLocaleString('pt-BR');
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
    var adultos = filtered.filter(function (p) { return p.tipo === 'Adultos'; }).length;
    var kids = total - adultos;
    var batN = filtered.filter(function (p) { return p.batizado === 'Sim'; }).length;
    var encN = filtered.filter(function (p) { return p.encontro === 'Sim'; }).length;
    var lideranca = filtered.filter(function (p) { return POSICOES_LIDERANCA.indexOf(p.posicao) >= 0; }).length;
    var potenciais = filtered.filter(function (p) { return POSICOES_POTENCIAIS.indexOf(p.posicao) >= 0; }).length;
    var membrosRede = filtered.filter(function (p) { return POSICOES_REDE.indexOf(p.posicao) >= 0; }).length;
    var batPct = pct(batN), encPct = pct(encN);

    // "Total" = todo mundo na seleção menos os visitantes; estes têm o
    // próprio quadro "Visitantes".
    var naoVisitante = filtered.filter(function (p) { return p.posicao !== 'Visitante'; });
    var visitantesFiltrados = filtered.filter(function (p) { return p.posicao === 'Visitante'; });
    var adultosSV = naoVisitante.filter(function (p) { return p.tipo === 'Adultos'; }).length;
    var kidsSV = naoVisitante.length - adultosSV;
    var visitAdultos = visitantesFiltrados.filter(function (p) { return p.tipo === 'Adultos'; }).length;
    var visitKids = visitantesFiltrados.length - visitAdultos;
    var faFiltrados = filtered.filter(function (p) { return p.posicao === 'Frequentador Assíduo'; });
    var faAdultos = faFiltrados.filter(function (p) { return p.tipo === 'Adultos'; }).length;
    var faKids = faFiltrados.length - faAdultos;

    var k = {
      total: naoVisitante.length,
      adultosKidsLabel: adultosSV + ' adultos · ' + kidsSV + ' kids/juvenis',
      totalVisitantes: visitantesFiltrados.length,
      visitantesLabel: visitAdultos + ' adultos · ' + visitKids + ' kids/juvenis',
      totalFA: faFiltrados.length,
      faLabel: faAdultos + ' adultos · ' + faKids + ' kids/juvenis',
      totalKids: kids,
      batPct: batPct, batLabel: batN + ' de ' + total + ' pessoas',
      encPct: encPct, encLabel: encN + ' de ' + total + ' pessoas',
      lideranca: lideranca, potenciais: potenciais, membrosRede: membrosRede,
      faltamBat: filtered.filter(function (p) { return p.batizado === 'Não'; }).length,
      faltamEnc: filtered.filter(function (p) { return p.encontro === 'Não'; }).length,
    };

    var gaugeBat = 'conic-gradient(#149C88 ' + (batPct * 3.6) + 'deg, #e4ebf3 0)';
    var gaugeEnc = 'conic-gradient(#3B5FDD ' + (encPct * 3.6) + 'deg, #e4ebf3 0)';

    // Estado civil bars
    var civilOrder = ['Casado (a)', 'Solteiro (a)', 'Viuvo (a)', 'Divorciado(a)', 'Amasiado (a)'];
    var civilLabels = { 'Casado (a)': 'Casado(a)', 'Solteiro (a)': 'Solteiro(a)', 'Viuvo (a)': 'Viúvo(a)', 'Divorciado(a)': 'Divorciado(a)', 'Amasiado (a)': 'Amasiado(a)' };
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
        return { nome: p.nome, numeroLabel: p.numero != null ? String(p.numero) : '—', idade: p.idade, celulaLabel: celulaLabel(p.celula), encontro: p.encontro, encBg: eb[0], encFg: eb[1], batizado: p.batizado, batBg: bb[0], batFg: bb[1], nascLabel: nascLabel(p.nasc) };
      });

    // Detail
    var s = state.selected;
    var sel = null;
    if (s) {
      var initials = s.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
      var nascLabelSel = '—';
      if (s.nasc) { var d2 = new Date(s.nasc); nascLabelSel = d2.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
      var historico = (state.movimentacoes || []).filter(function (m) { return m.member_id === s.id; }).map(function (m) {
        var campoLabel = { celula: 'Célula', posicao: 'Posição', batizado: 'Batismo', encontro: 'Encontro com Deus', situacao_saida: 'Situação', nota: 'Nota' }[m.campo] || m.campo;
        var desc = m.campo === 'nota' ? m.observacao : (celulaLabelOrRaw(m.campo, m.valor_anterior) + ' → ' + celulaLabelOrRaw(m.campo, m.valor_novo));
        return { data: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }), campoLabel: campoLabel, desc: desc };
      });
      sel = {
        id: s.id, nome: s.nome, posicao: s.posicao, tipo: s.tipo, initials: initials, fields: [
          { label: 'Nº de matrícula', value: s.numero != null ? String(s.numero) : '—' },
          { label: 'Célula', value: celulaLabel(s.celula) },
          { label: 'Idade', value: s.idade != null ? s.idade + ' anos' : '—' },
          { label: 'Nascimento', value: nascLabelSel },
          { label: 'Estado civil', value: s.civil },
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

    // ---- Presença por célula ----
    var att = state.presAtt || [];
    var pf = state.pFilters;
    var attFiltered = att.filter(function (r) {
      if (pf.celula && r.celula !== pf.celula) return false;
      if (pf.ano && String(r.ano) !== String(pf.ano)) return false;
      if (pf.mesTop !== '' && String(r.mesIdx) !== String(pf.mesTop)) return false;
      return true;
    });
    var pMesSet = Array.from(new Set(att.filter(function (r) { return r.mesIdx != null; }).map(function (r) { return r.mesIdx; }))).sort(function (a, b) { return a - b; });
    var pMesOptions = pMesSet.map(function (mi) { return { v: String(mi), label: MESES_PT[mi] }; });

    var celulaLabelP = celulaLabel;
    var pCelulaSet = Array.from(new Set(att.map(function (r) { return r.celula; }))).sort(function (a, b) { return celulaLabelP(a).localeCompare(celulaLabelP(b), 'pt'); });
    var pCelulaOptions = pCelulaSet.map(function (c) { return { v: c, label: celulaLabelP(c) }; });
    var pAnoSet = Array.from(new Set(att.map(function (r) { return r.ano; }).filter(Boolean))).sort();
    var pAnoOptions = pAnoSet.map(function (a) { return { v: String(a), label: String(a) }; });

    var pRegistros = attFiltered.length;
    var pTotalGeral = attFiltered.reduce(function (s2, r) { return s2 + r.total; }, 0);
    var pMedia = pRegistros ? Math.round(pTotalGeral / pRegistros) : 0;
    var pTotalFA = attFiltered.reduce(function (s2, r) { return s2 + r.fa; }, 0);
    var pTotalVisit = attFiltered.reduce(function (s2, r) { return s2 + r.visit; }, 0);

    var periodoLabel = 'sem dados';
    var isoRecs = attFiltered.filter(function (r) { return r.dataIso; }).map(function (r) { return r.dataIso; }).sort();
    if (isoRecs.length) {
      var fmt = function (iso) { var d3 = new Date(iso + 'T00:00:00'); return d3.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }); };
      periodoLabel = fmt(isoRecs[0]) + ' – ' + fmt(isoRecs[isoRecs.length - 1]);
    }

    var pk = { registros: pRegistros, media: pMedia, totalFA: pTotalFA, totalVisit: pTotalVisit, periodoLabel: periodoLabel };

    // por célula (stacked membros/fa/visit/kids)
    var celAttStats = {};
    attFiltered.forEach(function (r) {
      var c = celAttStats[r.celula] || (celAttStats[r.celula] = { membros: 0, fa: 0, visit: 0, kids: 0, total: 0, registros: 0, meses: new Set() });
      c.membros += r.membros; c.fa += r.fa; c.visit += r.visit; c.kids += r.kids; c.total += r.total; c.registros++;
      if (r.ano && r.mesIdx != null) c.meses.add(r.ano * 100 + r.mesIdx);
    });

    // média de frequência por líder de célula — só 2026
    var att2026 = att.filter(function (r) {
      if (pf.celula && r.celula !== pf.celula) return false;
      if (r.ano !== 2026) return false;
      if (pf.mes !== '' && String(r.mesIdx) !== String(pf.mes)) return false;
      return true;
    });

    // Frequência da Célula (registros brutos) + Frequência Média por Mês
    var freqCelulaRows = attFiltered.slice().sort(function (a, b) { return (b.dataIso || '').localeCompare(a.dataIso || ''); }).map(function (r) {
      return {
        dia: r.dataIso ? r.dataIso.slice(8, 10) : ((r.dataLabel || '').split('/')[0] || '—'),
        mes: r.mesIdx != null ? MESES_PT[r.mesIdx] : '—',
        membros: r.membros, fa: r.fa, visit: r.visit,
      };
    });
    var freqMesStats = {};
    attFiltered.forEach(function (r) {
      if (r.mesIdx == null) return;
      var c = freqMesStats[r.mesIdx] || (freqMesStats[r.mesIdx] = { membros: 0, fa: 0, visit: 0, n: 0 });
      c.membros += r.membros; c.fa += r.fa; c.visit += r.visit; c.n++;
    });
    var freqMediaMesRows = Object.keys(freqMesStats).map(Number).sort(function (a, b) { return a - b; }).map(function (mi) {
      var st = freqMesStats[mi];
      return { mes: MESES_PT[mi], membros: Math.round(st.membros / st.n), fa: Math.round(st.fa / st.n), visit: Math.round(st.visit / st.n) };
    });
    var freqLiderStats = {};
    attFiltered.forEach(function (r) {
      var c = freqLiderStats[r.celula] || (freqLiderStats[r.celula] = { membros: 0, fa: 0, visit: 0, n: 0 });
      c.membros += r.membros; c.fa += r.fa; c.visit += r.visit; c.n++;
    });
    var freqPorLiderRows = currentCelulaList().filter(function (cel) { return freqLiderStats[cel]; }).map(function (cel) {
      var st = freqLiderStats[cel];
      return { celula: celulaLabelP(cel), membros: Math.round(st.membros / st.n), fa: Math.round(st.fa / st.n), visit: Math.round(st.visit / st.n) };
    });

    var mesesComDados2026 = Array.from(new Set(att.filter(function (r) { return r.ano === 2026 && r.mesIdx != null; }).map(function (r) { return r.mesIdx; }))).sort(function (a, b) { return a - b; });
    var mesOptions = mesesComDados2026.map(function (mi) { return { v: String(mi), label: MES_ABREV[mi] }; });

    var celAtt2026 = {};
    att2026.forEach(function (r) {
      var c = celAtt2026[r.celula] || (celAtt2026[r.celula] = { membros: 0, fa: 0, visit: 0, total: 0, registros: 0, meses: new Set() });
      c.membros += r.membros; c.fa += r.fa; c.visit += r.visit; c.total += (r.membros + r.fa + r.visit); c.registros++;
      if (r.mesIdx != null) c.meses.add(r.mesIdx);
    });
    var mediaCatColor = { membros: '#1B2344', fa: '#149C88', visit: '#8A63C9' };
    var mediaCatLabel = { membros: 'Membros', fa: 'FAs', visit: 'Visitantes' };
    var mediaMax = Math.max(1, Object.values(celAtt2026).map(function (c) { return Math.round(c.total / (c.meses.size || 1)); }).reduce(function (a, b) { return Math.max(a, b); }, 0));
    var mediaLiderBars = Object.keys(celAtt2026)
      .map(function (cel) {
        var st = celAtt2026[cel];
        var mesesAtivos = st.meses.size || 1;
        var mediaMensal = Math.round(st.total / mesesAtivos);
        var cats = ['membros', 'fa', 'visit'].filter(function (k2) { return st[k2] > 0; });
        var segs = cats.map(function (k2) {
          var catMedia = Math.round(st[k2] / mesesAtivos);
          return { w: Math.round(catMedia / mediaMax * 100) + '%', color: mediaCatColor[k2], title: catMedia + ' ' + mediaCatLabel[k2] + '/mês' };
        });
        return { cel: cel, mediaMensal: mediaMensal, mesesAtivos: mesesAtivos, registros: st.registros, segs: segs, totalW: Math.round(mediaMensal / mediaMax * 100) + '%' };
      })
      .sort(function (a, b) { return b.mediaMensal - a.mediaMensal; })
      .map(function (x) {
        var active = pf.celula === x.cel;
        return {
          label: celulaLabelP(x.cel), mediaMensal: x.mediaMensal, mesesAtivos: x.mesesAtivos, registros: x.registros,
          mesLabel: x.mesesAtivos === 1 ? 'mês' : 'meses',
          segs: x.segs, totalW: x.totalW,
          bg: active ? '#eaf1fa' : 'transparent', weight: active ? 700 : 500,
          onClick: function () { setPF('celula', active ? '' : x.cel); },
        };
      });

    // tabela de registros
    var sortP = state.sortP;
    var sortedAtt = attFiltered.slice().sort(function (a, b) {
      var av = a.dataIso || '0000-00-00', bv = b.dataIso || '0000-00-00';
      return av < bv ? -sortP.dir : (av > bv ? sortP.dir : 0);
    });
    var pRows = sortedAtt.map(function (r) {
      var isRodizio = /sim/i.test(r.tipoRodizio);
      return {
        dataLabel: r.dataLabel, celulaLabel: celulaLabelP(r.celula),
        membros: r.membros, fa: r.fa, visit: r.visit, kids: r.kids, total: r.total,
        tipo: isRodizio ? 'Ponte/Rodízio' : 'Célula',
        tipoBg: isRodizio ? '#faf1de' : '#eef2f7', tipoFg: isRodizio ? '#a1780f' : '#5a6b80',
      };
    });

    var syncLabelMapP = {
      idle: { text: 'Sincronizando…', color: '#6b7c93', dot: '#c3cfde' },
      loading: { text: 'Sincronizando…', color: '#6b7c93', dot: '#5B8FE0' },
      ok: { text: state.lastSyncP ? 'Atualizado ' + new Date(state.lastSyncP).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Atualizado', color: '#0E7A68', dot: '#149C88' },
      error: { text: state.lastSyncP ? 'Offline · última sinc. ' + new Date(state.lastSyncP).toLocaleDateString('pt-BR') : 'Não foi possível sincronizar', color: '#6B3FA0', dot: '#6B3FA0' },
    };
    var syncP = syncLabelMapP[state.syncStatusP] || syncLabelMapP.idle;

    var isCadastro = state.tab === 'cadastro';
    var isPresenca = state.tab === 'presenca';
    var isTrilho = state.tab === 'trilho';
    var isNovo = state.tab === 'novo';
    var isCulto = state.tab === 'culto';
    var isMov = state.tab === 'mov';
    var isHierarquia = state.tab === 'hierarquia';

    // ---- Acesso total (Pastor/Pastor de Rede/admin) — só reflete a UI;
    // quem garante de verdade é a RLS no Supabase. ----
    var meuMembro = (state.profile && allPessoas.filter(function (p) { return p.id === state.profile.member_id; })[0]) || null;
    var souFull = !!(state.profile && (state.profile.is_admin || (meuMembro && ['Pastor', 'Pastor de Rede'].indexOf(meuMembro.posicao) >= 0)));

    // ---- Hierarquia célula → discipulador/obreiro (só Pastor/Admin edita) ----
    // Quem responde por um discipulador pode ser um Obreiro, mas também
    // pode pular direto pra Pastor de Rede ou Pastor, dependendo do
    // tamanho da rede.
    var discipuladores = allPessoas.filter(function (p) { return p.posicao === 'Discipulador' && p.active !== false; }).map(function (p) { return { v: p.id, label: p.nome }; });
    var obreiros = allPessoas.filter(function (p) { return POSICOES_OBREIRO_OU_ACIMA.indexOf(p.posicao) >= 0 && p.active !== false; }).map(function (p) { return { v: p.id, label: p.nome + ' (' + p.posicao + ')' }; });
    var hierarquiaRows = currentCelulaList().map(function (c) {
      var row = (state.celulaHierarquia || []).filter(function (h) { return h.celula === c; })[0] || {};
      return {
        celula: c, celulaLabelText: celulaLabel(c),
        discipuladorId: row.discipulador_id || '', obreiroId: row.obreiro_id || '',
        onDiscipulador: function (e) { setHierarquiaCampo(c, 'discipulador_id', e.target.value); },
        onObreiro: function (e) { setHierarquiaCampo(c, 'obreiro_id', e.target.value); },
      };
    });

    // ---- Administração: nova liderança (busca de pessoa já cadastrada + aviso de discipulador faltando) ----
    var alf = state.adminLiderForm;
    var adminLiderBusca = (alf.modo === 'existente' && alf.query.trim())
      ? allPessoas.filter(function (p) { return p.nome.toLowerCase().indexOf(alf.query.trim().toLowerCase()) >= 0; }).slice(0, 20)
      : [];
    var adminLiderCelulaInfo = (state.celulaHierarquia || []).filter(function (h) { return h.celula === alf.celula; })[0] || null;
    var adminLiderSemDiscipulador = alf.posicao === 'Líder' && !!alf.celula && (!adminLiderCelulaInfo || !adminLiderCelulaInfo.discipulador_id);

    // ---- Presença no culto ----
    var todosAtivos = all.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); });
    var cf = state.cultoFilters;
    var cultoQ = (cf.q || '').trim().toLowerCase();
    var membrosCulto = todosAtivos.filter(function (p) {
      if (cf.celula && p.celula !== cf.celula) return false;
      if (cultoQ && !p.nome.toLowerCase().includes(cultoQ)) return false;
      return true;
    });
    var cultoAtualId = state.cultoAtual;
    var presencasAtual = (cultoAtualId && state.presencasByCulto[cultoAtualId]) || {};
    var presentesCount = Object.keys(presencasAtual).filter(function (id) { return presencasAtual[id]; }).length;
    var cultoRows = membrosCulto.map(function (p) {
      var presente = !!presencasAtual[p.id];
      return {
        id: p.id, nome: p.nome, celulaLabel: celulaLabel(p.celula), presente: presente,
        onToggle: function () { togglePresenca(cultoAtualId, p.id, !presente); },
      };
    });
    var cultoAtualObj = state.cultos.filter(function (c) { return c.id === cultoAtualId; })[0] || null;
    var historicoCultos = state.cultos.map(function (c) {
      var pres = state.presencasByCulto[c.id] || {};
      var n = Object.keys(pres).filter(function (id) { return pres[id]; }).length;
      return {
        id: c.id, dataLabel: new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        presentes: n, active: c.id === cultoAtualId,
        onClick: function () { abrirCulto(c.id); },
      };
    });
    var cultoCelulaOptions = currentCelulaList().filter(function (c) { return all.some(function (p) { return p.celula === c; }); }).map(function (c) { return { v: c, label: celulaLabel(c) }; });

    // ---- Movimentações ----
    var mf = state.movFilters;
    var movRows = (state.movimentacoes || []).filter(function (m) {
      if (mf.celula && (!m.members || m.members.celula !== mf.celula)) return false;
      if (mf.campo && m.campo !== mf.campo) return false;
      return true;
    }).map(function (m) {
      var campoLabel = { celula: 'Célula', posicao: 'Posição', batizado: 'Batismo', encontro: 'Encontro com Deus', situacao_saida: 'Situação', nota: 'Nota' }[m.campo] || m.campo;
      var desc = m.campo === 'nota' ? (m.observacao || '') : (celulaLabelOrRaw(m.campo, m.valor_anterior) + ' → ' + celulaLabelOrRaw(m.campo, m.valor_novo));
      return {
        dataLabel: new Date(m.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        nome: (m.members && m.members.nome) || '—',
        celulaLabel: (m.members && m.members.celula) ? celulaLabel(m.members.celula) : '—',
        campoLabel: campoLabel, desc: desc,
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
    var sairamRows = pessoasSairam.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt'); }).map(function (p) {
      return {
        nome: p.nome, celulaLabel: celulaLabel(p.celula),
        situacaoLabel: SITUACAO_LABELS[p.situacao_saida] || p.situacao_saida || '—',
        detalhe: p.saida_detalhe || '—',
      };
    });

    // ---- Trilho (Maturidade / CTL / Seminário Pastoral) ----
    var tf = state.trilhoFilters;
    var trilhoCourses = [
      { key: 'ceifeiros', label: 'Ceifeiros', color: '#5B8FE0' },
      { key: 'maturidade', label: 'Maturidade', color: '#149C88' },
      { key: 'ctl', label: 'CTL', color: '#3B5FDD' },
      { key: 'seminario', label: 'Seminário Pastoral', color: '#6B3FA0' },
    ];
    var trilhoPop = all.filter(function (p) {
      if (p.tipo !== 'Adultos') return false;
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
      isCadastro: isCadastro, isPresenca: isPresenca,
      tabCadastroColor: isCadastro ? '#1B2344' : '#8a99ab',
      tabCadastroBorder: isCadastro ? '#1B2344' : 'transparent',
      tabPresencaColor: isPresenca ? '#1B2344' : '#8a99ab',
      tabPresencaBorder: isPresenca ? '#1B2344' : 'transparent',
      goCadastro: function () { setState({ tab: 'cadastro', sidebarOpen: false }); },
      goPresenca: function () { setState({ tab: 'presenca', sidebarOpen: false }); },
      goTrilho: function () { setState({ tab: 'trilho', sidebarOpen: false }); },
      goNovo: function () { setState({ tab: 'novo', novoSalvo: false, novoError: null, sidebarOpen: false }); },
      goCulto: function () { setState({ tab: 'culto', sidebarOpen: false }); },
      goMov: function () { setState({ tab: 'mov', sidebarOpen: false }); },
      goHierarquia: function () { setState({ tab: 'hierarquia', sidebarOpen: false }); },
      sidebarOpen: state.sidebarOpen,
      openSidebar: function () { setState({ sidebarOpen: true }); },
      closeSidebar: function () { setState({ sidebarOpen: false }); },
      isTrilho: isTrilho, isNovo: isNovo, isCulto: isCulto, isMov: isMov, isHierarquia: isHierarquia,
      souFull: souFull,
      tabTrilhoColor: isTrilho ? '#1B2344' : '#8a99ab',
      tabTrilhoBorder: isTrilho ? '#1B2344' : 'transparent',
      tabNovoColor: isNovo ? '#1B2344' : '#8a99ab',
      tabNovoBorder: isNovo ? '#1B2344' : 'transparent',
      tabCultoColor: isCulto ? '#1B2344' : '#8a99ab',
      tabCultoBorder: isCulto ? '#1B2344' : 'transparent',
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
      adminLiderForm: alf, adminLiderSaving: state.adminLiderSaving,
      adminLiderError: state.adminLiderError, adminLiderSalvo: state.adminLiderSalvo,
      adminLiderBusca: adminLiderBusca, adminLiderSemDiscipulador: adminLiderSemDiscipulador,
      posicoesAdminLideranca: POSICOES_ADMIN_LIDERANCA.map(function (p) { return { v: p, label: p }; }),
      onAdminLider: function (key) { return function (e) { setAdminLiderField(key, e.target.value); }; },
      setAdminLiderModo: function (modo) { return function () { setAdminLiderModo(modo); }; },
      pickAdminLiderExistente: function (m) { return function () { pickAdminLiderExistente(m); }; },
      submitAdminLider: function (e) { if (e && e.preventDefault) e.preventDefault(); submitAdminLider(); },
      novoForm: state.novoForm, novoSalvo: state.novoSalvo, novoSaving: state.novoSaving, novoError: state.novoError,
      isEditingMembro: !!state.novoEditId,
      cancelEditMembro: function () { cancelEditMembro(); },
      onNF: function (key) { return function (e) { setNF(key, e.target.value); }; },
      submitNovoMembro: function () { submitNovoMembro(); },
      celulaOptionsForm: currentCelulaList().map(function (c) { return { v: c, label: celulaLabel(c) }; }),
      cultos: historicoCultos, cultosStatus: state.cultosStatus,
      novoCultoData: state.novoCultoData,
      onCultoData: function (e) { setCultoData(e.target.value); },
      criarCulto: function () { criarCulto(); },
      cultoAtual: cultoAtualObj ? Object.assign({}, cultoAtualObj, { dataLabel: new Date(cultoAtualObj.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }) : null,
      cultoRows: cultoRows, cultoTotal: membrosCulto.length, cultoPresentes: presentesCount,
      cultoPct: membrosCulto.length ? Math.round(presentesCount / membrosCulto.length * 100) : 0,
      cultoFilters: cf, cultoCelulaOptions: cultoCelulaOptions,
      onCFCelula: function (e) { setCF('celula', e.target.value); },
      onCFQ: function (e) { setCF('q', e.target.value); },
      movRows: movRows, movStatus: state.movStatus, movFilters: mf, movCelulaOptions: movCelulaOptions,
      perdidosRows: perdidosRows, totalPerdidos: totalPerdidos, sairamRows: sairamRows,
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
      pFilters: Object.assign({}, pf, { celulaLabel: pf.celula ? celulaLabelP(pf.celula) : 'Todas as células' }),
      pCelulaOptions: pCelulaOptions, pAnoOptions: pAnoOptions, mesOptions: mesOptions,
      pMesOptions: pMesOptions,
      onPCelula: function (e) { setPF('celula', e.target.value); },
      onPAno: function (e) { setPF('ano', e.target.value); },
      onPMesTop: function (e) { setPF('mesTop', e.target.value); },
      onPMes: function (e) { setPF('mes', e.target.value); },
      clearPFilters: function () { setState({ pFilters: { celula: '', ano: '', mes: '', mesTop: '' } }); },
      onRefreshP: function () { syncAttendance(); },
      sharePresencaWhatsapp: function () { sharePresencaWhatsapp(); },
      syncP: syncP,
      pk: pk, mediaLiderBars: mediaLiderBars, pRows: pRows,
      freqCelulaRows: freqCelulaRows, freqMediaMesRows: freqMediaMesRows, freqPorLiderRows: freqPorLiderRows,
      shareFreqLiderWhatsapp: function () { shareFreqLiderWhatsapp(); },
      sortPData: function () { setState(function (st) { return { sortP: { key: 'data', dir: -st.sortP.dir } }; }); },
      sortPDataArrow: sortP.dir === 1 ? '↑' : '↓',
      q: state.q,
      filters: f,
      k: k, gaugeBat: gaugeBat, gaugeEnc: gaugeEnc, civilBars: civilBars, posBars: posBars, celulaBars: celulaBars, perfilBars: perfilBars, people: people, visitantes: visitantes, kids3a12: kids3a12,
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

  var NAV_ICONS = {
    cadastro: '<circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7"></path>',
    presenca: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect>',
    culto: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 3v4"></path><path d="M16 3v4"></path><path d="m9 15 2 2 4-4"></path>',
    trilho: '<path d="M5 3v18"></path><path d="M5 4h11l-2 4 2 4H5"></path>',
    mov: '<path d="M4 7h4l3 10h6"></path><path d="M4 17h4l3-10h6"></path><path d="m17 4 3 3-3 3"></path><path d="m17 14 3 3-3 3"></path>',
    novo: '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path>',
    hierarquia: '<circle cx="12" cy="4.5" r="2"></circle><circle cx="5" cy="18" r="2"></circle><circle cx="19" cy="18" r="2"></circle><path d="M12 6.5v4"></path><path d="M12 10.5 6 16"></path><path d="M12 10.5 18 16"></path>',
  };

  function navIcon(key) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto">' + NAV_ICONS[key] + '</svg>';
  }

  function sideNavItem(iconKey, label, active, onClick) {
    var bg = active ? 'rgba(255,255,255,.14)' : 'transparent';
    var color = active ? '#fff' : 'rgba(255,255,255,.7)';
    var borderColor = active ? '#149C88' : 'transparent';
    return '<button ' + cb(onClick) + ' style="display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:10px 12px;border:none;border-left:3px solid ' + borderColor + ';border-radius:0 9px 9px 0;background:' + bg + ';color:' + color + ';font-size:13.5px;font-weight:600;cursor:pointer">' +
      navIcon(iconKey) + '<span>' + escHtml(label) + '</span></button>';
  }

  function sidebarHtml(vals) {
    var items = [
      { icon: 'cadastro', label: 'Cadastro de Membros', active: vals.isCadastro, onClick: vals.goCadastro, show: true },
      { icon: 'presenca', label: 'Presença por Célula', active: vals.isPresenca, onClick: vals.goPresenca, show: true },
      { icon: 'culto', label: 'Presença no Culto', active: vals.isCulto, onClick: vals.goCulto, show: true },
      { icon: 'trilho', label: 'Trilho do Vencedor', active: vals.isTrilho, onClick: vals.goTrilho, show: true },
      { icon: 'mov', label: 'Movimentações', active: vals.isMov, onClick: vals.goMov, show: true },
      { icon: 'novo', label: '+ Novo Cadastro', active: vals.isNovo, onClick: vals.goNovo, show: true },
      { icon: 'hierarquia', label: 'Administração', active: vals.isHierarquia, onClick: vals.goHierarquia, show: vals.souFull },
    ];
    return '' +
      '<aside class="sidebar' + (vals.sidebarOpen ? ' sidebar-open' : '') + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:36px;width:auto">' +
      '<button ' + cb(vals.closeSidebar) + ' class="sidebar-close-btn" style="border:none;background:rgba(255,255,255,.1);color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;line-height:1">✕</button>' +
      '</div>' +
      '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.14)">' +
      '<div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:700">Videira SCS · Rede Oikos</div>' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:18px;color:#fff;margin-top:3px;line-height:1.25">Cadastro de Membros &amp; FAs</div>' +
      '</div>' +
      '<nav style="display:flex;flex-direction:column;gap:3px;margin-top:22px">' +
      items.filter(function (it) { return it.show; }).map(function (it) { return sideNavItem(it.icon, it.label, it.active, it.onClick); }).join('') +
      '</nav>' +
      '<div style="margin-top:auto;padding-top:18px">' +
      '<button ' + cb(vals.onRefresh) + ' title="Sincronizar agora com a planilha" style="display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);border-radius:20px;padding:7px 12px;cursor:pointer;width:100%">' +
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
      '</div></div>' +
      '</aside>' +
      '<div class="sidebar-backdrop' + (vals.sidebarOpen ? ' show' : '') + '" ' + cb(vals.closeSidebar) + '></div>';
  }

  function mobileTopbarHtml(vals) {
    return '<div class="mobile-topbar">' +
      '<button ' + cb(vals.openSidebar) + ' style="border:none;background:#eef2f7;width:36px;height:36px;border-radius:9px;cursor:pointer;color:#1B2344;font-size:17px;line-height:1">☰</button>' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:15px;color:#1B2344">Cadastro de Membros &amp; FAs</div>' +
      '</div>';
  }

  function kpiCard(label, value, sub, opts) {
    opts = opts || {};
    var bg = opts.gradient ? 'background:linear-gradient(135deg,#16A394,#3B5FDD 55%,#6B3FA0);border:1px solid #1B2344' : 'background:#fff;border:1px solid #e2e9f2';
    var labelColor = opts.gradient ? 'rgba(255,255,255,.75)' : '#6b7c93';
    var valueColor = opts.gradient ? '#fff' : (opts.valueColor || '#1B2344');
    var subColor = opts.gradient ? 'rgba(255,255,255,.68)' : '#6b7c93';
    var pctSuffix = opts.pct ? '<div style="font-size:13px;color:#6b7c93">%</div>' : '';
    return '<div style="' + bg + ';border-radius:14px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:' + labelColor + ';font-weight:600">' + escHtml(label) + '</div>' +
      '<div style="display:flex;align-items:baseline;gap:6px;margin-top:6px"><div style="font-family:\'Spectral\',serif;font-weight:700;font-size:32px;color:' + valueColor + ';line-height:1.1">' + value + '</div>' + pctSuffix + '</div>' +
      '<div style="font-size:12px;color:' + subColor + ';margin-top:2px">' + escHtml(sub) + '</div>' +
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
      opt('', 'Todos os tipos', vals.filters.tipo === '') + opt('Adultos', 'Adultos', vals.filters.tipo === 'Adultos') + opt('Kids e Juvenis', 'Kids e Juvenis', vals.filters.tipo === 'Kids e Juvenis') +
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
    html += '<div class="grid-kpi6" style="margin-bottom:16px">' +
      kpiCard('Membros da Rede', vals.k.membrosRede, 'membros, líderes, anfitr. e discip.', { gradient: true }) +
      kpiCard('Total de Frequentadores Assíduos', vals.k.totalFA, vals.k.faLabel, { valueColor: '#149C88' }) +
      kpiCard('Total de Visitantes', vals.k.totalVisitantes, vals.k.visitantesLabel, { valueColor: '#8A63C9' }) +
      kpiCard('Total de Kids e Juvenis', vals.k.totalKids, 'crianças e adolescentes na seleção', { valueColor: '#6B3FA0' }) +
      '</div>';

    // Charts grid
    html += '<div class="grid-2a" style="margin-bottom:16px">' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04)">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin-bottom:4px">Jornada espiritual</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Batismo e Encontro com Deus na seleção atual</div>' +
      '<div style="display:flex;gap:26px;align-items:center;justify-content:space-around">' +
      '<div style="text-align:center">' +
      '<div style="width:132px;height:132px;border-radius:50%;background:' + vals.gaugeBat + ';display:flex;align-items:center;justify-content:center">' +
      '<div style="width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:28px;color:#149C88;line-height:1">' + vals.k.batPct + '%</div>' +
      '<div style="font-size:10.5px;color:#6b7c93;letter-spacing:.04em;text-transform:uppercase;font-weight:600;margin-top:2px">Batizados</div>' +
      '</div></div>' +
      '<div style="font-size:12px;color:#6b7c93;margin-top:10px"><b style="color:#6B3FA0">' + vals.k.faltamBat + '</b> ainda não batizados</div>' +
      '</div>' +
      '<div style="text-align:center">' +
      '<div style="width:132px;height:132px;border-radius:50%;background:' + vals.gaugeEnc + ';display:flex;align-items:center;justify-content:center">' +
      '<div style="width:96px;height:96px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:28px;color:#3B5FDD;line-height:1">' + vals.k.encPct + '%</div>' +
      '<div style="font-size:10.5px;color:#6b7c93;letter-spacing:.04em;text-transform:uppercase;font-weight:600;margin-top:2px">Encontro</div>' +
      '</div></div>' +
      '<div style="font-size:12px;color:#6b7c93;margin-top:10px"><b style="color:#6B3FA0">' + vals.k.faltamEnc + '</b> ainda não fizeram</div>' +
      '</div></div></div>' +

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
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
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

  function presencaHtml(vals) {
    var html = '<div>';

    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<select ' + cb(vals.onPCelula, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as células', vals.pFilters.celula === '') +
      vals.pCelulaOptions.map(function (o) { return opt(o.v, o.label, vals.pFilters.celula === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onPAno, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os anos', vals.pFilters.ano === '') +
      vals.pAnoOptions.map(function (o) { return opt(o.v, o.label, vals.pFilters.ano === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onPMesTop, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os meses', vals.pFilters.mesTop === '') +
      vals.pMesOptions.map(function (o) { return opt(o.v, o.label, vals.pFilters.mesTop === o.v); }).join('') +
      '</select>' +
      '<button ' + cb(vals.clearPFilters) + ' style="padding:10px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#6b7c93;font-weight:600;cursor:pointer">Limpar</button>' +
      '<div style="flex:1"></div>' +
      '<button ' + cb(vals.sharePresencaWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' Enviar resumo via WhatsApp</button>' +
      '<button ' + cb(vals.onRefreshP) + ' title="Sincronizar agora com a planilha" style="display:flex;align-items:center;gap:7px;border:1px solid #e2e9f2;background:#fff;border-radius:20px;padding:6px 12px 6px 10px;cursor:pointer">' +
      '<span style="width:7px;height:7px;border-radius:50%;background:' + vals.syncP.dot + '"></span>' +
      '<span style="font-size:11.5px;color:' + vals.syncP.color + ';font-weight:600">' + escHtml(vals.syncP.text) + '</span></button>' +
      '</div>';

    html += '<div class="grid-kpi4" style="margin-bottom:16px">' +
      kpiCard('Encontros registrados', vals.pk.registros, vals.pk.periodoLabel) +
      kpiCard('Presença média', vals.pk.media, 'pessoas por encontro', { gradient: true }) +
      kpiCard('Frequentadores presentes', vals.pk.totalFA, 'soma de presenças de FAs', { valueColor: '#149C88' }) +
      kpiCard('Visitantes recebidos', vals.pk.totalVisit, 'soma de presenças de visitantes', { valueColor: '#8A63C9' }) +
      '</div>';

    function simpleTable(title, headers, rows, rowFn) {
      return '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
        '<div style="padding:18px 22px 14px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">' + title + '</div></div>' +
        '<div class="table-scroll" style="max-height:360px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead>' +
        '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' + headers + '</tr></thead><tbody>' +
        rows.map(rowFn).join('') +
        '</tbody></table></div></div>';
    }

    html += '<div class="grid-2c" style="margin-bottom:16px">' +
      simpleTable('Frequência da Célula',
        '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Dia</th>' +
        '<th style="text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Mês</th>' +
        '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Membros</th>' +
        '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">FAs</th>' +
        '<th style="text-align:right;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Visitantes</th>',
        vals.freqCelulaRows,
        function (r) {
          return '<tr style="border-bottom:1px solid #f0f4f9">' +
            '<td style="padding:8px 22px;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(r.dia) + '</td>' +
            '<td style="padding:8px 12px;font-weight:600;color:#14243a">' + escHtml(r.mes) + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.membros + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.fa + '</td>' +
            '<td style="padding:8px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.visit + '</td></tr>';
        }) +
      simpleTable('Frequência Média por Mês',
        '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Mês</th>' +
        '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Membros</th>' +
        '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">FAs</th>' +
        '<th style="text-align:right;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Visitantes</th>',
        vals.freqMediaMesRows,
        function (m) {
          return '<tr style="border-bottom:1px solid #f0f4f9">' +
            '<td style="padding:8px 22px;font-weight:600;color:#14243a">' + escHtml(m.mes) + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + m.membros + '</td>' +
            '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + m.fa + '</td>' +
            '<td style="padding:8px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + m.visit + '</td></tr>';
        }) +
      '</div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-bottom:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Frequência por Líder de Célula</div>' +
      '<button ' + cb(vals.shareFreqLiderWhatsapp) + ' style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:12.5px;color:#1B2344;font-weight:600;cursor:pointer">' + whatsappIcon + ' WhatsApp</button>' +
      '</div>' +
      '<div class="table-scroll" style="max-height:360px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Líder / Célula</th>' +
      '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Membros</th>' +
      '<th style="text-align:right;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">FAs</th>' +
      '<th style="text-align:right;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Visitantes</th>' +
      '</tr></thead><tbody>' +
      vals.freqPorLiderRows.map(function (r) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:8px 22px;font-weight:600;color:#14243a">' + escHtml(r.celula) + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.membros + '</td>' +
          '<td style="padding:8px 12px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.fa + '</td>' +
          '<td style="padding:8px 22px;text-align:right;color:#4a5b70;font-variant-numeric:tabular-nums">' + r.visit + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04);margin-bottom:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:10px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Média de frequência por líder de célula</div>' +
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<div style="font-size:11px;color:#6b7c93;display:flex;gap:12px"><span><b style="color:#1B2344">■</b> Membros</span><span><b style="color:#149C88">■</b> FAs</span><span><b style="color:#8A63C9">■</b> Visitantes</span></div>' +
      '<select ' + cb(vals.onPMes, 'change') + ' style="padding:6px 10px;border:1px solid #d4deea;border-radius:8px;background:#fff;font-size:12.5px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os meses (2026)', vals.pFilters.mes === '') +
      vals.mesOptions.map(function (o) { return opt(o.v, o.label + '/26', vals.pFilters.mes === o.v); }).join('') +
      '</select></div></div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Dados de 2026 · presença média por mês (ou total do mês selecionado), por membros/FAs/visitantes · clique para filtrar por célula</div>' +
      '<div style="display:flex;flex-direction:column;gap:13px">' +
      vals.mediaLiderBars.map(function (c) {
        return '<div ' + cb(c.onClick) + ' style="cursor:pointer;padding:4px 5px;border-radius:8px;background:' + c.bg + '">' +
          '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">' +
          '<div style="font-size:13px;color:#14243a;font-weight:' + c.weight + '">' + escHtml(c.label) + '</div>' +
          '<div style="font-size:12px;color:#6b7c93"><b style="color:#1B2344">' + c.registros + '</b> encontros em ' + c.mesesAtivos + ' ' + c.mesLabel + '</div></div>' +
          '<div style="display:grid;grid-template-columns:1fr 56px;align-items:center;gap:10px">' +
          '<div style="height:20px;background:#eef2f7;border-radius:6px;overflow:hidden;display:flex;width:' + c.totalW + '">' +
          c.segs.map(function (s) { return '<div title="' + escHtml(s.title) + '" style="height:100%;width:' + s.w + ';background:' + s.color + '"></div>'; }).join('') +
          '</div><div style="font-size:12.5px;font-weight:700;color:#1B2344;text-align:right">' + c.mediaMensal + '/mês</div></div></div>';
      }).join('') +
      '</div></div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;padding:18px 22px 14px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Registros <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.pk.registros + ' na seleção</span></div></div>' +
      '<div class="table-scroll" style="max-height:400px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th ' + cb(vals.sortPData) + ' style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;cursor:pointer;border-bottom:1px solid #e2e9f2">Data ' + vals.sortPDataArrow + '</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Membros</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">FAs</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Visitantes</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Kids</th>' +
      '<th style="text-align:center;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Tipo</th>' +
      '<th style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Total</th>' +
      '</tr></thead><tbody>' +
      vals.pRows.map(function (r) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:10px 22px;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(r.dataLabel) + '</td>' +
          '<td style="padding:10px 12px;font-weight:600;color:#14243a">' + escHtml(r.celulaLabel) + '</td>' +
          '<td style="padding:10px 12px;text-align:center;color:#4a5b70">' + r.membros + '</td>' +
          '<td style="padding:10px 12px;text-align:center;color:#4a5b70">' + r.fa + '</td>' +
          '<td style="padding:10px 12px;text-align:center;color:#4a5b70">' + r.visit + '</td>' +
          '<td style="padding:10px 12px;text-align:center;color:#4a5b70">' + r.kids + '</td>' +
          '<td style="padding:10px 12px;text-align:center"><span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:' + r.tipoBg + ';color:' + r.tipoFg + '">' + escHtml(r.tipo) + '</span></td>' +
          '<td style="padding:10px 22px;text-align:right;font-weight:700;color:#1B2344;font-variant-numeric:tabular-nums">' + r.total + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    html += '</div>';
    return html;
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

  function novoHtml(vals) {
    var f = vals.novoForm;
    var editing = vals.isEditingMembro;
    var html = '<div style="max-width:640px;margin:24px auto 60px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:19px;margin-bottom:4px">' + (editing ? 'Editar Cadastro' : 'Novo Cadastro') + '</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">' + (editing ? 'Altere os dados da pessoa. Mudanças de célula, posição, batismo ou encontro ficam registradas em Movimentações.' : 'Preencha os dados da pessoa para incluí-la neste dashboard. Fica salvo no banco de dados e soma aos totais e gráficos.') + '</div>';

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
      selectField('Tipo de cadastro', cb(vals.onNF('tipo'), 'change'), [{ v: 'Adultos', label: 'Adultos' }, { v: 'Kids e Juvenis', label: 'Kids e Juvenis' }], f.tipo) +
      (celulaObrigatoria(f.posicao)
        // Sem placeholder quando já tem uma célula válida (comportamento de sempre).
        // Com placeholder "Selecionar" (e required) quando está vazia — evita
        // salvar sem célula ao trocar a posição de liderança sênior pra uma
        // que exige célula no meio da edição.
        ? selectField('Célula', cb(vals.onNF('celula'), 'change'), vals.celulaOptionsForm, f.celula, f.celula ? undefined : 'Selecionar')
        : '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Célula</label>' +
          '<div style="margin-top:5px;padding:10px 12px;border:1px dashed #d4deea;border-radius:9px;font-size:12.5px;color:#8a99ab">Não se aplica a esta posição</div></div>') +
      '</div>' +

      '<div class="grid-form2">' +
      selectField('Posição', cb(vals.onNF('posicao'), 'change'), posicaoOptions(), f.posicao) +
      selectField('Estado civil', cb(vals.onNF('civil'), 'change'), [
        { v: 'Solteiro (a)', label: 'Solteiro(a)' }, { v: 'Casado (a)', label: 'Casado(a)' }, { v: 'Amasiado (a)', label: 'Amasiado(a)' },
        { v: 'Divorciado(a)', label: 'Divorciado(a)' }, { v: 'Viuvo (a)', label: 'Viúvo(a)' }
      ], f.civil) +
      '</div>' +

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
          '<div style="font-size:12px;color:#6b7c93;margin-top:2px">' + k.done + ' de ' + k.total + ' adultos concluíram</div></div>';
      }).join('') +
      '</div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:20px 22px;box-shadow:0 1px 2px rgba(20,36,58,.04);margin-bottom:16px">' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Volume de pessoas por curso, por célula</div>' +
      '<div style="font-size:11px;color:#6b7c93;display:flex;gap:14px">' +
      vals.trilhoCourses.map(function (tc) { return '<span><b style="color:' + tc.color + '">■</b> ' + escHtml(tc.label) + '</span>'; }).join('') +
      '</div></div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:16px">Quantidade de adultos que concluíram cada curso, empilhado por célula · clique no nome para filtrar</div>' +
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
      '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Cursos por pessoa <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.trilhoRows.length + ' adultos</span></div>' +
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

  function presencaCultoHtml(vals) {
    var html = '<div>';

    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<input type="date" id="culto-data-input" value="' + escHtml(vals.novoCultoData) + '" style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a">' +
      '<button ' + cb(vals.criarCulto) + ' style="padding:10px 14px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Selecionar / criar culto</button>' +
      '</div>';

    if (!vals.cultoAtual) {
      html += '<div style="font-size:13px;color:#6b7c93;margin-bottom:16px">Escolha uma data acima para abrir o check-in, ou clique num culto já registrado na lista abaixo.</div>';
    } else {
      html += '<div class="grid-kpi3" style="margin-bottom:16px">' +
        kpiCard('Culto selecionado', vals.cultoAtual.dataLabel, 'check-in em andamento') +
        kpiCard('Presentes', vals.cultoPresentes, 'de ' + vals.cultoTotal + ' na seleção', { gradient: true }) +
        kpiCard('Presença', vals.cultoPct, '% da seleção', { pct: true, valueColor: '#149C88' }) +
        '</div>';

      html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">' +
        '<input type="text" id="culto-busca-input" value="' + escHtml(vals.cultoFilters.q) + '" ' + cb(vals.onCFQ, 'input') + ' placeholder="Buscar por nome…" style="flex:1;min-width:200px;padding:9px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px">' +
        '<select ' + cb(vals.onCFCelula, 'change') + ' style="padding:9px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
        opt('', 'Todas as células', vals.cultoFilters.celula === '') +
        vals.cultoCelulaOptions.map(function (o) { return opt(o.v, o.label, vals.cultoFilters.celula === o.v); }).join('') +
        '</select>' +
        '</div>';

      html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden;margin-bottom:16px">' +
        '<div class="table-scroll" style="max-height:520px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
        '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
        '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
        '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
        '<th style="text-align:right;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Presente</th>' +
        '</tr></thead><tbody>' +
        vals.cultoRows.map(function (r) {
          return '<tr ' + cb(r.onToggle) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9">' +
            '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(r.nome) + '</td>' +
            '<td style="padding:11px 12px;color:#4a5b70">' + escHtml(r.celulaLabel) + '</td>' +
            '<td style="padding:11px 22px;text-align:right">' +
            '<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:11.5px;font-weight:600;background:' + (r.presente ? '#dcf3ef' : '#eef2f7') + ';color:' + (r.presente ? '#0E7A68' : '#8a99ab') + '">' + (r.presente ? 'Presente' : 'Ausente') + '</span>' +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div></div>';
    }

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="padding:18px 22px 14px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Cultos registrados</div></div>' +
      '<div class="table-scroll" style="max-height:300px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Data</th>' +
      '<th style="text-align:right;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Presentes</th>' +
      '</tr></thead><tbody>' +
      vals.cultos.map(function (c) {
        return '<tr ' + cb(c.onClick) + ' data-hover style="cursor:pointer;border-bottom:1px solid #f0f4f9;background:' + (c.active ? '#eaf1fa' : 'transparent') + '">' +
          '<td style="padding:9px 22px;font-weight:600;color:#14243a">' + escHtml(c.dataLabel) + '</td>' +
          '<td style="padding:9px 22px;text-align:right;color:#4a5b70">' + c.presentes + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    html += '</div>';
    return html;
  }

  function movimentacoesHtml(vals) {
    var campoOptions = [{ v: 'celula', label: 'Célula' }, { v: 'posicao', label: 'Posição' }, { v: 'batizado', label: 'Batismo' }, { v: 'encontro', label: 'Encontro com Deus' }, { v: 'situacao_saida', label: 'Situação' }, { v: 'nota', label: 'Nota' }];
    var html = '<div>';

    html += '<div class="grid-form2" style="margin:18px 0 16px">' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="padding:18px 22px 14px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Perdidos por Célula <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.totalPerdidos + ' no total</span></div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-top:2px">Só conta quem saiu como "Perdido" — transferidos não entram nessa contagem.</div></div>' +
      (vals.perdidosRows.length
        ? '<div class="table-scroll" style="max-height:260px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
          '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
          '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
          '<th style="text-align:right;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Perdidos</th>' +
          '</tr></thead><tbody>' +
          vals.perdidosRows.map(function (r) {
            return '<tr style="border-bottom:1px solid #f0f4f9">' +
              '<td style="padding:9px 22px;font-weight:600;color:#14243a">' + escHtml(r.celula) + '</td>' +
              '<td style="padding:9px 22px;text-align:right;color:#6B3FA0;font-weight:700">' + r.qtd + '</td></tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<div style="padding:0 22px 18px;font-size:12.5px;color:#6b7c93">Nenhum perdido registrado.</div>') +
      '</div>' +
      '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="padding:18px 22px 14px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Pessoas que saíram <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.sairamRows.length + '</span></div></div>' +
      (vals.sairamRows.length
        ? '<div class="table-scroll" style="max-height:260px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
          '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
          '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
          '<th style="text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Situação</th>' +
          '<th style="text-align:left;padding:9px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Detalhe</th>' +
          '</tr></thead><tbody>' +
          vals.sairamRows.map(function (r) {
            return '<tr style="border-bottom:1px solid #f0f4f9">' +
              '<td style="padding:9px 22px;font-weight:600;color:#14243a">' + escHtml(r.nome) + ' <span style="font-weight:500;color:#6b7c93">· ' + escHtml(r.celulaLabel) + '</span></td>' +
              '<td style="padding:9px 12px;color:#4a5b70">' + escHtml(r.situacaoLabel) + '</td>' +
              '<td style="padding:9px 22px;color:#4a5b70">' + escHtml(r.detalhe) + '</td></tr>';
          }).join('') +
          '</tbody></table></div>'
        : '<div style="padding:0 22px 18px;font-size:12.5px;color:#6b7c93">Ninguém saiu da rede ainda.</div>') +
      '</div></div>';

    html += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:18px 0 20px">' +
      '<select ' + cb(vals.onMFCelula, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todas as células', vals.movFilters.celula === '') +
      vals.movCelulaOptions.map(function (o) { return opt(o.v, o.label, vals.movFilters.celula === o.v); }).join('') +
      '</select>' +
      '<select ' + cb(vals.onMFCampo, 'change') + ' style="padding:10px 12px;border:1px solid #d4deea;border-radius:9px;background:#fff;font-size:13px;color:#14243a;font-weight:500;cursor:pointer">' +
      opt('', 'Todos os tipos', vals.movFilters.campo === '') +
      campoOptions.map(function (o) { return opt(o.v, o.label, vals.movFilters.campo === o.v); }).join('') +
      '</select>' +
      '</div>';

    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div style="padding:18px 22px 14px"><div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px">Movimentações <span style="color:#6b7c93;font-weight:500;font-family:\'Libre Franklin\'">· ' + vals.movRows.length + ' registros</span></div></div>' +
      '<div class="table-scroll" style="max-height:600px;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Data</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Nome</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Tipo</th>' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Mudança</th>' +
      '</tr></thead><tbody>' +
      vals.movRows.map(function (r) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:10px 22px;color:#4a5b70;font-variant-numeric:tabular-nums">' + escHtml(r.dataLabel) + '</td>' +
          '<td style="padding:10px 12px;font-weight:600;color:#14243a">' + escHtml(r.nome) + '</td>' +
          '<td style="padding:10px 12px;color:#4a5b70">' + escHtml(r.celulaLabel) + '</td>' +
          '<td style="padding:10px 12px;color:#4a5b70">' + escHtml(r.campoLabel) + '</td>' +
          '<td style="padding:10px 22px;color:#4a5b70">' + escHtml(r.desc) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    html += '</div>';
    return html;
  }

  function loginHtml(vals) {
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:360px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Entrar</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Acesso restrito aos líderes da Rede Oikos.</div>' +
      (vals.loginError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">' + escHtml(vals.loginError) + '</div>' : '') +
      '<form ' + cb(vals.doLogin, 'submit') + ' style="display:flex;flex-direction:column;gap:12px">' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail</label>' +
      '<input type="email" id="login-email" value="' + escHtml(vals.loginForm.email) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Senha</label>' +
      '<input type="password" id="login-senha" value="' + escHtml(vals.loginForm.senha) + '" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
      '<button type="submit"' + (vals.loginLoading ? ' disabled' : '') + ' style="margin-top:4px;padding:12px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:14px;font-weight:700;cursor:pointer">' + (vals.loginLoading ? 'Entrando…' : 'Entrar') + '</button>' +
      '</form>' +
      '<div style="margin-top:16px;text-align:center">' +
      '<button ' + cb(vals.irParaCadastroPublico) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">Sou visitante, quero me cadastrar</button>' +
      '</div></div></div>';
  }

  function cadastroPublicoHtml(vals) {
    var f = vals.publicForm;
    var celulaOpts = (vals.celulasPublicas || []).map(function (c) { return { v: c, label: celulaLabel(c) }; });
    var celulaPlaceholder = vals.celulasPublicasStatus === 'loading' ? 'Carregando…' : 'Selecionar';
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">' +
      '<div style="width:100%;max-width:460px;background:#fff;border:1px solid #e2e9f2;border-radius:14px;padding:28px;box-shadow:0 4px 20px rgba(20,36,58,.08)">' +
      '<img src="assets/logo-videira.png" alt="Videira Igreja em Células" style="height:40px;width:auto;margin-bottom:16px">' +
      '<div style="font-family:\'Spectral\',serif;font-weight:700;font-size:20px;margin-bottom:4px">Seja bem-vindo(a)!</div>' +
      '<div style="font-size:12.5px;color:#6b7c93;margin-bottom:20px">Preencha seus dados para se cadastrar na Rede Oikos.</div>' +
      (vals.publicSalvo
        ? '<div style="background:#e2f2ea;color:#237a5a;border-radius:9px;padding:14px;font-size:13.5px;font-weight:600">Cadastro recebido, obrigado! Em breve alguém da célula vai entrar em contato.</div>'
        : (
          (vals.publicError ? '<div style="background:#f7e2e2;color:#a02020;border-radius:9px;padding:9px 12px;font-size:12.5px;font-weight:600;margin-bottom:14px">Erro: ' + escHtml(vals.publicError) + '</div>' : '') +
          '<form ' + cb(vals.submitPublico, 'submit') + ' style="display:flex;flex-direction:column;gap:14px">' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Nome completo</label>' +
          '<input type="text" id="pub-nome" required value="' + escHtml(f.nome) + '" ' + cb(vals.onPF('nome'), 'input') + ' placeholder="Seu nome" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '<div class="grid-form2">' +
          selectField('Tipo', cb(vals.onPF('tipo'), 'change'), [{ v: 'Adultos', label: 'Adultos' }, { v: 'Kids e Juvenis', label: 'Kids e Juvenis' }], f.tipo) +
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
      '<button ' + cb(vals.voltarParaLogin) + ' style="border:none;background:none;padding:0;color:#6b7c93;font-size:12.5px;font-weight:600;cursor:pointer">Já sou líder, quero entrar</button>' +
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
      (vals.adminLiderSalvo ? adminBanner('ok', 'Liderança cadastrada com sucesso.') : '') +
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
        ? '<div class="grid-form2">' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">E-mail de login</label>' +
          '<input type="email" id="adminlider-email" placeholder="pessoa@exemplo.com" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '<div><label style="font-size:12px;color:#6b7c93;font-weight:600">Senha inicial</label>' +
          '<input type="text" id="adminlider-senha" placeholder="mínimo 6 caracteres" style="width:100%;margin-top:5px;padding:10px 12px;border:1px solid #d4deea;border-radius:9px;font-size:14px;box-sizing:border-box"></div>' +
          '</div>'
        : '') +
      '<button type="submit"' + (vals.adminLiderSaving ? ' disabled' : '') + ' style="align-self:flex-start;padding:10px 18px;border:none;border-radius:9px;background:#1B2344;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer">' + (vals.adminLiderSaving ? 'Salvando…' : 'Cadastrar') + '</button>' +
      '</form>';
    return adminCard('Nova Liderança', 'Cadastre um novo Pastor, Obreiro, Discipulador ou Líder — e, se quiser, já crie o login dele.', body);
  }

  function hierarquiaHtml(vals) {
    var html = '<div style="margin:18px 0 20px;font-size:12.5px;color:#6b7c93">Cadastre novas células e liderança, e defina quem é o discipulador e o obreiro responsável por cada célula. Isso controla o que cada líder vê nos relatórios.</div>';
    html += adminNovaCelulaHtml(vals);
    html += adminNovaLiderancaHtml(vals);
    html += '<div style="font-family:\'Spectral\',serif;font-weight:600;font-size:16px;margin:20px 0 12px">Discipulador e Obreiro por célula</div>';
    html += '<div style="background:#fff;border:1px solid #e2e9f2;border-radius:14px;box-shadow:0 1px 2px rgba(20,36,58,.04);overflow:hidden">' +
      '<div class="table-scroll"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead>' +
      '<tr style="position:sticky;top:0;background:#f5f8fc;z-index:1">' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Célula</th>' +
      '<th style="text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Discipulador responsável</th>' +
      '<th style="text-align:left;padding:10px 22px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#6b7c93;font-weight:600;border-bottom:1px solid #e2e9f2">Obreiro/Pastor responsável</th>' +
      '</tr></thead><tbody>' +
      vals.hierarquiaRows.map(function (r) {
        return '<tr style="border-bottom:1px solid #f0f4f9">' +
          '<td style="padding:11px 22px;font-weight:600;color:#14243a">' + escHtml(r.celulaLabelText) + '</td>' +
          '<td style="padding:8px 12px">' +
          '<select ' + cb(r.onDiscipulador, 'change') + ' style="padding:8px 10px;border:1px solid #d4deea;border-radius:8px;background:#fff;font-size:13px;color:#14243a;min-width:200px">' +
          opt('', 'Nenhum', r.discipuladorId === '') +
          vals.discipuladores.map(function (o) { return opt(o.v, o.label, r.discipuladorId === o.v); }).join('') +
          '</select></td>' +
          '<td style="padding:8px 22px">' +
          '<select ' + cb(r.onObreiro, 'change') + ' style="padding:8px 10px;border:1px solid #d4deea;border-radius:8px;background:#fff;font-size:13px;color:#14243a;min-width:200px">' +
          opt('', 'Nenhum', r.obreiroId === '') +
          vals.obreiros.map(function (o) { return opt(o.v, o.label, r.obreiroId === o.v); }).join('') +
          '</select></td></tr>';
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
  var UNCONTROLLED_FIELD_IDS = ['login-email', 'login-senha', 'novo-nasc', 'culto-data-input', 'pub-nasc', 'adminlider-email', 'adminlider-senha'];

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
    } else if (state.isPublicCadastro) {
      html = cadastroPublicoHtml({
        publicForm: state.publicForm, publicSaving: state.publicSaving, publicError: state.publicError, publicSalvo: state.publicSalvo,
        celulasPublicas: state.celulasPublicas, celulasPublicasStatus: state.celulasPublicasStatus,
        onPF: function (key) { return function (e) { setPublicField(key, e.target.value); }; },
        submitPublico: function (e) { if (e && e.preventDefault) e.preventDefault(); submitPublico(); },
        voltarParaLogin: function () { voltarParaLogin(); },
      });
    } else if (!state.session) {
      html = loginHtml({
        loginForm: state.loginForm, loginError: state.loginError, loginLoading: state.loginLoading,
        doLogin: function (e) { if (e && e.preventDefault) e.preventDefault(); doLogin(); },
        irParaCadastroPublico: function () { irParaCadastroPublico(); },
      });
    } else if (state.profile === null || state.profileStatus === 'loading') {
      html = carregandoHtml();
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
        (vals.isCadastro ? cadastroHtml(vals) : '') +
        (vals.isPresenca ? presencaHtml(vals) : '') +
        (vals.isCulto ? presencaCultoHtml(vals) : '') +
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
      checkSession();
      if (state.isPublicCadastro) loadCelulasPublicas();
    }
    render();
  });
})();
