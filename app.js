/* Monad Impact frontend — ethers.js v6 */
(() => {
  "use strict";
  const CFG = window.MONAD_IMPACT_CONFIG || {
    chainId: 10143, chainName: "Monad Testnet", rpcUrl: "https://testnet-rpc.monad.xyz",
    currencySymbol: "MON", blockExplorerUrl: "https://testnet.monadvision.com",
    contractAddress: "PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE"
  };

  const ABI = [
    "function campaignCount() view returns (uint256)",
    "function createCampaign(string title,string description,uint256 goal,uint64 deadline) returns (uint256 campaignId)",
    "function donate(uint256 campaignId) payable",
    "function withdraw(uint256 campaignId)",
    "function refund(uint256 campaignId)",
    "function getCampaign(uint256 campaignId) view returns ((address creator,string title,string description,uint256 goal,uint256 totalRaised,uint64 deadline,bool withdrawn))",
    "function contributions(uint256 campaignId,address donor) view returns (uint256)",
    "event CampaignCreated(uint256 indexed campaignId,address indexed creator,string title,uint256 goal,uint256 deadline)",
    "event DonationReceived(uint256 indexed campaignId,address indexed donor,uint256 amount)",
    "event FundsWithdrawn(uint256 indexed campaignId,address indexed creator,uint256 amount)",
    "event RefundClaimed(uint256 indexed campaignId,address indexed donor,uint256 amount)"
  ];

  const $ = (id) => document.getElementById(id);
  let provider = null, signer = null, contract = null, account = null;
  let campaigns = [];
  const isConfigured = () => /^0x[a-fA-F0-9]{40}$/.test(CFG.contractAddress || "");
  const fmt = (wei) => Number(ethers.formatEther(wei)).toLocaleString(undefined, { maximumFractionDigits: 4 });
  const shorten = (a) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const now = () => Math.floor(Date.now() / 1000);
  function notice(message, type = "") {
    const el = $("notice"); el.textContent = message; el.className = `notice ${type}`.trim();
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function clearNotice() { $("notice").className = "notice hidden"; }
  function requireConfigured() {
    if (!isConfigured()) throw new Error("Falta configurar la dirección del contrato. Despliega MonadImpact.sol y pega la dirección en frontend/config.js.");
    if (!contract) throw new Error("Conecta MetaMask para continuar.");
  }
  async function connect() {
    if (!window.ethereum) throw new Error("MetaMask no está instalado. Instala la extensión y vuelve a intentarlo.");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CFG.chainId) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x279f" }] });
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{
            chainId: "0x279f", chainName: CFG.chainName,
            nativeCurrency: { name: "MON", symbol: CFG.currencySymbol, decimals: 18 },
            rpcUrls: [CFG.rpcUrl], blockExplorerUrls: [CFG.blockExplorerUrl]
          }] });
        } else { throw e; }
      }
      provider = new ethers.BrowserProvider(window.ethereum);
      const switchedNet = await provider.getNetwork();
      if (Number(switchedNet.chainId) !== CFG.chainId) throw new Error("Cambia MetaMask a Monad Testnet para continuar.");
    }
    signer = await provider.getSigner();
    account = await signer.getAddress();
    $("connectBtn").textContent = shorten(account);
    if (isConfigured()) contract = new ethers.Contract(CFG.contractAddress, ABI, signer);
    clearNotice();
    await loadCampaigns();
  }
  async function ensureConnection() {
    if (!signer || !account) await connect();
    requireConfigured();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CFG.chainId) throw new Error("La wallet no está conectada a Monad Testnet.");
  }
  async function loadCampaigns() {
    if (!isConfigured()) {
      $("campaignGrid").innerHTML = '<div class="loading-card">Para cargar campañas, despliega el contrato y configura su dirección en <code>frontend/config.js</code>.</div>';
      $("statCampaigns").textContent = "—"; $("statRaised").innerHTML = "— <small>MON</small>";
      return;
    }
    try {
      const readProvider = provider || new ethers.JsonRpcProvider(CFG.rpcUrl);
      const readContract = new ethers.Contract(CFG.contractAddress, ABI, readProvider);
      const count = Number(await readContract.campaignCount());
      campaigns = [];
      let total = 0n;
      for (let id = count; id >= 1; id--) {
        const c = await readContract.getCampaign(id);
        const item = { id, creator: c.creator, title: c.title, description: c.description, goal: c.goal,
          raised: c.totalRaised, deadline: Number(c.deadline), withdrawn: c.withdrawn };
        campaigns.push(item); total += c.totalRaised;
      }
      $("statCampaigns").textContent = String(count);
      $("statRaised").innerHTML = `${fmt(total)} <small>MON</small>`;
      renderCampaigns();
    } catch (e) {
      $("campaignGrid").innerHTML = `<div class="loading-card">No se pudieron cargar campañas. Comprueba la dirección del contrato y la red. ${esc(e.shortMessage || e.message || "")}</div>`;
    }
  }
  function renderCampaigns() {
    const grid = $("campaignGrid");
    $("emptyState").classList.toggle("hidden", campaigns.length !== 0);
    if (!campaigns.length) { grid.innerHTML = ""; return; }
    grid.innerHTML = campaigns.map(c => {
      const success = c.raised >= c.goal, expired = now() >= c.deadline;
      const status = c.withdrawn ? ["Funds withdrawn", "success"] : success ? ["Goal reached", "success"] : expired ? ["Expired · goal missed", "failed"] : ["Funding open", ""];
      const pct = c.goal === 0n ? 0 : Math.min(100, Number(c.raised * 10000n / c.goal) / 100);
      const timeText = expired ? "Ended" : `${Math.max(1, Math.ceil((c.deadline - now()) / 86400))} day(s) left`;
      let actions = "";
      if (!expired && !success) actions += `<button class="btn btn-primary btn-small" data-action="donate" data-id="${c.id}">Back this idea ↗</button>`;
      if (account && account.toLowerCase() === c.creator.toLowerCase() && success && !c.withdrawn)
        actions += `<button class="btn btn-muted btn-small" data-action="withdraw" data-id="${c.id}">Withdraw</button>`;
      if (expired && !success && account)
        actions += `<button class="btn btn-muted btn-small" data-action="refund" data-id="${c.id}">Claim refund</button>`;
      return `<article class="campaign-card">
        <div class="campaign-top"><div class="campaign-symbol">✳</div><span class="status ${status[1]}">${status[0]}</span></div>
        <h3>${esc(c.title)}</h3><p class="campaign-description">${esc(c.description)}</p>
        <div class="progress-meta"><span><strong>${fmt(c.raised)} MON</strong> raised</span><span>${pct.toFixed(0)}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="campaign-foot"><div class="goal-caption"><strong>${fmt(c.goal)} MON</strong> goal · ${timeText}</div><div class="card-actions">${actions || `<span class="goal-caption">${shorten(c.creator)}</span>`}</div></div>
      </article>`;
    }).join("");
  }
  async function runTx(action, id, amount) {
    await ensureConnection();
    let tx;
    if (action === "create") {
      const title = $("campaignTitle").value.trim(), description = $("campaignDescription").value.trim();
      const goal = ethers.parseEther($("campaignGoal").value);
      const days = Number($("campaignDays").value);
      const deadline = now() + days * 86400;
      tx = await contract.createCampaign(title, description, goal, deadline);
    } else if (action === "donate") {
      tx = await contract.donate(BigInt(id), { value: ethers.parseEther(amount) });
    } else if (action === "withdraw") tx = await contract.withdraw(BigInt(id));
    else if (action === "refund") tx = await contract.refund(BigInt(id));
    notice(`Transacción enviada: ${tx.hash}. Esperando confirmación…`);
    await tx.wait();
    notice("Transacción confirmada en Monad Testnet.", "success");
    $("campaignDialog").close(); $("donateDialog").close();
    await loadCampaigns();
  }
  function showCreate() {
    if (!isConfigured()) { notice("Primero despliega el contrato y configura su dirección en frontend/config.js.", "error"); return; }
    $("campaignDialog").showModal();
  }
  function showDonate(id) {
    const c = campaigns.find(x => x.id === Number(id)); if (!c) return;
    $("donateCampaignId").value = String(id); $("donateTitle").textContent = c.title;
    $("donateDescription").textContent = `${fmt(c.raised)} of ${fmt(c.goal)} MON raised · Goal remaining: ${fmt(c.goal - c.raised)} MON`;
    $("donateAmount").max = ethers.formatEther(c.goal - c.raised);
    $("donateDialog").showModal();
  }
  $("connectBtn").addEventListener("click", async () => { try { await connect(); } catch (e) { notice(e.shortMessage || e.message, "error"); } });
  $("createBtn").addEventListener("click", showCreate); $("heroCreateBtn").addEventListener("click", showCreate); $("emptyCreateBtn").addEventListener("click", showCreate);
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  $("campaignForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const goal = Number($("campaignGoal").value);
      if (!Number.isFinite(goal) || goal <= 0) throw new Error("El objetivo debe ser un número mayor que cero.");
      await runTx("create");
      $("campaignForm").reset();
    } catch (err) { notice(err.shortMessage || err.message || "No se pudo crear la campaña.", "error"); }
  });
  $("donateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const amount = $("donateAmount").value;
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error("La aportación debe ser mayor que cero.");
      await runTx("donate", $("donateCampaignId").value, amount);
      $("donateForm").reset();
    } catch (err) { notice(err.shortMessage || err.message || "No se pudo completar la aportación.", "error"); }
  });
  $("campaignGrid").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]"); if (!btn) return;
    const action = btn.dataset.action, id = btn.dataset.id;
    if (action === "donate") { showDonate(id); return; }
    try { await runTx(action, id); } catch (err) { notice(err.shortMessage || err.message || "La transacción falló.", "error"); }
  });
  if (window.ethereum) {
    window.ethereum.on?.("accountsChanged", async (accounts) => {
      account = accounts[0] || null; signer = null; contract = null;
      $("connectBtn").textContent = account ? shorten(account) : "Connect wallet ↗";
      if (account) { try { await connect(); } catch (e) { notice(e.message, "error"); } } else await loadCampaigns();
    });
    window.ethereum.on?.("chainChanged", () => window.location.reload());
  }
  loadCampaigns();
})();
