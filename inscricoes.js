/* Participação na feira: uma inscrição por conta Google/e-mail validado. */
(function () {
  "use strict";
  const root = document.getElementById("participar");
  const c = window.FEIRA_CONFIG;
  if (!root || !window.supabase || !c?.supabaseUrl || !c?.supabaseAnonKey) return;

  const $ = id => document.getElementById(id);
  const message = $("participar-msg");
  const entry = $("participar-entrada");
  const profile = $("participar-conta");
  const connect = $("participar-google");
  const add = $("participar-novo");
  const logout = $("participar-sair");
  const history = $("participar-historico");
  const pendingKey = "feira_google_inscricao_pendente_v2";
  const oldPendingKey = "feira_google_inscricao_pendente";
  const redirect = location.origin + location.pathname;
  const previewName = new URLSearchParams(location.search).get("previewTema");
  const preview = ["original","royal","cloud","aurora","emerald","studio","skyline"].includes(previewName) || window.self !== window.top;
  const say = (text, type = "info") => {
    message.textContent = text;
    message.dataset.type = type;
  };

  if (preview) {
    connect.disabled = true;
    say("Visualização de exemplo. Para participar, abra o site público da feira.");
    return;
  }

  // Em aparelhos compartilhados, uma nova aba/sessão não deve herdar
  // o login Google que antes permanecia guardado no armazenamento duradouro.
  try { localStorage.removeItem("feira_google_participacao"); } catch (_) {}
  const client = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
    auth: {
      storage: window.sessionStorage,
      storageKey: "feira_google_participacao",
      detectSessionInUrl: true,
      autoRefreshToken: true,
      persistSession: true,
      flowType: "implicit"
    }
  });

  let currentSession = null;
  let processing = false;
  let fetchingHistory = false;
  let lastHistoryUser = null;
  const validGoogle = session => Boolean(session?.user?.email && (
    session.user.app_metadata?.provider === "google" ||
    session.user.app_metadata?.providers?.includes("google")
  ));

  const getName = user => {
    const source = user?.user_metadata?.full_name || user?.user_metadata?.name ||
      user?.email?.split("@")[0] || "Participante";
    const name = String(source).trim().slice(0, 100);
    return name.length >= 3 ? name : "Participante";
  };

  const isPending = () => {
    try {
      return sessionStorage.getItem(pendingKey) === "sim" ||
        sessionStorage.getItem(oldPendingKey) === "sim";
    } catch (_) {
      return false;
    }
  };
  const clearPending = () => {
    try { sessionStorage.removeItem(pendingKey); sessionStorage.removeItem(oldPendingKey); }
    catch (_) {}
  };

  function showSession(session) {
    currentSession = validGoogle(session) ? session : null;
    const logged = Boolean(currentSession);
    entry.hidden = logged;
    profile.hidden = !logged;
    if (!logged) return;
    const user = session.user;
    $("participar-usuario").textContent = getName(user);
    $("participar-email-conta").textContent = user.email;
    $("participar-avatar").textContent = getName(user).charAt(0).toLocaleUpperCase("pt-BR");
  }

  async function loadHistory() {
    const userId = currentSession?.user?.id;
    if (!userId || fetchingHistory) return;
    fetchingHistory = true;
    history.textContent = "Consultando suas participações...";
    try {
      const { data, error } = await client.from("feira_inscricoes")
        .select("id,criado_em,status")
        .eq("usuario_id", userId)
        .order("criado_em", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (currentSession?.user?.id !== userId) return;
      const entries = data || [];
      if (!entries.length) {
        history.textContent = "Você ainda não registrou uma participação.";
        return;
      }
      const label = document.createElement("strong");
      label.textContent = "✓ Sua participação está confirmada";
      const details = document.createElement("span");
      details.textContent = " • Registrada em " + new Date(entries[0].criado_em).toLocaleString("pt-BR", {
        dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo"
      });
      history.replaceChildren(label, details);
    } catch (_) {
      history.textContent = "Não foi possível consultar as inscrições agora.";
    } finally {
      fetchingHistory = false;
    }
  }

  async function register(session) {
    if (processing) return;
    if (!validGoogle(session)) {
      clearPending();
      showSession(null);
      say("Não foi possível confirmar a conta Google. Clique em Continuar com Google para tentar novamente.", "error");
      return;
    }
    processing = true;
    add.disabled = true;
    connect.disabled = true;
    showSession(session);
    say("Verificando sua inscrição...", "info");
    try {
      const user = session.user;
      // Verificação amigável: o banco também possui índices únicos
      // que impedem duas inscrições da mesma conta ou e-mail.
      const previous = await client.from("feira_inscricoes")
        .select("id")
        .eq("usuario_id", user.id)
        .limit(1);
      if (previous.error) throw previous.error;
      if (previous.data?.length) {
        clearPending();
        say("✓ Essa conta Google já confirmou a participação na feira. Não é necessário se cadastrar novamente.", "success");
        await loadHistory();
        return;
      }
      const { data, error } = await client.from("feira_inscricoes")
        .insert({ usuario_id: user.id, nome: getName(user), email: user.email })
        .select("id")
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error("O banco não confirmou a inscrição.");
      clearPending();
      say("✓ Participação confirmada! Seu e-mail está inscrito na feira.", "success");
      await loadHistory();
    } catch (error) {
      // Não apague a intenção automaticamente: o visitante pode tentar de novo.
      clearPending();
      const msg = String(error?.message || "Erro de conexão.");
      if (error?.code === "23505" || /duplicate.key|unique.constraint/i.test(msg)) {
        say("✓ Este e-mail já tem uma inscrição. Para registrar outra pessoa, escolha outra conta Google.", "success");
        await loadHistory();
      } else if (error?.code === "42501" || /row.level.security|permission.denied|42501/i.test(msg)) {
        say("O servidor recusou a inscrição. Tente novamente; se continuar, avise a organização.", "error");
      } else {
        say("Não foi possível salvar sua participação. Verifique sua conexão e tente novamente. Se continuar, avise a organização.", "error");
      }
    } finally {
      processing = false;
      add.disabled = false;
      connect.disabled = false;
    }
  }

  async function refresh(session) {
    if (validGoogle(session)) {
      const changed = lastHistoryUser !== session.user.id;
      showSession(session);
      lastHistoryUser = session.user.id;
      // Primeiro conclui a inscrição iniciada pelo usuário. Consultar o
      // histórico em paralelo pode mostrar a contagem antiga após o INSERT.
      if (isPending()) await register(session);
      else if (changed) await loadHistory();
    } else {
      lastHistoryUser = null;
      showSession(null);
    }
  }

  connect.addEventListener("click", async () => {
    if (processing || connect.disabled) return;
    connect.disabled = true;
    say("Abrindo o login seguro do Google...");
    try {
      // Somente o clique do visitante inicia a inscrição.
      sessionStorage.setItem(pendingKey, "sim");
      const { data: { session } } = await client.auth.getSession();
      if (validGoogle(session)) {
        await refresh(session);
        return;
      }
      // Sem fragmento (#participar): ele interferia com o retorno OAuth.
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect, scopes: "openid email profile" }
      });
      if (error) throw error;
    } catch (error) {
      clearPending();
      say("Não foi possível iniciar o login Google. Verifique sua conexão e tente novamente.", "error");
    } finally {
      connect.disabled = false;
    }
  });

  add.addEventListener("click", async () => {
    if (processing) return;
    processing = true;
    add.disabled = true;
    logout.disabled = true;
    clearPending();
    say("Preparando o login de outro e-mail...", "info");
    try {
      const { error: logoutError } = await client.auth.signOut({ scope: "local" });
      if (logoutError) throw logoutError;
      lastHistoryUser = null;
      showSession(null);
      history.textContent = "";
      // A nova participação só é criada após a pessoa escolher outra conta.
      sessionStorage.setItem(pendingKey, "sim");
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirect,
          scopes: "openid email profile",
          queryParams: { prompt: "select_account" }
        }
      });
      if (error) throw error;
    } catch (error) {
      clearPending();
      say("Não foi possível trocar a conta. Tente novamente em instantes.", "error");
    } finally {
      processing = false;
      add.disabled = false;
      logout.disabled = false;
    }
  });

  logout.addEventListener("click", async () => {
    if (processing) return;
    logout.disabled = true;
    clearPending();
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      lastHistoryUser = null;
      showSession(null);
      history.textContent = "";
      say("Você saiu da conta Google. A participação já confirmada continua salva.", "info");
    } catch (error) {
      say("Não foi possível sair da conta. Verifique sua conexão e tente novamente.", "error");
    } finally {
      logout.disabled = false;
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "SIGNED_OUT"].includes(event)) {
      // Nada de consultar o Supabase dentro do callback: evita bloqueios da sessão.
      setTimeout(() => refresh(session), 0);
    }
  });

  (async () => {
    const params = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const oauthError = params.get("error_description") || hashParams.get("error_description");
    if (oauthError) {
      clearPending();
      say("O login Google não foi concluído. Clique em Continuar com Google para tentar novamente.", "error");
      return;
    }
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error;
      await refresh(session);
      if (!session && isPending()) {
        // O retorno OAuth pode estar terminando de processar; o evento SIGNED_IN
        // fará o registro assim que a sessão aparecer.
        say("Concluindo o retorno do Google. Se continuar sem conectar, clique novamente em Continuar com Google.");
      }
    } catch (error) {
      say("Não foi possível recuperar seu acesso. Clique em Continuar com Google para tentar novamente.", "error");
    }
  })();
})();