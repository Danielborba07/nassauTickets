import React, { useEffect, useState } from "react";

const API = "http://localhost:3001/api";

async function api(path, options={}) {
  const r = await fetch(API + path, {
    headers: {"Content-Type":"application/json"},
    ...options
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.erro || "Erro na API");
  return data;
}

function Totem() {
  const [senha, setSenha] = useState(null);
  const emitir = async tipo => {
    try { setSenha(await api("/senhas",{method:"POST",body:JSON.stringify({tipo})})); }
    catch(e) { alert(e.message); }
  };
  return <section className="card">
    <h2>Emissão de senha</h2>
    <p>Escolha o tipo de atendimento:</p>
    <div className="buttons">
      <button onClick={()=>emitir("SP")}>Senha Prioritária (SP)</button>
      <button onClick={()=>emitir("SE")}>Retirada de Exames (SE)</button>
      <button onClick={()=>emitir("SG")}>Senha Geral (SG)</button>
    </div>
    {senha && <div className="ticket"><small>Sua senha</small><strong>{senha.numero}</strong><span>{senha.tipo}</span></div>}
  </section>
}

function Painel() {
  const [items,setItems] = useState([]);
  const carregar=()=>api("/painel").then(setItems).catch(()=>{});
  useEffect(()=>{ carregar(); const t=setInterval(carregar,3000); return()=>clearInterval(t)},[]);
  return <section className="card">
    <h2>Painel de chamadas</h2>
    {items.length===0 ? <p>Nenhuma chamada registrada.</p> :
      <div className="panel">{items.map((x,i)=>
        <div className={i===0?"current call":"call"} key={x.numero+x.chamada_em}>
          <strong>{x.numero}</strong><span>Guichê {x.guiche || "-"}</span>
        </div>
      )}</div>}
  </section>
}

function Atendente() {
  const [current,setCurrent]=useState(null);
  const [usuarioId]=useState(1);
  const [guicheId]=useState(1);

  const chamar=async()=>{
    try { const s=await api("/atendimento/chamar",{method:"POST",body:JSON.stringify({usuarioId,guicheId})}); setCurrent(s); speechSynthesis.speak(new SpeechSynthesisUtterance(`${s.tipo} ${s.numero}, guichê ${guicheId}`)); }
    catch(e){alert(e.message)}
  };

  const iniciar=async()=>{
    if (!current) return;
    await api("/atendimento/iniciar", {
      method: "POST",
      body: JSON.stringify({ senhaId: current.id, usuarioId, guicheId })
    });
    setCurrent({ ...current, estado: "EM_ATENDIMENTO" });
  };

  const finalizar=async()=>{
    if (!current) return;
    await api("/atendimento/finalizar", {
      method: "POST",
      body: JSON.stringify({ senhaId: current.id, usuarioId, guicheId })
    });
    setCurrent(null);
  };

  const novamente=async()=>{
    if (!current) return;
    const chamada = await api("/atendimento/chamar-novamente", {
      method: "POST",
      body: JSON.stringify({ senhaId: current.id, usuarioId, guicheId })
    });
    setCurrent(chamada);
    speechSynthesis.speak(new SpeechSynthesisUtterance(`Última chamada, ${current.numero}, guichê ${guicheId}`));
  };

  const naoCompareceu=async()=>{
    if (!current) return;
    await api("/atendimento/nao-compareceu", {
      method: "POST",
      body: JSON.stringify({ senhaId: current.id, usuarioId, guicheId })
    });
    setCurrent(null);
  };

  return <section className="card">
    <h2>Terminal do atendente</h2>
    <p>Guichê {guicheId}</p>
    {current && <div className="current-ticket"><strong>{current.numero}</strong><span>{current.estado}</span></div>}
    <div className="buttons">
      <button onClick={chamar}>Chamar próxima</button>
      <button disabled={!current} onClick={novamente}>Chamar novamente</button>
      <button disabled={!current} onClick={iniciar}>Iniciar atendimento</button>
      <button disabled={!current || current.estado!=="EM_ATENDIMENTO"} onClick={finalizar}>Finalizar</button>
      <button disabled={!current || current.estado!=="CHAMADA_NOVAMENTE"} onClick={naoCompareceu}>Não compareceu</button>
    </div>
  </section>
}

function Relatorio() {
  const [r,setR]=useState(null);
  useEffect(()=>{api("/relatorios/resumo").then(setR).catch(()=>{})},[]);
  if(!r)return <section className="card"><h2>Relatório diário</h2><p>Carregando...</p></section>;
  return <section className="card"><h2>Relatório diário</h2>
    <div className="stats">
      <b>Emitidas: {r.total_emitidas||0}</b>
      <b>Atendidas: {r.total_atendidas||0}</b>
      <b>SP: {r.emitidas_sp||0}</b>
      <b>SE: {r.emitidas_se||0}</b>
      <b>SG: {r.emitidas_sg||0}</b>
      <b>Tempo médio: {r.tempo_medio_minutos||0} min</b>
    </div>
  </section>
}

export default function App(){
  return <main>
    <header><h1>nassauTickets</h1><p>Controle de Atendimento — Laboratório de Análises Clínicas</p></header>
    <div className="grid">
      <Totem/><Painel/><Atendente/><Relatorio/>
    </div>
  </main>
}
